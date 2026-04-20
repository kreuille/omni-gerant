// Vague G3 : exports vers expert-comptable (Pennylane, Dougs, Tiime...)
//
// 2 formats supportes :
//   1. JSON batch invoices/purchases normalise (utilisable par n'importe
//      quel cabinet via l'API Pennylane /invoices, Dougs /documents, etc.)
//   2. ZIP + manifest (PDF + JSON metadata) pour depot courriel / drive
//      comptable.
//
// On ne pousse PAS directement vers Pennylane/Dougs : chaque cabinet a sa propre
// auth/tokens. On produit un payload que le owner transmet via copier-coller
// d'URL ou depot manuel.

export interface PennylaneInvoice {
  external_id: string;
  invoice_number: string;
  issue_date: string;     // YYYY-MM-DD
  due_date: string | null;
  client: {
    name: string;
    siret?: string | null;
    country_alpha2: string;
    email?: string | null;
    address?: string | null;
  };
  currency: string;
  amount_ht_cents: number;
  amount_tva_cents: number;
  amount_ttc_cents: number;
  paid_cents: number;
  remaining_cents: number;
  status: string;
  lines: Array<{
    label: string;
    quantity: number;
    unit_price_cents: number;
    tva_rate_bp: number;   // basis points (2000 = 20 %)
    total_ht_cents: number;
  }>;
  pdf_url?: string | null; // URL interne zenAdmin /api/invoices/:id/facturx.pdf
}

export interface PennylaneExportResult {
  export_version: string;
  generated_at: string;
  tenant: {
    name: string;
    siret: string | null;
    naf_code: string | null;
  };
  period: { from: string; to: string };
  invoices: PennylaneInvoice[];
  purchases: unknown[]; // forme symetrique a invoices avec supplier au lieu de client
  counters: { invoices: number; purchases: number; total_ttc_cents_invoices: number; total_ttc_cents_purchases: number };
}

export async function exportForAccountant(
  tenantId: string,
  from: Date,
  to: Date,
): Promise<PennylaneExportResult> {
  const { prisma } = await import('@zenadmin/db');
  const [tenant, invoices, purchases] = await Promise.all([
    prisma.tenant.findUnique({ where: { id: tenantId }, select: { name: true, siret: true, naf_code: true } }),
    prisma.invoice.findMany({
      where: {
        tenant_id: tenantId,
        deleted_at: null,
        issue_date: { gte: from, lte: to },
      },
      include: { lines: true, client: true },
      orderBy: { issue_date: 'asc' },
    }),
    prisma.purchase.findMany({
      where: {
        tenant_id: tenantId,
        deleted_at: null,
        created_at: { gte: from, lte: to }, // issue_date peut etre null sur achat ; fallback created_at
      },
      include: { lines: true, supplier: true },
      orderBy: { created_at: 'asc' },
    }),
  ]);

  const invoiceItems: PennylaneInvoice[] = invoices.map((inv) => ({
    external_id: inv.id,
    invoice_number: inv.number,
    issue_date: inv.issue_date.toISOString().slice(0, 10),
    due_date: inv.due_date ? inv.due_date.toISOString().slice(0, 10) : null,
    client: {
      name: inv.client?.company_name ?? ([inv.client?.first_name, inv.client?.last_name].filter(Boolean).join(' ') || 'Client'),
      siret: inv.client?.siret ?? null,
      country_alpha2: (inv.client?.country ?? 'FR').toUpperCase().slice(0, 2),
      email: inv.client?.email ?? null,
      address: [inv.client?.address_line1, inv.client?.zip_code, inv.client?.city].filter(Boolean).join(', ') || null,
    },
    currency: 'EUR',
    amount_ht_cents: inv.total_ht_cents,
    amount_tva_cents: inv.total_tva_cents,
    amount_ttc_cents: inv.total_ttc_cents,
    paid_cents: inv.paid_cents,
    remaining_cents: inv.remaining_cents,
    status: inv.status,
    lines: inv.lines.map((l) => ({
      label: l.label,
      quantity: Number(l.quantity),
      unit_price_cents: l.unit_price_cents,
      tva_rate_bp: l.tva_rate,
      total_ht_cents: l.total_ht_cents,
    })),
    pdf_url: `/api/invoices/${inv.id}/facturx.pdf`,
  }));

  const purchaseItems = purchases.map((p) => ({
    external_id: p.id,
    purchase_number: p.number,
    issue_date: (p.issue_date ?? p.created_at).toISOString().slice(0, 10),
    due_date: p.due_date ? p.due_date.toISOString().slice(0, 10) : null,
    supplier: {
      name: p.supplier?.name ?? 'Fournisseur',
      siret: p.supplier?.siret ?? null,
      country_alpha2: 'FR',
    },
    currency: 'EUR',
    amount_ht_cents: p.total_ht_cents,
    amount_tva_cents: p.total_tva_cents,
    amount_ttc_cents: p.total_ttc_cents,
    paid_cents: p.paid_cents,
    status: p.status,
    lines: p.lines.map((l) => ({
      label: l.label,
      quantity: Number(l.quantity),
      unit_price_cents: l.unit_price_cents,
      tva_rate_bp: l.tva_rate,
      total_ht_cents: l.total_ht_cents,
    })),
  }));

  const totalInv = invoiceItems.reduce((s, i) => s + i.amount_ttc_cents, 0);
  const totalPur = purchaseItems.reduce((s, i) => s + i.amount_ttc_cents, 0);

  return {
    export_version: '1.0',
    generated_at: new Date().toISOString(),
    tenant: tenant ?? { name: '', siret: null, naf_code: null },
    period: {
      from: from.toISOString().slice(0, 10),
      to: to.toISOString().slice(0, 10),
    },
    invoices: invoiceItems,
    purchases: purchaseItems,
    counters: {
      invoices: invoiceItems.length,
      purchases: purchaseItems.length,
      total_ttc_cents_invoices: totalInv,
      total_ttc_cents_purchases: totalPur,
    },
  };
}
