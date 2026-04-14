import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import fp from 'fastify-plugin';

// BUSINESS RULE [R03]: Multi-tenant avec RLS
// This plugin ensures every authenticated request has a valid tenant_id
// and injects it into the request for use by services.
// The actual RLS filtering is handled by the Prisma tenant middleware
// in packages/db/src/middleware/tenant.ts

declare module 'fastify' {
  interface FastifyRequest {
    tenant_id: string;
  }
}

async function tenantPlugin(app: FastifyInstance) {
  app.decorateRequest('tenant_id', '');
}

export const registerTenantPlugin = fp(tenantPlugin, {
  name: 'tenant-plugin',
  dependencies: ['auth-plugin'],
});

// BUSINESS RULE [R03]: Tenant isolation hook - must run after authenticate
export function injectTenant(request: FastifyRequest, reply: FastifyReply, done: (err?: Error) => void) {
  if (!request.auth?.tenant_id) {
    reply.status(401).send({
      error: { code: 'UNAUTHORIZED', message: 'No tenant context' },
    });
    return;
  }

  request.tenant_id = request.auth.tenant_id;
  done();
}
