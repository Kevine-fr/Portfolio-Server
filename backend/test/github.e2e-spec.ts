import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp, seedUser, TestModels } from './utils/test-app';
import { FakeFetch, installFakeFetch } from './utils/fake-fetch';
import { mockGithubAccount } from './utils/mock-github';
import { makeRepo } from './fixtures/github';

describe('GitHub integration (e2e)', () => {
  let app: INestApplication;
  let models: TestModels;
  let fake: FakeFetch;
  let admin: Awaited<ReturnType<typeof seedUser>>;
  let editor: Awaited<ReturnType<typeof seedUser>>;
  const http = () => request(app.getHttpServer());

  beforeEach(async () => {
    fake = installFakeFetch();
    ({ app, models } = await createTestApp());
    admin = await seedUser(app, models, { role: 'admin' });
    editor = await seedUser(app, models, { role: 'editor' });
    mockGithubAccount(
      fake,
      'kev',
      [
        {
          repo: makeRepo({ id: 1, name: 'portfolio-3d', topics: ['portfolio', 'threejs'], homepage: 'https://kev.dev' }),
          files: {
            'README.md': '# Portfolio 3D\n\n![hero](docs/hero.png)\n\nAn immersive portfolio built with Three.js.',
            '.portfolio.yml': 'featured: true\norder: 1\n',
          },
          languages: { JavaScript: 7000, CSS: 3000 },
        },
        { repo: makeRepo({ id: 2, name: 'side-project', topics: [] }), files: { 'README.md': '# Side\n\nNot tagged.' } },
      ],
      { files: { '.portfolio.yml': 'about:\n  tagline: Built from GitHub\nexperiences:\n  - title: Dev\n    company: ACME\n    startDate: 2024-01\n    current: true\n' } },
    );
  });
  afterEach(async () => {
    await app.close();
    fake.restore();
  });

  it('requires authentication on every GitHub endpoint', async () => {
    await http().get('/api/v1/github/settings').expect(401);
    await http().get('/api/v1/github/repos').expect(401);
    await http().post('/api/v1/github/sync').expect(401);
  });

  it('exposes settings, restricts their update to admins and validates them', async () => {
    const res = await http().get('/api/v1/github/settings').set(editor.auth).expect(200);
    expect(res.body).toMatchObject({ username: '', topic: 'portfolio', autoSync: true, tokenConfigured: false });

    await http().put('/api/v1/github/settings').set(editor.auth).send({ username: 'kev' }).expect(403);
    await http().put('/api/v1/github/settings').set(admin.auth).send({ username: 'not valid!' }).expect(400);
    await http().put('/api/v1/github/settings').set(admin.auth).send({ syncIntervalMinutes: 1 }).expect(400);
    await http().put('/api/v1/github/settings').set(admin.auth).send({ token: 'x' }).expect(400); // never stored in DB

    const saved = await http()
      .put('/api/v1/github/settings')
      .set(admin.auth)
      .send({ username: 'kev', topic: 'Portfolio', selectedRepos: ['Side-Project', 'side-project'] })
      .expect(200);
    expect(saved.body).toMatchObject({ username: 'kev', topic: 'portfolio', selectedRepos: ['side-project'], effectiveUsername: 'kev' });
  });

  it('asks for a username before listing or syncing', async () => {
    const res = await http().post('/api/v1/github/sync').set(admin.auth).expect(400);
    expect(res.body.message).toMatch(/identifiant GitHub/);
    await http().get('/api/v1/github/repos').set(admin.auth).expect(400);
  });

  it('syncs repositories into the public portfolio', async () => {
    await http().put('/api/v1/github/settings').set(admin.auth).send({ username: 'kev' }).expect(200);

    const repos = await http().get('/api/v1/github/repos').set(editor.auth).expect(200);
    expect(repos.body.repos.map((r: any) => [r.name, r.inclusion])).toEqual([
      ['portfolio-3d', 'topic'],
      ['side-project', null],
    ]);

    const report = await http().post('/api/v1/github/sync').set(editor.auth).expect(200);
    expect(report.body).toMatchObject({ ok: true, about: true, projects: { created: ['Portfolio 3D'] } });

    const list = await http().get('/api/v1/projects?summary=true').expect(200);
    expect(list.body).toHaveLength(1);
    expect(list.body[0]).toMatchObject({
      slug: 'portfolio-3d',
      featured: true,
      order: 1,
      liveUrl: 'https://kev.dev',
      techStack: ['JavaScript', 'CSS', 'Three.js'],
      source: 'github',
      github: expect.objectContaining({ fullName: 'kev/portfolio-3d', stars: 3 }),
    });
    const detail = await http().get('/api/v1/projects/slug/portfolio-3d').expect(200);
    expect(detail.body.contentHtml).toContain('immersive portfolio');
    expect(detail.body.contentHtml).toContain('https://raw.githubusercontent.com/kev/portfolio-3d/main/docs/hero.png');

    expect((await http().get('/api/v1/about').expect(200)).body.tagline).toBe('Built from GitHub');
    expect((await http().get('/api/v1/experiences').expect(200)).body[0]).toMatchObject({ company: 'ACME', source: 'github' });
    expect((await http().get('/api/v1/skills').expect(200)).body.map((s: any) => s.name).sort()).toEqual([
      'CSS',
      'JavaScript',
      'Three.js',
    ]);

    // Select the untagged repository from the admin, then sync again
    await http().put('/api/v1/github/repos/side-project/selection').set(editor.auth).send({ included: true }).expect(200);
    const second = await http().post('/api/v1/github/sync').set(admin.auth).expect(200);
    expect(second.body.projects.created).toEqual(['Side']);

    // Exclude the tagged one → removed from the portfolio
    await http().put('/api/v1/github/repos/portfolio-3d/selection').set(admin.auth).send({ included: false }).expect(200);
    const third = await http().post('/api/v1/github/sync').set(admin.auth).expect(200);
    expect(third.body.projects.removed).toEqual(['Portfolio 3D']);

    const status = await http().get('/api/v1/github/status').set(admin.auth).expect(200);
    expect(status.body).toMatchObject({ running: false, username: 'kev', lastSyncReport: { ok: true } });
  });

  it('lets the admin detach a synced project', async () => {
    await http().put('/api/v1/github/settings').set(admin.auth).send({ username: 'kev' }).expect(200);
    await http().post('/api/v1/github/sync').set(admin.auth).expect(200);
    const [p] = (await http().get('/api/v1/projects').expect(200)).body;

    await http().put(`/api/v1/github/projects/${p._id}/auto-sync`).set(admin.auth).send({ autoSync: 'no' }).expect(400);
    const res = await http().put(`/api/v1/github/projects/${p._id}/auto-sync`).set(admin.auth).send({ autoSync: false }).expect(200);
    expect(res.body.github.autoSync).toBe(false);

    await http().patch(`/api/v1/projects/${p._id}`).set(admin.auth).send({ title: 'Edited by hand' }).expect(200);
    await http().post('/api/v1/github/sync').set(admin.auth).expect(200);
    expect((await http().get(`/api/v1/projects/${p._id}`).expect(200)).body.title).toBe('Edited by hand');
  });
});
