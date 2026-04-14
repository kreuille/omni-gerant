// BUSINESS RULE [CDC-2.1]: Template email "Nouveau devis"

export interface QuoteSentTemplateData {
  client_name: string;
  company_name: string;
  quote_number: string;
  quote_title: string | null;
  total_ttc: string;
  validity_date: string;
  share_url: string;
}

export function quoteSentHtml(data: QuoteSentTemplateData): string {
  const title = data.quote_title ? ` - ${data.quote_title}` : '';
  return `
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"></head>
<body style="font-family: -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
  <h2 style="color: #1a56db;">Nouveau devis</h2>
  <p>Bonjour ${data.client_name},</p>
  <p><strong>${data.company_name}</strong> vous a envoye le devis <strong>${data.quote_number}${title}</strong>.</p>
  <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
    <tr>
      <td style="padding: 8px; border-bottom: 1px solid #eee; color: #666;">Montant TTC</td>
      <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right; font-weight: bold;">${data.total_ttc}</td>
    </tr>
    <tr>
      <td style="padding: 8px; border-bottom: 1px solid #eee; color: #666;">Valide jusqu'au</td>
      <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">${data.validity_date}</td>
    </tr>
  </table>
  <p style="text-align: center; margin: 30px 0;">
    <a href="${data.share_url}" style="background: #1a56db; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold;">
      Consulter le devis
    </a>
  </p>
  <p style="color: #999; font-size: 12px; margin-top: 40px;">
    Ce lien est valide jusqu'au ${data.validity_date}. Si vous avez des questions, contactez directement ${data.company_name}.
  </p>
</body>
</html>`.trim();
}

export function quoteSentText(data: QuoteSentTemplateData): string {
  const title = data.quote_title ? ` - ${data.quote_title}` : '';
  return [
    `Bonjour ${data.client_name},`,
    '',
    `${data.company_name} vous a envoye le devis ${data.quote_number}${title}.`,
    '',
    `Montant TTC : ${data.total_ttc}`,
    `Valide jusqu'au : ${data.validity_date}`,
    '',
    `Consultez votre devis : ${data.share_url}`,
    '',
    `Ce lien est valide jusqu'au ${data.validity_date}.`,
  ].join('\n');
}
