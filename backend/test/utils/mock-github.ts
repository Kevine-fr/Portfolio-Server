import type { GithubRepo } from '../../src/modules/github/github.types';
import { FakeFetch } from './fake-fetch';
import { fileResponse } from '../fixtures/github';

export interface MockRepo {
  repo: GithubRepo;
  /** path → content (root files are listed by /contents/) */
  files?: Record<string, string>;
  languages?: Record<string, number>;
  /** Make a given endpoint fail: 'readme' | 'languages' | 'contents' */
  failOn?: { endpoint: 'readme' | 'languages' | 'contents'; status: number; headers?: Record<string, string>; message?: string };
}

/** Registers GitHub REST routes for a user, its repositories and its profile repo. */
export function mockGithubAccount(
  fake: FakeFetch,
  username: string,
  repos: MockRepo[],
  profile?: { name?: string; files: Record<string, string> },
) {
  fake.route(new RegExp(`^/users/${username}/repos\\?`), () => ({ body: repos.map((r) => r.repo) }));
  fake.route('/rate_limit', { resources: { core: { limit: 5000, remaining: 4900, reset: 1700000000 } } });

  const all = [...repos];
  if (profile) {
    all.push({ repo: { name: profile.name ?? username, owner: { login: username } } as GithubRepo, files: profile.files });
  }

  for (const r of all) {
    const base = `/repos/${username}/${r.repo.name}`;
    const files = () => r.files ?? {};
    const fail = (endpoint: string) =>
      r.failOn?.endpoint === endpoint
        ? { status: r.failOn.status, headers: r.failOn.headers, body: { message: r.failOn.message ?? 'failure' } }
        : undefined;

    fake.route(`${base}/contents/`, () => fail('contents') ?? {
      body: Object.keys(files())
        .filter((p) => !p.includes('/'))
        .map((p) => ({ name: p, path: p, type: 'file' })),
    });
    fake.route(`${base}/languages`, () => fail('languages') ?? { body: r.languages ?? {} });
    fake.route(`${base}/readme`, () => {
      const f = fail('readme');
      if (f) return f;
      const readme = Object.keys(files()).find((p) => /^readme(\.md)?$/i.test(p));
      return readme ? { body: fileResponse(readme, files()[readme]) } : { status: 404, body: { message: 'Not Found' } };
    });
    // Files are looked up at request time, so tests can edit them between syncs
    fake.route(new RegExp(`^${base.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/contents/(.+)$`), ({ path }) => {
      const wanted = decodeURIComponent(path.slice(`${base}/contents/`.length));
      const text = (r.files ?? {})[wanted];
      return text === undefined ? { status: 404, body: { message: 'Not Found' } } : { body: fileResponse(wanted, text) };
    });
  }
}
