// BUSINESS RULE [CDC-6 / S1]: Protection bruteforce login
//
// Apres 5 tentatives echouees sur 15 min pour un meme email :
//  -> account lockout 30 min (retry avec message "trop de tentatives")
// Apres 20 tentatives echouees sur 15 min depuis meme IP :
//  -> IP ban 1h
// Log toutes les tentatives en DB pour detection fraude + audit.

import { prisma } from '@zenadmin/db';

const MAX_EMAIL_ATTEMPTS = 5;
const EMAIL_WINDOW_MS = 15 * 60 * 1000;
const EMAIL_LOCKOUT_MS = 30 * 60 * 1000;
const MAX_IP_ATTEMPTS = 20;
const IP_WINDOW_MS = 15 * 60 * 1000;

export async function recordLoginAttempt(params: {
  email: string;
  ipAddress?: string;
  userAgent?: string;
  success: boolean;
  reason?: string;
  tenantId?: string;
}): Promise<void> {
  await prisma.loginAttempt.create({
    data: {
      email: params.email.toLowerCase(),
      ip_address: params.ipAddress ?? null,
      user_agent: params.userAgent ?? null,
      success: params.success,
      reason: params.reason ?? null,
      tenant_id: params.tenantId ?? null,
    },
  });
}

export async function isEmailLocked(email: string): Promise<{ locked: boolean; reason?: string; retryAfterMs?: number }> {
  const since = new Date(Date.now() - EMAIL_WINDOW_MS);
  const failures = await prisma.loginAttempt.count({
    where: {
      email: email.toLowerCase(),
      success: false,
      created_at: { gte: since },
    },
  });
  if (failures >= MAX_EMAIL_ATTEMPTS) {
    // Verifier la derniere tentative : si plus vieille que lockout, on reset
    const latest = await prisma.loginAttempt.findFirst({
      where: { email: email.toLowerCase(), success: false },
      orderBy: { created_at: 'desc' },
    });
    const retryAt = latest ? new Date(latest.created_at.getTime() + EMAIL_LOCKOUT_MS) : new Date();
    if (retryAt > new Date()) {
      return {
        locked: true,
        reason: `Trop de tentatives. Reessayez dans ${Math.ceil((retryAt.getTime() - Date.now()) / 60000)} min.`,
        retryAfterMs: retryAt.getTime() - Date.now(),
      };
    }
  }
  return { locked: false };
}

export async function isIpBlocked(ip: string): Promise<{ blocked: boolean; reason?: string }> {
  if (!ip) return { blocked: false };
  const since = new Date(Date.now() - IP_WINDOW_MS);
  const failures = await prisma.loginAttempt.count({
    where: { ip_address: ip, success: false, created_at: { gte: since } },
  });
  if (failures >= MAX_IP_ATTEMPTS) {
    return { blocked: true, reason: 'IP bannie 1h (trop de tentatives de connexion echouees)' };
  }
  return { blocked: false };
}

export async function cleanupOldAttempts(): Promise<number> {
  // Purge > 30 jours
  const cutoff = new Date(Date.now() - 30 * 24 * 3600 * 1000);
  const r = await prisma.loginAttempt.deleteMany({ where: { created_at: { lt: cutoff } } });
  return r.count;
}
