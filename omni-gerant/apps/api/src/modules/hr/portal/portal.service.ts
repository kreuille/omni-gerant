// BUSINESS RULE [CDC-RH-V8]: Portail salarie — acces magic link
// Le salarie recoit un lien par email pour acceder a ses bulletins / contrats
// sans creer de compte. Token hashes stockes en DB, expires 24h.

import { createHash, randomBytes } from 'crypto';
import { prisma } from '@zenadmin/db';
import type { Result, AppError } from '@zenadmin/shared';
import { ok, err, notFound, validationError } from '@zenadmin/shared';

const TOKEN_TTL_HOURS = 24;

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export async function issueMagicLink(tenantId: string, employeeId: string): Promise<Result<{ token: string; expiresAt: Date; portalUrl: string }, AppError>> {
  const employee = await prisma.hrEmployee.findFirst({
    where: { id: employeeId, tenant_id: tenantId, deleted_at: null },
  });
  if (!employee) return err(notFound('HrEmployee', employeeId));
  if (!employee.email) return err(validationError('Salarie sans email — impossible d\'envoyer le lien'));

  const token = randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + TOKEN_TTL_HOURS * 3600 * 1000);

  await prisma.hrEmployeePortalAccess.upsert({
    where: { employee_id: employeeId },
    create: {
      tenant_id: tenantId,
      employee_id: employeeId,
      token_hash: hashToken(token),
      expires_at: expiresAt,
    },
    update: {
      token_hash: hashToken(token),
      issued_at: new Date(),
      expires_at: expiresAt,
      revoked_at: null,
    },
  });

  const base = process.env['APP_URL'] ?? 'https://omni-gerant.vercel.app';
  return ok({ token, expiresAt, portalUrl: `${base}/portal/${token}` });
}

export async function verifyMagicLink(token: string): Promise<Result<{ tenantId: string; employeeId: string; employee: { firstName: string; lastName: string; email: string | null } }, AppError>> {
  const access = await prisma.hrEmployeePortalAccess.findUnique({
    where: { token_hash: hashToken(token) },
  });
  if (!access || access.revoked_at) return err(validationError('Lien invalide ou revoque'));
  if (access.expires_at < new Date()) return err(validationError('Lien expire — demandez un nouveau lien'));

  const employee = await prisma.hrEmployee.findUnique({ where: { id: access.employee_id } });
  if (!employee) return err(notFound('HrEmployee', access.employee_id));

  await prisma.hrEmployeePortalAccess.update({
    where: { id: access.id },
    data: { last_used_at: new Date() },
  });

  return ok({
    tenantId: access.tenant_id,
    employeeId: access.employee_id,
    employee: { firstName: employee.first_name, lastName: employee.last_name, email: employee.email },
  });
}

export async function listPayslipsForEmployee(tenantId: string, employeeId: string): Promise<Array<{
  id: string; year: number; month: number; grossCents: number; netCents: number; sentAt: Date | null;
}>> {
  const rows = await prisma.hrPayslip.findMany({
    where: { tenant_id: tenantId, employee_id: employeeId },
    orderBy: [{ period_year: 'desc' }, { period_month: 'desc' }],
  });
  return rows.map((p) => ({
    id: p.id,
    year: p.period_year,
    month: p.period_month,
    grossCents: p.gross_total_cents,
    netCents: p.net_to_pay_cents,
    sentAt: p.sent_to_employee_at,
  }));
}
