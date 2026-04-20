import type { FastifyInstance } from 'fastify';
import { createHash } from 'node:crypto';
import { createAuthService } from './auth.service.js';
import { createPrismaAuthRepository } from './auth.repository.js';
import { registerSchema, loginSchema, verify2faSchema, refreshTokenSchema, enable2faSchema } from './auth.schemas.js';
import { verifyAccessToken, generateTokenPair, type JwtPayload } from './jwt.js';
import { verifyTotpCode } from './totp.js';
import { authenticate } from '../../plugins/auth.js';
import { authRateLimit } from '../../plugins/rate-limiter.js';
import { setAuthCookies, clearAuthCookies, COOKIE_NAMES } from './cookies.js';

// Plan 4 : blacklist JWT en memoire (Map TTL = exp)
// Cle = jti/token-hash, valeur = timestamp d'expiration (ms)
const jwtBlacklist = new Map<string, number>();
export function blacklistJwt(tokenHash: string, expiresAtMs: number): void {
  jwtBlacklist.set(tokenHash, expiresAtMs);
  // Nettoyage periodique
  if (jwtBlacklist.size > 1000) {
    const now = Date.now();
    for (const [k, exp] of jwtBlacklist) if (exp < now) jwtBlacklist.delete(k);
  }
}
export function isJwtBlacklisted(tokenHash: string): boolean {
  const exp = jwtBlacklist.get(tokenHash);
  if (!exp) return false;
  if (exp < Date.now()) { jwtBlacklist.delete(tokenHash); return false; }
  return true;
}

// BUSINESS RULE [CDC-6]: Auth endpoints (public + authenticated)

