/**
 * Programmable replacement for global fetch, routing GitHub API paths to
 * handlers. Records every request (url + headers) for assertions.
 */
export type RouteHandler = (req: { url: string; path: string; headers: Record<string, string> }) =>
  | { status?: number; body?: unknown; headers?: Record<string, string> }
  | undefined;

export interface FakeFetch {
  fn: jest.Mock;
  calls: Array<{ url: string; path: string; headers: Record<string, string> }>;
  route(path: string | RegExp, handler: RouteHandler | unknown): void;
  restore(): void;
}

export function installFakeFetch(baseUrl = 'https://api.github.test'): FakeFetch {
  const original = global.fetch;
  const routes: Array<{ match: string | RegExp; handler: RouteHandler }> = [];
  const calls: FakeFetch['calls'] = [];

  const fn = jest.fn(async (input: any, init: any = {}) => {
    const url = String(input);
    const path = url.startsWith(baseUrl) ? url.slice(baseUrl.length) : url;
    const headers: Record<string, string> = { ...(init.headers ?? {}) };
    calls.push({ url, path, headers });
    const route = [...routes].reverse().find((r) => (typeof r.match === 'string' ? r.match === path : r.match.test(path)));
    const res = route?.handler({ url, path, headers }) ?? { status: 404, body: { message: 'Not Found' } };
    const status = res.status ?? 200;
    return new Response(status === 304 ? null : JSON.stringify(res.body ?? {}), {
      status,
      headers: { 'content-type': 'application/json', 'x-ratelimit-limit': '5000', 'x-ratelimit-remaining': '4999', ...(res.headers ?? {}) },
    });
  });
  global.fetch = fn as any;

  return {
    fn,
    calls,
    route(match, handler) {
      routes.push({ match, handler: typeof handler === 'function' ? (handler as RouteHandler) : () => ({ body: handler }) });
    },
    restore() {
      global.fetch = original;
    },
  };
}
