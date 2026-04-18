// BUSINESS RULE [CDC-2.1]: Template email "Nouveau devis"

export interface QuoteSentTemplateData {
  client_name: string;
  company_name: string;
  quote_number: string;
  quote_title: string | null;
  total_ttc: string;
  validity_date: string;
  share_url: string;
  // Optional company footer details
  company_siret?: string | null;
  company_address?: string | null;
  company_phone?: string | null;
  company_email?: string | null;
  company_tva?: string | null;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function quoteSentHtml(data: QuoteSentTemplateData): string {
  const title = data.quote_title ? ` - ${escapeHtml(data.quote_title)}` : '';
  const companyName = escapeHtml(data.company_name);
  const clientName = escapeHtml(data.client_name);
  const quoteNumber = escapeHtml(data.quote_number);

  const footerParts: string[] = [];
  if (data.company_address) footerParts.push(escapeHtml(data.company_address));
  if (data.company_phone) footerParts.push(`Tel : ${escapeHtml(data.company_phone)}`);
  if (data.company_email) footerParts.push(escapeHtml(data.company_email));
  const contactLine = footerParts.length > 0 ? footerParts.join(' &bull; ') : '';

  const legalParts: string[] = [];
  if (data.company_siret) legalParts.push(`SIRET ${escapeHtml(data.company_siret)}`);
  if (data.company_tva) legalParts.push(`TVA ${escapeHtml(data.company_tva)}`);
  const legalLine = legalParts.length > 0 ? legalParts.join(' &bull; ') : '';

  return `
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"></head>
<body style="font-family: -apple-system, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 0; color: #1a202c; background: #f7fafc;">
  <div style="background: white; padding: 32px; border-radius: 8px; margin: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
    <div style="border-bottom: 3px solid #2563eb; padding-bottom: 16px; margin-bottom: 24px;">
      <h1 style="margin: 0; color: #2563eb; font-size: 24px;">${companyName}</h1>
      <p style="margin: 4px 0 0 0; color: #4a5568; font-size: 13px;">Nouveau devis a votre attention</p>
    </div>

    <p style="font-size: 15px;">Bonjour ${clientName},</p>
    <p>Nous avons le plaisir de vous adresser le devis <strong>${quoteNumber}${title}</strong>.</p>

    <table style="width: 100%; border-collapse: collapse; margin: 24px 0; background: #f7fafc; border-radius: 6px; overflow: hidden;">
      <tr>
        <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; color: #718096; font-size: 13px;">Montant TTC</td>
        <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; text-align: right; font-weight: bold; font-size: 16px; color: #1a202c;">${escapeHtml(data.total_ttc)}</td>
      </tr>
      <tr>
        <td style="padding: 12px 16px; color: #718096; font-size: 13px;">Valide jusqu'au</td>
        <td style="padding: 12px 16px; text-align: right; color: #1a202c;">${escapeHtml(data.validity_date)}</td>
      </tr>
    </table>

    <p style="text-align: center; margin: 32px 0;">
      <a href="${data.share_url}" style="background: #2563eb; color: white; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block; font-size: 15px;">
        Consulter et signer le devis
      </a>
    </p>

    <p style="color: #718096; font-size: 13px; line-height: 1.6;">
      Depuis le lien ci-dessus, vous pourrez consulter le detail du devis, le signer en ligne ou le refuser avec un commentaire.
      Le lien reste valide jusqu'au ${escapeHtml(data.validity_date)}.
    </p>

    ${contactLine || legalLine ? `
    <div style="border-top: 1px solid #e2e8f0; margin-top: 32px; padding-top: 20px; font-size: 11px; color: #a0aec0; line-height: 1.6;">
      <div style="font-weight: 600; color: #718096; margin-bottom: 4px;">${companyName}</div>
      ${contactLine ? `<div>${contactLine}</div>` : ''}
      ${legalLine ? `<div style="margin-top: 4px;">${legalLine}</div>` : ''}
    </div>
    ` : ''}
  </div>
</body>
</html>`.trim();
}

export function quoteSentText(data: QuoteSentTemplateData): string {
  const title = data.quote_title ? ` - ${data.quote_title}` : '';
  const lines = [
    `Bonjour ${data.client_name},`,
    '',
    `${data.company_name} vous a envoye le devis ${data.quote_number}${title}.`,
    '',
    `Montant TTC : ${data.total_ttc}`,
    `Valide jusqu'au : ${data.validity_date}`,
    '',
    `Consultez et signez votre devis : ${data.share_url}`,
    '',
    `Ce lien est valide jusqu'au ${data.validity_date}.`,
  ];

  const footerParts: string[] = [];
  if (data.company_address) footerParts.push(data.company_address);
  if (data.company_phone) footerParts.push(`Tel : ${data.company_phone}`);
  if (data.company_email) footerParts.push(data.company_email);
  if (footerParts.length > 0) {
    lines.push('', '--', data.company_name, ...footerParts);
  }

  return lines.join('\n');
}
