import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { apiGet, apiPost } from './api';

export type AuthUser = {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'editor';
};

type LoginResponse = { accessToken: string; user: AuthUser };

type AuthState = {
  user: AuthUser | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  /** Validates the session with GET /auth/me (once per page load, shared by all callers). */
  hydrate: (opts?: { force?: boolean }) => Promise<void>;
};

const TOKEN_COOKIE = 'portfolio_token';

export function getTokenCookie(): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${TOKEN_COOKIE}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}
function setTokenCookie(token: string) {
  const isSecure = typeof window !== 'undefined' && window.location.protocol === 'https:';
  document.cookie = `${TOKEN_COOKIE}=${encodeURIComponent(token)}; path=/; max-age=${7 * 24 * 3600}; SameSite=Lax${isSecure ? '; Secure' : ''}`;
}
export function clearTokenCookie() {
  document.cookie = `${TOKEN_COOKIE}=; path=/; max-age=0`;
}

// Every admin page used to call GET /auth/me on each navigation: the session
// is now validated once and the result shared (401s are still handled by the
// axios interceptor, which logs out on an expired token).
let hydration: Promise<void> | null = null;

export const useAuth = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isLoading: false,
      login: async (email, password) => {
        set({ isLoading: true });
        try {
          const data = await apiPost<LoginResponse>('/auth/login', { email, password });
          setTokenCookie(data.accessToken);
          hydration = Promise.resolve();
          set({ user: data.user, isLoading: false });
        } catch (err) {
          set({ isLoading: false });
          throw err;
        }
      },
      logout: () => {
        clearTokenCookie();
        hydration = null;
        set({ user: null });
      },
      hydrate: (opts) => {
        if (hydration && !opts?.force) return hydration;
        hydration = (async () => {
          if (!getTokenCookie()) {
            set({ user: null });
            return;
          }
          try {
            const user = await apiGet<AuthUser>('/auth/me');
            set({ user });
          } catch {
            clearTokenCookie();
            set({ user: null });
          }
        })();
        return hydration;
      },
    }),
    { name: 'portfolio-admin-auth', partialize: (s) => ({ user: s.user }) },
  ),
);

/** Test helper: forget the cached session check. */
export function resetAuthHydration() {
  hydration = null;
}
