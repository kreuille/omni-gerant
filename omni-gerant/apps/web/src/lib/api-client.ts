import type { Result } from '@zenadmin/shared';
import { ok, err, appError } from '@zenadmin/shared';
import type { AppError } from '@zenadmin/shared';

const API_BASE_URL = process.env['NEXT_PUBLIC_API_URL'] || 'https://omni-gerant-api.onrender.com';

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
  headers?: Record<string, string>;
  signal?: AbortSignal;
}

function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('access_token');
}

// BUSINESS RULE [CDC-6]: Auto-refresh token when expired
let isRefreshing = false;

async function refreshToken(): Promise<boolean> {
  if (isRefreshing) return false;
  if (typeof window === 'undefined') return false;

  const refreshTkn = localStorage.getItem('refresh_token');
  const accessTkn = localStorage.getItem('access_token');
  if (!refreshTkn || !accessTkn) return false;

  isRefreshing = true;
  try {
    const res = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshTkn }),
    });

    if (!res.ok) {
      // Refresh failed — redirect to login
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user');
      document.cookie = 'auth_token=; path=/; max-age=0';
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
      return false;
    }

    const data = await res.json();
    const newToken = data.tokens?.access_token || data.access_token;
    const newRefresh = data.tokens?.refresh_token || data.refresh_token;

    if (newToken) {
      localStorage.setItem('access_token', newToken);
      document.cookie = `auth_token=${newToken}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`;
    }
    if (newRefresh) {
      localStorage.setItem('refresh_token', newRefresh);
    }

    return !!newToken;
  } catch {
    return false;
  } finally {
    isRefreshing = false;
  }
}

// P1-06 : lit le cookie non-HttpOnly zen_csrf pour le double-submit
function getCsrfToken(): string | null {
  if (typeof document === 'undefined') return null;
  const m = document.cookie.match(/(?:^|; )zen_csrf=([^;]+)/);
  return m && m[1] ? decodeURIComponent(m[1]) : null;
}

async function doFetch(
  path: string,
  options: RequestOptions,
): Promise<Response> {
  const { method = 'GET', body, headers = {}, signal } = options;

  const token = getAuthToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  if (body) {
    headers['Content-Type'] = 'application/json';
  }

  // P1-06 : CSRF token pour mutations si on utilise le cookie d'auth
  const method_upper = method.toUpperCase();
  if (method_upper !== 'GET' && method_upper !== 'HEAD') {
    const csrf = getCsrfToken();
    if (csrf) headers['X-CSRF-Token'] = csrf;
  }

  return fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    signal,
    // P1-06 : include cookies HttpOnly cross-origin (necessite CORS credentials: true cote API)
    credentials: 'include',
  });
}

export async function apiRequest<T>(
  path: string,
  options: RequestOptions = {},
): Promise<Result<T, AppError>> {
  try {
    let response = await doFetch(path, options);

    // Auto-refresh on 401
    if (response.status === 401 && !path.includes('/auth/')) {
      const refreshed = await refreshToken();
      if (refreshed) {
        // Retry with new token
        response = await doFetch(path, options);
      }
    }

    if (!response.ok) {
      const errorBody = await response.json().catch(() => null);
      if (errorBody?.error) {
        return err(errorBody.error as AppError);
      }
      return err(appError('INTERNAL_ERROR', `HTTP ${response.status}: ${response.statusText}`));
    }

    if (response.status === 204) {
      return ok(undefined as T);
    }

    const data = await response.json();
    return ok(data as T);
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      return err(appError('INTERNAL_ERROR', 'Request was cancelled'));
    }
    return err(appError('SERVICE_UNAVAILABLE', 'Erreur reseau - verifiez votre connexion'));
  }
}

// Raw fetch for non-JSON responses (e.g., TSV export, PDF)
export async function apiRequestRaw(
  path: string,
  options: RequestOptions = {},
): Promise<Result<Response, AppError>> {
  try {
    let response = await doFetch(path, options);

    if (response.status === 401 && !path.includes('/auth/')) {
      const refreshed = await refreshToken();
      if (refreshed) {
        response = await doFetch(path, options);
      }
    }

    if (!response.ok) {
      return err(appError('INTERNAL_ERROR', `HTTP ${response.status}: ${response.statusText}`));
    }

    return ok(response);
  } catch {
    return err(appError('SERVICE_UNAVAILABLE', 'Erreur reseau'));
  }
}

export const api = {
  get: <T>(path: string, signal?: AbortSignal) =>
    apiRequest<T>(path, { method: 'GET', signal }),
  post: <T>(path: string, body: unknown) =>
    apiRequest<T>(path, { method: 'POST', body }),
  patch: <T>(path: string, body: unknown) =>
    apiRequest<T>(path, { method: 'PATCH', body }),
  put: <T>(path: string, body: unknown) =>
    apiRequest<T>(path, { method: 'PUT', body }),
  delete: <T>(path: string) =>
    apiRequest<T>(path, { method: 'DELETE' }),
  getRaw: (path: string, signal?: AbortSignal) =>
    apiRequestRaw(path, { method: 'GET', signal }),
};
