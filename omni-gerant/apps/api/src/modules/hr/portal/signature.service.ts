// BUSINESS RULE [CDC-RH-V8]: Signature electronique contrat (eIDAS niveau simple)
// Workflow :
// 1. Employeur cree la signature → status "pending", hash document SHA-256 stocke
// 2. Employeur signe (hash email employeur + timestamp) → status "employer_signed"
// 3. Employe recoit lien, signe (hash email + timestamp + consent) → status "fully_signed"
// Apres signature, le document devient inalterable (le hash valide l'integrite).

import { createHash } from 'crypto';
import { prisma } from '@zenadmin/db';
import type { Result, AppError } from '@zenadmin/shared';
import { ok, err, notFound, validationError } from '@zenadmin/shared';

function hashDocument(content: string): string {
  return createHash('sha256').update(content).digest('hex');
}

function signatureHash(identifier: string, timestamp: Date, documentHash: string): string {
  return createHash('sha256').update(`${identifier}|${timestamp.toISOString()}|${documentHash}`).digest('hex');
}

export async function initContractSignature(tenantId: string, employeeId: string, contractType: string, documentHtml: string): Promise<Result<{ id: string; documentHash: string }, AppError>> {
  const employee = await prisma.hrEmployee.findFirst({
    where: { id: employeeId, tenant_id: tenantId, deleted_at: null },
  });
  if (!employee) return err(notFound('HrEmployee', employeeId));

  const documentHash = hashDocument(documentHtml);

  const row = await prisma.hrContractSignature.create({
    data: {
      tenant_id: tenantId,
      employee_id: employeeId,
      contract_type: contractType,
      document_html: documentHtml,
      document_hash: documentHash,
      status: 'pending',
    },
  });

  return ok({ id: row.id, documentHash });
}

export async function signAsEmployer(signatureId: string, tenantId: string, employerEmail: string): Promise<Result<{ status: string }, AppError>> {
  const sig = await prisma.hrContractSignature.findFirst({ where: { id: signatureId, tenant_id: tenantId } });
  if (!sig) return err(notFound('HrContractSignature', signatureId));
  if (sig.signed_by_employer_at) return err(validationError('Deja signe par l\'employeur'));

  const signedAt = new Date();
  const sigHash = signatureHash(employerEmail, signedAt, sig.document_hash);

  await prisma.hrContractSignature.update({
    where: { id: signatureId },
    data: {
      signed_by_employer_at: signedAt,
      employer_signature: sigHash,
      status: sig.signed_by_employee_at ? 'fully_signed' : 'employer_signed',
    },
  });
  return ok({ status: sig.signed_by_employee_at ? 'fully_signed' : 'employer_signed' });
}

export async function signAsEmployee(signatureId: string, employeeEmail: string): Promise<Result<{ status: string; documentHash: string }, AppError>> {
  const sig = await prisma.hrContractSignature.findUnique({ where: { id: signatureId } });
  if (!sig) return err(notFound('HrContractSignature', signatureId));
  if (sig.signed_by_employee_at) return err(validationError('Deja signe par le salarie'));
  if (sig.status === 'cancelled') return err(validationError('Signature annulee'));

  const signedAt = new Date();
  const sigHash = signatureHash(employeeEmail, signedAt, sig.document_hash);

  const newStatus = sig.signed_by_employer_at ? 'fully_signed' : 'pending';

  await prisma.hrContractSignature.update({
    where: { id: signatureId },
    data: {
      signed_by_employee_at: signedAt,
      employee_signature: sigHash,
      status: newStatus,
    },
  });

  if (newStatus === 'fully_signed') {
    // Marquer le contrat employe comme signe
    await prisma.hrEmployee.update({
      where: { id: sig.employee_id },
      data: { contract_signed_at: signedAt },
    });
  }

  return ok({ status: newStatus, documentHash: sig.document_hash });
}

export async function getSignature(signatureId: string, tenantId?: string): Promise<{
  id: string; contractType: string; status: string;
  signedByEmployerAt: Date | null; signedByEmployeeAt: Date | null;
  documentHtml: string; documentHash: string;
} | null> {
  const sig = await prisma.hrContractSignature.findFirst({
    where: tenantId ? { id: signatureId, tenant_id: tenantId } : { id: signatureId },
  });
  if (!sig) return null;
  return {
    id: sig.id,
    contractType: sig.contract_type,
    status: sig.status,
    signedByEmployerAt: sig.signed_by_employer_at,
    signedByEmployeeAt: sig.signed_by_employee_at,
    documentHtml: sig.document_html,
    documentHash: sig.document_hash,
  };
}
