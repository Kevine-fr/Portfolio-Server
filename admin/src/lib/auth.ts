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
  hydrate: () => Promise<void>;
};

function setTokenCookie(token: string) {
  // 7-day expiry, secure flag in production
  const isSecure = typeof window !== 'undefined' && window.location.protocol === 'https:';
  document.cookie = `portfolio_token=${encodeURIComponent(token)}; path=/; max-age=${7 * 24 * 3600}; SameSite=Lax${isSecure ? '; Secure' : ''}`;
}
function clearTokenCookie() {
  document.cookie = 'portfolio_token=; path=/; max-age=0';
}

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
          set({ user: data.user, isLoading: false });
        } catch (err) {
          set({ isLoading: false });
          throw err;
        }
      },
      logout: () => {
        clearTokenCookie();
        set({ user: null });
      },
      hydrate: async () => {
        try {
          const user = await apiGet<AuthUser>('/auth/me');
          set({ user });
        } catch {
          clearTokenCookie();
          set({ user: null });
        }
      },
    }),
    { name: 'portfolio-admin-auth', partialize: (s) => ({ user: s.user }) },
  ),
);
