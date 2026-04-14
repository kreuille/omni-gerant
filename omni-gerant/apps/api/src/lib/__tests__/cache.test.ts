import { describe, it, expect, beforeEach } from 'vitest';
import { createMemoryCacheStore, createCacheHelper, CACHE_TTL } from '../cache.js';
import { tenantFilter, statusFilter, clientFilter, dateRangeFilter, cursorPagination } from '../query-optimizer.js';

const TENANT_ID = '00000000-0000-0000-0000-000000000001';

describe('MemoryCacheStore', () => {
  let store: ReturnType<typeof createMemoryCacheStore>;

  beforeEach(() => {
    store = createMemoryCacheStore();
  });

  it('returns null for cache miss', async () => {
    const result = await store.get('nonexistent');
    expect(result).toBeNull();
  });

  it('stores and retrieves values', async () => {
    await store.set('key1', 'value1', 60);
    const result = await store.get('key1');
    expect(result).toBe('value1');
  });

  it('deletes a key', async () => {
    await store.set('key2', 'value2', 60);
    await store.del('key2');
    const result = await store.get('key2');
    expect(result).toBeNull();
  });

  it('deletes keys by pattern', async () => {
    await store.set('tenant:abc:clients', '[]', 60);
    await store.set('tenant:abc:products', '[]', 60);
    await store.set('tenant:xyz:clients', '[]', 60);

    await store.delPattern('tenant:abc:*');

    expect(await store.get('tenant:abc:clients')).toBeNull();
    expect(await store.get('tenant:abc:products')).toBeNull();
    expect(await store.get('tenant:xyz:clients')).toBe('[]');
  });

  it('expires entries after TTL', async () => {
    // Set with 0 TTL (immediately expired)
    await store.set('expired', 'value', 0);
    // Wait a tick
    await new Promise((r) => setTimeout(r, 10));
    const result = await store.get('expired');
    expect(result).toBeNull();
  });
});

describe('CacheHelper', () => {
  let helper: ReturnType<typeof createCacheHelper>;

  beforeEach(() => {
    const store = createMemoryCacheStore();
    helper = createCacheHelper(store);
  });

  it('caches computed values (cache miss then hit)', async () => {
    let computeCount = 0;
    const compute = async () => {
      computeCount++;
      return { data: 'expensive result' };
    };

    const key = helper.key(TENANT_ID, 'dashboard');

    // First call — cache miss
    const result1 = await helper.getOrSet(key, 60, compute);
    expect(result1).toEqual({ data: 'expensive result' });
    expect(computeCount).toBe(1);

    // Second call — cache hit (no recompute)
    const result2 = await helper.getOrSet(key, 60, compute);
    expect(result2).toEqual({ data: 'expensive result' });
    expect(computeCount).toBe(1); // Still 1 — cache hit
  });

  it('invalidates specific key', async () => {
    let computeCount = 0;
    const compute = async () => {
      computeCount++;
      return { n: computeCount };
    };

    const key = helper.key(TENANT_ID, 'clients');

    await helper.getOrSet(key, 60, compute);
    expect(computeCount).toBe(1);

    await helper.invalidate(key);

    await helper.getOrSet(key, 60, compute);
    expect(computeCount).toBe(2); // Recomputed after invalidation
  });

  it('invalidates all tenant keys', async () => {
    const key1 = helper.key(TENANT_ID, 'clients');
    const key2 = helper.key(TENANT_ID, 'products');
    const key3 = helper.key('other-tenant', 'clients');

    await helper.getOrSet(key1, 60, async () => 'clients');
    await helper.getOrSet(key2, 60, async () => 'products');
    await helper.getOrSet(key3, 60, async () => 'other');

    await helper.invalidateTenant(TENANT_ID);

    let recomputed = false;
    await helper.getOrSet(key1, 60, async () => { recomputed = true; return 'new'; });
    expect(recomputed).toBe(true);

    // Other tenant not affected
    let otherRecomputed = false;
    await helper.getOrSet(key3, 60, async () => { otherRecomputed = true; return 'new'; });
    expect(otherRecomputed).toBe(false);
  });

  it('builds correct tenant-scoped keys', () => {
    expect(helper.key(TENANT_ID, 'dashboard')).toBe(`tenant:${TENANT_ID}:dashboard`);
    expect(helper.key(TENANT_ID, 'clients', 'list')).toBe(`tenant:${TENANT_ID}:clients:list`);
  });
});

describe('CACHE_TTL constants', () => {
  it('has correct TTL values', () => {
    expect(CACHE_TTL.DASHBOARD_KPIS).toBe(300);        // 5 min
    expect(CACHE_TTL.CLIENT_LIST).toBe(60);             // 1 min
    expect(CACHE_TTL.PRODUCT_LIST).toBe(60);            // 1 min
    expect(CACHE_TTL.SIRET_LOOKUP).toBe(86400);         // 24h
    expect(CACHE_TTL.PPF_DIRECTORY).toBe(43200);        // 12h
    expect(CACHE_TTL.TENANT_CONFIG).toBe(600);          // 10 min
  });
});

describe('QueryOptimizer', () => {
  it('builds tenant filter with soft delete', () => {
    const filter = tenantFilter(TENANT_ID);
    expect(filter.tenant_id).toBe(TENANT_ID);
    expect(filter.deleted_at).toBeNull();
  });

  it('builds status filter', () => {
    const filter = statusFilter(TENANT_ID, 'draft');
    expect(filter.tenant_id).toBe(TENANT_ID);
    expect(filter.status).toBe('draft');
    expect(filter.deleted_at).toBeNull();
  });

  it('builds client filter', () => {
    const filter = clientFilter(TENANT_ID, 'client-001');
    expect(filter.tenant_id).toBe(TENANT_ID);
    expect(filter.client_id).toBe('client-001');
    expect(filter.deleted_at).toBeNull();
  });

  it('builds date range filter', () => {
    const from = new Date('2026-01-01');
    const to = new Date('2026-03-31');
    const filter = dateRangeFilter(TENANT_ID, from, to);
    expect(filter.tenant_id).toBe(TENANT_ID);
    expect(filter.date).toEqual({ gte: from, lte: to });
  });

  it('builds cursor pagination', () => {
    const first = cursorPagination(undefined, 20);
    expect(first.take).toBe(21); // N+1 for hasMore
    expect(first.orderBy.created_at).toBe('desc');

    const next = cursorPagination('cursor-id', 10);
    expect(next.take).toBe(11);
    expect(next.cursor).toEqual({ id: 'cursor-id' });
    expect(next.skip).toBe(1);
  });
});
