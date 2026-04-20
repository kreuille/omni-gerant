import type { FastifyReply } from 'fastify';
import { randomBytes } from 'node:crypto';

// P1-06 : helpers cookies HttpOnly pour auth + CSRF double-submit

const ACCESS_COOKIE = 'zen_access';
const REFRESH_COOKIE = 'zen_refresh';
const CSRF_COOKIE = 'zen_csrf';

const ACCESS_TTL_MS = 60 * 60 * 1000;                 // 1h
const REFRESH_TTL_MS = 7 * 24 * 60 * 60 * 1000;       // 7j

function isProd(): boolean {
  return process.env['NODE_ENV'] === 'production';
}

// SameSite=None necessaire pour cross-origin Vercel -> Render.
// Secure obligatoire avec SameSite=None.
function baseOptions(ttlMs: number, httpOnly: boolean) {
  return {
    httpOnly,
    secure: isProd(),
    sameSite: (isProd() ? 'none' : 'lax') as 'none' | 'lax',
    path: '/',
    maxAge: Math.floor(ttlMs / 1000),
  };
}

export function setAuthCookies(reply: FastifyReply, access: string, refresh: string): string {
  // HttpOnly pour access + refresh
  reply.setCookie(ACCESS_COOKIE, access, baseOptions(ACCESS_TTL_MS, true));
  reply.setCookie(REFRESH_COOKIE, refresh, baseOptions(REFRESH_TTL_MS, true));

  // CSRF token : NON-HttpOnly, lisible par JS pour etre mis dans header X-CSRF-Token
  const csrf = randomBytes(24).toString('hex');
  reply.setCookie(CSRF_COOKIE, csrf, baseOptions(ACCESS_TTL_MS, false));
  return csrf;
}

export function clearAuthCookies(reply: FastifyReply): void {
  reply.clearCookie(ACCESS_COOKIE, { path: '/' });
  reply.clearCookie(REFRESH_COOKIE, { path: '/' });
  reply.clearCookie(CSRF_COOKIE, { path: '/' });
}

export const COOKIE_NAMES = {
  access: ACCESS_COOKIE,
  refresh: REFRESH_COOKIE,
  csrf: CSRF_COOKIE,
};
