// BUSINESS RULE [CDC-6 / S3]: OAuth Google Sign-in
//
// Utilise Google Sign-In OAuth 2.0 (pas de Firebase) — flow Authorization Code :
//  1. Frontend ouvre https://accounts.google.com/o/oauth2/v2/auth?...client_id&redirect_uri
//  2. Google redirige vers /api/auth/oauth/google/callback?code=XXX
//  3. Backend echange code pour access_token + id_token (JWT)
//  4. Verifier id_token -> email verifie + email + name + sub (google user id)
//  5. Creer ou retrouver User + generer tokens JWT zenAdmin

import { prisma } from '@zenadmin/db';
import type { Result, AppError } from '@zenadmin/shared';
import { ok, err, validationError } from '@zenadmin/shared';

const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_USERINFO_URL = 'https://openidconnect.googleapis.com/v1/userinfo';

interface GoogleUserInfo {
  sub: string;       // Google user ID
  email: string;
  email_verified: boolean;
  name?: string;
  given_name?: string;
  family_name?: string;
  picture?: string;
}

export function getGoogleAuthUrl(state: string, redirectUri: string): string | null {
  const clientId = process.env['GOOGLE_OAUTH_CLIENT_ID'];
  if (!clientId) return null;
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    state,
    access_type: 'online',
    prompt: 'select_account',
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export async function handleGoogleCallback(code: string, redirectUri: string): Promise<Result<{
  userId: string; tenantId: string; isNewUser: boolean; email: string;
}, AppError>> {
  const clientId = process.env['GOOGLE_OAUTH_CLIENT_ID'];
  const clientSecret = process.env['GOOGLE_OAUTH_CLIENT_SECRET'];
  if (!clientId || !clientSecret) return err(validationError('Google OAuth non configure (GOOGLE_OAUTH_CLIENT_ID manquant)'));

  // Echange code pour token
  const tokenRes = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code, client_id: clientId, client_secret: clientSecret,
      redirect_uri: redirectUri, grant_type: 'authorization_code',
    }).toString(),
  });
  const tokenData = await tokenRes.json() as { access_token?: string; id_token?: string; error?: string };
  if (!tokenRes.ok || !tokenData.access_token) {
    return err(validationError(`Google token error : ${tokenData.error ?? 'unknown'}`));
  }

  // Recupere userinfo
  const userRes = await fetch(GOOGLE_USERINFO_URL, {
    headers: { Authorization: `Bearer ${tokenData.access_token}` },
  });
  if (!userRes.ok) return err(validationError('Impossible de recuperer les infos Google'));
  const userInfo = await userRes.json() as GoogleUserInfo;

  if (!userInfo.email_verified) return err(validationError('Email Google non verifie'));

  // Trouver user existant par email
  const existing = await prisma.user.findFirst({
    where: { email: userInfo.email.toLowerCase(), deleted_at: null },
  });

  if (existing) {
    // Mettre a jour last_login
    await prisma.user.update({ where: { id: existing.id }, data: { last_login_at: new Date() } });
    return ok({
      userId: existing.id,
      tenantId: existing.tenant_id,
      isNewUser: false,
      email: userInfo.email,
    });
  }

  // Nouveau user -> creer tenant + user avec mot de passe aleatoire (remplace par OAuth)
  const randomPassword = 'oauth-' + Math.random().toString(36).slice(2, 20);
  const { hashPassword } = await import('./password.js');
  const passwordHash = await hashPassword(randomPassword);

  const result = await prisma.$transaction(async (tx) => {
    const tenant = await tx.tenant.create({
      data: { name: `${userInfo.given_name ?? userInfo.name ?? userInfo.email.split('@')[0]}'s workspace` },
    });
    const user = await tx.user.create({
      data: {
        tenant_id: tenant.id,
        email: userInfo.email.toLowerCase(),
        password_hash: passwordHash,
        first_name: userInfo.given_name ?? userInfo.name?.split(' ')[0] ?? 'Utilisateur',
        last_name: userInfo.family_name ?? userInfo.name?.split(' ').slice(1).join(' ') ?? '',
        role: 'owner',
        last_login_at: new Date(),
      },
    });
    return { userId: user.id, tenantId: tenant.id };
  });

  return ok({ userId: result.userId, tenantId: result.tenantId, isNewUser: true, email: userInfo.email });
}
