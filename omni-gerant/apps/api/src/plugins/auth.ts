import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import fp from 'fastify-plugin';
import { createHash } from 'node:crypto';
import type { UserRole } from '@zenadmin/shared';
import { verifyAccessToken } from '../modules/auth/jwt.js';
import { checkPermission, type Resource, type Action } from '../modules/auth/rbac.js';
import { isJwtBlacklisted } from '../modules/auth/auth.routes.js';
import { getRequestContext } from '../middleware/request-context.js';

// BUSINESS RULE [R03]: Multi-tenant - every authenticated request carries tenant context

declare module 'fastify' {
  interface FastifyRequest {
    auth: {
      user_id: string;
      tenant_id: string;
      role: UserRole;
    };
  }
}

async function authPlugin(app: FastifyInstance) {
  app.decorateRequest('auth', null);
}

export const registerAuthPlugin = fp(authPlugin, { name: 'auth-plugin' });

// BUSINESS RULE [CDC-6]: Authentication hook - verifies JWT (header OR cookie)
export function authenticate(request: FastifyRequest, reply: FastifyReply, done: (err?: Error) => void) {
  // P1-06 : lecture duale — Authorization header OU cookie HttpOnly `zen_access`
  const authHeader = request.headers.authorization;
  const bearer = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  const cookieToken = (request.cookies as Record<string, string | undefined> | undefined)?.['zen_access'];
  const token = bearer ?? cookieToken;

  if (!token) {
    reply.status(401).send({
      error: { code: 'UNAUTHORIZED', message: 'Session requise (cookie ou en-tête Authorization manquant).' },
    });
    return;
  }

  // P1-06 CSRF double-submit : si authent par cookie sur mutations, exiger X-CSRF-Token
  const method = request.method.toUpperCase();
  const isMutation = method === 'POST' || method === 'PUT' || method === 'PATCH' || method === 'DELETE';
  if (!bearer && isMutation) {
    const csrfCookie = (request.cookies as Record<string, string | undefined> | undefined)?.['zen_csrf'];
    const csrfHeader = request.headers['x-csrf-token'];
    if (!csrfCookie || !csrfHeader || csrfCookie !== csrfHeader) {
      reply.status(403).send({
        error: { code: 'CSRF_MISMATCH', message: 'Jeton CSRF invalide ou manquant.' },
      });
      return;
    }
  }

  // P1-07 : blacklist post-logout
  const tokenHash = createHash('sha256').update(token).digest('hex');
  if (isJwtBlacklisted(tokenHash)) {
    reply.status(401).send({
      error: { code: 'TOKEN_REVOKED', message: 'Session déconnectée.' },
    });
    return;
  }
  const result = verifyAccessToken(token);
  if (!result.ok) {
    reply.status(401).send({
      error: { code: 'UNAUTHORIZED', message: result.error.message },
    });
    return;
  }

  const payload = result.value;
  request.auth = {
    user_id: payload.user_id,
    tenant_id: payload.tenant_id,
    role: payload.role as UserRole,
  };

  // Update request context with authenticated user info
  const ctx = getRequestContext();
  if (ctx) {
    ctx.tenant_id = payload.tenant_id;
    ctx.user_id = payload.user_id;
  }

  done();
}

// BUSINESS RULE [CDC-6]: Authorization hook factory - checks RBAC permissions
export function requirePermission(resource: Resource, action: Action) {
  return function (request: FastifyRequest, reply: FastifyReply, done: (err?: Error) => void) {
    if (!request.auth) {
      reply.status(401).send({
        error: { code: 'UNAUTHORIZED', message: 'Not authenticated' },
      });
      return;
    }

    const result = checkPermission(request.auth.role, resource, action);
    if (!result.ok) {
      reply.status(403).send({
        error: { code: 'FORBIDDEN', message: result.error.message },
      });
      return;
    }

    done();
  };
}

// Convenience: require any of the listed roles
export function requireRole(...roles: UserRole[]) {
  return function (request: FastifyRequest, reply: FastifyReply, done: (err?: Error) => void) {
    if (!request.auth) {
      reply.status(401).send({
        error: { code: 'UNAUTHORIZED', message: 'Not authenticated' },
      });
      return;
    }

    if (!roles.includes(request.auth.role)) {
      reply.status(403).send({
        error: { code: 'FORBIDDEN', message: `Requires role: ${roles.join(' or ')}` },
      });
      return;
    }

    done();
  };
}
