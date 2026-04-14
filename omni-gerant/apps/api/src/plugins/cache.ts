import type { FastifyInstance } from 'fastify';
import { createMemoryCacheStore, createRedisCacheStore, createCacheHelper } from '../lib/cache.js';

// BUSINESS RULE [CDC-3.1]: Plugin cache Fastify avec Redis

declare module 'fastify' {
  interface FastifyInstance {
    cache: ReturnType<typeof createCacheHelper>;
  }
}

export async function registerCachePlugin(app: FastifyInstance) {
  const redisUrl = process.env.REDIS_URL;

  const store = redisUrl
    ? createRedisCacheStore(redisUrl)
    : createMemoryCacheStore();

  const cache = createCacheHelper(store);

  app.decorate('cache', cache);

  app.log.info(
    { driver: redisUrl ? 'redis' : 'memory' },
    'Cache plugin registered',
  );
}
