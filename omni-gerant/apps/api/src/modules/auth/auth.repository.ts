import { prisma } from '@zenadmin/db';
import type { AuthRepository, User } from './auth.service.js';

// BUSINESS RULE [CDC-6]: Auth repository — Prisma implementation

export function createPrismaAuthRepository(): AuthRepository {
  return {
    async findUserByEmail(email: string): Promise<User | null> {
      const user = await prisma.user.findFirst({
        where: { email: email.toLowerCase() },
      });
      if (!user) return null;
      return mapUser(user);
    },

    async findUserById(id: string): Promise<User | null> {
      const user = await prisma.user.findUnique({ where: { id } });
      if (!user) return null;
      return mapUser(user);
    },

    async createTenantAndUser(data) {
      const result = await prisma.$transaction(async (tx) => {
        const tenant = await tx.tenant.create({
          data: {
            name: data.company_name,
            plan: 'starter',
            settings: {},
          },
        });

        const user = await tx.user.create({
          data: {
            tenant_id: tenant.id,
            email: data.email.toLowerCase(),
            password_hash: data.password_hash,
            first_name: data.first_name,
            last_name: data.last_name,
            role: 'owner',
          },
        });

        return user;
      });

      return mapUser(result);
    },

    async storeRefreshToken(userId, tokenHash, expiresAt) {
      await prisma.refreshToken.create({
        data: {
          user_id: userId,
          token_hash: tokenHash,
          expires_at: expiresAt,
        },
      });
    },

    async findRefreshToken(tokenHash) {
      const token = await prisma.refreshToken.findUnique({
        where: { token_hash: tokenHash },
      });
      if (!token) return null;
      return {
        user_id: token.user_id,
        revoked_at: token.revoked_at,
        expires_at: token.expires_at,
      };
    },

    async revokeRefreshToken(tokenHash) {
      await prisma.refreshToken.update({
        where: { token_hash: tokenHash },
        data: { revoked_at: new Date() },
      }).catch(() => {
        // Token may not exist — no-op
      });
    },

    async revokeAllRefreshTokens(userId) {
      await prisma.refreshToken.updateMany({
        where: { user_id: userId, revoked_at: null },
        data: { revoked_at: new Date() },
      });
    },

    async updateTotpSecret(userId, secret, enabled) {
      await prisma.user.update({
        where: { id: userId },
        data: { totp_secret: secret, totp_enabled: enabled },
      });
    },

    async updateLastLogin(userId) {
      await prisma.user.update({
        where: { id: userId },
        data: { last_login_at: new Date() },
      });
    },
  };
}

function mapUser(row: {
  id: string;
  tenant_id: string;
  email: string;
  password_hash: string;
  first_name: string;
  last_name: string;
  role: string;
  totp_secret: string | null;
  totp_enabled: boolean;
}): User {
  return {
    id: row.id,
    tenant_id: row.tenant_id,
    email: row.email,
    password_hash: row.password_hash,
    first_name: row.first_name,
    last_name: row.last_name,
    role: row.role,
    totp_secret: row.totp_secret,
    totp_enabled: row.totp_enabled,
  };
}
