import type { FastifyInstance } from 'fastify';
import { createHash } from 'node:crypto';
import { createAuthService, type AuthRepository, type User } from './auth.service.js';
import { registerSchema, loginSchema, verify2faSchema, refreshTokenSchema, enable2faSchema } from './auth.schemas.js';
import { verifyAccessToken, generateTokenPair, type JwtPayload } from './jwt.js';
import { verifyTotpCode } from './totp.js';
import { authenticate } from '../../plugins/auth.js';

// BUSINESS RULE [CDC-6]: Auth endpoints (public + authenticated)

export async function authRoutes(app: FastifyInstance) {
  // In-memory repo — functional for dev/demo, use Prisma in production
  const users = new Map<string, User>();
  const usersByEmail = new Map<string, string>(); // email → id
  const refreshTokens = new Map<string, { user_id: string; revoked_at: Date | null; expires_at: Date }>();

  const repo: AuthRepository = {
    async findUserByEmail(email: string) {
      const id = usersByEmail.get(email.toLowerCase());
      return id ? users.get(id) ?? null : null;
    },
    async findUserById(id: string) {
      return users.get(id) ?? null;
    },
    async createTenantAndUser(data) {
      const user: User = {
        id: crypto.randomUUID(),
        tenant_id: crypto.randomUUID(),
        email: data.email,
        password_hash: data.password_hash,
        first_name: data.first_name,
        last_name: data.last_name,
        role: 'owner',
        totp_secret: null,
        totp_enabled: false,
      };
      users.set(user.id, user);
      usersByEmail.set(data.email.toLowerCase(), user.id);
      return user;
    },
    async storeRefreshToken(userId, tokenHash, expiresAt) {
      refreshTokens.set(tokenHash, { user_id: userId, revoked_at: null, expires_at: expiresAt });
    },
    async findRefreshToken(tokenHash) {
      return refreshTokens.get(tokenHash) ?? null;
    },
    async revokeRefreshToken(tokenHash) {
      const token = refreshTokens.get(tokenHash);
      if (token) refreshTokens.set(tokenHash, { ...token, revoked_at: new Date() });
    },
    async revokeAllRefreshTokens(userId) {
      for (const [hash, token] of refreshTokens) {
        if (token.user_id === userId) refreshTokens.set(hash, { ...token, revoked_at: new Date() });
      }
    },
    async updateTotpSecret(userId, secret, enabled) {
      const user = users.get(userId);
      if (user) users.set(userId, { ...user, totp_secret: secret, totp_enabled: enabled });
    },
    async updateLastLogin() {},
  };

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

  // POST /api/auth/login (public)
  app.post('/api/auth/login', async (request, reply) => {
    const parsed = loginSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid login data',
          details: { issues: parsed.error.issues },
        },
      });
    }

    const result = await authService.login(parsed.data);
    if (!result.ok) {
      return reply.status(401).send({ error: result.error });
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
    return result.value;
  });

  // POST /api/auth/logout (authenticated)
  app.post(
    '/api/auth/logout',
    { preHandler: [authenticate] },
    async (request, reply) => {
      const parsed = refreshTokenSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Missing refresh token',
            details: { issues: parsed.error.issues },
          },
        });
      }

      const result = await authService.logout(parsed.data.refresh_token);
      if (!result.ok) {
        return reply.status(400).send({ error: result.error });
      }
      return reply.status(204).send();
    },
  );

  // POST /api/auth/2fa/enable (authenticated)
  app.post(
    '/api/auth/2fa/enable',
    { preHandler: [authenticate] },
    async (request, reply) => {
      const result = await authService.enable2fa(request.auth.user_id);
      if (!result.ok) {
        return reply.status(400).send({ error: result.error });
      }
      return result.value;
    },
  );

  // POST /api/auth/2fa/confirm (authenticated)
  app.post(
    '/api/auth/2fa/confirm',
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

      const result = await authService.confirm2fa(request.auth.user_id, parsed.data.code);
      if (!result.ok) {
        return reply.status(400).send({ error: result.error });
      }
      return reply.status(204).send();
    },
  );

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
