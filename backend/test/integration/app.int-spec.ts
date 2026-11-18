/**
 * Integration tests against a REAL MongoDB (unique indexes, casting,
 * select:false, atomic upserts…). Run in CI with a mongo:7 service:
 *   MONGO_URI_TEST=mongodb://localhost:27017/portfolio_test npm run test:int
 * Skipped when MONGO_URI_TEST is not set.
 */
import { INestApplication } from '@nestjs/common';
import { getConnectionToken, getModelToken } from '@nestjs/mongoose';
import { Test } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { Connection, Model } from 'mongoose';
import request from 'supertest';
import * as bcrypt from 'bcrypt';
import { FakeFetch, installFakeFetch } from '../utils/fake-fetch';
import { mockGithubAccount } from '../utils/mock-github';
import { makeRepo } from '../fixtures/github';

const MONGO_URI = process.env.MONGO_URI_TEST;
const describeIfMongo = MONGO_URI ? describe : describe.skip;

describeIfMongo('API with a real MongoDB (integration)', () => {
  let app: INestApplication;
  let connection: Connection;
  let auth: { Authorization: string };
  let fake: FakeFetch;
  const http = () => request(app.getHttpServer());

  beforeAll(async () => {
    process.env.MONGO_URI = MONGO_URI;
    // Imported lazily: AppModule reads MONGO_URI when it is evaluated
    const { AppModule } = await import('../../src/app.module');
    const { configureApp } = await import('../../src/app.setup');
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();

    connection = app.get<Connection>(getConnectionToken());
    await connection.dropDatabase();
    for (const name of connection.modelNames()) await connection.model(name).syncIndexes();

    const users = app.get<Model<any>>(getModelToken('User'));
    const admin = await users.create({
      email: 'admin@int.dev',
      password: await bcrypt.hash('Secret123!', 4),
      name: 'Admin',
      role: 'admin',
    });
    const token = await app.get(JwtService).signAsync({ sub: admin._id.toString(), role: 'admin' });
    auth = { Authorization: `Bearer ${token}` };
  });

  afterAll(async () => {
    await connection?.dropDatabase();
    await app?.close();
  });

  beforeEach(() => {
    fake = installFakeFetch();
  });
  afterEach(() => fake.restore());

  it('logs in against the stored bcrypt hash', async () => {
    const res = await http().post('/api/v1/auth/login').send({ email: 'admin@int.dev', password: 'Secret123!' }).expect(200);
    expect(res.body.user.email).toBe('admin@int.dev');
  });

  it('never exposes password hashes (select: false)', async () => {
    const res = await http().get('/api/v1/users').set(auth).expect(200);
    expect(res.body[0].password).toBeUndefined();
  });

  it('maps real Mongo errors to HTTP statuses', async () => {
    await http().post('/api/v1/projects').set(auth).send({ title: 'A', slug: 'dup' }).expect(201);
    await http().post('/api/v1/projects').set(auth).send({ title: 'B', slug: 'DUP' }).expect(409);
    await http().get('/api/v1/projects/not-an-object-id').expect(400);
    await http().post('/api/v1/users').set(auth).send({ email: 'ADMIN@int.dev', name: 'x', password: 'secret12' }).expect(409);
  });

  it('supports partial updates and clearing fields', async () => {
    const { body } = await http()
      .post('/api/v1/projects')
      .set(auth)
      .send({ title: 'C', slug: 'c', coverImage: '/uploads/c.png', liveUrl: 'https://c.dev' })
      .expect(201);
    const res = await http().patch(`/api/v1/projects/${body._id}`).set(auth).send({ coverImage: null, liveUrl: '' }).expect(200);
    expect(res.body.coverImage).toBeNull();
    expect(res.body.liveUrl).toBeNull();
    expect(res.body.title).toBe('C');
  });

  it('creates a single About document under concurrent first reads', async () => {
    await Promise.all(Array.from({ length: 5 }, () => http().get('/api/v1/about').expect(200)));
    expect(await connection.collection('abouts').countDocuments()).toBe(1);
  });

  it('runs a full GitHub sync idempotently', async () => {
    mockGithubAccount(fake, 'kev', [
      { repo: makeRepo({ id: 42, name: 'int-app' }), files: { 'README.md': '# Int App\n\nIntegration test project.' }, languages: { Go: 100 } },
    ]);
    await http().put('/api/v1/github/settings').set(auth).send({ username: 'kev' }).expect(200);

    const first = await http().post('/api/v1/github/sync').set(auth).expect(200);
    expect(first.body).toMatchObject({ ok: true, projects: { created: ['Int App'] } });
    const second = await http().post('/api/v1/github/sync').set(auth).expect(200);
    expect(second.body.projects).toMatchObject({ created: [], updated: ['Int App'] });

    const projects = await connection.collection('projects').find({ 'github.repoId': 42 }).toArray();
    expect(projects).toHaveLength(1);
    expect((await http().get('/api/v1/projects/slug/int-app').expect(200)).body.contentHtml).toContain('Integration test project');
    expect((await http().get('/api/v1/skills').expect(200)).body.map((s: any) => s.name)).toContain('Go');
  });

  it('exposes Prometheus metrics', async () => {
    const res = await http().get('/api/v1/metrics').expect(200);
    expect(res.text).toContain('http_request_duration_seconds');
  });
});
