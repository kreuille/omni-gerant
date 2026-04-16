import { randomBytes, createHash } from 'node:crypto';
import type { Result } from '@zenadmin/shared';
import { ok, err, notFound, unauthorized } from '@zenadmin/shared';
import type { AppError } from '@zenadmin/shared';

// BUSINESS RULE [CDC-2.1]: Generation lien securise pour partage devis

export interface ShareToken {
  id: string;
  quote_id: string;
  tenant_id: string;
  token_hash: string;
  expires_at: Date;
  viewed_at: Date | null;
  signed_at: Date | null;
  created_at: Date;
}

export interface ShareTokenRepository {
  create(data: {
    quote_id: string;
    tenant_id: string;
    token_hash: string;
    expires_at: Date;
  }): Promise<ShareToken>;
  findByTokenHash(tokenHash: string): Promise<ShareToken | null>;
  markViewed(id: string): Promise<void>;
  markSigned(id: string, signatureData: SignatureData): Promise<void>;
}

export interface SignatureData {
  signer_name: string;
  signer_first_name: string;
  ip_address: string;
  user_agent: string;
  signed_at: Date;
  signature_image?: string; // Base64 canvas data
}

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function createShareService(repo: ShareTokenRepository) {
  return {
    // Generate a secure share token for a quote
    async generateToken(quoteId: string, tenantId: string, validityDate: Date): Promise<Result<{ token: string; expires_at: Date }, AppError>> {
      const token = randomBytes(32).toString('hex');
      const tokenHash = hashToken(token);

      await repo.create({
        quote_id: quoteId,
        tenant_id: tenantId,
        token_hash: tokenHash,
        expires_at: validityDate,
      });

      return ok({ token, expires_at: validityDate });
    },

    // Verify and retrieve share token data
    async verifyToken(token: string): Promise<Result<ShareToken, AppError>> {
      const tokenHash = hashToken(token);
      const shareToken = await repo.findByTokenHash(tokenHash);

      if (!shareToken) {
        return err(notFound('ShareToken'));
      }

      if (shareToken.expires_at < new Date()) {
        return err(unauthorized('This share link has expired'));
      }

      return ok(shareToken);
    },

    // Mark quote as viewed via share link
    async markViewed(token: string): Promise<Result<ShareToken, AppError>> {
      const verifyResult = await this.verifyToken(token);
      if (!verifyResult.ok) return verifyResult;

      const shareToken = verifyResult.value;
      if (!shareToken.viewed_at) {
        await repo.markViewed(shareToken.id);
      }

      return ok({ ...shareToken, viewed_at: shareToken.viewed_at ?? new Date() });
    },

    // Sign quote via share link
    async sign(token: string, signatureData: SignatureData): Promise<Result<ShareToken, AppError>> {
      const verifyResult = await this.verifyToken(token);
      if (!verifyResult.ok) return verifyResult;

      const shareToken = verifyResult.value;
      if (shareToken.signed_at) {
        return err(unauthorized('This quote has already been signed'));
      }

      await repo.markSigned(shareToken.id, signatureData);

      return ok({ ...shareToken, signed_at: new Date() });
    },
  };
}
