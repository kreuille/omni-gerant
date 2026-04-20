// BUSINESS RULE [CDC-2.1] : Email de transmission facture au client

export interface InvoiceSentData {
  client_name: string;
  company_name: string;
  invoice_number: string;
  issue_date: string;
  due_date: string;
  total_ttc: string;
  total_ht: string;
  payment_terms: string;
  iban?: string;
  bic?: string;
  company_siret?: string;
  company_address?: string;
  company_phone?: string;
  company_email?: string;
}

export function invoiceSentHtml(d: InvoiceSentData): string {
  return `<!DOCTYPE html>
<html lang="fr"><head><meta charset="utf-8"></head>
<body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;color:#1f2937">
  <div style="border-left:4px solid #2563eb;padding-left:16px;margin-bottom:24px">
    <h2 style="margin:0;color:#2563eb">Facture ${d.invoice_number}</h2>
    <p style="margin:4px 0 0;color:#6b7280;font-size:14px">Émise le ${d.issue_date} — échéance ${d.due_date}</p>
  </div>
  <p>Bonjour ${d.client_name},</p>
  <p>Vous trouverez ci-joint la facture <strong>${d.invoice_number}</strong> émise par <strong>${d.company_name}</strong>.</p>
  <table style="border-collapse:collapse;margin:16px 0;width:100%">
    <tr><td style="padding:6px 0;color:#6b7280">Total HT</td><td style="text-align:right">${d.total_ht}</td></tr>
    <tr><td style="padding:6px 0;color:#6b7280">Total TTC</td><td style="text-align:right;font-weight:bold">${d.total_ttc}</td></tr>
    <tr><td style="padding:6px 0;color:#6b7280">Conditions</td><td style="text-align:right">${d.payment_terms}</td></tr>
  </table>
  ${d.iban ? `<p><strong>Coordonnées bancaires :</strong><br>IBAN : ${d.iban}${d.bic ? '<br>BIC : ' + d.bic : ''}</p>` : ''}
  <p style="margin-top:24px;color:#6b7280;font-size:13px">
    ${d.company_name}${d.company_siret ? ' — SIRET ' + d.company_siret : ''}<br>
    ${d.company_address ?? ''}<br>
    ${[d.company_phone, d.company_email].filter(Boolean).join(' — ')}
  </p>
</body></html>`;
}

export function invoiceSentText(d: InvoiceSentData): string {
  return `Bonjour ${d.client_name},

Vous trouverez ci-joint la facture ${d.invoice_number} émise par ${d.company_name}.

Total HT : ${d.total_ht}
Total TTC : ${d.total_ttc}
Échéance : ${d.due_date} (${d.payment_terms})
${d.iban ? `\nIBAN : ${d.iban}${d.bic ? ' / BIC : ' + d.bic : ''}` : ''}

${d.company_name}${d.company_siret ? ` — SIRET ${d.company_siret}` : ''}
`;
}
