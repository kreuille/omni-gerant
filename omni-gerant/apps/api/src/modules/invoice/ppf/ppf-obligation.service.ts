// BUSINESS RULE [CDC-2.1 / F4]: Detection automatique obligation PPF
//
// Reforme 2026 : toute facture B2B emise entre assujettis a la TVA etablis en France
// doit etre transmise via PPF ou PDP agreee.
//   - Obligation reception : toutes entreprises FR depuis 01/09/2026
//   - Obligation emission : grandes + ETI depuis 01/09/2026, PME+TPE depuis 01/09/2027
//
// Exclus du circuit PPF (mais e-reporting obligatoire) :
//   - B2C (particuliers)
//   - International (acheteur hors FR)
//   - B2G (administrations) : circuit Chorus Pro separement
//
// Ref : Loi Finances 2024 + Decret 2025-1019

import { prisma } from '@zenadmin/db';

export type PpfObligationStatus =
  | 'required'         // doit etre transmis via PPF
  | 'e_reporting_only' // pas PPF mais e-reporting requis (B2C, international)
  | 'chorus_pro'       // B2G : circuit special
  | 'not_applicable';  // pas d'obligation (ex: avoir interne)

export interface PpfObligationCheck {
  status: PpfObligationStatus;
  reason: string;
  detectedCustomerType: 'b2b_fr' | 'b2c_fr' | 'b2b_eu' | 'b2b_export' | 'b2g' | 'unknown';
}

export async function detectPpfObligation(invoiceId: string, tenantId: string): Promise<PpfObligationCheck> {
  const invoice = await prisma.invoice.findFirst({
    where: { id: invoiceId, tenant_id: tenantId, deleted_at: null },
    include: { client: true },
  });
  if (!invoice) return { status: 'not_applicable', reason: 'Facture introuvable', detectedCustomerType: 'unknown' };

  const client = invoice.client;
  if (!client) return { status: 'not_applicable', reason: 'Sans client identifie', detectedCustomerType: 'unknown' };

  const country = (client.country ?? 'FR').toUpperCase();
  const isCompany = client.type === 'company';
  const hasSiret = !!client.siret;

  // B2G detection simplifiee : SIRET commence par 1 ou 2 = personne publique possible
  // En pratique il faut un systeme plus robuste (lookup api-entreprise)
  // Pour l'instant on log seulement
  const isLikelyB2G = hasSiret && /^(1|2)\d{13}$/.test(client.siret ?? '');

  if (isLikelyB2G) {
    return { status: 'chorus_pro', reason: 'Client potentiellement administration (SIRET 1xxx/2xxx). Transmission Chorus Pro obligatoire.', detectedCustomerType: 'b2g' };
  }

  if (country === 'FR' && isCompany && hasSiret) {
    return { status: 'required', reason: 'B2B-FR : transmission PPF obligatoire (Loi Finances 2024).', detectedCustomerType: 'b2b_fr' };
  }

  if (country === 'FR' && !isCompany) {
    return { status: 'e_reporting_only', reason: 'B2C-FR : e-reporting PPF requis (pas de flux e-invoice).', detectedCustomerType: 'b2c_fr' };
  }

  if (country !== 'FR' && isCompany) {
    const isEu = ['AT', 'BE', 'BG', 'CY', 'CZ', 'DE', 'DK', 'EE', 'EL', 'ES', 'FI', 'GR', 'HR', 'HU', 'IE', 'IT', 'LT', 'LU', 'LV', 'MT', 'NL', 'PL', 'PT', 'RO', 'SE', 'SI', 'SK'].includes(country);
    return {
      status: 'e_reporting_only',
      reason: isEu ? 'Intracommunautaire UE : e-reporting requis.' : 'Export hors UE : e-reporting requis.',
      detectedCustomerType: isEu ? 'b2b_eu' : 'b2b_export',
    };
  }

  return { status: 'not_applicable', reason: 'Contexte non standard : a verifier manuellement.', detectedCustomerType: 'unknown' };
}

/**
 * Batch detection — utile pour dashboard conformite
 */
export async function listInvoicesByObligation(tenantId: string, limit = 50): Promise<Array<{ invoiceId: string; number: string; status: PpfObligationStatus; clientName: string | null }>> {
  const invoices = await prisma.invoice.findMany({
    where: { tenant_id: tenantId, deleted_at: null, status: { in: ['finalized', 'sent', 'partially_paid', 'overdue', 'paid'] } },
    include: { client: true },
    orderBy: { created_at: 'desc' },
    take: limit,
  });

  const results: Array<{ invoiceId: string; number: string; status: PpfObligationStatus; clientName: string | null }> = [];
  for (const inv of invoices) {
    const check = await detectPpfObligation(inv.id, tenantId);
    results.push({
      invoiceId: inv.id,
      number: inv.number,
      status: check.status,
      clientName: inv.client?.company_name ?? inv.client?.last_name ?? null,
    });
  }
  return results;
}
