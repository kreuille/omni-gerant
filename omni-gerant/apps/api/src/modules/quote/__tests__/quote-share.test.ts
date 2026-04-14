import { describe, it, expect, vi } from 'vitest';
import { createShareService, type ShareTokenRepository, type ShareToken } from '../quote-share.js';

const QUOTE_ID = '550e8400-e29b-41d4-a716-446655440000';
const TENANT_ID = '660e8400-e29b-41d4-a716-446655440001';

function createMockShareToken(overrides?: Partial<ShareToken>): ShareToken {
  return {
    id: crypto.randomUUID(),
    quote_id: QUOTE_ID,
    tenant_id: TENANT_ID,
    token_hash: 'hashed-token',
    expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    viewed_at: null,
    signed_at: null,
    created_at: new Date(),
    ...overrides,
  };
}

function createMockRepo(existingToken?: ShareToken | null): ShareTokenRepository {
  return {
    create: vi.fn().mockImplementation(async (data) => ({
      id: crypto.randomUUID(),
      ...data,
      viewed_at: null,
      signed_at: null,
      created_at: new Date(),
    })),
    findByTokenHash: vi.fn().mockResolvedValue(existingToken ?? null),
    markViewed: vi.fn().mockResolvedValue(undefined),
    markSigned: vi.fn().mockResolvedValue(undefined),
  };
}

describe('ShareService', () => {
  describe('generateToken', () => {
    it('generates a secure token', async () => {
      const repo = createMockRepo();
      const service = createShareService(repo);

      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      const result = await service.generateToken(QUOTE_ID, TENANT_ID, expiresAt);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.token).toBeDefined();
        expect(result.value.token.length).toBe(64); // 32 bytes hex
        expect(result.value.expires_at).toEqual(expiresAt);
      }
      expect(repo.create).toHaveBeenCalledOnce();
    });

    it('stores hashed token, not raw token', async () => {
      const repo = createMockRepo();
      const service = createShareService(repo);

      const result = await service.generateToken(QUOTE_ID, TENANT_ID, new Date());

      if (result.ok) {
        const createCall = (repo.create as ReturnType<typeof vi.fn>).mock.calls[0]![0] as { token_hash: string };
        // Hash should be different from raw token
        expect(createCall.token_hash).not.toBe(result.value.token);
        // Hash should be 64 chars (SHA-256 hex)
        expect(createCall.token_hash.length).toBe(64);
      }
    });
  });

  describe('verifyToken', () => {
    it('returns token data for valid token', async () => {
      const shareToken = createMockShareToken();
      const repo = createMockRepo(shareToken);
      const service = createShareService(repo);

      const result = await service.verifyToken('some-token');

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.quote_id).toBe(QUOTE_ID);
      }
    });

    it('returns NOT_FOUND for unknown token', async () => {
      const repo = createMockRepo(null);
      const service = createShareService(repo);

      const result = await service.verifyToken('unknown-token');

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('NOT_FOUND');
      }
    });

    it('rejects expired token', async () => {
      const expiredToken = createMockShareToken({
        expires_at: new Date(Date.now() - 1000), // expired
      });
      const repo = createMockRepo(expiredToken);
      const service = createShareService(repo);

      const result = await service.verifyToken('expired-token');

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('UNAUTHORIZED');
        expect(result.error.message).toContain('expired');
      }
    });
  });

  describe('markViewed', () => {
    it('marks token as viewed on first access', async () => {
      const shareToken = createMockShareToken();
      const repo = createMockRepo(shareToken);
      const service = createShareService(repo);

      const result = await service.markViewed('some-token');

      expect(result.ok).toBe(true);
      expect(repo.markViewed).toHaveBeenCalledWith(shareToken.id);
    });

    it('does not re-mark already viewed token', async () => {
      const shareToken = createMockShareToken({ viewed_at: new Date() });
      const repo = createMockRepo(shareToken);
      const service = createShareService(repo);

      const result = await service.markViewed('some-token');

      expect(result.ok).toBe(true);
      expect(repo.markViewed).not.toHaveBeenCalled();
    });
  });

  describe('sign', () => {
    it('signs a quote via share link', async () => {
      const shareToken = createMockShareToken();
      const repo = createMockRepo(shareToken);
      const service = createShareService(repo);

      const signatureData = {
        signer_name: 'Dupont',
        signer_first_name: 'Jean',
        ip_address: '192.168.1.1',
        user_agent: 'Mozilla/5.0',
        signed_at: new Date(),
      };

      const result = await service.sign('some-token', signatureData);

      expect(result.ok).toBe(true);
      expect(repo.markSigned).toHaveBeenCalledWith(shareToken.id, signatureData);
    });

    it('rejects double signing', async () => {
      const shareToken = createMockShareToken({ signed_at: new Date() });
      const repo = createMockRepo(shareToken);
      const service = createShareService(repo);

      const result = await service.sign('some-token', {
        signer_name: 'Dupont',
        signer_first_name: 'Jean',
        ip_address: '192.168.1.1',
        user_agent: 'Mozilla/5.0',
        signed_at: new Date(),
      });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('UNAUTHORIZED');
        expect(result.error.message).toContain('already been signed');
      }
    });
  });
});
