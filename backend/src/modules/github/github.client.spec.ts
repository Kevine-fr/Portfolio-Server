import { installFakeFetch, FakeFetch } from '../../../test/utils/fake-fetch';
import { fileResponse, makeRepo } from '../../../test/fixtures/github';
import { GithubApiError, GithubClient, mapLimit } from './github.client';

describe('GithubClient', () => {
  let fake: FakeFetch;
  let client: GithubClient;

  beforeEach(() => {
    fake = installFakeFetch();
    client = new GithubClient();
    delete process.env.GITHUB_TOKEN;
  });
  afterEach(() => {
    fake.restore();
    delete process.env.GITHUB_TOKEN;
  });

  it('sends the GitHub headers, and the token only when configured', async () => {
    fake.route('/users/kev', { login: 'kev' });
    await client.getUser('kev');
    expect(fake.calls[0].headers).toMatchObject({
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'portfolio-github-sync',
    });
    expect(fake.calls[0].headers.Authorization).toBeUndefined();
    expect(client.hasToken()).toBe(false);

    process.env.GITHUB_TOKEN = 'ghp_test';
    await client.getUser('kev');
    expect(fake.calls[1].headers.Authorization).toBe('Bearer ghp_test');
    expect(client.hasToken()).toBe(true);
  });

  it('reuses cached bodies on 304 Not Modified (ETag)', async () => {
    let n = 0;
    fake.route('/repos/kev/app/languages', ({ headers }) => {
      n++;
      if (headers['If-None-Match'] === '"v1"') return { status: 304, headers: { etag: '"v1"' } };
      return { body: { TypeScript: 10 }, headers: { etag: '"v1"' } };
    });
    expect(await client.getLanguages('kev', 'app')).toEqual({ TypeScript: 10 });
    expect(await client.getLanguages('kev', 'app')).toEqual({ TypeScript: 10 });
    expect(n).toBe(2);
    expect(fake.calls[1].headers['If-None-Match']).toBe('"v1"');
  });

  it('paginates repository listings', async () => {
    const page1 = Array.from({ length: 100 }, (_, i) => makeRepo({ id: i + 1, name: `r${i}` }));
    fake.route(/\/users\/kev\/repos\?.*page=1$/, page1);
    fake.route(/\/users\/kev\/repos\?.*page=2$/, [makeRepo({ id: 999, name: 'last' })]);
    const repos = await client.listUserRepos('kev');
    expect(repos).toHaveLength(101);
    expect(fake.calls.map((c) => c.path)).toEqual([
      '/users/kev/repos?type=owner&sort=pushed&per_page=100&page=1',
      '/users/kev/repos?type=owner&sort=pushed&per_page=100&page=2',
    ]);
  });

  it('reports unknown accounts clearly', async () => {
    await expect(client.listUserRepos('ghost')).rejects.toMatchObject({ status: 404, message: expect.stringContaining('ghost') });
  });

  it('decodes files and README (base64)', async () => {
    fake.route('/repos/kev/app/contents/docs/My%20Doc.md', fileResponse('docs/My Doc.md', '# Hé'));
    fake.route('/repos/kev/app/readme', fileResponse('docs/README.md', 'Hello'));
    expect(await client.getFileText('kev', 'app', '/docs/My Doc.md')).toBe('# Hé');
    expect(await client.getReadme('kev', 'app')).toEqual({ path: 'docs/README.md', text: 'Hello' });
  });

  it('returns null / [] for missing resources', async () => {
    expect(await client.getReadme('kev', 'app')).toBeNull();
    expect(await client.getFileText('kev', 'app', 'nope.yml')).toBeNull();
    expect(await client.listRootFiles('kev', 'empty')).toEqual([]);
    expect(await client.getLanguages('kev', 'app')).toEqual({});
    fake.route('/repos/kev/app/contents/dir', [{ name: 'a', path: 'dir/a', type: 'file' }]);
    expect(await client.getFileText('kev', 'app', 'dir')).toBeNull(); // a directory is not a file
  });

  it('detects rate limiting and tracks the quota', async () => {
    fake.route('/users/kev', () => ({
      status: 403,
      body: { message: 'API rate limit exceeded' },
      headers: { 'x-ratelimit-remaining': '0', 'x-ratelimit-limit': '60', 'x-ratelimit-reset': '1700000000' },
    }));
    const err: GithubApiError = await client.getUser('kev').catch((e) => e);
    expect(err).toBeInstanceOf(GithubApiError);
    expect(err.rateLimited).toBe(true);
    expect(err.message).toMatch(/GITHUB_TOKEN/);
    expect(client.getLastRateLimit()).toEqual({ limit: 60, remaining: 0, reset: '2023-11-14T22:13:20.000Z' });
  });

  it('maps 401 and other failures', async () => {
    fake.route('/users/a', () => ({ status: 401, body: { message: 'Bad credentials' } }));
    fake.route('/users/b', () => ({ status: 500, body: { message: 'boom' } }));
    await expect(client.getUser('a')).rejects.toMatchObject({ status: 401, message: expect.stringMatching(/GITHUB_TOKEN/) });
    await expect(client.getUser('b')).rejects.toMatchObject({ status: 500, message: expect.stringMatching(/boom/) });
  });

  it('wraps network errors', async () => {
    fake.fn.mockRejectedValueOnce(new Error('ECONNRESET'));
    await expect(client.getUser('kev')).rejects.toMatchObject({ status: 0, message: expect.stringMatching(/injoignable/) });
  });

  it('reads /rate_limit without failing the caller', async () => {
    fake.route('/rate_limit', { resources: { core: { limit: 5000, remaining: 4990, reset: 1700000000 } } });
    expect(await client.fetchRateLimit()).toEqual({ limit: 5000, remaining: 4990, reset: '2023-11-14T22:13:20.000Z' });
    fake.route('/rate_limit', () => ({ status: 500 }));
    await expect(client.fetchRateLimit()).resolves.toBeTruthy();
  });

  it('encodes path segments and never lets a file path escape the repository', async () => {
    await client.getUser('a b');
    await client.getFileText('o', 'r', 'x/../../../users/y z.md');
    expect(fake.calls[0].path).toBe('/users/a%20b');
    expect(fake.calls[1].path).toBe('/repos/o/r/contents/x/users/y%20z.md');
  });
});

describe('mapLimit', () => {
  it('preserves order and limits concurrency', async () => {
    let active = 0;
    let peak = 0;
    const out = await mapLimit([30, 10, 20, 5, 1], 2, async (ms, i) => {
      active++;
      peak = Math.max(peak, active);
      await new Promise((r) => setTimeout(r, ms));
      active--;
      return i * 10;
    });
    expect(out).toEqual([0, 10, 20, 30, 40]);
    expect(peak).toBe(2);
  });

  it('handles empty input', async () => {
    expect(await mapLimit([], 3, async () => 1)).toEqual([]);
  });
});
