import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Fastify from 'fastify';
import type { FastifyInstance } from 'fastify';
import { registerErrorHandler } from '../plugins/error-handler.js';
import { loadConfig } from '../config.js';
import type { AppError } from '@zenadmin/shared';

describe('Error handler', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    process.env['NODE_ENV'] = 'test';
    process.env['LOG_LEVEL'] = 'error';
    loadConfig();

    app = Fastify({ logger: false });
    registerErrorHandler(app);

    // Route that throws AppError
    app.get('/app-error', async () => {
      const error = new Error('Not found') as Error & { appError: AppError };
      error.appError = { code: 'NOT_FOUND', message: 'Invoice not found' };
      throw error;
    });

    // Route that throws unknown error
    app.get('/unknown-error', async () => {
      throw new Error('Something went wrong');
    });

    // Route that throws with statusCode
    app.get('/http-error', async (_req, reply) => {
      return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Not found' } });
    });

    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('handles AppError with correct status code', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/app-error',
    });

    expect(response.statusCode).toBe(404);
    const body = JSON.parse(response.body);
    expect(body.error.code).toBe('NOT_FOUND');
    expect(body.error.message).toBe('Invoice not found');
  });

  it('handles unknown errors with 500', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/unknown-error',
    });

    expect(response.statusCode).toBe(500);
    const body = JSON.parse(response.body);
    expect(body.error.code).toBe('INTERNAL_ERROR');
    expect(body.error.message).toBe('An unexpected error occurred');
  });

  it('returns standard error format', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/app-error',
    });

    const body = JSON.parse(response.body);
    expect(body).toHaveProperty('error');
    expect(body.error).toHaveProperty('code');
    expect(body.error).toHaveProperty('message');
  });
});
