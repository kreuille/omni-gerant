import { createHash } from 'node:crypto';
import type { Result } from '@zenadmin/shared';
import { ok, err, appError, unauthorized, notFound } from '@zenadmin/shared';
import type { AppError } from '@zenadmin/shared';
import { hashPassword, verifyPassword } from './password.js';
import { generateTokenPair, generateAccessToken, type JwtPayload, type TokenPair } from './jwt.js';
import { generateTotpSecret, verifyTotpCode, type TotpSetup } from './totp.js';
import type { RegisterInput, LoginInput } from './auth.schemas.js';

export interface User {
  id: string;
  tenant_id: string;
  email: string;
  password_hash: string;
  first_name: string;
  last_name: string;
  role: string;
  totp_secret: string | null;
  totp_enabled: boolean;
}

export interface AuthRepository {
  findUserByEmail(email: string): Promise<User | null>;
  findUserById(id: string): Promise<User | null>;
  createTenantAndUser(data: {
    company_name: string;
    email: string;
    password_hash: string;
    first_name: string;
    last_name: string;
  }): Promise<User>;
  storeRefreshToken(userId: string, tokenHash: string, expiresAt: Date): Promise<void>;
  findRefreshToken(tokenHash: string): Promise<{ user_id: string; revoked_at: Date | null; expires_at: Date } | null>;
  revokeRefreshToken(tokenHash: string): Promise<void>;
  revokeAllRefreshTokens(userId: string): Promise<void>;
  updateTotpSecret(userId: string, secret: string | null, enabled: boolean): Promise<void>;
  updateLastLogin(userId: string): Promise<void>;
}

export interface LoginResult {
  requires_2fa: false;
  tokens: TokenPair;
  user: { id: string; email: string; first_name: string; last_name: string; role: string; tenant_id: string };
}

export interface Login2faResult {
  requires_2fa: true;
  temporary_token: string;
}

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function createAuthService(repo: AuthRepository) {
  return {
    async register(input: RegisterInput): Promise<Result<LoginResult, AppError>> {
      // Check if email already exists
      const existing = await repo.findUserByEmail(input.email);
      if (existing) {
        return err(appError('CONFLICT', 'Email already registered'));
      }

      const passwordHash = await hashPassword(input.password);
      const user = await repo.createTenantAndUser({
        company_name: input.company_name,
        email: input.email,
        password_hash: passwordHash,
        first_name: input.first_name,
        last_name: input.last_name,
      });

      const payload: JwtPayload = { user_id: user.id, tenant_id: user.tenant_id, role: user.role };
      const tokens = generateTokenPair(payload);

      // Store refresh token
      await repo.storeRefreshToken(user.id, hashToken(tokens.refresh_token), new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));
      await repo.updateLastLogin(user.id);

      return ok({
        requires_2fa: false,
        tokens,
        user: {
          id: user.id,
          email: user.email,
          first_name: user.first_name,
          last_name: user.last_name,
          role: user.role,
          tenant_id: user.tenant_id,
        },
      });
    },

    async login(input: LoginInput): Promise<Result<LoginResult | Login2faResult, AppError>> {
      const user = await repo.findUserByEmail(input.email);
      if (!user) {
        return err(unauthorized('Invalid email or password'));
      }

      const passwordValid = await verifyPassword(input.password, user.password_hash);
      if (!passwordValid) {
        return err(unauthorized('Invalid email or password'));
      }

      // If 2FA is enabled, return temporary token
      if (user.totp_enabled && user.totp_secret) {
        const tempPayload: JwtPayload = { user_id: user.id, tenant_id: user.tenant_id, role: user.role };
        const tempToken = generateAccessToken(tempPayload);
        return ok({
          requires_2fa: true,
          temporary_token: tempToken,
        });
      }

      // Generate tokens
      const payload: JwtPayload = { user_id: user.id, tenant_id: user.tenant_id, role: user.role };
      const tokens = generateTokenPair(payload);
      await repo.storeRefreshToken(user.id, hashToken(tokens.refresh_token), new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));
      await repo.updateLastLogin(user.id);

      return ok({
        requires_2fa: false,
        tokens,
        user: {
          id: user.id,
          email: user.email,
          first_name: user.first_name,
          last_name: user.last_name,
          role: user.role,
          tenant_id: user.tenant_id,
        },
      });
    },

    async refreshToken(refreshTokenValue: string): Promise<Result<TokenPair, AppError>> {
      const tokenHash = hashToken(refreshTokenValue);
      const stored = await repo.findRefreshToken(tokenHash);

      if (!stored) {
        return err(unauthorized('Invalid refresh token'));
      }
      if (stored.revoked_at) {
        return err(unauthorized('Refresh token has been revoked'));
      }
      if (stored.expires_at < new Date()) {
        return err(unauthorized('Refresh token expired'));
      }

      const user = await repo.findUserById(stored.user_id);
      if (!user) {
        return err(unauthorized('User not found'));
      }

      // Revoke old token and generate new pair
      await repo.revokeRefreshToken(tokenHash);
      const payload: JwtPayload = { user_id: user.id, tenant_id: user.tenant_id, role: user.role };
      const tokens = generateTokenPair(payload);
      await repo.storeRefreshToken(user.id, hashToken(tokens.refresh_token), new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));

      return ok(tokens);
    },

    async logout(refreshTokenValue: string): Promise<Result<void, AppError>> {
      const tokenHash = hashToken(refreshTokenValue);
      await repo.revokeRefreshToken(tokenHash);
      return ok(undefined);
    },

    async enable2fa(userId: string): Promise<Result<TotpSetup, AppError>> {
      const user = await repo.findUserById(userId);
      if (!user) {
        return err(notFound('User', userId));
      }

      const setup = generateTotpSecret(user.email);
      // Store secret but don't enable yet (need verification)
      await repo.updateTotpSecret(userId, setup.secret, false);
      return ok(setup);
    },

    async confirm2fa(userId: string, code: string): Promise<Result<void, AppError>> {
      const user = await repo.findUserById(userId);
      if (!user || !user.totp_secret) {
        return err(appError('BAD_REQUEST', '2FA setup not initiated'));
      }

      const result = verifyTotpCode(user.totp_secret, code);
      if (!result.ok) return result as Result<void, AppError>;
      if (!result.value) {
        return err(appError('BAD_REQUEST', 'Invalid 2FA code'));
      }

      await repo.updateTotpSecret(userId, user.totp_secret, true);
      return ok(undefined);
    },

    async disable2fa(userId: string, code: string): Promise<Result<void, AppError>> {
      const user = await repo.findUserById(userId);
      if (!user || !user.totp_secret || !user.totp_enabled) {
        return err(appError('BAD_REQUEST', '2FA is not enabled'));
      }

      const result = verifyTotpCode(user.totp_secret, code);
      if (!result.ok) return result as Result<void, AppError>;
      if (!result.value) {
        return err(appError('BAD_REQUEST', 'Invalid 2FA code'));
      }

      await repo.updateTotpSecret(userId, null, false);
      return ok(undefined);
    },
  };
}
