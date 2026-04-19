import type { Quote } from './quote.service.js';
import type { TenantProfile } from '../tenant/tenant.service.js';

// BUSINESS RULE [CDC-2.1]: PDF devis avec emetteur, client, mentions legales

function formatCents(cents: number): string {
  return (cents / 100).toFixed(2).replace('.', ',') + ' EUR';
}

function formatRate(basisPoints: number): string {
  return (basisPoints / 100).toFixed(basisPoints % 100 === 0 ? 0 : 1) + '%';
}

function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString('fr-FR');
}

function escapeHtml(str: string | null | undefined): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function generateQuoteHtml(quote: Quote, tenant: TenantProfile | null): string {
  const productLines = quote.lines.filter((l) => l.type === 'line');
  const sections = quote.lines;

  // Group TVA by rate
  const tvaMap = new Map<number, { base: number; tva: number }>();
  for (const line of productLines) {
    const existing = tvaMap.get(line.tva_rate) ?? { base: 0, tva: 0 };
    existing.base += line.total_ht_cents;
    existing.tva += Math.round((line.total_ht_cents * line.tva_rate) / 10000);
    tvaMap.set(line.tva_rate, existing);
  }

  const companyName = escapeHtml(tenant?.company_name ?? 'Votre entreprise');
  const companyAddress = tenant?.address
    ? `${escapeHtml(tenant.address.line1)}<br>${escapeHtml(tenant.address.zip_code)} ${escapeHtml(tenant.address.city)}`
    : '';
  const companySiret = escapeHtml(tenant?.siret ?? '');
  const companyTva = escapeHtml(tenant?.tva_number ?? '');
  const companyPhone = escapeHtml(tenant?.phone ?? '');
  const companyEmail = escapeHtml(tenant?.email ?? '');
  const legalForm = escapeHtml(tenant?.legal_form ?? '');

  const clientName = escapeHtml(quote.client_name ?? '—');
  const clientAddress = escapeHtml(quote.client_address ?? '');
  const clientZipCity = [quote.client_zip_code, quote.client_city].filter(Boolean).join(' ');
  const clientSiret = escapeHtml(quote.client_siret ?? '');

  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<title>Devis ${escapeHtml(quote.number)}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: -apple-system, Arial, sans-serif; margin: 0; padding: 40px; color: #1a202c; font-size: 12px; }
  .header { display: flex; justify-content: space-between; margin-bottom: 40px; }
  .emetteur { max-width: 45%; }
  .emetteur h1 { margin: 0 0 8px 0; font-size: 18px; color: #2563eb; }
  .meta { text-align: right; font-size: 11px; color: #4a5568; }
  .meta .ref { font-size: 20px; font-weight: bold; color: #1a202c; margin-bottom: 4px; }
  .parties { display: flex; justify-content: space-between; gap: 20px; margin-bottom: 30px; padding: 16px; background: #f7fafc; border-radius: 8px; }
  .party { flex: 1; }
  .party-label { text-transform: uppercase; font-size: 10px; color: #718096; letter-spacing: 1px; margin-bottom: 4px; }
  .party-name { font-weight: bold; font-size: 14px; margin-bottom: 4px; }
  .party-details { font-size: 11px; color: #4a5568; line-height: 1.6; }
  .title { font-size: 16px; font-weight: bold; margin: 20px 0 16px; padding-bottom: 8px; border-bottom: 2px solid #2563eb; }
  table { width: 100%; border-collapse: collapse; font-size: 11px; }
  th { background: #edf2f7; text-align: left; padding: 8px; font-weight: 600; border-bottom: 2px solid #cbd5e0; }
  th.num { text-align: right; }
  th.ctr { text-align: center; }
  td { padding: 8px; border-bottom: 1px solid #e2e8f0; }
  td.num { text-align: right; }
  td.ctr { text-align: center; }
  tr.section td { background: #f7fafc; font-weight: bold; }
  tr.comment td { font-style: italic; color: #718096; font-size: 10px; }
  .totals { margin-top: 20px; float: right; width: 280px; }
  .totals-row { display: flex; justify-content: space-between; padding: 4px 0; }
  .totals-ttc { border-top: 2px solid #2d3748; font-weight: bold; font-size: 14px; padding-top: 8px; margin-top: 8px; }
  .notes { clear: both; margin-top: 40px; padding-top: 20px; border-top: 1px solid #e2e8f0; }
  .notes-title { font-size: 10px; color: #718096; text-transform: uppercase; margin-bottom: 6px; letter-spacing: 1px; }
  .legal { margin-top: 60px; padding-top: 20px; border-top: 1px solid #e2e8f0; font-size: 9px; color: #a0aec0; line-height: 1.5; }
  @media print { body { padding: 20px; } }
</style>
</head>
<body>

<div class="header">
  <div class="emetteur">
    <h1>${companyName}</h1>
    ${legalForm ? `<div style="color: #4a5568; font-size: 11px; margin-bottom: 6px;">${legalForm}</div>` : ''}
    <div style="color: #4a5568; font-size: 11px; line-height: 1.6;">
      ${companyAddress}
      ${companyPhone ? `<br>Tel : ${companyPhone}` : ''}
      ${companyEmail ? `<br>${companyEmail}` : ''}
    </div>
  </div>
  <div class="meta">
    <div class="ref">DEVIS</div>
    <div>N&deg; ${escapeHtml(quote.number)}</div>
    <div>Date : ${formatDate(quote.issue_date)}</div>
    <div>Validite : ${formatDate(quote.validity_date)}</div>
  </div>
</div>

<div class="parties">
  <div class="party">
    <div class="party-label">De</div>
    <div class="party-name">${companyName}</div>
    <div class="party-details">
      ${companyAddress}
      ${companySiret ? `<br>SIRET : ${companySiret}` : ''}
      ${companyTva ? `<br>TVA : ${companyTva}` : ''}
    </div>
  </div>
  <div class="party">
    <div class="party-label">Pour</div>
    <div class="party-name">${clientName}</div>
    <div class="party-details">
      ${clientAddress ? escapeHtml(clientAddress) + '<br>' : ''}
      ${clientZipCity ? escapeHtml(clientZipCity) : ''}
      ${clientSiret ? `<br>SIRET : ${clientSiret}` : ''}
    </div>
  </div>
</div>

${quote.title ? `<div class="title">${escapeHtml(quote.title)}</div>` : ''}

<table>
  <thead>
    <tr>
      <th>Designation</th>
      <th class="num" style="width: 60px;">Qte</th>
      <th class="ctr" style="width: 50px;">Unite</th>
      <th class="num" style="width: 90px;">P.U. HT</th>
      <th class="ctr" style="width: 50px;">TVA</th>
      <th class="num" style="width: 100px;">Total HT</th>
    </tr>
  </thead>
  <tbody>
    ${sections.map((line) => {
      if (line.type === 'section') {
        return `<tr class="section"><td colspan="6">${escapeHtml(line.label)}</td></tr>`;
      }
      if (line.type === 'comment') {
        return `<tr class="comment"><td colspan="6">${escapeHtml(line.label)}</td></tr>`;
      }
      return `<tr>
        <td>${escapeHtml(line.label)}${line.description ? `<br><span style="color: #718096; font-size: 10px;">${escapeHtml(line.description)}</span>` : ''}</td>
        <td class="num">${line.quantity}</td>
        <td class="ctr">${escapeHtml(line.unit)}</td>
        <td class="num">${formatCents(line.unit_price_cents)}</td>
        <td class="ctr">${formatRate(line.tva_rate)}</td>
        <td class="num">${formatCents(line.total_ht_cents)}</td>
      </tr>`;
    }).join('')}
  </tbody>
</table>

<div class="totals">
  <div class="totals-row"><span>Total HT</span><span>${formatCents(quote.total_ht_cents)}</span></div>
  ${Array.from(tvaMap.entries()).map(([rate, { tva }]) =>
    `<div class="totals-row" style="color: #718096; font-size: 10px;"><span>TVA ${formatRate(rate)}</span><span>${formatCents(tva)}</span></div>`
  ).join('')}
  <div class="totals-row"><span>Total TVA</span><span>${formatCents(quote.total_tva_cents)}</span></div>
  <div class="totals-row totals-ttc"><span>Total TTC</span><span>${formatCents(quote.total_ttc_cents)}</span></div>
</div>

${quote.notes ? `<div class="notes">
  <div class="notes-title">Conditions / Notes</div>
  <div style="white-space: pre-wrap;">${escapeHtml(quote.notes)}</div>
</div>` : ''}

${quote.signature_data && quote.signature_data.signature_image ? `
<div class="signature-block" style="margin-top: 40px; padding-top: 20px; border-top: 2px solid #2d3748; page-break-inside: avoid;">
  <div class="notes-title" style="text-transform: uppercase; font-size: 10px; color: #718096; letter-spacing: 1px; margin-bottom: 10px;">Signature et acceptation</div>
  <div style="display: flex; justify-content: space-between; align-items: flex-end; gap: 40px;">
    <div style="flex: 1;">
      <div style="font-size: 11px; color: #4a5568; margin-bottom: 6px;">
        Bon pour accord, le ${formatDate(quote.signature_data.signed_at)}
      </div>
      <div style="font-weight: 600; color: #1a202c; margin-bottom: 4px;">
        ${escapeHtml(quote.signature_data.signer_first_name)} ${escapeHtml(quote.signature_data.signer_name)}
      </div>
      ${quote.signature_data.ip_address ? `<div style="font-size: 9px; color: #a0aec0;">IP : ${escapeHtml(quote.signature_data.ip_address)}</div>` : ''}
    </div>
    <div style="border: 1px solid #e2e8f0; padding: 8px; background: white; border-radius: 4px;">
      <img src="${quote.signature_data.signature_image}" alt="Signature" style="display: block; max-width: 280px; max-height: 100px;" />
    </div>
  </div>
</div>
` : ''}

<div class="legal">
  Devis valable jusqu'au ${formatDate(quote.validity_date)}.
  Bon pour accord a retourner date et signe.
  ${companySiret ? `<br>${companyName}${legalForm ? ` - ${legalForm}` : ''} - SIRET ${companySiret}${companyTva ? ` - TVA ${companyTva}` : ''}` : ''}
</div>

</body>
</html>`;
}
