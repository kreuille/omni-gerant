import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { buildApp } from '../app.js';
import type { FastifyInstance } from 'fastify';

// Mock prisma to avoid needing a real database in tests
vi.mock('@zenadmin/db', () => {
  const mockPrisma = {
    $connect: vi.fn().mockResolvedValue(undefined),
    $disconnect: vi.fn().mockResolvedValue(undefined),
    $queryRaw: vi.fn().mockResolvedValue([{ '?column?': 1 }]),
    $use: vi.fn(),
  };
  return {
    prisma: mockPrisma,
    PrismaClient: vi.fn(),
  };
});

describe('Health endpoints', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    process.env['NODE_ENV'] = 'test';
    process.env['LOG_LEVEL'] = 'error';
    app = await buildApp();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /health', () => {
    it('returns 200 with status ok', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/health',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.status).toBe('ok');
      expect(body.timestamp).toBeDefined();
      expect(body.uptime).toBeGreaterThan(0);
    });
  });

  describe('GET /ready', () => {
    it('returns 200 with readiness checks', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/ready',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.status).toBe('ok');
      expect(body.checks.server).toBe('ok');
      expect(body.checks.database).toBe('ok');
    });
  });

  describe('GET /health/ready', () => {
    it('returns 200 with DB check', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/health/ready',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.status).toBe('ok');
      expect(body.checks.database).toBe('ok');
    });
  });

  describe('GET /health/full', () => {
    it('returns full health info with DB and memory', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/health/full',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.status).toBe('ok');
      expect(body.db).toBe('connected');
      expect(body.memory).toBeDefined();
      expect(body.memory.rss_mb).toBeGreaterThanOrEqual(0);
    });
  });

  describe('GET /health/live', () => {
    it('returns alive true', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/health/live',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.alive).toBe(true);
    });
  });

  describe('GET /metrics', () => {
    it('returns metrics data', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/metrics',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.requests_total).toBeGreaterThanOrEqual(0);
      expect(body.uptime_seconds).toBeGreaterThan(0);
      expect(body.memory).toBeDefined();
    });
  });
});
