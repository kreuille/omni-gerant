import type { Result } from '@omni-gerant/shared';
import { ok, err, appError } from '@omni-gerant/shared';
import type { AppError } from '@omni-gerant/shared';

const API_BASE_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001';

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

export async function apiRequest<T>(
  path: string,
  options: RequestOptions = {},
): Promise<Result<T, AppError>> {
  const { method = 'GET', body, headers = {}, signal } = options;

  const token = getAuthToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  if (body) {
    headers['Content-Type'] = 'application/json';
  }

  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      signal,
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => null);
      if (errorBody?.error) {
        return err(errorBody.error as AppError);
      }
      return err(appError('INTERNAL_ERROR', `HTTP ${response.status}: ${response.statusText}`));
    }

    // Handle 204 No Content
    if (response.status === 204) {
      return ok(undefined as T);
    }

    const data = await response.json();
    return ok(data as T);
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      return err(appError('INTERNAL_ERROR', 'Request was cancelled'));
    }
    return err(appError('SERVICE_UNAVAILABLE', 'Network error - please check your connection'));
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
};
