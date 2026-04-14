// BUSINESS RULE [CDC-2.1]: Template relance devis

export interface QuoteReminderTemplateData {
  client_name: string;
  company_name: string;
  quote_number: string;
  quote_title: string | null;
  total_ttc: string;
  validity_date: string;
  share_url: string;
  days_remaining: number;
}

export function quoteReminderHtml(data: QuoteReminderTemplateData): string {
  const title = data.quote_title ? ` - ${data.quote_title}` : '';
  const urgency = data.days_remaining <= 3
    ? `<p style="color: #dc2626; font-weight: bold;">Attention : ce devis expire dans ${data.days_remaining} jour${data.days_remaining > 1 ? 's' : ''}.</p>`
    : `<p>Ce devis expire le ${data.validity_date}.</p>`;

  return `
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"></head>
<body style="font-family: -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
  <h2 style="color: #1a56db;">Rappel : Devis en attente</h2>
  <p>Bonjour ${data.client_name},</p>
  <p>Nous souhaitons vous rappeler que le devis <strong>${data.quote_number}${title}</strong> de <strong>${data.company_name}</strong> est en attente de votre validation.</p>
  ${urgency}
  <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
    <tr>
      <td style="padding: 8px; border-bottom: 1px solid #eee; color: #666;">Montant TTC</td>
      <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right; font-weight: bold;">${data.total_ttc}</td>
    </tr>
  </table>
  <p style="text-align: center; margin: 30px 0;">
    <a href="${data.share_url}" style="background: #1a56db; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold;">
      Consulter le devis
    </a>
  </p>
</body>
</html>`.trim();
}

export function quoteReminderText(data: QuoteReminderTemplateData): string {
  const title = data.quote_title ? ` - ${data.quote_title}` : '';
  return [
    `Bonjour ${data.client_name},`,
    '',
    `Rappel : le devis ${data.quote_number}${title} de ${data.company_name} est en attente.`,
    `Montant TTC : ${data.total_ttc}`,
    data.days_remaining <= 3
      ? `ATTENTION : expire dans ${data.days_remaining} jour(s).`
      : `Expire le : ${data.validity_date}`,
    '',
    `Consultez votre devis : ${data.share_url}`,
  ].join('\n');
}
