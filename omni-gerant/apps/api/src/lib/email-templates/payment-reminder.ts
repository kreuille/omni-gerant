// BUSINESS RULE [CDC-2.1]: Templates relance paiement (niveaux 1-5)

import type { ReminderLevel } from '../../modules/invoice/reminder.service.js';

export interface PaymentReminderData {
  client_name: string;
  company_name: string;
  invoice_number: string;
  total_ttc: string;
  remaining: string;
  due_date: string;
  days_overdue: number;
  penalty_amount?: string;
  level: ReminderLevel;
}

const SUBJECTS: Record<ReminderLevel, string> = {
  1: 'Rappel : Facture {number} arrive a echeance',
  2: 'Facture {number} arrivee a echeance',
  3: 'Relance : Facture {number} impayee',
  4: 'Relance urgente : Facture {number} impayee depuis {days} jours',
  5: 'Derniere relance avant contentieux : Facture {number}',
};

export function getReminderSubject(data: PaymentReminderData): string {
  return SUBJECTS[data.level]
    .replace('{number}', data.invoice_number)
    .replace('{days}', String(data.days_overdue));
}

export function paymentReminderHtml(data: PaymentReminderData): string {
  const bodyByLevel: Record<ReminderLevel, string> = {
    1: `<p>Nous souhaitons vous rappeler que la facture <strong>${data.invoice_number}</strong> d'un montant de <strong>${data.total_ttc}</strong> arrive a echeance le <strong>${data.due_date}</strong>.</p>
    <p>Si le paiement a deja ete effectue, veuillez ignorer ce message.</p>`,

    2: `<p>La facture <strong>${data.invoice_number}</strong> d'un montant de <strong>${data.remaining}</strong> est arrivee a echeance le <strong>${data.due_date}</strong>.</p>
    <p>Nous vous remercions de bien vouloir proceder au reglement dans les meilleurs delais.</p>`,

    3: `<p>Sauf erreur de notre part, la facture <strong>${data.invoice_number}</strong> d'un montant de <strong>${data.remaining}</strong>, echue depuis le <strong>${data.due_date}</strong>, reste impayee.</p>
    <p>Nous vous prions de regulariser cette situation dans les plus brefs delais.</p>`,

    4: `<p>Malgre nos precedentes relances, la facture <strong>${data.invoice_number}</strong> d'un montant de <strong>${data.remaining}</strong> reste impayee depuis <strong>${data.days_overdue} jours</strong>.</p>
    <p>Conformement a la loi, des penalites de retard${data.penalty_amount ? ` de <strong>${data.penalty_amount}</strong>` : ''} ainsi qu'une indemnite forfaitaire de <strong>40,00 EUR</strong> pour frais de recouvrement sont exigibles.</p>`,

    5: `<p><strong>DERNIERE RELANCE AVANT CONTENTIEUX</strong></p>
    <p>La facture <strong>${data.invoice_number}</strong> d'un montant de <strong>${data.remaining}</strong> reste impayee malgre nos multiples relances.</p>
    <p>Sans reglement de votre part sous 8 jours, nous serons contraints de transmettre ce dossier a notre service contentieux.</p>
    ${data.penalty_amount ? `<p>Penalites de retard applicables : <strong>${data.penalty_amount}</strong> + indemnite forfaitaire de <strong>40,00 EUR</strong>.</p>` : ''}`,
  };

  return `
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"></head>
<body style="font-family: -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
  <h2 style="color: ${data.level >= 4 ? '#dc2626' : '#1a56db'};">${getReminderSubject(data)}</h2>
  <p>Bonjour ${data.client_name},</p>
  ${bodyByLevel[data.level]}
  <p style="color: #999; font-size: 12px; margin-top: 40px;">
    ${data.company_name}
  </p>
</body>
</html>`.trim();
}

export function paymentReminderText(data: PaymentReminderData): string {
  return `${getReminderSubject(data)}\n\nBonjour ${data.client_name},\n\nFacture: ${data.invoice_number}\nMontant restant: ${data.remaining}\nEcheance: ${data.due_date}\n\n${data.company_name}`;
}
