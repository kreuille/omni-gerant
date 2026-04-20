// BUSINESS RULE [CDC-2.1 / Vague A2] : rappels automatiques factures impayees
// Niveaux : J+1 (courtois), J+15 (relance), J+30 (mise en demeure)

import type { JobDefinition } from './registry.js';
import { createEmailService, createDefaultEmailProvider } from '../lib/email.js';

const HOURS_IN_DAY = 24;
const MS_PER_DAY = 1000 * 60 * 60 * HOURS_IN_DAY;

function daysSince(d: Date): number {
  return Math.floor((Date.now() - d.getTime()) / MS_PER_DAY);
}

function getLevel(daysOverdue: number): { level: 1 | 2 | 3 | 4 | 5; subjectPrefix: string } | null {
  if (daysOverdue === 1) return { level: 1, subjectPrefix: 'Rappel' };
  if (daysOverdue === 15) return { level: 2, subjectPrefix: 'Relance' };
  if (daysOverdue === 30) return { level: 3, subjectPrefix: 'Relance ferme' };
  if (daysOverdue === 45) return { level: 4, subjectPrefix: 'Mise en demeure' };
  if (daysOverdue === 60) return { level: 5, subjectPrefix: 'Dernière relance' };
  return null;
}

export const invoiceRemindersJob: JobDefinition = {
  name: 'invoice-reminders',
  description: 'Envoie les rappels de paiement aux clients pour les factures impayees',
  minIntervalMs: 20 * 60 * 60 * 1000, // au plus 1x / 20h
  allowedHoursUtc: [7, 8, 9], // envoi le matin seulement (UTC)
  async run() {
    try {
      const { prisma } = await import('@zenadmin/db');
      const emailService = createEmailService(createDefaultEmailProvider());

      // Factures finalisees, non payees, en retard, pas annulees
      const overdueInvoices = await prisma.invoice.findMany({
        where: {
          deleted_at: null,
          status: { in: ['finalized', 'sent', 'overdue'] },
          due_date: { lt: new Date() },
        },
        include: { client: true, tenant: true },
        take: 200, // batch
      });

      let sent = 0;
      for (const inv of overdueInvoices) {
        if (!inv.due_date || !inv.client?.email) continue;
        const days = daysSince(inv.due_date);
        const level = getLevel(days);
        if (!level) continue;

        const clientName = inv.client.company_name
          ?? ([inv.client.first_name, inv.client.last_name].filter(Boolean).join(' ') || 'Client');
        const totalTtc = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(inv.total_ttc_cents / 100);
        const settings = (inv.tenant.settings ?? {}) as Record<string, string | undefined>;
        const companyName = settings.company_name ?? inv.tenant.name;

        const subject = `${level.subjectPrefix} : Facture ${inv.number} impayée (${days} jours de retard)`;
        const html = `<p>Bonjour ${clientName},</p>
          <p>Notre facture <strong>${inv.number}</strong> d'un montant de <strong>${totalTtc}</strong>
          est arrivée à échéance le ${inv.due_date.toLocaleDateString('fr-FR')} (${days} jours de retard).</p>
          <p>Nous vous remercions de bien vouloir procéder à son règlement dans les meilleurs délais.</p>
          <p>Cordialement,<br>${companyName}</p>`;

        const r = await emailService.send({
          to: inv.client.email,
          subject,
          html,
          text: `Bonjour ${clientName}, la facture ${inv.number} (${totalTtc}) est en retard de ${days} jours. Merci de la régler.`,
        });
        if (r.ok) sent++;
      }
      return { ok: true, affected: sent };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : String(e) };
    }
  },
};
