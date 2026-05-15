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

// ─── Media upload ──────────────────────────────────────────────────────────
export type UploadResponse = { url: string; filename: string; size: number; mimetype: string };

export async function uploadMedia(
  file: File,
  kind: 'image' | 'video',
  onProgress?: (percent: number) => void,
): Promise<UploadResponse> {
  const form = new FormData();
  form.append('file', file);
  const { data } = await api.post<UploadResponse>(`/uploads/${kind}`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: (e) => {
      if (onProgress && e.total) onProgress(Math.round((e.loaded * 100) / e.total));
    },
  });
  return data;
}

export async function deleteMedia(filename: string): Promise<void> {
  await api.delete(`/uploads/${filename}`);
}

// Resolve a stored path/URL to a fully qualified URL the browser can fetch.
// Backend returns paths like "/uploads/xxx.jpg". The API URL is .../api/v1, so
// we strip the /api/v1 suffix and prepend the origin.
export function resolveMediaUrl(path?: string | null): string {
  if (!path) return '';
  if (/^https?:\/\//i.test(path)) return path;       // already absolute
  if (!path.startsWith('/')) return path;            // unknown, leave alone
  const origin = API_URL.replace(/\/api\/v\d+\/?$/, '');
  return `${origin}${path}`;
}

// Extract filename from stored path/URL for delete calls
export function filenameFromUrl(pathOrUrl: string): string | null {
  if (!pathOrUrl) return null;
  const m = pathOrUrl.match(/\/uploads\/([^/?#]+)$/);
  return m ? m[1] : null;
}

// Extracts error message from axios error in French
export function getErrorMessage(err: any, fallback = 'Une erreur est survenue'): string {
  const msg = err?.response?.data?.message;
  if (Array.isArray(msg)) return msg.join(', ');
  if (typeof msg === 'string') return msg;
  return err?.message || fallback;
}
