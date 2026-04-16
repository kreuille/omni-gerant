import { describe, it, expect, vi } from 'vitest';
import { createAuthService, type AuthRepository, type User } from '../auth.service.js';
import { hashPassword } from '../password.js';
import { verifyAccessToken } from '../jwt.js';
import { generateTotpSecret, verifyTotpCode } from '../totp.js';

const TENANT_ID = '550e8400-e29b-41d4-a716-446655440000';

async function createMockUser(overrides?: Partial<User>): Promise<User> {
  return {
    id: '660e8400-e29b-41d4-a716-446655440001',
    tenant_id: TENANT_ID,
    email: 'test@test.com',
    password_hash: await hashPassword('ValidPass1'),
    first_name: 'Test',
    last_name: 'User',
    role: 'owner',
    totp_secret: null,
    totp_enabled: false,
    ...overrides,
  };
}

function createMockRepo(user: User | null): AuthRepository {
  return {
    findUserByEmail: vi.fn().mockResolvedValue(user),
    findUserById: vi.fn().mockResolvedValue(user),
    createTenantAndUser: vi.fn().mockImplementation(async (data) => ({
      id: '660e8400-e29b-41d4-a716-446655440001',
      tenant_id: TENANT_ID,
      email: data.email,
      password_hash: data.password_hash,
      first_name: data.first_name,
      last_name: data.last_name,
      role: 'owner',
      totp_secret: null,
      totp_enabled: false,
    })),
    storeRefreshToken: vi.fn().mockResolvedValue(undefined),
    findRefreshToken: vi.fn().mockResolvedValue(null),
    revokeRefreshToken: vi.fn().mockResolvedValue(undefined),
    revokeAllRefreshTokens: vi.fn().mockResolvedValue(undefined),
    updateTotpSecret: vi.fn().mockResolvedValue(undefined),
    updateLastLogin: vi.fn().mockResolvedValue(undefined),
  };
}

describe('AuthService', () => {
  describe('register', () => {
    it('creates tenant and user, returns tokens', async () => {
      const repo = createMockRepo(null); // No existing user
      const service = createAuthService(repo);

      const result = await service.register({
        email: 'new@test.com',
        password: 'ValidPass1',
        first_name: 'New',
        last_name: 'User',
        company_name: 'New SARL',
      });

      expect(result.ok).toBe(true);
      if (result.ok && !result.value.requires_2fa) {
        expect(result.value.tokens.access_token).toBeDefined();
        expect(result.value.tokens.refresh_token).toBeDefined();
        expect(result.value.user.email).toBe('new@test.com');
      }
    });

    it('rejects duplicate email', async () => {
      const user = await createMockUser();
      const repo = createMockRepo(user);
      const service = createAuthService(repo);

      const result = await service.register({
        email: 'test@test.com',
        password: 'ValidPass1',
        first_name: 'Test',
        last_name: 'User',
        company_name: 'Test SARL',
      });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('CONFLICT');
      }
    });
  });

  describe('login', () => {
    it('returns tokens for valid credentials', async () => {
      const user = await createMockUser();
      const repo = createMockRepo(user);
      const service = createAuthService(repo);

      const result = await service.login({ email: 'test@test.com', password: 'ValidPass1' });

      expect(result.ok).toBe(true);
      if (result.ok && !result.value.requires_2fa) {
        expect(result.value.tokens.access_token).toBeDefined();
      }
    });

    it('rejects wrong password', async () => {
      const user = await createMockUser();
      const repo = createMockRepo(user);
      const service = createAuthService(repo);

      const result = await service.login({ email: 'test@test.com', password: 'WrongPass1' });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('UNAUTHORIZED');
      }
    });

    it('rejects nonexistent user', async () => {
      const repo = createMockRepo(null);
      const service = createAuthService(repo);

      const result = await service.login({ email: 'nobody@test.com', password: 'ValidPass1' });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('UNAUTHORIZED');
      }
    });

    it('returns temporary token when 2FA enabled', async () => {
      const user = await createMockUser({
        totp_enabled: true,
        totp_secret: 'JBSWY3DPEHPK3PXP',
      });
      const repo = createMockRepo(user);
      const service = createAuthService(repo);

      const result = await service.login({ email: 'test@test.com', password: 'ValidPass1' });

      expect(result.ok).toBe(true);
      if (result.ok && result.value.requires_2fa) {
        expect(result.value.temporary_token).toBeDefined();
      }
    });
  });

  describe('refreshToken', () => {
    it('rejects invalid refresh token', async () => {
      const repo = createMockRepo(null);
      const service = createAuthService(repo);

      const result = await service.refreshToken('invalid-token');

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('UNAUTHORIZED');
      }
    });

    it('rejects revoked refresh token', async () => {
      const repo = createMockRepo(null);
      (repo.findRefreshToken as ReturnType<typeof vi.fn>).mockResolvedValue({
        user_id: '1',
        revoked_at: new Date(),
        expires_at: new Date(Date.now() + 100000),
      });
      const service = createAuthService(repo);

      const result = await service.refreshToken('some-token');

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('UNAUTHORIZED');
        expect(result.error.message).toContain('revoked');
      }
    });

    it('rejects expired refresh token', async () => {
      const repo = createMockRepo(null);
      (repo.findRefreshToken as ReturnType<typeof vi.fn>).mockResolvedValue({
        user_id: '1',
        revoked_at: null,
        expires_at: new Date(Date.now() - 100000),
      });
      const service = createAuthService(repo);

      const result = await service.refreshToken('some-token');

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toContain('expired');
      }
    });
  });
});

describe('Password hashing', () => {
  it('hashes and verifies password', async () => {
    const hash = await hashPassword('MyPassword123');
    expect(hash).toMatch(/^scrypt:/);

    const { verifyPassword } = await import('../password.js');
    const valid = await verifyPassword('MyPassword123', hash);
    expect(valid).toBe(true);

    const invalid = await verifyPassword('WrongPassword', hash);
    expect(invalid).toBe(false);
  });
});

describe('JWT', () => {
  it('generates and verifies access token', async () => {
    const payload = { user_id: '1', tenant_id: TENANT_ID, role: 'owner' };
    const { generateAccessToken } = await import('../jwt.js');
    const token = generateAccessToken(payload);

    const result = verifyAccessToken(token);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.user_id).toBe('1');
      expect(result.value.tenant_id).toBe(TENANT_ID);
    }
  });

  it('rejects invalid token', () => {
    const result = verifyAccessToken('invalid-token');
    expect(result.ok).toBe(false);
  });
});

describe('TOTP', () => {
  it('generates secret and URI', () => {
    const setup = generateTotpSecret('test@test.com');
    expect(setup.secret).toBeDefined();
    expect(setup.uri).toContain('otpauth://totp/');
    expect(setup.uri).toContain('zenAdmin');
  });

  it('verifies valid code', async () => {
    const setup = generateTotpSecret('test@test.com');
    // Generate a valid code
    const OTPAuth = await import('otpauth');
    const totp = new OTPAuth.TOTP({
      secret: OTPAuth.Secret.fromBase32(setup.secret),
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
    });
    const code = totp.generate();

    const result = verifyTotpCode(setup.secret, code);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toBe(true);
    }
  });

  it('rejects invalid code', () => {
    const setup = generateTotpSecret('test@test.com');
    const result = verifyTotpCode(setup.secret, '000000');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toBe(false);
    }
  });
});
