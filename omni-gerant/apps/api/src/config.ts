import { z } from 'zod';

// BUSINESS RULE [R08]: Variables d'env validees avec Zod au demarrage (crash si invalide)
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3001),
  HOST: z.string().default('0.0.0.0'),
  DATABASE_URL: z.string().min(1),
  LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).default('info'),
  RATE_LIMIT_MAX: z.coerce.number().int().min(1).default(100),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().min(1000).default(60000),
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default('15m'),
  CORS_ORIGIN: z.string().default('http://localhost:3000'),
});

export type Env = z.infer<typeof envSchema>;

let _config: Env | null = null;

export function loadConfig(): Env {
  if (_config) return _config;

  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    const errors = result.error.flatten().fieldErrors;
    const errorMessages = Object.entries(errors)
      .map(([key, msgs]) => `  ${key}: ${(msgs ?? []).join(', ')}`)
      .join('\n');
    throw new Error(`Invalid environment variables:\n${errorMessages}`);
  }

  const config = result.data;

  // BUSINESS RULE [D1]: Reject default/insecure secrets in production
  if (config.NODE_ENV === 'production') {
    const INSECURE_SECRETS = [
      'change-me-to-a-random-64-char-string',
      'omni-gerant-prod-secret-key-at-least-32-characters-long',
    ];
    if (INSECURE_SECRETS.includes(config.JWT_SECRET)) {
      throw new Error('JWT_SECRET must be changed from default value in production');
    }
  }

  _config = config;
  return _config;
}

export function getConfig(): Env {
  if (!_config) {
    return loadConfig();
  }
  return _config;
}

export function resetConfig(): void {
  _config = null;
}
