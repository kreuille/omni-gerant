import { describe, it, expect, beforeEach } from 'vitest';
import { loadConfig, resetConfig } from '../config.js';

describe('Config', () => {
  beforeEach(() => {
    resetConfig();
  });

  it('loads config with defaults', () => {
    process.env['NODE_ENV'] = 'test';
    const config = loadConfig();
    expect(config.NODE_ENV).toBe('test');
    expect(config.PORT).toBe(3001);
    expect(config.HOST).toBe('0.0.0.0');
    expect(config.LOG_LEVEL).toBe('info');
    expect(config.RATE_LIMIT_MAX).toBe(100);
  });

  it('overrides with env vars', () => {
    process.env['NODE_ENV'] = 'production';
    process.env['PORT'] = '8080';
    process.env['LOG_LEVEL'] = 'warn';
    const config = loadConfig();
    expect(config.PORT).toBe(8080);
    expect(config.LOG_LEVEL).toBe('warn');
    // Cleanup
    delete process.env['PORT'];
    delete process.env['LOG_LEVEL'];
    process.env['NODE_ENV'] = 'test';
  });

  it('rejects invalid NODE_ENV', () => {
    process.env['NODE_ENV'] = 'invalid';
    expect(() => loadConfig()).toThrow('Invalid environment variables');
    process.env['NODE_ENV'] = 'test';
  });

  it('rejects default JWT_SECRET in production', () => {
    process.env['NODE_ENV'] = 'production';
    process.env['JWT_SECRET'] = 'change-me-to-a-random-64-char-string';
    expect(() => loadConfig()).toThrow('JWT_SECRET must be changed from default value');
    process.env['NODE_ENV'] = 'test';
  });

  it('accepts custom JWT_SECRET in production', () => {
    process.env['NODE_ENV'] = 'production';
    process.env['JWT_SECRET'] = 'a-real-production-secret-that-is-at-least-32-characters';
    const config = loadConfig();
    expect(config.NODE_ENV).toBe('production');
    // Cleanup
    process.env['NODE_ENV'] = 'test';
  });
});
