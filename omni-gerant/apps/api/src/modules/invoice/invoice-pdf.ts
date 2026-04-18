// BUSINESS RULE [CDC-2.1]: Generation PDF facture
// Placeholder - will use puppeteer/pdfkit in production

export interface PdfGeneratorConfig {
  company_name: string;
  company_address: string;
  company_siret: string;
  company_tva_number?: string;
  logo_url?: string;
}

export interface InvoicePdfData {
  number: string;
  type: string;
  issue_date: string;
  due_date: string;
  client_name: string;
  client_address: string;
  client_siret?: string;
  lines: Array<{
    position: number;
    label: string;
    description?: string | null;
    quantity: number;
    unit: string;
    unit_price_cents: number;
    tva_rate: number;
    total_ht_cents: number;
  }>;
  total_ht_cents: number;
  total_tva_cents: number;
  total_ttc_cents: number;
  tva_breakdown: Array<{
    tva_rate: number;
    base_ht_cents: number;
    tva_cents: number;
  }>;
  payment_terms: number;
  notes?: string | null;
  deposit_percent?: number | null;
}

function formatCents(cents: number): string {
  return (cents / 100).toFixed(2).replace('.', ',');
}

function formatRate(ratePercent: number): string {
  return `${ratePercent}%`;
}

function formatBasisPoints(bp: number): string {
  return `${bp / 100}%`;
}

// Generate HTML for PDF rendering
export function generateInvoiceHtml(config: PdfGeneratorConfig, data: InvoicePdfData): string {
  const typeLabel = {
    standard: 'FACTURE',
    deposit: "FACTURE D'ACOMPTE",
    credit_note: 'AVOIR',
    situation: 'SITUATION DE TRAVAUX',
  }[data.type] ?? 'FACTURE';

  const linesHtml = data.lines
    .map((line) => `
      <tr>
        <td style="padding:6px;border-bottom:1px solid #eee;">${line.label}${line.description ? `<br><small style="color:#666">${line.description}</small>` : ''}</td>
        <td style="padding:6px;border-bottom:1px solid #eee;text-align:right;">${line.quantity}</td>
        <td style="padding:6px;border-bottom:1px solid #eee;text-align:center;">${line.unit}</td>
        <td style="padding:6px;border-bottom:1px solid #eee;text-align:right;">${formatCents(line.unit_price_cents)}</td>
        <td style="padding:6px;border-bottom:1px solid #eee;text-align:center;">${formatRate(line.tva_rate)}</td>
        <td style="padding:6px;border-bottom:1px solid #eee;text-align:right;font-weight:bold;">${formatCents(line.total_ht_cents)}</td>
      </tr>`)
    .join('');

  const tvaHtml = data.tva_breakdown
    .map((g) => `
      <tr>
        <td style="padding:4px;">TVA ${formatRate(g.tva_rate)} (base: ${formatCents(g.base_ht_cents)} EUR)</td>
        <td style="padding:4px;text-align:right;">${formatCents(g.tva_cents)} EUR</td>
      </tr>`)
    .join('');

  return `
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><style>body{font-family:Arial,sans-serif;font-size:12px;color:#333;margin:40px;}</style></head>
<body>
  <table style="width:100%;margin-bottom:40px;">
    <tr>
      <td style="width:50%;vertical-align:top;">
        <h2 style="margin:0;color:#1a56db;">${config.company_name}</h2>
        <p style="margin:4px 0;color:#666;white-space:pre-line;">${config.company_address}</p>
        <p style="margin:4px 0;color:#666;">SIRET: ${config.company_siret}</p>
        ${config.company_tva_number ? `<p style="margin:4px 0;color:#666;">TVA: ${config.company_tva_number}</p>` : ''}
      </td>
      <td style="width:50%;vertical-align:top;text-align:right;">
        <h1 style="margin:0;font-size:24px;">${typeLabel}</h1>
        <p style="margin:4px 0;font-size:16px;font-weight:bold;">${data.number}</p>
        <p style="margin:4px 0;">Date : ${data.issue_date}</p>
        <p style="margin:4px 0;">Echeance : ${data.due_date}</p>
      </td>
    </tr>
  </table>

  <div style="background:#f9f9f9;padding:16px;margin-bottom:30px;border-radius:4px;">
    <p style="margin:0;font-weight:bold;">${data.client_name}</p>
    <p style="margin:4px 0;white-space:pre-line;">${data.client_address}</p>
    ${data.client_siret ? `<p style="margin:4px 0;">SIRET: ${data.client_siret}</p>` : ''}
  </div>

  ${data.deposit_percent ? `<p style="margin-bottom:10px;"><strong>Acompte de ${formatBasisPoints(data.deposit_percent)}</strong></p>` : ''}

  <table style="width:100%;border-collapse:collapse;margin-bottom:30px;">
    <thead>
      <tr style="background:#f0f0f0;">
        <th style="padding:8px;text-align:left;">Designation</th>
        <th style="padding:8px;text-align:right;">Qte</th>
        <th style="padding:8px;text-align:center;">Unite</th>
        <th style="padding:8px;text-align:right;">P.U. HT</th>
        <th style="padding:8px;text-align:center;">TVA</th>
        <th style="padding:8px;text-align:right;">Total HT</th>
      </tr>
    </thead>
    <tbody>${linesHtml}</tbody>
  </table>

  <table style="width:300px;margin-left:auto;border-collapse:collapse;">
    <tr>
      <td style="padding:6px;">Total HT</td>
      <td style="padding:6px;text-align:right;font-weight:bold;">${formatCents(data.total_ht_cents)} EUR</td>
    </tr>
    ${tvaHtml}
    <tr style="border-top:2px solid #333;font-size:14px;">
      <td style="padding:8px;font-weight:bold;">Total TTC</td>
      <td style="padding:8px;text-align:right;font-weight:bold;">${formatCents(data.total_ttc_cents)} EUR</td>
    </tr>
  </table>

  ${data.notes ? `<div style="margin-top:30px;padding-top:16px;border-top:1px solid #eee;"><p style="font-weight:bold;margin-bottom:4px;">Conditions</p><p style="white-space:pre-wrap;">${data.notes}</p></div>` : ''}

  <div style="margin-top:40px;padding-top:16px;border-top:1px solid #eee;font-size:10px;color:#999;">
    <p>Conditions de paiement : ${data.payment_terms} jours</p>
    <p>En cas de retard de paiement, une penalite de 3 fois le taux d'interet legal sera appliquee, ainsi qu'une indemnite forfaitaire de 40 EUR pour frais de recouvrement.</p>
  </div>
</body>
</html>`.trim();
}
