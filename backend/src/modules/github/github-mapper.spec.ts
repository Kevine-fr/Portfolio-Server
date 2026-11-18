import { makeRepo } from '../../../test/fixtures/github';
import {
  buildProjectData, deriveSkills, deriveTechStack, educationKey, experienceKey, githubCardUrl, humanizeRepoName,
  languagesBreakdown, normalizeRepoUrl, RepoDetails, repoInclusion, slugify,
} from './github-mapper';

const details = (over: Partial<RepoDetails> = {}): RepoDetails => ({
  repo: makeRepo({ id: 1, name: 'cool-app', topics: ['portfolio', 'react', 'docker'] }),
  config: {},
  content: { path: 'README.md', text: '# Cool App\n\n![shot](docs/shot.png)\n\nA cool application for testing purposes.' },
  languages: { TypeScript: 9000, CSS: 800, Shell: 200 },
  warnings: [],
  ...over,
});

describe('naming helpers', () => {
  it('slugifies and humanizes repository names', () => {
    expect(slugify('Portfolio-Server')).toBe('portfolio-server');
    expect(slugify('PortfolioWeb')).toBe('portfolio-web');
    expect(slugify('Été 2024 !!')).toBe('ete-2024');
    expect(humanizeRepoName('my-cool_app')).toBe('My Cool App');
    expect(humanizeRepoName('PortfolioWeb')).toBe('Portfolio Web');
    expect(humanizeRepoName('api-REST')).toBe('Api REST');
  });

  it('normalizes repository URLs for comparison', () => {
    expect(normalizeRepoUrl('https://GitHub.com/Kev/App.git/')).toBe('https://github.com/kev/app');
    expect(normalizeRepoUrl(undefined)).toBe('');
  });
});

describe('repoInclusion', () => {
  const settings = { topic: 'portfolio', selectedRepos: ['picked'], excludedRepos: ['nope'], includeForks: false };

  it('includes selected repos, even without the topic or when forked', () => {
    expect(repoInclusion(makeRepo({ name: 'Picked', topics: [], fork: true }), settings)).toBe('selected');
  });

  it('includes repos tagged with the topic (case-insensitive)', () => {
    expect(repoInclusion(makeRepo({ topics: ['Portfolio'] }), settings)).toBe('topic');
    expect(repoInclusion(makeRepo({ topics: ['other'] }), settings)).toBeNull();
  });

  it('exclusion wins over topic and selection', () => {
    expect(repoInclusion(makeRepo({ name: 'nope' }), { ...settings, selectedRepos: ['nope'] })).toBeNull();
  });

  it('skips forks (unless allowed), the profile repo and private repos', () => {
    expect(repoInclusion(makeRepo({ fork: true }), settings)).toBeNull();
    expect(repoInclusion(makeRepo({ fork: true }), { ...settings, includeForks: true })).toBe('topic');
    expect(repoInclusion(makeRepo({ name: 'kev' }), settings, 'kev')).toBeNull();
    expect(repoInclusion(makeRepo({ private: true }), settings)).toBeNull();
  });

  it('topic mode can be disabled', () => {
    expect(repoInclusion(makeRepo(), { ...settings, topic: '' })).toBeNull();
  });
});

describe('languages / tech stack', () => {
  it('computes percentages sorted by size', () => {
    expect(languagesBreakdown({ CSS: 1, TypeScript: 3, Empty: 0 })).toEqual([
      { name: 'TypeScript', bytes: 3, percent: 75 },
      { name: 'CSS', bytes: 1, percent: 25 },
    ]);
  });

  it('keeps main languages and recognized topics', () => {
    expect(deriveTechStack(details())).toEqual(['TypeScript', 'CSS', 'React', 'Docker']);
  });
});

