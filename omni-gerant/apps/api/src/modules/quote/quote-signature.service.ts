import { createHash } from 'node:crypto';
import type { Result, AppError } from '@zenadmin/shared';
import { ok, err, notFound } from '@zenadmin/shared';

// BUSINESS RULE [CDC-2.1 / Vague C1] : Signature electronique eIDAS "simple" pour devis
//
// Level SES (Simple Electronic Signature) — legalement valable en France :
//  - Identification du signataire (nom + email + IP + user-agent)
//  - Integrite : hash SHA-256 du contenu du devis au moment de la signature
//  - Horodatage serveur
//  - Piste d'audit inalterable dans signature_data (JSON)
//
// Pour niveau AES (Advanced) il faudrait un certificat X.509 + horodatage
// qualifie RFC 3161. A faire dans un second temps.

export interface QuoteSignaturePayload {
  signer_name: string;
  signer_first_name: string;
  signer_email?: string;
  signer_company?: string;
  signature_image?: string; // base64 PNG canvas
  ip_address: string;
  user_agent: string;
}

export interface QuoteSignatureRecord extends QuoteSignaturePayload {
  signed_at: string; // ISO
  content_hash: string; // SHA-256 du contenu du devis au moment T
  signature_hash: string; // SHA-256 du (content_hash | signer_email | signed_at) — proof chain
}

/**
 * Calcule l'empreinte SHA-256 du contenu canonique du devis.
 * Utilise les champs financiers + lignes pour detecter toute modification apres signature.
 */
export function computeQuoteContentHash(quote: {
  id: string;
  number: string;
  total_ht_cents: number;
  total_tva_cents: number;
  total_ttc_cents: number;
  validity_date: Date | string;
  lines: Array<{ position: number; label: string; quantity: number; unit_price_cents: number; tva_rate: number }>;
}): string {
  const canonical = JSON.stringify({
    id: quote.id,
    number: quote.number,
    total_ht: quote.total_ht_cents,
    total_tva: quote.total_tva_cents,
    total_ttc: quote.total_ttc_cents,
    validity: new Date(quote.validity_date).toISOString(),
    lines: quote.lines
      .slice()
      .sort((a, b) => a.position - b.position)
      .map((l) => ({ pos: l.position, lbl: l.label, qty: l.quantity, pu: l.unit_price_cents, tva: l.tva_rate })),
  });
  return createHash('sha256').update(canonical).digest('hex');
}

export function buildSignatureRecord(
  contentHash: string,
  payload: QuoteSignaturePayload,
  signedAtMs: number = Date.now(),
): QuoteSignatureRecord {
  const signedAt = new Date(signedAtMs).toISOString();
  const signatureHash = createHash('sha256')
    .update(`${contentHash}|${payload.signer_email ?? ''}|${payload.signer_name}|${signedAt}|${payload.ip_address}`)
    .digest('hex');
  return {
    ...payload,
    signed_at: signedAt,
    content_hash: contentHash,
    signature_hash: signatureHash,
  };
}

/**
 * Verifie qu'une signature enregistree est toujours valide :
 *  - Le devis n'a pas ete modifie apres signature (content_hash match).
 *  - La chain signature_hash est coherente.
 */
export function verifyQuoteSignature(
  currentHash: string,
  record: QuoteSignatureRecord | null,
): { valid: boolean; reason?: string } {
  if (!record) return { valid: false, reason: 'no_signature' };
  if (record.content_hash !== currentHash) {
    return { valid: false, reason: 'content_tampered' };
  }
  const expected = createHash('sha256')
    .update(`${record.content_hash}|${record.signer_email ?? ''}|${record.signer_name}|${record.signed_at}|${record.ip_address}`)
    .digest('hex');
  if (expected !== record.signature_hash) {
    return { valid: false, reason: 'hash_mismatch' };
  }
  return { valid: true };
}

// Pour les consommateurs qui ont un Quote en objet JS prisma-like.
export async function signQuote(
  quoteId: string,
  tenantId: string,
  payload: QuoteSignaturePayload,
): Promise<Result<QuoteSignatureRecord, AppError>> {
  const { prisma } = await import('@zenadmin/db');
  const quote = await prisma.quote.findFirst({
    where: { id: quoteId, tenant_id: tenantId, deleted_at: null },
    include: { lines: true },
  });
  if (!quote) return err(notFound('Quote', quoteId));

  const contentHash = computeQuoteContentHash({
    id: quote.id,
    number: quote.number,
    total_ht_cents: quote.total_ht_cents,
    total_tva_cents: quote.total_tva_cents,
    total_ttc_cents: quote.total_ttc_cents,
    validity_date: quote.validity_date,
    lines: quote.lines.map((l) => ({
      position: l.position,
      label: l.label,
      quantity: Number(l.quantity),
      unit_price_cents: l.unit_price_cents,
      tva_rate: l.tva_rate,
    })),
  });

  const record = buildSignatureRecord(contentHash, payload);

  await prisma.quote.update({
    where: { id: quoteId },
    data: {
      status: 'signed',
      signature_data: record as unknown as Parameters<typeof prisma.quote.update>[0]['data']['signature_data'],
    },
  });

  return ok(record);
}
