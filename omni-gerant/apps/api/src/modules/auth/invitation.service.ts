// BUSINESS RULE [CDC-6 / S2]: Invitations multi-user
//
// Workflow :
//  1. Owner/admin cree une invitation : POST /api/users/invitations { email, role }
//  2. Un token signe est genere + hash en DB, email envoye au destinataire
//  3. Le destinataire clique -> /accept-invite/:token
//     -> s'il a deja un compte : rattachement au tenant
//     -> sinon : creation compte avec password
//  4. L'invitation expire apres 7 jours

import { createHash, randomBytes } from 'crypto';
import { prisma } from '@zenadmin/db';
import type { Result, AppError } from '@zenadmin/shared';
import { ok, err, notFound, validationError, conflict } from '@zenadmin/shared';

const INVITATION_TTL_MS = 7 * 24 * 3600 * 1000;
const VALID_ROLES = new Set(['admin', 'member', 'accountant']); // pas owner via invite

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export interface CreateInvitationInput {
  tenantId: string;
  email: string;
  role: string;
  invitedByUserId: string;
}

export async function createInvitation(input: CreateInvitationInput): Promise<Result<{ id: string; token: string; inviteUrl: string; expiresAt: Date }, AppError>> {
  if (!input.email || !input.email.includes('@')) return err(validationError('Email invalide'));
  if (!VALID_ROLES.has(input.role)) return err(validationError(`Role invalide. Attendu : ${[...VALID_ROLES].join(', ')}`));

  // Verifier pas deja user dans le tenant
  const existingUser = await prisma.user.findFirst({
    where: { email: input.email.toLowerCase(), tenant_id: input.tenantId, deleted_at: null },
  });
  if (existingUser) return err(conflict('Un utilisateur avec cet email existe deja dans votre organisation'));

  // Revoquer toute invitation pending existante
  await prisma.userInvitation.updateMany({
    where: { tenant_id: input.tenantId, email: input.email.toLowerCase(), accepted_at: null, revoked_at: null },
    data: { revoked_at: new Date() },
  });

  const token = randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + INVITATION_TTL_MS);

  const row = await prisma.userInvitation.upsert({
    where: { tenant_id_email: { tenant_id: input.tenantId, email: input.email.toLowerCase() } },
    create: {
      tenant_id: input.tenantId,
      email: input.email.toLowerCase(),
      role: input.role,
      token_hash: hashToken(token),
      invited_by: input.invitedByUserId,
      expires_at: expiresAt,
    },
    update: {
      role: input.role,
      token_hash: hashToken(token),
      invited_by: input.invitedByUserId,
      expires_at: expiresAt,
      accepted_at: null,
      revoked_at: null,
    },
  });

  const base = process.env['APP_URL'] ?? 'https://omni-gerant.vercel.app';
  return ok({
    id: row.id,
    token,
    inviteUrl: `${base}/accept-invite/${token}`,
    expiresAt,
  });
}

export async function listInvitations(tenantId: string): Promise<Array<{
  id: string; email: string; role: string; createdAt: Date; expiresAt: Date;
  status: 'pending' | 'accepted' | 'revoked' | 'expired';
}>> {
  const rows = await prisma.userInvitation.findMany({
    where: { tenant_id: tenantId },
    orderBy: { created_at: 'desc' },
    take: 100,
  });
  return rows.map((r) => ({
    id: r.id,
    email: r.email,
    role: r.role,
    createdAt: r.created_at,
    expiresAt: r.expires_at,
    status: r.accepted_at ? 'accepted' : r.revoked_at ? 'revoked' : r.expires_at < new Date() ? 'expired' : 'pending',
  }));
}

export async function revokeInvitation(tenantId: string, invitationId: string): Promise<Result<void, AppError>> {
  const inv = await prisma.userInvitation.findFirst({ where: { id: invitationId, tenant_id: tenantId } });
  if (!inv) return err(notFound('UserInvitation', invitationId));
  await prisma.userInvitation.update({ where: { id: invitationId }, data: { revoked_at: new Date() } });
  return ok(undefined);
}

export interface AcceptInvitationInput {
  token: string;
  firstName?: string;
  lastName?: string;
  password?: string; // requis si nouvel utilisateur
}

