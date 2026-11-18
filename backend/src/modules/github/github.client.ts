import { Injectable, Logger } from '@nestjs/common';
import { GithubContentEntry, GithubRepo, GithubUser, RateLimitInfo } from './github.types';

export class GithubApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly rateLimited = false,
  ) {
    super(message);
    this.name = 'GithubApiError';
  }
}

interface CachedResponse {
  etag: string;
  body: unknown;
}

const MAX_CACHE_ENTRIES = 1000;
const MAX_REPO_PAGES = 10;
const REQUEST_TIMEOUT_MS = 15_000;

const seg = (s: string) => encodeURIComponent(s);
// '.' / '..' segments are dropped: a path from .portfolio.yml must not escape
// the repository contents endpoint once the URL is normalized by fetch().
const filePath = (p: string) =>
  p.split('/').filter((s) => s && s !== '.' && s !== '..').map(seg).join('/');

/**
 * Minimal GitHub REST client.
 * - optional GITHUB_TOKEN (60 → 5000 requests/hour)
 * - conditional requests (ETag / 304) so unchanged resources cost nothing
 *   against the rate limit on subsequent syncs
 */
@Injectable()
export class GithubClient {
  private readonly logger = new Logger(GithubClient.name);
  private readonly cache = new Map<string, CachedResponse>();
  private rateLimit: RateLimitInfo | null = null;

  get baseUrl(): string {
    return (process.env.GITHUB_API_URL || 'https://api.github.com').replace(/\/+$/, '');
  }

  hasToken(): boolean {
    return !!process.env.GITHUB_TOKEN?.trim();
  }

  getLastRateLimit(): RateLimitInfo | null {
    return this.rateLimit;
  }

  clearCache() {
    this.cache.clear();
  }

