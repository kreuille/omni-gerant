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

// BUSINESS RULE [CDC-6]: Authentication hook - verifies JWT
export function authenticate(request: FastifyRequest, reply: FastifyReply, done: (err?: Error) => void) {
  const authHeader = request.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    reply.status(401).send({
      error: { code: 'UNAUTHORIZED', message: 'Missing or invalid authorization header' },
    });
    return;
  }

  const token = authHeader.slice(7);
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