describe('buildProjectData', () => {
  const now = new Date('2025-06-01T00:00:00Z');

  it('builds a new project from the README', () => {
    const data: any = buildProjectData(details(), null, now);
    expect(data).toMatchObject({
      title: 'Cool App',
      slug: 'cool-app',
      description: 'A demo repository',
      techStack: ['TypeScript', 'CSS', 'React', 'Docker'],
      repoUrl: 'https://github.com/kev/cool-app',
      status: 'published',
      year: 2024,
      source: 'github',
      contentFormat: 'markdown',
      coverImage: 'https://raw.githubusercontent.com/kev/cool-app/main/docs/shot.png',
    });
    expect(data.contentHtml).not.toContain('<h1>'); // title is displayed by the page
    expect(data.contentHtml).toContain('A cool application');
    expect(data.github).toMatchObject({
      repoId: 1,
      fullName: 'kev/cool-app',
      autoSync: true,
      adopted: false,
      contentPath: 'README.md',
      autoCover: 'https://raw.githubusercontent.com/kev/cool-app/main/docs/shot.png',
      syncedAt: now,
    });
    expect(data.github.languages[0]).toEqual({ name: 'TypeScript', bytes: 9000, percent: 90 });
    // admin-owned fields are not touched
    for (const key of ['subtitle', 'gallery', 'demoVideo', 'featured', 'order', 'liveUrl']) expect(data).not.toHaveProperty(key);
  });

  it('falls back to README summary, humanized name and the GitHub card', () => {
    const data: any = buildProjectData(
      details({ repo: makeRepo({ id: 2, name: 'no-desc', description: null }), content: { path: 'README.md', text: 'Just a long enough paragraph of text.' } }),
      null,
    );
    expect(data.title).toBe('No Desc');
    expect(data.description).toBe('Just a long enough paragraph of text.');
    expect(data.coverImage).toBe(githubCardUrl('kev/no-desc'));
  });

  it('applies .portfolio.yml values over GitHub data', () => {
    const data: any = buildProjectData(
      details({
        config: {
          title: 'Custom', slug: 'custom-slug', subtitle: 'Sub', description: 'Desc', cover: 'img/cover.png',
          gallery: ['img/1.png', 'https://x.dev/2.png'], video: 'https://x.dev/demo.mp4', techStack: ['Vue', 'vue'],
          liveUrl: 'https://live.dev', featured: true, order: 2, status: 'draft', year: 2020,
        },
      }),
      null,
    );
    expect(data).toMatchObject({
      title: 'Custom', slug: 'custom-slug', subtitle: 'Sub', description: 'Desc',
      coverImage: 'https://raw.githubusercontent.com/kev/cool-app/main/img/cover.png',
      gallery: ['https://raw.githubusercontent.com/kev/cool-app/main/img/1.png', 'https://x.dev/2.png'],
      demoVideo: 'https://x.dev/demo.mp4', techStack: ['Vue'], liveUrl: 'https://live.dev',
      featured: true, order: 2, status: 'draft', year: 2020,
    });
    expect(data.github.autoCover).toBe('');
  });

  it('uses the repository homepage as live URL and marks archived repos', () => {
    const data: any = buildProjectData(details({ repo: makeRepo({ homepage: 'https://app.dev', archived: true }) }), null);
    expect(data.liveUrl).toBe('https://app.dev');
    expect(data.status).toBe('archived');
    expect(buildProjectData(details({ repo: makeRepo({ homepage: 'not a url' }) }), null)).not.toHaveProperty('liveUrl');
  });

  it('keeps a cover uploaded in the admin but refreshes an automatic one', () => {
    const uploaded: any = buildProjectData(details(), {
      slug: 'cool-app', source: 'github', coverImage: '/uploads/mine.png', github: { autoCover: 'https://old' },
    });
    expect(uploaded).not.toHaveProperty('coverImage');
    expect(uploaded.github.autoCover).toBe('https://old');

    const auto: any = buildProjectData(details(), {
      slug: 'cool-app', source: 'github', coverImage: 'https://old', github: { autoCover: 'https://old' },
    });
    expect(auto.coverImage).toBe('https://raw.githubusercontent.com/kev/cool-app/main/docs/shot.png');
  });

  it('keeps the slug of an existing project unless the config changes it', () => {
    expect(buildProjectData(details(), { slug: 'old-slug', source: 'github' })).not.toHaveProperty('slug');
    expect(buildProjectData(details({ config: { slug: 'New-Slug' } }), { slug: 'old-slug' })).toMatchObject({ slug: 'new-slug' });
  });

  it('marks manual projects linked by URL as adopted and keeps autoSync', () => {
    const data: any = buildProjectData(details(), { slug: 'x', source: 'manual' });
    expect(data.github.adopted).toBe(true);
    expect((buildProjectData(details(), { slug: 'x', source: 'github', github: { autoSync: false } }) as any).github.autoSync).toBe(false);
  });

  it('does not touch the content when the repository has no README', () => {
    const data: any = buildProjectData(details({ content: null }), null);
    expect(data).not.toHaveProperty('longDescription');
    expect(data).not.toHaveProperty('contentHtml');
  });
});

describe('deriveSkills', () => {
  const repos = [
    { repo: makeRepo({ topics: ['react', 'docker'] }), languages: { TypeScript: 8000, CSS: 1000, Makefile: 500 }, config: {} },
    { repo: makeRepo({ topics: ['react'] }), languages: { Python: 2000, TypeScript: 1000 }, config: { techStack: ['MongoDB', 'Custom'] } },
  ];

  it('weights languages by bytes and topics by number of repositories', () => {
    const skills = deriveSkills(repos, { minLanguagePercent: 2 });
    const byName = Object.fromEntries(skills.map((s) => [s.name, s]));
    expect(byName.TypeScript).toMatchObject({ level: 95, category: 'frontend', sourceKey: 'skill:typescript' });
    expect(byName.Python.level).toBeLessThan(95);
    expect(byName.React).toMatchObject({ level: 90, category: 'frontend' });
    expect(byName.Docker.level).toBe(70);
    expect(byName.MongoDB).toBeDefined();
    expect(byName.Makefile).toBeUndefined(); // ignored language
    expect(byName.Custom).toBeUndefined(); // unknown tech from techStack
  });

  it('respects the minimum language share', () => {
    const names = deriveSkills(repos, { minLanguagePercent: 15 }).map((s) => s.name);
    expect(names).toContain('TypeScript');
    expect(names).not.toContain('CSS');
  });

  it('lets explicit profile skills override derived ones', () => {
    const skills = deriveSkills(repos, {}, [{ name: 'typescript', level: 60, category: 'backend', order: 1 }, { name: 'Figma' }]);
    expect(skills.find((s) => s.sourceKey === 'skill:typescript')).toMatchObject({ name: 'typescript', level: 60, category: 'backend', order: 1 });
    expect(skills.find((s) => s.name === 'Figma')).toMatchObject({ level: 70, category: 'design' });
  });

  it('can return only explicit skills', () => {
    expect(deriveSkills(repos, { includeDerived: false }, [{ name: 'Go' }]).map((s) => s.name)).toEqual(['Go']);
  });
});

describe('stable keys', () => {
  it('builds keys from identifying fields', () => {
    const start = new Date('2023-04-15T00:00:00Z');
    expect(experienceKey({ company: 'ACME Inc.', title: 'Dév Front', startDate: start })).toBe('exp:acme-inc:dev-front:2023-04');
    expect(educationKey({ school: 'Université', degree: 'Master', startDate: start })).toBe('edu:universite:master:2023-04');
  });
});