  async request<T>(path: string, opts: { allowNotFound?: boolean } = {}): Promise<T | null> {
    const url = /^https?:\/\//.test(path) ? path : `${this.baseUrl}${path}`;
    const headers: Record<string, string> = {
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'portfolio-github-sync',
    };
    const token = process.env.GITHUB_TOKEN?.trim();
    if (token) headers.Authorization = `Bearer ${token}`;
    const cached = this.cache.get(url);
    if (cached) headers['If-None-Match'] = cached.etag;

    let res: Response;
    try {
      res = await fetch(url, { headers, signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
    } catch (err: any) {
      throw new GithubApiError(`GitHub est injoignable (${err?.message || err})`, 0);
    }
    this.captureRateLimit(res.headers);

    if (res.status === 304 && cached) {
      // refresh LRU position
      this.cache.delete(url);
      this.cache.set(url, cached);
      return cached.body as T;
    }
    if (res.status === 404 && opts.allowNotFound) return null;
    if (!res.ok) throw await this.toError(res, path);

    const body = (await res.json()) as T;
    const etag = res.headers.get('etag');
    if (etag) this.remember(url, { etag, body });
    return body;
  }

  // ─── Endpoints ─────────────────────────────────────────────────────────
  getUser(username: string) {
    return this.request<GithubUser>(`/users/${seg(username)}`, { allowNotFound: true });
  }

  /** Public repositories owned by the user (all pages). */
  async listUserRepos(username: string): Promise<GithubRepo[]> {
    const repos: GithubRepo[] = [];
    for (let page = 1; page <= MAX_REPO_PAGES; page++) {
      const batch = await this.request<GithubRepo[]>(
        `/users/${seg(username)}/repos?type=owner&sort=pushed&per_page=100&page=${page}`,
        { allowNotFound: true },
      );
      if (batch === null) {
        throw new GithubApiError(`Compte GitHub « ${username} » introuvable`, 404);
      }
      repos.push(...batch);
      if (batch.length < 100) break;
    }
    return repos;
  }

  /** Files at the root of the default branch ([] for an empty repository). */
  async listRootFiles(owner: string, repo: string): Promise<GithubContentEntry[]> {
    const entries = await this.request<GithubContentEntry[] | GithubContentEntry>(
      `/repos/${seg(owner)}/${seg(repo)}/contents/`,
      { allowNotFound: true },
    );
    return Array.isArray(entries) ? entries : [];
  }

  /** UTF-8 content of a file, or null when missing / not a file. */
  async getFileText(owner: string, repo: string, path: string): Promise<string | null> {
    const file = await this.request<any>(`/repos/${seg(owner)}/${seg(repo)}/contents/${filePath(path)}`, {
      allowNotFound: true,
    });
    return decodeContent(file);
  }

  /** README detected by GitHub (README.md, readme.rst, docs/README.md…). */
  async getReadme(owner: string, repo: string): Promise<{ path: string; text: string } | null> {
    const file = await this.request<any>(`/repos/${seg(owner)}/${seg(repo)}/readme`, { allowNotFound: true });
    const text = decodeContent(file);
    return text === null ? null : { path: String(file.path || 'README.md'), text };
  }

  async getLanguages(owner: string, repo: string): Promise<Record<string, number>> {
    const langs = await this.request<Record<string, number>>(
      `/repos/${seg(owner)}/${seg(repo)}/languages`,
      { allowNotFound: true },
    );
    return langs ?? {};
  }

  /** Current quota (this endpoint does not consume it). */
  async fetchRateLimit(): Promise<RateLimitInfo | null> {
    try {
      const data = await this.request<any>('/rate_limit');
      const core = data?.resources?.core ?? data?.rate;
      if (core) {
        this.rateLimit = {
          limit: core.limit,
          remaining: core.remaining,
          reset: core.reset ? new Date(core.reset * 1000).toISOString() : null,
        };
      }
    } catch (err: any) {
      this.logger.warn(`rate_limit indisponible : ${err?.message || err}`);
    }
    return this.rateLimit;
  }

  // ─── Internals ─────────────────────────────────────────────────────────
  private remember(url: string, entry: CachedResponse) {
    this.cache.delete(url);
    this.cache.set(url, entry);
    if (this.cache.size > MAX_CACHE_ENTRIES) {
      const oldest = this.cache.keys().next().value;
      if (oldest !== undefined) this.cache.delete(oldest);
    }
  }

  private captureRateLimit(headers: Headers) {
    const limit = headers.get('x-ratelimit-limit');
    const remaining = headers.get('x-ratelimit-remaining');
    if (limit === null || remaining === null) return;
    const reset = headers.get('x-ratelimit-reset');
    this.rateLimit = {
      limit: Number(limit),
      remaining: Number(remaining),
      reset: reset ? new Date(Number(reset) * 1000).toISOString() : null,
    };
  }

  private async toError(res: Response, path: string): Promise<GithubApiError> {
    const body: any = await res.json().catch(() => ({}));
    const message: string = body?.message ?? res.statusText ?? '';
    const rateLimited =
      (res.status === 403 || res.status === 429) &&
      (res.headers.get('x-ratelimit-remaining') === '0' || /rate limit/i.test(message));
    if (rateLimited) {
      const reset = this.rateLimit?.reset
        ? ` (réinitialisation ${new Date(this.rateLimit.reset).toLocaleTimeString('fr-FR')})`
        : '';
      const hint = this.hasToken() ? '' : ' Ajoutez GITHUB_TOKEN pour passer à 5000 requêtes/heure.';
      return new GithubApiError(`Limite d'appels à l'API GitHub atteinte${reset}.${hint}`, res.status, true);
    }
    if (res.status === 401) return new GithubApiError('Jeton GitHub refusé (vérifiez GITHUB_TOKEN)', 401);
    return new GithubApiError(`Erreur GitHub ${res.status} sur ${path}${message ? ` : ${message}` : ''}`, res.status);
  }
}

function decodeContent(file: any): string | null {
  if (!file || Array.isArray(file) || file.type !== 'file' || typeof file.content !== 'string') return null;
  if (file.encoding && file.encoding !== 'base64') return null;
  return Buffer.from(file.content, 'base64').toString('utf8');
}

/** Runs `fn` over items with at most `limit` promises in flight, preserving order. */
export async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T, index: number) => Promise<R>): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i], i);
    }
  });
  await Promise.all(workers);
  return results;
}
