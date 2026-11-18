import type { GithubRepo } from '../../src/modules/github/github.types';

let nextId = 1000;

export function makeRepo(overrides: Partial<GithubRepo> = {}): GithubRepo {
  const name = overrides.name ?? `repo-${nextId}`;
  const owner = overrides.owner?.login ?? 'kev';
  return {
    id: overrides.id ?? nextId++,
    name,
    full_name: `${owner}/${name}`,
    owner: { login: owner },
    description: 'A demo repository',
    html_url: `https://github.com/${owner}/${name}`,
    homepage: null,
    language: 'TypeScript',
    stargazers_count: 3,
    forks_count: 1,
    topics: ['portfolio'],
    fork: false,
    archived: false,
    private: false,
    pushed_at: '2025-05-01T10:00:00Z',
    created_at: '2024-02-10T10:00:00Z',
    default_branch: 'main',
    ...overrides,
  };
}

export const b64 = (text: string) => Buffer.from(text, 'utf8').toString('base64');

export const fileResponse = (path: string, text: string) => ({
  type: 'file',
  encoding: 'base64',
  path,
  name: path.split('/').pop(),
  content: b64(text),
});
