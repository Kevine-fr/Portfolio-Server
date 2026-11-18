import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AxiosAdapter } from 'axios';
import { api, navigation } from '@/lib/api';
import { resetAuthHydration, useAuth, getTokenCookie } from '@/lib/auth';

function mockAdapter(handler: (url: string) => { status: number; data: unknown }) {
  const calls: string[] = [];
  const adapter: AxiosAdapter = async (config) => {
    const url = config.url ?? '';
    calls.push(url);
    const { status, data } = handler(url);
    const response = { data, status, statusText: '', headers: {}, config, request: {} };
    if (status >= 400) {
      const err: any = new Error(`Request failed with status code ${status}`);
      err.isAxiosError = true;
      err.config = config;
      err.response = response;
      throw err;
    }
    return response;
  };
  api.defaults.adapter = adapter;
  return calls;
}

describe('auth store', () => {
  let toLogin: ReturnType<typeof vi.spyOn>;
  beforeEach(() => {
    toLogin = vi.spyOn(navigation, 'toLogin').mockImplementation(() => {});
    resetAuthHydration();
    useAuth.setState({ user: null, isLoading: false });
  });

  it('logs in, stores the token cookie and shares the session check', async () => {
    const calls = mockAdapter((url) =>
      url === '/auth/login'
        ? { status: 200, data: { accessToken: 'tok', user: { id: '1', email: 'a@b.c', name: 'A', role: 'admin' } } }
        : { status: 200, data: { id: '1', email: 'a@b.c', name: 'A', role: 'admin' } },
    );
    await useAuth.getState().login('a@b.c', 'secret');
    expect(getTokenCookie()).toBe('tok');
    expect(useAuth.getState().user?.role).toBe('admin');

    // Navigating between pages no longer calls /auth/me each time
    await Promise.all([useAuth.getState().hydrate(), useAuth.getState().hydrate(), useAuth.getState().hydrate()]);
    expect(calls).toEqual(['/auth/login']);
  });

  it('validates an existing cookie once', async () => {
    document.cookie = 'portfolio_token=abc; path=/';
    const calls = mockAdapter(() => ({ status: 200, data: { id: '1', email: 'a@b.c', name: 'A', role: 'editor' } }));
    await Promise.all([useAuth.getState().hydrate(), useAuth.getState().hydrate()]);
    expect(calls).toEqual(['/auth/me']);
    expect(useAuth.getState().user?.role).toBe('editor');
  });

  it('skips the request without a token and clears an invalid one', async () => {
    const calls = mockAdapter(() => ({ status: 401, data: {} }));
    await useAuth.getState().hydrate();
    expect(calls).toEqual([]);

    document.cookie = 'portfolio_token=bad; path=/';
    await useAuth.getState().hydrate({ force: true });
    expect(useAuth.getState().user).toBeNull();
    expect(getTokenCookie()).toBeNull();
    expect(toLogin).toHaveBeenCalledTimes(1); // expired session → back to /login
  });

  it('does not redirect when a login attempt fails with 401', async () => {
    mockAdapter(() => ({ status: 401, data: { message: 'Identifiants invalides' } }));
    await expect(useAuth.getState().login('a@b.c', 'bad')).rejects.toBeTruthy();
    expect(useAuth.getState().isLoading).toBe(false);
    expect(toLogin).not.toHaveBeenCalled();
  });

  it('logs out', async () => {
    useAuth.setState({ user: { id: '1', email: 'a', name: 'A', role: 'admin' } });
    document.cookie = 'portfolio_token=x; path=/';
    useAuth.getState().logout();
    expect(useAuth.getState().user).toBeNull();
    expect(getTokenCookie()).toBeNull();
  });
});
