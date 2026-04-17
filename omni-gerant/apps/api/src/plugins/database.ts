import type { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import { prisma } from '@zenadmin/db';

declare module 'fastify' {
  interface FastifyInstance {
    prisma: typeof prisma;
  }
}

async function databasePlugin(app: FastifyInstance) {
  app.decorate('prisma', prisma);

  app.addHook('onClose', async () => {
    await prisma.$disconnect();
  });
}

export const registerDatabasePlugin = fp(databasePlugin, {
  name: 'database-plugin',
});
