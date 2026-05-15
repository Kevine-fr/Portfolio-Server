import axios, { AxiosError, AxiosInstance } from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

function getTokenFromCookie(): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(/(?:^|; )portfolio_token=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : null;
}

export const api: AxiosInstance = axios.create({ baseURL: API_URL });

api.interceptors.request.use((config) => {
  const token = getTokenFromCookie();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err: AxiosError) => {
    if (err.response?.status === 401 && typeof window !== 'undefined') {
      document.cookie = 'portfolio_token=; path=/; max-age=0';
      if (!window.location.pathname.startsWith('/login')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(err);
  },
);

export const apiGet  = <T,>(url: string, params?: any) => api.get<T>(url, { params }).then((r) => r.data);
export const apiPost = <T,>(url: string, data?: any)   => api.post<T>(url, data).then((r) => r.data);
export const apiPatch= <T,>(url: string, data?: any)   => api.patch<T>(url, data).then((r) => r.data);
export const apiDel  = <T,>(url: string)               => api.delete<T>(url).then((r) => r.data);

// Extracts error message from axios error in French
export function getErrorMessage(err: any, fallback = 'Une erreur est survenue'): string {
  const msg = err?.response?.data?.message;
  if (Array.isArray(msg)) return msg.join(', ');
  if (typeof msg === 'string') return msg;
  return err?.message || fallback;
}
