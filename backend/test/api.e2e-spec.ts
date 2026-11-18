import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { Types } from 'mongoose';
import { createTestApp, seedUser, TestModels } from './utils/test-app';

describe('API (e2e, in-memory store)', () => {
  let app: INestApplication;
  let models: TestModels;
  let admin: Awaited<ReturnType<typeof seedUser>>;
  const http = () => request(app.getHttpServer());

  beforeEach(async () => {
    ({ app, models } = await createTestApp());
    admin = await seedUser(app, models, { email: 'admin@test.dev', role: 'admin' });
  });
  afterEach(() => app.close());

  describe('health', () => {
    it('reports liveness', async () => {
      const res = await http().get('/api/v1/health').expect(200);
      expect(res.body).toMatchObject({ status: 'ok', mongo: 'connected' });
    });
  });

  describe('auth', () => {
    it('logs in with valid credentials (200) and returns the profile', async () => {
      const res = await http().post('/api/v1/auth/login').send({ email: 'ADMIN@test.dev', password: admin.password }).expect(200);
      expect(res.body.accessToken).toEqual(expect.any(String));
      expect(res.body.user).toMatchObject({ email: 'admin@test.dev', role: 'admin' });
      expect(res.body.user.password).toBeUndefined();
      await http().get('/api/v1/auth/me').set('Authorization', `Bearer ${res.body.accessToken}`).expect(200);
    });

    it('rejects wrong credentials with the same message', async () => {
      const a = await http().post('/api/v1/auth/login').send({ email: 'admin@test.dev', password: 'wrong-pass' }).expect(401);
      const b = await http().post('/api/v1/auth/login').send({ email: 'nobody@test.dev', password: 'wrong-pass' }).expect(401);
      expect(a.body.message).toBe(b.body.message);
    });

    it('refuses deactivated accounts, at login and with an existing token', async () => {
      const editor = await seedUser(app, models, { role: 'editor', isActive: false });
      await http().post('/api/v1/auth/login').send({ email: editor.user.email, password: editor.password }).expect(401);
      await http().get('/api/v1/auth/me').set(editor.auth).expect(401);
    });

    it('answers 401 (not 404) for a token whose user was deleted', async () => {
      await models.users.deleteOne({ _id: admin.user._id });
      await http().get('/api/v1/auth/me').set(admin.auth).expect(401);
    });

    it('validates the login payload', async () => {
      await http().post('/api/v1/auth/login').send({ email: 'not-an-email', password: 'x' }).expect(400);
    });

    it('rate-limits login attempts (10/min)', async () => {
      for (let i = 0; i < 10; i++) {
        await http().post('/api/v1/auth/login').send({ email: 'admin@test.dev', password: 'wrong-pass' }).expect(401);
      }
      await http().post('/api/v1/auth/login').send({ email: 'admin@test.dev', password: 'wrong-pass' }).expect(429);
    });
  });

  describe('projects', () => {
    const base = { title: 'Portfolio 3D', slug: 'portfolio-3d', description: 'Immersive', longDescription: 'Long text' };

    it('protects writes', async () => {
      await http().post('/api/v1/projects').send(base).expect(401);
      await http().patch(`/api/v1/projects/${new Types.ObjectId()}`).send({ title: 'x' }).expect(401);
      await http().delete(`/api/v1/projects/${new Types.ObjectId()}`).expect(401);
    });

    it('creates, lists, reads by slug (case-insensitive) and deletes', async () => {
      const created = await http().post('/api/v1/projects').set(admin.auth).send(base).expect(201);
      expect(created.body).toMatchObject({ slug: 'portfolio-3d', status: 'published', source: 'manual', contentFormat: 'text' });

      const list = await http().get('/api/v1/projects').expect(200);
      expect(list.body).toHaveLength(1);
      expect(list.body[0].longDescription).toBe('Long text');
      expect(list.body[0].contentHtml).toBeUndefined();

      const summary = await http().get('/api/v1/projects?summary=true').expect(200);
      expect(summary.body[0].longDescription).toBeUndefined();

      await http().get('/api/v1/projects/slug/Portfolio-3D').expect(200);
      await http().delete(`/api/v1/projects/${created.body._id}`).set(admin.auth).expect(200);
      await http().get('/api/v1/projects/slug/portfolio-3d').expect(404);
    });

    it('accepts partial PATCH bodies (used to require every field)', async () => {
      const { body } = await http().post('/api/v1/projects').set(admin.auth).send(base).expect(201);
      const res = await http().patch(`/api/v1/projects/${body._id}`).set(admin.auth).send({ featured: true }).expect(200);
      expect(res.body).toMatchObject({ featured: true, title: 'Portfolio 3D' });
    });

    it('lets the admin clear media and links (null / empty string)', async () => {
      const { body } = await http()
        .post('/api/v1/projects')
        .set(admin.auth)
        .send({ ...base, coverImage: '/uploads/a.png', demoVideo: '/uploads/v.mp4', liveUrl: 'https://x.dev' })
        .expect(201);
      const res = await http()
        .patch(`/api/v1/projects/${body._id}`)
        .set(admin.auth)
        .send({ coverImage: null, demoVideo: null, liveUrl: '', repoUrl: '' })
        .expect(200);
      expect(res.body.coverImage).toBeNull();
      expect(res.body.demoVideo).toBeNull();
      expect(res.body.liveUrl).toBeNull();
    });

    it('renders markdown content to sanitized HTML when asked', async () => {
      const { body } = await http()
        .post('/api/v1/projects')
        .set(admin.auth)
        .send({ ...base, contentFormat: 'markdown', longDescription: '## Hi\n\n<script>alert(1)</script>**bold**' })
        .expect(201);
      const detail = await http().get('/api/v1/projects/slug/portfolio-3d').expect(200);
      expect(detail.body.contentHtml).toContain('<h2>Hi</h2>');
      expect(detail.body.contentHtml).not.toContain('<script');

      const back = await http().patch(`/api/v1/projects/${body._id}`).set(admin.auth).send({ contentFormat: 'text' }).expect(200);
      expect(back.body.contentHtml).toBe('');
    });

    it('answers 409 on duplicate slug and 400 on invalid ids / payloads', async () => {
      await http().post('/api/v1/projects').set(admin.auth).send(base).expect(201);
      const dup = await http().post('/api/v1/projects').set(admin.auth).send(base).expect(409);
      expect(dup.body.message).toMatch(/slug/);
      await http().get('/api/v1/projects/not-an-id').expect(400);
      await http().patch('/api/v1/projects/not-an-id').set(admin.auth).send({ title: 'x' }).expect(400);
      await http().get(`/api/v1/projects/${new Types.ObjectId()}`).expect(404);
      await http().post('/api/v1/projects').set(admin.auth).send({ ...base, slug: 'Bad slug!' }).expect(400);
      await http().post('/api/v1/projects').set(admin.auth).send({ ...base, slug: 'x2', status: 'live' }).expect(400);
      await http().post('/api/v1/projects').set(admin.auth).send({ ...base, slug: 'x3', hacker: true }).expect(400);
      await http()
        .post('/api/v1/projects')
        .set(admin.auth)
        .send({ ...base, slug: 'x4', gallery: Array.from({ length: 31 }, () => '/uploads/a.png') })
        .expect(400);
    });

    it('filters by status / featured / source and ignores unknown values', async () => {
      await http().post('/api/v1/projects').set(admin.auth).send({ ...base, slug: 'a', featured: true }).expect(201);
      await http().post('/api/v1/projects').set(admin.auth).send({ ...base, slug: 'b', status: 'draft' }).expect(201);
      expect((await http().get('/api/v1/projects?status=draft')).body.map((p: any) => p.slug)).toEqual(['b']);
      expect((await http().get('/api/v1/projects?featured=true')).body.map((p: any) => p.slug)).toEqual(['a']);
      expect((await http().get('/api/v1/projects?status=whatever')).body).toHaveLength(2);
      expect((await http().get('/api/v1/projects?source=github')).body).toHaveLength(0);
      expect((await http().get('/api/v1/projects?source=manual')).body).toHaveLength(2);
    });
  });

  describe('skills / experiences / education', () => {
    it('supports partial skill updates and validates levels', async () => {
      const { body } = await http()
        .post('/api/v1/skills')
        .set(admin.auth)
        .send({ name: 'React', category: 'frontend', level: 90 })
        .expect(201);
      await http().patch(`/api/v1/skills/${body._id}`).set(admin.auth).send({ visible: false }).expect(200);
      await http().patch(`/api/v1/skills/${body._id}`).set(admin.auth).send({ level: 101 }).expect(400);
      expect((await http().get('/api/v1/skills?visible=false')).body).toHaveLength(1);
      expect((await http().get('/api/v1/skills?category=nope')).body).toHaveLength(1);
    });

    it('creates an education without end date (the admin sends "")', async () => {
      const res = await http()
        .post('/api/v1/education')
        .set(admin.auth)
        .send({ school: 'Uni', degree: 'Master', field: '', location: '', startDate: '2023-09-01', endDate: '', description: '' })
        .expect(201);
      expect(res.body.endDate ?? null).toBeNull();
    });

    it('clears the end date when an experience becomes current', async () => {
      const { body } = await http()
        .post('/api/v1/experiences')
        .set(admin.auth)
        .send({ title: 'Dev', company: 'ACME', startDate: '2022-01-01', endDate: '2023-01-01' })
        .expect(201);
      const res = await http().patch(`/api/v1/experiences/${body._id}`).set(admin.auth).send({ current: true }).expect(200);
      expect(res.body).toMatchObject({ current: true });
      expect(res.body.endDate ?? null).toBeNull();
      await http().patch(`/api/v1/experiences/${body._id}`).set(admin.auth).send({ startDate: 'yesterday' }).expect(400);
    });
  });

  describe('tags', () => {
    it('removes a deleted tag from the projects using it', async () => {
      const tag = await http().post('/api/v1/tags').set(admin.auth).send({ name: 'WebGL', slug: 'webgl' }).expect(201);
      const project = await http()
        .post('/api/v1/projects')
        .set(admin.auth)
        .send({ title: 'P', slug: 'p', tags: [tag.body._id] })
        .expect(201);
      await http().delete(`/api/v1/tags/${tag.body._id}`).set(admin.auth).expect(200);
      const after = await http().get(`/api/v1/projects/${project.body._id}`).expect(200);
      expect(after.body.tags).toEqual([]);
    });

    it('rejects duplicate tags', async () => {
      await http().post('/api/v1/tags').set(admin.auth).send({ name: 'A', slug: 'a' }).expect(201);
      await http().post('/api/v1/tags').set(admin.auth).send({ name: 'A', slug: 'a2' }).expect(409);
    });
  });

  describe('contacts', () => {
    const msg = { name: 'Visitor', email: 'v@x.dev', subject: 'Hello', message: 'I would like to talk about a project.' };

    it('accepts public messages and keeps them private', async () => {
      await http().post('/api/v1/contacts').send(msg).expect(201);
      await http().get('/api/v1/contacts').expect(401);
      const list = await http().get('/api/v1/contacts').set(admin.auth).expect(200);
      expect(list.body).toHaveLength(1);
      expect((await http().get('/api/v1/contacts/unread-count').set(admin.auth)).body).toEqual({ count: 1 });
      await http().patch(`/api/v1/contacts/${list.body[0]._id}`).set(admin.auth).send({ read: true }).expect(200);
      expect((await http().get('/api/v1/contacts/unread-count').set(admin.auth)).body).toEqual({ count: 0 });
      expect((await http().get('/api/v1/contacts?read=true').set(admin.auth)).body).toHaveLength(1);
    });

    it('validates input (length limits)', async () => {
      await http().post('/api/v1/contacts').send({ ...msg, message: 'short' }).expect(400);
      await http().post('/api/v1/contacts').send({ ...msg, message: 'x'.repeat(5001) }).expect(400);
      await http().post('/api/v1/contacts').send({ ...msg, email: 'nope' }).expect(400);
    });

    it('rate-limits the public form to 5 messages per minute', async () => {
      for (let i = 0; i < 5; i++) await http().post('/api/v1/contacts').send(msg).expect(201);
      const res = await http().post('/api/v1/contacts').send(msg).expect(429);
      expect(res.body.message).toMatch(/Too Many|Trop/i);
    });
  });

  describe('users', () => {
    it('creates a user with the isActive flag sent by the admin form', async () => {
      const res = await http()
        .post('/api/v1/users')
        .set(admin.auth)
        .send({ email: 'New@Test.dev', name: 'New', password: 'secret12', role: 'editor', isActive: true })
        .expect(201);
      expect(res.body).toMatchObject({ email: 'new@test.dev', isActive: true });
      expect(res.body.password).toBeUndefined();
      await http().post('/api/v1/users').set(admin.auth).send({ email: 'new@test.dev', name: 'Dup', password: 'secret12' }).expect(409);
    });

    it('never returns password hashes', async () => {
      const res = await http().get('/api/v1/users').set(admin.auth).expect(200);
      expect(res.body[0].password).toBeUndefined();
    });

    it('is reserved to admins', async () => {
      const editor = await seedUser(app, models, { role: 'editor' });
      await http().get('/api/v1/users').set(editor.auth).expect(403);
    });

    it('prevents admins from locking themselves out', async () => {
      const id = admin.user._id.toString();
      await http().delete(`/api/v1/users/${id}`).set(admin.auth).expect(400);
      await http().patch(`/api/v1/users/${id}`).set(admin.auth).send({ role: 'editor' }).expect(400);
      await http().patch(`/api/v1/users/${id}`).set(admin.auth).send({ isActive: false }).expect(400);
      await http().patch(`/api/v1/users/${id}`).set(admin.auth).send({ name: 'Renamed' }).expect(200);
    });

    it('lets an admin manage other admins', async () => {
      const other = await seedUser(app, models, { role: 'admin' });
      await http().patch(`/api/v1/users/${other.user._id}`).set(admin.auth).send({ role: 'editor' }).expect(200);
      await http().get('/api/v1/users').set(other.auth).expect(403); // role change effective immediately
      await http().delete(`/api/v1/users/${other.user._id}`).set(admin.auth).expect(200);
      await http().delete(`/api/v1/users/${new Types.ObjectId()}`).set(admin.auth).expect(404);
    });
  });

  describe('about', () => {
    it('creates the defaults on first read and merges partial updates', async () => {
      const first = await http().get('/api/v1/about').expect(200);
      expect(first.body).toMatchObject({ firstName: 'Kevine', title: 'Qui suis-je ?' });
      await http().put('/api/v1/about').send({ tagline: 'x' }).expect(401);
      const updated = await http().put('/api/v1/about').set(admin.auth).send({ tagline: 'New tagline' }).expect(200);
      expect(updated.body).toMatchObject({ tagline: 'New tagline', firstName: 'Kevine' });
      expect(models.about.docs).toHaveLength(1);
    });

    it('survives concurrent first reads (single document)', async () => {
      await Promise.all([http().get('/api/v1/about'), http().get('/api/v1/about'), http().get('/api/v1/about')]);
      expect(models.about.docs).toHaveLength(1);
    });
  });

  describe('uploads', () => {
    const png = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
      'base64',
    );

    it('stores images and deletes them', async () => {
      await http().post('/api/v1/uploads/image').attach('file', png, 'a.png').expect(401);
      const res = await http()
        .post('/api/v1/uploads/image')
        .set(admin.auth)
        .attach('file', png, { filename: 'a.PNG', contentType: 'image/png' })
        .expect(201);
      expect(res.body.url).toMatch(/^\/uploads\/\d+-[a-f0-9]{16}\.png$/);
      await http().delete(`/api/v1/uploads/${res.body.filename}`).set(admin.auth).expect(200);
      await http().delete(`/api/v1/uploads/${res.body.filename}`).set(admin.auth).expect(404);
    });

    it('rejects unsupported types and hidden files', async () => {
      await http()
        .post('/api/v1/uploads/image')
        .set(admin.auth)
        .attach('file', Buffer.from('hi'), { filename: 'a.txt', contentType: 'text/plain' })
        .expect(400);
      await http()
        .post('/api/v1/uploads/image')
        .set(admin.auth)
        .attach('file', png, { filename: 'a.exe', contentType: 'image/png' })
        .expect(400);
      await http().delete('/api/v1/uploads/.gitkeep').set(admin.auth).expect(400);
    });
  });
});
