// BUSINESS RULE [CDC-2.1]: Template confirmation paiement recu

export interface PaymentReceivedData {
  client_name: string;
  company_name: string;
  invoice_number: string;
  payment_amount: string;
  payment_date: string;
  remaining: string;
  is_fully_paid: boolean;
}

export function paymentReceivedHtml(data: PaymentReceivedData): string {
  return `
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"></head>
<body style="font-family: -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
  <h2 style="color: #16a34a;">Paiement recu</h2>
  <p>Bonjour ${data.client_name},</p>
  <p>Nous accusons reception de votre paiement de <strong>${data.payment_amount}</strong> en date du <strong>${data.payment_date}</strong> pour la facture <strong>${data.invoice_number}</strong>.</p>
  ${data.is_fully_paid
    ? '<p style="color: #16a34a; font-weight: bold;">Votre facture est integralement reglee. Merci.</p>'
    : `<p>Reste a payer : <strong>${data.remaining}</strong></p>`}
  <p style="color: #999; font-size: 12px; margin-top: 40px;">${data.company_name}</p>
</body>
</html>`.trim();
}

export function paymentReceivedText(data: PaymentReceivedData): string {
  return [
    `Paiement recu`,
    ``,
    `Bonjour ${data.client_name},`,
    ``,
    `Paiement de ${data.payment_amount} recu le ${data.payment_date} pour la facture ${data.invoice_number}.`,
    data.is_fully_paid ? 'Facture integralement reglee.' : `Reste a payer : ${data.remaining}`,
    ``,
    data.company_name,
  ].join('\n');
}
