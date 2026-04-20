// Vague H2 : vue pipeline CRM des devis (kanban + statistiques conversion)

export type PipelineStage = 'draft' | 'sent' | 'viewed' | 'accepted' | 'signed' | 'invoiced' | 'refused' | 'expired';

export interface PipelineColumn {
  stage: PipelineStage;
  label: string;
  color: string;
  count: number;
  total_ttc_cents: number;
  items: Array<{
    id: string;
    number: string;
    title: string | null;
    client_name: string;
    total_ttc_cents: number;
    validity_date: string;
    status: string;
    age_days: number;
    overdue_validity: boolean;
  }>;
}

export interface PipelineStats {
  total_quotes: number;
  total_pipeline_value_cents: number;     // devis non refused/expired
  conversion_rate: number;                 // quotes invoiced / (invoiced + refused + expired)
  avg_days_to_sign: number | null;
  win_value_ytd_cents: number;
  loss_value_ytd_cents: number;
}

export interface PipelineResult {
  columns: PipelineColumn[];
  stats: PipelineStats;
}

const STAGE_META: Record<PipelineStage, { label: string; color: string }> = {
  draft:     { label: 'Brouillon',    color: '#9ca3af' },
  sent:      { label: 'Envoyé',        color: '#3b82f6' },
  viewed:    { label: 'Vu',            color: '#8b5cf6' },
  accepted:  { label: 'Accepté',       color: '#10b981' },
  signed:    { label: 'Signé',         color: '#059669' },
  invoiced:  { label: 'Facturé',       color: '#16a34a' },
  refused:   { label: 'Refusé',        color: '#ef4444' },
  expired:   { label: 'Expiré',        color: '#6b7280' },
};

const ACTIVE_STAGES: PipelineStage[] = ['draft', 'sent', 'viewed', 'accepted', 'signed', 'invoiced'];
const LOST_STAGES: PipelineStage[] = ['refused', 'expired'];

export async function getPipeline(tenantId: string): Promise<PipelineResult> {
  const { prisma } = await import('@zenadmin/db');
  const yearStart = new Date(Date.UTC(new Date().getUTCFullYear(), 0, 1));

  const quotes = await prisma.quote.findMany({
    where: { tenant_id: tenantId, deleted_at: null },
    include: { client: true },
    orderBy: { created_at: 'desc' },
    take: 500,
  });

  const columns: Record<PipelineStage, PipelineColumn> = {} as Record<PipelineStage, PipelineColumn>;
  for (const stage of [...ACTIVE_STAGES, ...LOST_STAGES] as PipelineStage[]) {
    columns[stage] = {
      stage,
      label: STAGE_META[stage].label,
      color: STAGE_META[stage].color,
      count: 0,
      total_ttc_cents: 0,
      items: [],
    };
  }

  const now = Date.now();
  let totalPipeline = 0;
  let winYtd = 0;
  let lossYtd = 0;
  let totalDaysToSign = 0;
  let signedCount = 0;

  for (const q of quotes) {
    const status = q.status as PipelineStage;
    const col = columns[status];
    if (!col) continue;

    const ageDays = Math.floor((now - q.created_at.getTime()) / 86400_000);
    const validityDate = q.validity_date ?? new Date(q.created_at.getTime() + 30 * 86400_000);
    const overdueValidity = status !== 'invoiced' && status !== 'signed' && validityDate.getTime() < now;

    col.count++;
    col.total_ttc_cents += q.total_ttc_cents;
    col.items.push({
      id: q.id,
      number: q.number,
      title: q.title ?? null,
      client_name: q.client?.company_name ?? ([q.client?.first_name, q.client?.last_name].filter(Boolean).join(' ') || 'Client'),
      total_ttc_cents: q.total_ttc_cents,
      validity_date: validityDate.toISOString().slice(0, 10),
      status: q.status,
      age_days: ageDays,
      overdue_validity: overdueValidity,
    });

    if (ACTIVE_STAGES.includes(status) && status !== 'invoiced') {
      totalPipeline += q.total_ttc_cents;
    }
    if (q.created_at >= yearStart) {
      if (status === 'invoiced' || status === 'signed') winYtd += q.total_ttc_cents;
      else if (status === 'refused' || status === 'expired') lossYtd += q.total_ttc_cents;
    }
    if (q.signed_at && q.created_at) {
      const days = (q.signed_at.getTime() - q.created_at.getTime()) / 86400_000;
      totalDaysToSign += days;
      signedCount++;
    }
  }

  const invoicedCount = columns['invoiced'].count;
  const lostCount = columns['refused'].count + columns['expired'].count;
  const decidedCount = invoicedCount + lostCount;

  const stats: PipelineStats = {
    total_quotes: quotes.length,
    total_pipeline_value_cents: totalPipeline,
    conversion_rate: decidedCount > 0 ? invoicedCount / decidedCount : 0,
    avg_days_to_sign: signedCount > 0 ? Math.round(totalDaysToSign / signedCount) : null,
    win_value_ytd_cents: winYtd,
    loss_value_ytd_cents: lossYtd,
  };

  return {
    columns: (Object.values(columns)) as PipelineColumn[],
    stats,
  };
}