export async function acceptInvitation(input: AcceptInvitationInput): Promise<Result<{ userId: string; tenantId: string; alreadyHadAccount: boolean }, AppError>> {
  const inv = await prisma.userInvitation.findUnique({
    where: { token_hash: hashToken(input.token) },
  });
  if (!inv) return err(notFound('UserInvitation'));
  if (inv.revoked_at) return err(validationError('Invitation revoquee'));
  if (inv.accepted_at) return err(validationError('Invitation deja acceptee'));
  if (inv.expires_at < new Date()) return err(validationError('Invitation expiree'));

  // Verifier si user existe deja (autre tenant -> on cree un nouveau rattachement)
  const existing = await prisma.user.findFirst({
    where: { email: inv.email.toLowerCase(), tenant_id: inv.tenant_id, deleted_at: null },
  });

  if (existing) {
    // Update role if needed
    if (existing.role !== inv.role) {
      await prisma.user.update({ where: { id: existing.id }, data: { role: inv.role } });
    }
    await prisma.userInvitation.update({ where: { id: inv.id }, data: { accepted_at: new Date() } });
    return ok({ userId: existing.id, tenantId: inv.tenant_id, alreadyHadAccount: true });
  }

  // Nouvel utilisateur : necessite prenom + nom + password
  if (!input.firstName || !input.lastName || !input.password) {
    return err(validationError('firstName, lastName et password requis pour un nouvel utilisateur'));
  }
  if (input.password.length < 8) return err(validationError('Mot de passe trop court (min 8 caracteres)'));

  const { hashPassword } = await import('./password.js');
  const passwordHash = await hashPassword(input.password);

  const user = await prisma.user.create({
    data: {
      tenant_id: inv.tenant_id,
      email: inv.email.toLowerCase(),
      password_hash: passwordHash,
      first_name: input.firstName,
      last_name: input.lastName,
      role: inv.role,
    },
  });

  await prisma.userInvitation.update({ where: { id: inv.id }, data: { accepted_at: new Date() } });

  return ok({ userId: user.id, tenantId: inv.tenant_id, alreadyHadAccount: false });
}

export async function listTenantUsers(tenantId: string): Promise<Array<{
  id: string; email: string; firstName: string; lastName: string; role: string;
  twoFaEnabled: boolean; lastLoginAt: Date | null; createdAt: Date;
}>> {
  const users = await prisma.user.findMany({
    where: { tenant_id: tenantId, deleted_at: null },
    orderBy: { created_at: 'asc' },
  });
  return users.map((u) => ({
    id: u.id,
    email: u.email,
    firstName: u.first_name,
    lastName: u.last_name,
    role: u.role,
    twoFaEnabled: u.totp_enabled,
    lastLoginAt: u.last_login_at,
    createdAt: u.created_at,
  }));
}

export async function changeUserRole(tenantId: string, userId: string, newRole: string, actingUserId: string): Promise<Result<void, AppError>> {
  if (!['owner', 'admin', 'member', 'accountant'].includes(newRole)) return err(validationError('Role invalide'));
  const user = await prisma.user.findFirst({ where: { id: userId, tenant_id: tenantId, deleted_at: null } });
  if (!user) return err(notFound('User', userId));
  if (userId === actingUserId) return err(validationError('Impossible de modifier votre propre role'));
  // Verifier : il doit rester au moins 1 owner
  if (user.role === 'owner' && newRole !== 'owner') {
    const ownerCount = await prisma.user.count({ where: { tenant_id: tenantId, role: 'owner', deleted_at: null } });
    if (ownerCount <= 1) return err(validationError('Au moins un propriétaire doit rester'));
  }
  await prisma.user.update({ where: { id: userId }, data: { role: newRole } });
  return ok(undefined);
}

export async function removeUser(tenantId: string, userId: string, actingUserId: string): Promise<Result<void, AppError>> {
  const user = await prisma.user.findFirst({ where: { id: userId, tenant_id: tenantId, deleted_at: null } });
  if (!user) return err(notFound('User', userId));
  if (userId === actingUserId) return err(validationError('Impossible de vous retirer vous-meme'));
  if (user.role === 'owner') {
    const ownerCount = await prisma.user.count({ where: { tenant_id: tenantId, role: 'owner', deleted_at: null } });
    if (ownerCount <= 1) return err(validationError('Impossible de retirer le dernier propriétaire'));
  }
  await prisma.user.update({ where: { id: userId }, data: { deleted_at: new Date() } });
  // Revoquer tous les refresh tokens
  await prisma.refreshToken.updateMany({ where: { user_id: userId, revoked_at: null }, data: { revoked_at: new Date() } });
  return ok(undefined);
}
