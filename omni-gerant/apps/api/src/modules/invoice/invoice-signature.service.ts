// BUSINESS RULE [F5]: Signature electronique facture (eIDAS simple)
// Hash SHA-256 sur contenu facture (numero + date + totaux + client + lignes)
// signed_at + signer (email employeur) + hash permettent audit d'integrite.

import { createHash } from 'crypto';
import { prisma } from '@zenadmin/db';
import type { Result, AppError } from '@zenadmin/shared';
import { ok, err, notFound, validationError } from '@zenadmin/shared';

export function computeInvoiceContentHash(inv: {
  number: string;
  issue_date: Date;
  due_date: Date;
  client_id: string;
  total_ttc_cents: number;
  total_ht_cents: number;
  total_tva_cents: number;
}, lines: Array<{ label: string; quantity: unknown; total_ht_cents: number }>): string {
  const payload = JSON.stringify({
    n: inv.number,
    i: inv.issue_date.toISOString(),
    d: inv.due_date.toISOString(),
    c: inv.client_id,
    ttc: inv.total_ttc_cents,
    ht: inv.total_ht_cents,
    tva: inv.total_tva_cents,
    l: lines.map((l) => ({ lbl: l.label, q: String(l.quantity), tht: l.total_ht_cents })),
  });
  return createHash('sha256').update(payload).digest('hex');
}

export async function signInvoice(invoiceId: string, tenantId: string, signerEmail: string): Promise<Result<{ hash: string; signedAt: Date }, AppError>> {
  const inv = await prisma.invoice.findFirst({
    where: { id: invoiceId, tenant_id: tenantId, deleted_at: null },
    include: { lines: true },
  });
  if (!inv) return err(notFound('Invoice', invoiceId));
  if (inv.status === 'draft') return err(validationError('Facture en brouillon : finaliser avant signature'));
  if (inv.e_signature_signed_at) return err(validationError('Facture deja signee'));

  const contentHash = computeInvoiceContentHash(inv, inv.lines);
  // Signature = hash(content + signer + timestamp)
  const signedAt = new Date();
  const signatureHash = createHash('sha256')
    .update(`${contentHash}|${signerEmail}|${signedAt.toISOString()}`)
    .digest('hex');

  await prisma.invoice.update({
    where: { id: invoiceId },
    data: {
      e_signature_hash: signatureHash,
      e_signature_signed_at: signedAt,
      e_signature_signer: signerEmail,
    },
  });

  return ok({ hash: signatureHash, signedAt });
}

/**
 * Verifie l'integrite de la facture : le contenu actuel genere-t-il le meme hash
 * que celui stocke au moment de la signature ?
 */
export async function verifyInvoiceSignature(invoiceId: string, tenantId: string): Promise<Result<{ valid: boolean; signedAt: Date | null; signer: string | null; currentHash: string; storedHash: string | null }, AppError>> {
  const inv = await prisma.invoice.findFirst({
    where: { id: invoiceId, tenant_id: tenantId, deleted_at: null },
    include: { lines: true },
  });
  if (!inv) return err(notFound('Invoice', invoiceId));

  const currentHash = computeInvoiceContentHash(inv, inv.lines);
  const valid = inv.e_signature_hash !== null && inv.e_signature_signer !== null && inv.e_signature_signed_at !== null
    ? createHash('sha256')
        .update(`${currentHash}|${inv.e_signature_signer}|${inv.e_signature_signed_at.toISOString()}`)
        .digest('hex') === inv.e_signature_hash
    : false;

  return ok({
    valid,
    signedAt: inv.e_signature_signed_at,
    signer: inv.e_signature_signer,
    currentHash,
    storedHash: inv.e_signature_hash,
  });
}
