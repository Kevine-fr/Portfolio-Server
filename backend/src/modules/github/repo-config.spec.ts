import {
  findConfigFile, normalizeProfileConfig, normalizeProjectConfig, parseConfigText, parseFlexibleDate,
} from './repo-config';

const collect = () => {
  const warnings: string[] = [];
  return { warnings, warn: (m: string) => warnings.push(m) };
};

describe('findConfigFile', () => {
  it('prefers .portfolio.yml and matches case-insensitively', () => {
    expect(findConfigFile(['README.md', 'portfolio.json', '.portfolio.yml'])).toBe('.portfolio.yml');
    expect(findConfigFile(['Portfolio.YAML'])).toBe('Portfolio.YAML');
    expect(findConfigFile(['README.md'])).toBeUndefined();
  });
});

describe('parseConfigText', () => {
  it('parses YAML and JSON', () => {
    expect(parseConfigText('title: Hello\nfeatured: true', '.portfolio.yml')).toEqual({ title: 'Hello', featured: true });
    expect(parseConfigText('{"title":"Hi"}', 'portfolio.json')).toEqual({ title: 'Hi' });
    expect(parseConfigText('', '.portfolio.yml')).toEqual({});
  });

  it('reports syntax errors and wrong root types', () => {
    expect(() => parseConfigText('title: [oops', '.portfolio.yml')).toThrow(/syntaxe invalide/);
    expect(() => parseConfigText('- a\n- b', '.portfolio.yml')).toThrow(/objet est attendu/);
    expect(() => parseConfigText('{bad json', 'portfolio.json')).toThrow(/syntaxe invalide/);
  });

  it('does not execute custom YAML tags', () => {
    expect(() => parseConfigText('x: !!js/function "function(){}"', '.portfolio.yml')).toThrow();
  });

  it('rejects oversized files', () => {
    expect(() => parseConfigText('a: ' + 'x'.repeat(300_000), '.portfolio.yml')).toThrow(/volumineux/);
  });
});

describe('normalizeProjectConfig', () => {
  it('maps known keys and aliases', () => {
    const { warn, warnings } = collect();
    const cfg = normalizeProjectConfig(
      {
        title: ' Mon Projet ',
        tech: 'React, NestJS',
        screenshots: ['a.png', 42, null],
        demo: 'https://demo.dev',
        featured: 'true',
        order: '3',
        status: 'Draft',
        year: 2024,
        cover_image: 'docs/cover.png',
        content: 'docs/PORTFOLIO.md',
      },
      warn,
    );
    expect(cfg).toEqual({
      title: 'Mon Projet',
      techStack: ['React', 'NestJS'],
      gallery: ['a.png', '42'],
      liveUrl: 'https://demo.dev',
      featured: true,
      order: 3,
      status: 'draft',
      year: 2024,
      cover: 'docs/cover.png',
      content: 'docs/PORTFOLIO.md',
    });
    expect(warnings).toEqual([]);
  });

  it('warns about unknown keys and invalid values and ignores them', () => {
    const { warn, warnings } = collect();
    const cfg = normalizeProjectConfig(
      { foo: 1, status: 'live', slug: 'Not valid!', liveUrl: 'ftp://x', featured: 'yes', order: 'abc', title: { a: 1 } },
      warn,
    );
    expect(cfg).toEqual({});
    expect(warnings).toHaveLength(7);
    expect(warnings.join('\n')).toMatch(/foo/);
  });

  it('limits the gallery to 30 images', () => {
    const cfg = normalizeProjectConfig({ gallery: Array.from({ length: 40 }, (_, i) => `${i}.png`) }, () => {});
    expect(cfg.gallery).toHaveLength(30);
  });
});

describe('parseFlexibleDate', () => {
  it.each([
    [2024, '2024-01-01'],
    ['2024', '2024-01-01'],
    ['2024-03', '2024-03-01'],
    ['03/2024', '2024-03-01'],
    ['2024-03-15', '2024-03-15'],
    [new Date(Date.UTC(2020, 5, 2)), '2020-06-02'],
  ])('parses %p', (input, expected) => {
    expect(parseFlexibleDate(input).date?.toISOString().slice(0, 10)).toBe(expected);
  });

  it('understands "present" in French and English', () => {
    expect(parseFlexibleDate("aujourd'hui")).toEqual({ date: null, present: true });
    expect(parseFlexibleDate('Present')).toEqual({ date: null, present: true });
  });

  it('returns null for garbage', () => {
    expect(parseFlexibleDate('not a date').date).toBeNull();
    expect(parseFlexibleDate('2024-13').date).toBeNull();
    expect(parseFlexibleDate(undefined).date).toBeNull();
  });
});

describe('normalizeProfileConfig', () => {
  it('normalizes about, skills, experiences and education', () => {
    const { warn, warnings } = collect();
    const profile = normalizeProfileConfig(
      {
        about: {
          firstName: 'Kevine',
          roles: ['Dev', 'Archi'],
          stats: [{ label: 'PROJETS', value: '20' }, { value: 3 }],
          timeline: [{ year: 2021, title: 'Start' }, { title: 'no year' }],
          values: [{ title: 'Rigueur' }],
          cv: 'cv.pdf',
        },
        skills: [{ name: 'React', level: 150, category: 'frontend' }, { level: 3 }, { name: 'Go', category: 'weird' }],
        experiences: [
          { title: 'Dev', company: 'ACME', startDate: '2023-01', endDate: 'present', tech: ['React'] },
          { title: 'Missing company', startDate: 2020 },
        ],
        education: [{ school: 'Uni', degree: 'Master', start: 2021, end: '2023-06' }],
      },
      warn,
    );
    expect(profile.about).toMatchObject({
      firstName: 'Kevine',
      roles: ['Dev', 'Archi'],
      cvUrl: 'cv.pdf',
      stats: [{ label: 'PROJETS', value: 20, order: 0 }],
      timeline: [{ year: '2021', title: 'Start', order: 0 }],
      values: [{ icon: '◆', title: 'Rigueur', order: 0 }],
    });
    expect(profile.skills).toEqual([
      { name: 'React', level: 100, category: 'frontend' },
      { name: 'Go' },
    ]);
    expect(profile.experiences).toHaveLength(1);
    expect(profile.experiences![0]).toMatchObject({ current: true, endDate: null, techStack: ['React'], order: 0 });
    expect(profile.education![0].endDate?.toISOString().slice(0, 7)).toBe('2023-06');
    expect(warnings.some((w) => w.includes('skills[1]'))).toBe(true);
    expect(warnings.some((w) => w.includes('experiences[1]'))).toBe(true);
    expect(warnings.some((w) => w.includes('weird'))).toBe(true);
  });

  it('leaves absent sections undefined (so they are not wiped)', () => {
    expect(normalizeProfileConfig({ about: { bio: 'x' } }, () => {})).toEqual({ about: { bio: 'x' } });
  });
});
