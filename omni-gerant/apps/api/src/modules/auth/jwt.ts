import jwt from 'jsonwebtoken';
import { randomBytes } from 'node:crypto';
import type { Result } from '@zenadmin/shared';
import { ok, err, appError } from '@zenadmin/shared';
import type { AppError } from '@zenadmin/shared';

export interface JwtPayload {
  user_id: string;
  tenant_id: string;
  role: string;
}

export interface TokenPair {
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

const DEFAULT_SECRET = 'dev-secret-change-in-production-min-32-chars!!';

function getSecret(): string {
  return process.env['JWT_SECRET'] ?? DEFAULT_SECRET;
}

export function generateAccessToken(payload: JwtPayload): string {
  return jwt.sign(payload, getSecret(), {
    expiresIn: '15m',
    issuer: 'zenadmin',
  });
}

export function generateRefreshToken(): string {
  return randomBytes(48).toString('hex');
}

export function verifyAccessToken(token: string): Result<JwtPayload, AppError> {
  try {
    const payload = jwt.verify(token, getSecret(), {
      issuer: 'zenadmin',
    }) as JwtPayload;
    return ok(payload);
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return err(appError('UNAUTHORIZED', 'Token expired'));
    }
    return err(appError('UNAUTHORIZED', 'Invalid token'));
  }
}

export function generateTokenPair(payload: JwtPayload): TokenPair {
  return {
    access_token: generateAccessToken(payload),
    refresh_token: generateRefreshToken(),
    expires_in: 900, // 15 minutes in seconds
  };
}
