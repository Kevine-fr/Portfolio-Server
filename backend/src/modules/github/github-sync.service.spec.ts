import { BadRequestException } from '@nestjs/common';
import { Types } from 'mongoose';
import { createModels, TestModels } from '../../../test/utils/test-app';
import { FakeFetch, installFakeFetch } from '../../../test/utils/fake-fetch';
import { mockGithubAccount, MockRepo } from '../../../test/utils/mock-github';
import { makeRepo } from '../../../test/fixtures/github';
import { AboutService } from '../about/about.service';
import { GithubClient } from './github.client';
import { GithubSettingsService } from './github-settings.service';
import { GithubSyncService } from './github-sync.service';

const README = '# Cool App\n\n![shot](docs/shot.png)\n\nA cool application used in tests.';

describe('GithubSyncService', () => {
  let fake: FakeFetch;
  let models: TestModels;
  let settings: GithubSettingsService;
  let service: GithubSyncService;

  const setup = async (repos: MockRepo[], profile?: { files: Record<string, string> }, overrides: Record<string, unknown> = {}) => {
    mockGithubAccount(fake, 'kev', repos, profile);
    await settings.update({ username: 'kev', ...overrides } as any);
  };
  const project = (title: string) => models.projects.docs.find((p) => p.title === title);

  beforeEach(() => {
    fake = installFakeFetch();
    models = createModels();
    settings = new GithubSettingsService(models.githubSettings as any);
    service = new GithubSyncService(
      new GithubClient(),
      settings,
      new AboutService(models.about as any),
      models.projects as any,
      models.skills as any,
      models.experiences as any,
      models.education as any,
    );
  });
  afterEach(() => fake.restore());

  it('requires a GitHub username', async () => {
    await expect(service.sync()).rejects.toBeInstanceOf(BadRequestException);
  });

  it('creates projects for tagged and selected repositories only', async () => {
    await setup(
      [
        { repo: makeRepo({ id: 1, name: 'cool-app' }), files: { 'README.md': README }, languages: { TypeScript: 100 } },
        { repo: makeRepo({ id: 2, name: 'picked', topics: [] }), files: { 'README.md': '# Picked\n\nSelected manually in the admin.' } },
        { repo: makeRepo({ id: 3, name: 'ignored', topics: [] }) },
        { repo: makeRepo({ id: 4, name: 'a-fork', fork: true }) },
      ],
      undefined,
      { selectedRepos: ['Picked'] },
    );

    const report = await service.sync();

    expect(report.ok).toBe(true);
    expect(report.reposScanned).toBe(4);
    expect(report.reposIncluded).toBe(2);
    expect(report.projects.created.sort()).toEqual(['Cool App', 'Picked']);
    expect(models.projects.docs).toHaveLength(2);
    expect(project('Cool App')).toMatchObject({
      slug: 'cool-app',
      source: 'github',
      contentFormat: 'markdown',
      coverImage: 'https://raw.githubusercontent.com/kev/cool-app/main/docs/shot.png',
      github: expect.objectContaining({ repoId: 1, fullName: 'kev/cool-app', autoSync: true }),
    });
    expect(project('Cool App')!.contentHtml).toContain('A cool application');
    const saved = await settings.get();
    expect(saved.lastSyncAt).toBeInstanceOf(Date);
    expect(saved.lastSyncReport).toMatchObject({ ok: true, trigger: 'manual' });
  });

  it('updates on the next sync without duplicating and keeps admin-owned fields', async () => {
    const repo = makeRepo({ id: 1, name: 'cool-app' });
    await setup([{ repo, files: { 'README.md': README } }]);
    await service.sync();
    const id = project('Cool App')!._id;
    await models.projects.updateOne(
      { _id: id },
      { $set: { subtitle: 'Mine', featured: true, order: 7, gallery: ['/uploads/1.png'], coverImage: '/uploads/cover.png' } },
    );

    repo.description = 'New description';
    const report = await service.sync();

    expect(report.projects.updated).toEqual(['Cool App']);
    expect(models.projects.docs).toHaveLength(1);
    expect(project('Cool App')).toMatchObject({
      description: 'New description',
      subtitle: 'Mine',
      featured: true,
      order: 7,
      gallery: ['/uploads/1.png'],
      coverImage: '/uploads/cover.png',
    });
  });

  it('applies .portfolio.yml and reports its warnings', async () => {
    await setup([
      {
        repo: makeRepo({ id: 1, name: 'cool-app' }),
        files: {
          'README.md': README,
          '.portfolio.yml': 'title: Super App\nfeatured: true\ncontent: docs/PORTFOLIO.md\ncover: img/c.png\nstatus: draft\nwhat: ever\n',
          'docs/PORTFOLIO.md': '# Portfolio page\n\nSee ![d](diagram.png)',
        },
      },
    ]);
    const report = await service.sync();
    const p = project('Super App')!;
    expect(p).toMatchObject({ featured: true, status: 'draft', coverImage: 'https://raw.githubusercontent.com/kev/cool-app/main/img/c.png' });
    expect(p.github.contentPath).toBe('docs/PORTFOLIO.md');
    expect(p.github.configPath).toBe('.portfolio.yml');
    expect(p.contentHtml).toContain('https://raw.githubusercontent.com/kev/cool-app/main/docs/diagram.png');
    expect(report.warnings.join('\n')).toMatch(/what/);
  });

  it('falls back to the README when the configured content file is missing', async () => {
    await setup([
      { repo: makeRepo({ id: 1, name: 'cool-app' }), files: { 'README.md': README, '.portfolio.yml': 'content: nope.md' } },
    ]);
    const report = await service.sync();
    expect(project('Cool App')!.github.contentPath).toBe('README.md');
    expect(report.warnings.join('\n')).toMatch(/nope\.md/);
  });

  it('links an existing manual project by its repoUrl instead of duplicating it', async () => {
    await models.projects.create({
      title: 'Old manual', slug: 'my-portfolio', repoUrl: 'https://github.com/Kev/cool-app.git', gallery: ['/uploads/g.png'],
    });
    await setup([{ repo: makeRepo({ id: 1, name: 'cool-app' }), files: { 'README.md': README } }]);

    await service.sync();
    expect(models.projects.docs).toHaveLength(1);
    const p = models.projects.docs[0];
    expect(p).toMatchObject({ slug: 'my-portfolio', source: 'github', title: 'Cool App', gallery: ['/uploads/g.png'] });
    expect(p.github.adopted).toBe(true);

    // De-selecting the repository gives the project back as a manual one
    await settings.setRepoIncluded('cool-app', false);
    const report = await service.sync();
    expect(report.projects.detached).toEqual(['Cool App']);
    expect(models.projects.docs[0].source).toBe('manual');
    expect(models.projects.docs[0].github).toBeUndefined();
  });

  it('removes projects whose repository is no longer included, but keeps detached ones', async () => {
    const a = makeRepo({ id: 1, name: 'app-a' });
    const b = makeRepo({ id: 2, name: 'app-b' });
    await setup([{ repo: a, files: { 'README.md': '# A' } }, { repo: b, files: { 'README.md': '# B' } }]);
    await service.sync();
    expect(models.projects.docs).toHaveLength(2);

    const bId = project('B')!._id.toString();
    await service.setProjectAutoSync(bId, false);
    a.topics = [];
    b.topics = [];
    b.description = 'changed upstream';

    const report = await service.sync();
    expect(report.projects.removed).toEqual(['A']);
    expect(models.projects.docs.map((p) => p.title)).toEqual(['B']);
    expect(project('B')!.description).toBe('A demo repository'); // not overwritten while detached
  });

  it('skips detached projects that are still included', async () => {
    await setup([{ repo: makeRepo({ id: 1, name: 'app-a' }), files: { 'README.md': '# A' } }]);
    await service.sync();
    await service.setProjectAutoSync(project('A')!._id.toString(), false);
    const report = await service.sync();
    expect(report.projects.skipped).toEqual([{ repo: 'app-a', reason: expect.stringMatching(/désactivée/) }]);
  });

  it('gives a unique slug when it collides with an unrelated project', async () => {
    await models.projects.create({ title: 'Manual', slug: 'cool-app' });
    await setup([{ repo: makeRepo({ id: 1, name: 'cool-app' }), files: { 'README.md': README } }]);
    await service.sync();
    expect(project('Cool App')!.slug).toBe('cool-app-2');
  });

  it('hides repositories flagged hidden: true', async () => {
    await setup([{ repo: makeRepo({ id: 1, name: 'secret' }), files: { '.portfolio.yml': 'hidden: true' } }]);
    const report = await service.sync();
    expect(models.projects.docs).toHaveLength(0);
    expect(report.projects.skipped[0]).toMatchObject({ repo: 'secret' });
  });

  it('keeps the project of a repository that failed to sync', async () => {
    const ok = makeRepo({ id: 1, name: 'ok' });
    const broken: MockRepo = { repo: makeRepo({ id: 2, name: 'broken' }), files: { 'README.md': '# Broken' } };
    await setup([{ repo: ok, files: { 'README.md': '# Ok' } }, broken]);
    await service.sync();

    broken.failOn = { endpoint: 'readme', status: 500, message: 'server error' };
    const report = await service.sync();
    expect(report.ok).toBe(false);
    expect(report.errors).toEqual([expect.stringMatching(/^broken : .*server error/)]);
    expect(models.projects.docs.map((p) => p.title).sort()).toEqual(['Broken', 'Ok']);
  });

  it('stops fetching once the GitHub quota is exhausted', async () => {
    const limited = { endpoint: 'languages' as const, status: 403, headers: { 'x-ratelimit-remaining': '0' }, message: 'API rate limit exceeded' };
    await setup(Array.from({ length: 6 }, (_, i) => ({ repo: makeRepo({ id: i + 1, name: `r${i}` }), failOn: limited })));
    const report = await service.sync();
    expect(report.errors).toHaveLength(1);
    expect(report.errors[0]).toMatch(/Limite d'appels/);
    const languageCalls = fake.calls.filter((c) => c.path.endsWith('/languages')).length;
    expect(languageCalls).toBeLessThan(6);
  });

  it('changes nothing when the repository list cannot be read', async () => {
    await setup([{ repo: makeRepo({ id: 1, name: 'cool-app' }), files: { 'README.md': README } }]);
    await service.sync();
    await settings.update({ username: 'ghost' });
    const report = await service.sync();
    expect(report.ok).toBe(false);
    expect(report.errors[0]).toMatch(/ghost/);
    expect(models.projects.docs).toHaveLength(1);
  });

  it('syncs about, experiences and education from the profile repository', async () => {
    await models.experiences.create({ title: 'Manual job', company: 'Me', startDate: new Date('2019-01-01') });
    const profileFile = (extraExp = '') => `about:
  firstName: Kevine
  tagline: Hello
  cv: docs/cv.pdf
experiences:
  - title: Dev
    company: ACME
    startDate: 2023-01
    endDate: present
${extraExp}education:
  - school: Uni
    degree: Master
    startDate: 2021
    endDate: 2023-06
skills:
  - name: Figma
    level: 80
`;
    const profile = { files: { '.portfolio.yml': profileFile('  - title: Old\n    company: Before\n    startDate: 2020\n    endDate: 2021\n') } };
    await setup([], profile, {});

    let report = await service.sync();
    expect(report.about).toBe(true);
    expect(report.experiences).toEqual({ created: 2, updated: 0, removed: 0 });
    expect(report.education.created).toBe(1);
    const about = await new AboutService(models.about as any).get();
    expect(about).toMatchObject({ firstName: 'Kevine', tagline: 'Hello', cvUrl: 'https://raw.githubusercontent.com/kev/kev/HEAD/docs/cv.pdf' });
    expect(about.lastName).toBe('DIANTOUADI'); // untouched default
    expect(models.skills.docs.find((s) => s.name === 'Figma')).toMatchObject({ level: 80, category: 'design', source: 'github' });

    // Remove "Old" from the file: it disappears, the manual experience stays
    profile.files['.portfolio.yml'] = profileFile();
    report = await service.sync();
    expect(report.experiences).toEqual({ created: 0, updated: 0, removed: 1 });
    expect(models.experiences.docs.map((e) => e.title).sort()).toEqual(['Dev', 'Manual job']);
    expect(models.experiences.docs.find((e) => e.title === 'Dev')).toMatchObject({ current: true, source: 'github' });
  });

  it('reports invalid profile files without aborting the project sync', async () => {
    await setup([{ repo: makeRepo({ id: 1, name: 'cool-app' }), files: { 'README.md': README } }], {
      files: { '.portfolio.yml': 'about: [oops' },
    });
    const report = await service.sync();
    expect(report.projects.created).toEqual(['Cool App']);
    expect(report.errors.join()).toMatch(/Profil kev\/kev/);
  });

  it('derives skills from languages and topics, never shadowing manual skills', async () => {
    await models.skills.create({ name: 'React', category: 'frontend', level: 99 });
    const repo = makeRepo({ id: 1, name: 'cool-app', topics: ['portfolio', 'react', 'docker'] });
    const mock: MockRepo = { repo, files: { 'README.md': README }, languages: { TypeScript: 900, Python: 100 } };
    await setup([mock]);

    await service.sync();
    const names = () => models.skills.docs.map((s) => `${s.name}:${s.source}`).sort();
    expect(names()).toEqual(['Docker:github', 'Python:github', 'React:manual', 'TypeScript:github']);

    // Admin hides a synced skill: kept hidden after the next sync
    const python = models.skills.docs.find((s) => s.name === 'Python')!;
    await models.skills.updateOne({ _id: python._id }, { $set: { visible: false } });
    mock.languages = { TypeScript: 1000 };
    repo.topics = ['portfolio', 'react'];
    const report = await service.sync();
    expect(names()).toEqual(['React:manual', 'TypeScript:github']);
    expect(report.skills.removed).toBe(2);
  });

  it('can disable derived skills while keeping profile skills', async () => {
    await setup([{ repo: makeRepo({ id: 1, name: 'cool-app' }), languages: { Go: 10 } }], { files: { 'portfolio.json': '{"skills":[{"name":"Figma"}]}' } }, { syncSkills: false });
    await service.sync();
    expect(models.skills.docs.map((s) => s.name)).toEqual(['Figma']);
  });

  it('shares one run between concurrent sync requests', async () => {
    await setup([{ repo: makeRepo({ id: 1, name: 'cool-app' }), files: { 'README.md': README } }]);
    const [a, b] = await Promise.all([service.sync(), service.sync()]);
    expect(a).toBe(b);
    expect(service.isRunning()).toBe(false);
    expect(fake.calls.filter((c) => c.path.startsWith('/users/kev/repos')).length).toBe(1);
  });

  it('runs scheduled syncs only when enabled and due', async () => {
    await setup([]);
    const spy = jest.spyOn(service, 'sync');
    await service.tick();
    expect(spy).toHaveBeenCalledTimes(1); // never synced → due

    await service.tick(Date.now() + 10 * 60_000);
    expect(spy).toHaveBeenCalledTimes(1); // interval (60 min) not elapsed

    await service.tick(Date.now() + 61 * 60_000);
    expect(spy).toHaveBeenCalledTimes(2);

    await settings.update({ autoSync: false });
    await service.tick(Date.now() + 10 * 60 * 60_000);
    expect(spy).toHaveBeenCalledTimes(2);
  });

  it('lists repositories with their inclusion state and linked project', async () => {
    await setup(
      [
        { repo: makeRepo({ id: 1, name: 'cool-app' }), files: { 'README.md': README } },
        { repo: makeRepo({ id: 2, name: 'other', topics: [] }) },
        { repo: makeRepo({ id: 3, name: 'kev', topics: [] }) },
      ],
    );
    await service.sync();
    const res = await service.listRepos();
    expect(res.username).toBe('kev');
    expect(res.tokenConfigured).toBe(false);
    const byName = Object.fromEntries(res.repos.map((r) => [r.name, r]));
    expect(byName['cool-app']).toMatchObject({ inclusion: 'topic', project: { slug: 'cool-app', autoSync: true } });
    expect(byName.other).toMatchObject({ inclusion: null, project: null });
    expect(byName.kev.isProfileRepo).toBe(true);
  });

  it('rejects auto-sync changes on non GitHub projects', async () => {
    await expect(service.setProjectAutoSync(new Types.ObjectId().toString(), true)).rejects.toThrow(/introuvable/);
  });

  it('exposes a status with the quota', async () => {
    await setup([]);
    expect(await service.status()).toMatchObject({ running: false, username: 'kev', tokenConfigured: false, rateLimit: { remaining: 4900 } });
  });
});
