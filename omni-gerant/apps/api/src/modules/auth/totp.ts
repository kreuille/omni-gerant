import * as OTPAuth from 'otpauth';
import type { Result } from '@zenadmin/shared';
import { ok, err, appError } from '@zenadmin/shared';
import type { AppError } from '@zenadmin/shared';

// BUSINESS RULE [CDC-6]: Double authentification (2FA) obligatoire

export interface TotpSetup {
  secret: string;
  uri: string;
}

export function generateTotpSecret(email: string): TotpSetup {
  const totp = new OTPAuth.TOTP({
    issuer: 'zenAdmin',
    label: email,
    algorithm: 'SHA1',
    digits: 6,
    period: 30,
  });

  return {
    secret: totp.secret.base32,
    uri: totp.toString(),
  };
}

export function verifyTotpCode(secret: string, code: string): Result<boolean, AppError> {
  try {
    const totp = new OTPAuth.TOTP({
      issuer: 'zenAdmin',
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
      secret: OTPAuth.Secret.fromBase32(secret),
    });

    // Allow 1 period tolerance (window = 1)
    const delta = totp.validate({ token: code, window: 1 });
    if (delta === null) {
      return ok(false);
    }
    return ok(true);
  } catch {
    return err(appError('BAD_REQUEST', 'Invalid TOTP configuration'));
  }
}
