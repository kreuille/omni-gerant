// Vague K3 : 2FA par email (fallback TOTP).
// Envoie un code 6 chiffres par email valide 10 minutes.

import { createHash, randomInt } from 'node:crypto';
import { createEmailService, createDefaultEmailProvider } from '../../lib/email.js';

const OTP_TTL_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 5;

function hashCode(code: string): string {
  return createHash('sha256').update(code).digest('hex');
}

function generateCode(): string {
  // 6 chiffres entre 100000 et 999999
  return String(randomInt(100000, 1000000));
}

export async function sendEmailOtp(userId: string, email: string, purpose: 'login' | 'sensitive_action' = 'login'): Promise<{ sent: boolean; expires_at: string }> {
  const { prisma } = await import('@zenadmin/db');
  const code = generateCode();
  const codeHash = hashCode(code);
  const expiresAt = new Date(Date.now() + OTP_TTL_MS);

  await (prisma as unknown as { emailOtpChallenge?: { create?: Function } })
    .emailOtpChallenge?.create?.({
      data: {
        user_id: userId,
        code_hash: codeHash,
        purpose,
        expires_at: expiresAt,
      },
    });

  const emailService = createEmailService(createDefaultEmailProvider());
  await emailService.send({
    to: email,
    subject: `zenAdmin — Code de vérification : ${code}`,
    html: `<p>Votre code de vérification à usage unique :</p>
      <p style="font-size:24px;font-weight:bold;letter-spacing:4px;font-family:monospace;">${code}</p>
      <p style="color:#6b7280;font-size:13px">Valable 10 minutes. Ne le partagez avec personne.</p>
      <p style="color:#9ca3af;font-size:11px">Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.</p>`,
    text: `Votre code de vérification : ${code}. Valable 10 minutes.`,
  });

  return { sent: true, expires_at: expiresAt.toISOString() };
}

export async function verifyEmailOtp(
  userId: string,
  code: string,
  purpose: 'login' | 'sensitive_action' = 'login',
): Promise<{ valid: boolean; reason?: string }> {
  const { prisma } = await import('@zenadmin/db');
  const p = prisma as unknown as {
    emailOtpChallenge?: { findFirst?: Function; update?: Function };
  };

  const challenge = await p.emailOtpChallenge?.findFirst?.({
    where: {
      user_id: userId,
      purpose,
      used_at: null,
      expires_at: { gte: new Date() },
    },
    orderBy: { created_at: 'desc' },
  }) as { id: string; code_hash: string; attempts: number } | null;

  if (!challenge) return { valid: false, reason: 'no_active_challenge' };
  if (challenge.attempts >= MAX_ATTEMPTS) {
    return { valid: false, reason: 'too_many_attempts' };
  }

  if (hashCode(code) !== challenge.code_hash) {
    await p.emailOtpChallenge?.update?.({
      where: { id: challenge.id },
      data: { attempts: { increment: 1 } },
    });
    return { valid: false, reason: 'wrong_code' };
  }

  await p.emailOtpChallenge?.update?.({
    where: { id: challenge.id },
    data: { used_at: new Date() },
  });
  return { valid: true };
}
