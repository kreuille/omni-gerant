// BUSINESS RULE [CDC-3.1]: Cache Redis avec invalidation par tenant

export interface CacheStore {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttlSeconds: number): Promise<void>;
  del(key: string): Promise<void>;
  delPattern(pattern: string): Promise<void>;
}

/**
 * In-memory cache store (for dev/testing, use Redis in production)
 */
export function createMemoryCacheStore(): CacheStore {
  const store = new Map<string, { value: string; expiresAt: number }>();

  function cleanup() {
    const now = Date.now();
    for (const [key, entry] of store) {
      if (entry.expiresAt <= now) {
        store.delete(key);
      }
    }
  }

  return {
    async get(key) {
      const entry = store.get(key);
      if (!entry) return null;
      if (entry.expiresAt <= Date.now()) {
        store.delete(key);
        return null;
      }
      return entry.value;
    },
    async set(key, value, ttlSeconds) {
      cleanup();
      store.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
    },
    async del(key) {
      store.delete(key);
    },
    async delPattern(pattern) {
      const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
      for (const key of store.keys()) {
        if (regex.test(key)) {
          store.delete(key);
        }
      }
    },
  };
}

/**
 * Redis cache store (production)
 */
export function createRedisCacheStore(redisUrl: string): CacheStore {
  // Placeholder — in production, use ioredis or redis package
  // For now, falls back to in-memory
  void redisUrl;
  return createMemoryCacheStore();
}

// TTL constants (in seconds)
export const CACHE_TTL = {
  DASHBOARD_KPIS: 5 * 60,       // 5 minutes
  CLIENT_LIST: 60,                // 1 minute
  PRODUCT_LIST: 60,               // 1 minute
  SIRET_LOOKUP: 24 * 60 * 60,    // 24 hours
  PPF_DIRECTORY: 12 * 60 * 60,   // 12 hours
  TENANT_CONFIG: 10 * 60,         // 10 minutes
} as const;

/**
 * Cache helper with typed get/set and automatic invalidation
 */
export function createCacheHelper(store: CacheStore) {
  return {
    /**
     * Get cached value, or compute and cache it
     */
    async getOrSet<T>(
      key: string,
      ttlSeconds: number,
      compute: () => Promise<T>,
    ): Promise<T> {
      const cached = await store.get(key);
      if (cached !== null) {
        return JSON.parse(cached) as T;
      }
      const value = await compute();
      await store.set(key, JSON.stringify(value), ttlSeconds);
      return value;
    },

    /**
     * Invalidate a specific key
     */
    async invalidate(key: string): Promise<void> {
      await store.del(key);
    },

    /**
     * Invalidate all keys matching pattern (e.g., tenant:*)
     */
    async invalidatePattern(pattern: string): Promise<void> {
      await store.delPattern(pattern);
    },

    /**
     * Invalidate all cache for a tenant (on mutation)
     */
    async invalidateTenant(tenantId: string): Promise<void> {
      await store.delPattern(`tenant:${tenantId}:*`);
    },

    /**
     * Build a tenant-scoped cache key
     */
    key(tenantId: string, ...parts: string[]): string {
      return `tenant:${tenantId}:${parts.join(':')}`;
    },
  };
}