export async function authRoutes(app: FastifyInstance) {
  const repo = createPrismaAuthRepository();
  const authService = createAuthService(repo);

  // POST /api/auth/register (public)
  app.post('/api/auth/register', async (request, reply) => {
    const parsed = registerSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid registration data',
          details: { issues: parsed.error.issues },
        },
      });
    }

    const result = await authService.register(parsed.data);
    if (!result.ok) {
      const status = result.error.code === 'CONFLICT' ? 409 : 400;
      return reply.status(status).send({ error: result.error });
    }
    return reply.status(201).send(result.value);
  });

  // POST /api/auth/login (public) — P1-08 : rate-limit specifique 5/15min par IP+email
  app.post('/api/auth/login', {
    config: {
      rateLimit: {
        max: 5,
        timeWindow: 15 * 60 * 1000,
        keyGenerator: (req: { ip: string; body?: unknown }) => {
          const email = (req.body as { email?: string } | undefined)?.email ?? '';
          return `login:${req.ip}:${email.toLowerCase()}`;
        },
      },
    },
  }, async (request, reply) => {
    const parsed = loginSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Données de connexion invalides.',
          details: { issues: parsed.error.issues },
        },
      });
    }

    const result = await authService.login(parsed.data);
    if (!result.ok) {
      const code = result.error.code as string;
      const isCred = code === 'NOT_FOUND' || code === 'BAD_REQUEST' || code === 'UNAUTHORIZED';
      if (isCred) {
        return reply.status(401).send({
          error: { code: 'INVALID_CREDENTIALS', message: 'Email ou mot de passe incorrect.' },
        });
      }
      return reply.status(500).send({
        error: { code: 'LOGIN_FAILED', message: 'Le serveur est temporairement indisponible. Réessayez dans quelques secondes.' },
      });
    }

    // P1-06 : si login complet (pas 2FA pending), set cookies HttpOnly
    const v = result.value as { tokens?: { access_token: string; refresh_token: string }; requires_2fa?: boolean };
    if (v.tokens && !v.requires_2fa) {
      const csrf = setAuthCookies(reply, v.tokens.access_token, v.tokens.refresh_token);
      return { ...result.value, csrf_token: csrf };
    }
    return result.value;
  });

  // POST /api/auth/verify-2fa (public - with temporary token)
  app.post('/api/auth/verify-2fa', async (request, reply) => {
    const parsed = verify2faSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid 2FA verification data',
          details: { issues: parsed.error.issues },
        },
      });
    }

    // Verify the temporary token
    const tokenResult = verifyAccessToken(parsed.data.temporary_token);
    if (!tokenResult.ok) {
      return reply.status(401).send({ error: tokenResult.error });
    }

    const user = await repo.findUserById(tokenResult.value.user_id);
    if (!user?.totp_secret || !user.totp_enabled) {
      return reply.status(400).send({
        error: { code: 'BAD_REQUEST', message: '2FA not configured' },
      });
    }

    const codeResult = verifyTotpCode(user.totp_secret, parsed.data.code);
    if (!codeResult.ok) {
      return reply.status(500).send({ error: codeResult.error });
    }
    if (!codeResult.value) {
      return reply.status(401).send({
        error: { code: 'UNAUTHORIZED', message: 'Invalid 2FA code' },
      });
    }

    // Generate full token pair
    const payload: JwtPayload = {
      user_id: user.id,
      tenant_id: user.tenant_id,
      role: user.role,
    };
    const tokens = generateTokenPair(payload);
    const tokenHash = createHash('sha256').update(tokens.refresh_token).digest('hex');
    await repo.storeRefreshToken(user.id, tokenHash, new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));
    await repo.updateLastLogin(user.id);

    return {
      requires_2fa: false,
      tokens,
      user: {
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        role: user.role,
        tenant_id: user.tenant_id,
      },
    };
  });

  // POST /api/auth/refresh (public - with refresh token)
  app.post('/api/auth/refresh', async (request, reply) => {
    const parsed = refreshTokenSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid refresh token data',
          details: { issues: parsed.error.issues },
        },
      });
    }

    const result = await authService.refreshToken(parsed.data.refresh_token);
    if (!result.ok) {
      return reply.status(401).send({ error: result.error });
    }
    // P1-06 : renouvelle les cookies
    const v = result.value as { access_token?: string; refresh_token?: string; tokens?: { access_token: string; refresh_token: string } };
    const tokens = v.tokens ?? (v.access_token && v.refresh_token ? { access_token: v.access_token, refresh_token: v.refresh_token } : null);
    if (tokens) {
      const csrf = setAuthCookies(reply, tokens.access_token, tokens.refresh_token);
      return { ...result.value, csrf_token: csrf };
    }
    return result.value;
  });

  // POST /api/auth/refresh-cookie — refresh via cookie HttpOnly seulement
  app.post('/api/auth/refresh-cookie', async (request, reply) => {
    const refreshToken = request.cookies[COOKIE_NAMES.refresh];
    if (!refreshToken) {
      return reply.status(401).send({ error: { code: 'UNAUTHORIZED', message: 'Missing refresh cookie.' } });
    }
    const result = await authService.refreshToken(refreshToken);
    if (!result.ok) {
      clearAuthCookies(reply);
      return reply.status(401).send({ error: result.error });
    }
    const v = result.value as { access_token?: string; refresh_token?: string; tokens?: { access_token: string; refresh_token: string } };
    const tokens = v.tokens ?? (v.access_token && v.refresh_token ? { access_token: v.access_token, refresh_token: v.refresh_token } : null);
    if (tokens) {
      const csrf = setAuthCookies(reply, tokens.access_token, tokens.refresh_token);
      return { refreshed: true, csrf_token: csrf };
    }
    return reply.status(500).send({ error: { code: 'INTERNAL_ERROR', message: 'Token format unexpected.' } });
  });

  // POST /api/auth/logout (authenticated)
  // P1-07 : accepte logout sans refresh token (best-effort) + blacklist le access_token courant
  app.post(
    '/api/auth/logout',
    { preHandler: [authenticate] },
    async (request, reply) => {
      const body = (request.body ?? {}) as { refresh_token?: string };
      if (body.refresh_token) {
        await authService.logout(body.refresh_token).catch(() => { /* best-effort */ });
      }

      // Blacklist l'access_token courant (header ou cookie) jusqu'a son exp naturelle
      const auth = request.headers.authorization ?? '';
      const bearer = auth.toLowerCase().startsWith('bearer ') ? auth.slice(7) : null;
      const cookieToken = request.cookies[COOKIE_NAMES.access];
      const activeToken = bearer ?? cookieToken;
      if (activeToken) {
        const tokenHash = createHash('sha256').update(activeToken).digest('hex');
        const tokenInfo = verifyAccessToken(activeToken);
        const expMs = tokenInfo.ok ? Date.now() + 60 * 60 * 1000 : Date.now() + 60 * 60 * 1000;
        blacklistJwt(tokenHash, expMs);
      }

      // P1-06 : clear cookies HttpOnly
      clearAuthCookies(reply);

      return reply.status(204).send();
    },
  );

  // POST /api/auth/2fa/enable (authenticated)
  const enable2faHandler = async (request: import('fastify').FastifyRequest, reply: import('fastify').FastifyReply) => {
    const result = await authService.enable2fa(request.auth.user_id);
    if (!result.ok) {
      return reply.status(400).send({ error: result.error });
    }
    return result.value;
  };
  app.post('/api/auth/2fa/enable', { preHandler: [authenticate] }, enable2faHandler);
  // Alias documenté dans CLAUDE.md — P0-08
  app.post('/api/auth/2fa/setup', { preHandler: [authenticate] }, enable2faHandler);

  // POST /api/auth/2fa/confirm (authenticated)
  const confirm2faHandler = async (request: import('fastify').FastifyRequest, reply: import('fastify').FastifyReply) => {
    const parsed = enable2faSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Code 2FA invalide',
          details: { issues: parsed.error.issues },
        },
      });
    }

    const result = await authService.confirm2fa(request.auth.user_id, parsed.data.code);
    if (!result.ok) {
      return reply.status(400).send({ error: result.error });
    }
    return reply.status(204).send();
  };
  app.post('/api/auth/2fa/confirm', { preHandler: [authenticate] }, confirm2faHandler);
  // Alias documenté dans CLAUDE.md — P0-08
  app.post('/api/auth/2fa/verify', { preHandler: [authenticate] }, confirm2faHandler);

  // POST /api/auth/2fa/disable (authenticated)
  app.post(
    '/api/auth/2fa/disable',
    { preHandler: [authenticate] },
    async (request, reply) => {
      const parsed = enable2faSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid code',
            details: { issues: parsed.error.issues },
          },
        });
      }

      const result = await authService.disable2fa(request.auth.user_id, parsed.data.code);
      if (!result.ok) {
        return reply.status(400).send({ error: result.error });
      }
      return reply.status(204).send();
    },
  );

  // GET /api/auth/me (authenticated)
  app.get(
    '/api/auth/me',
    { preHandler: [authenticate] },
    async (request, reply) => {
      const user = await repo.findUserById(request.auth.user_id);
      if (!user) {
        return reply.status(404).send({
          error: { code: 'NOT_FOUND', message: 'User not found' },
        });
      }

      return {
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        role: user.role,
        tenant_id: user.tenant_id,
        totp_enabled: user.totp_enabled,
      };
    },
  );
}
