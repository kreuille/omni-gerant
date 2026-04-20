import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import type { DuerpDocument } from './duerp.service.js';
import { calculateRiskLevel } from './risk-database.js';

// BUSINESS RULE [CDC-2.4 / P0-02] : PDF binaire DUERP (pdf-lib)

function toWinAnsi(s: string | null | undefined): string {
  if (!s) return '';
  return s.replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/\u2026/g, '...')
    .replace(/[\u00A0\u202F]/g, ' ');
}

function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString('fr-FR');
}

const LEVEL_COLORS: Record<string, [number, number, number]> = {
  faible: [0.13, 0.77, 0.37],
  modere: [0.92, 0.7, 0.05],
  eleve: [0.98, 0.45, 0.09],
  critique: [0.94, 0.27, 0.27],
};

export async function generateDuerpPdfBinary(doc: DuerpDocument): Promise<Buffer> {
  const pdf = await PDFDocument.create();
  const year = new Date(doc.evaluation_date).getFullYear();
  pdf.setTitle(`DUERP ${year} — ${doc.tenant_id}`);
  pdf.setCreator('zenAdmin');
  pdf.setProducer('zenAdmin DUERP PDF');

  let page = pdf.addPage([595.28, 841.89]);
  const { width, height } = page.getSize();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const margin = 40;
  let y = height - margin;

  const draw = (text: string, x: number, yy: number, size = 10, bold = false, color = rgb(0, 0, 0)) => {
    page.drawText(toWinAnsi(text), { x, y: yy, size, font: bold ? fontBold : font, color });
  };

  const ensureSpace = (needed: number) => {
    if (y - needed < margin) {
      page = pdf.addPage([595.28, 841.89]);
      y = page.getSize().height - margin;
    }
  };

  // Title
  draw('DOCUMENT UNIQUE D\'EVALUATION DES RISQUES PROFESSIONNELS', margin, y, 14, true, rgb(0.1, 0.3, 0.6));
  y -= 20;
  draw(`Annee : ${year}  -  Version ${doc.version}  -  Etabli le ${formatDate(doc.created_at)}`, margin, y, 10);
  y -= 16;
  draw(`Statut : ${doc.status}  -  ${doc.risks.length} risques identifies`, margin, y, 10);
  y -= 22;

  // Summary
  const summary = {
    critique: doc.risks.filter((r) => calculateRiskLevel(r.gravity, r.probability).level === 'critique').length,
    eleve: doc.risks.filter((r) => calculateRiskLevel(r.gravity, r.probability).level === 'eleve').length,
    modere: doc.risks.filter((r) => calculateRiskLevel(r.gravity, r.probability).level === 'modere').length,
    faible: doc.risks.filter((r) => calculateRiskLevel(r.gravity, r.probability).level === 'faible').length,
  };
  draw('Synthese des risques', margin, y, 11, true); y -= 14;
  for (const [level, count] of Object.entries(summary)) {
    const [r, g, b] = LEVEL_COLORS[level] ?? [0.4, 0.4, 0.4];
    page.drawRectangle({ x: margin, y: y - 2, width: 10, height: 10, color: rgb(r, g, b) });
    draw(`${level.toUpperCase()} : ${count}`, margin + 16, y, 10);
    y -= 14;
  }
  y -= 8;

  // Risk table
  draw('Evaluation detaillee des risques', margin, y, 11, true); y -= 14;
  page.drawLine({ start: { x: margin, y: y + 4 }, end: { x: width - margin, y: y + 4 }, thickness: 0.5 });

  const colX = { cat: margin, risk: margin + 80, level: margin + 340, actions: margin + 400 };
  draw('Categorie', colX.cat, y, 9, true);
  draw('Risque', colX.risk, y, 9, true);
  draw('Niveau', colX.level, y, 9, true);
  draw('Actions preventives', colX.actions, y, 9, true);
  y -= 14;

  for (const risk of doc.risks) {
    ensureSpace(40);
    const level = calculateRiskLevel(risk.gravity, risk.probability);
    const [rc, gc, bc] = LEVEL_COLORS[level.level] ?? [0.4, 0.4, 0.4];
    draw((risk.category ?? '').slice(0, 20), colX.cat, y, 9);
    draw((risk.name ?? '').slice(0, 40), colX.risk, y, 9);
    page.drawRectangle({ x: colX.level, y: y - 2, width: 45, height: 12, color: rgb(rc, gc, bc) });
    draw(`${level.score}-${level.level.slice(0, 4)}`, colX.level + 2, y, 8, true, rgb(1, 1, 1));
    const firstAction = risk.preventive_actions?.[0] ?? '';
    draw(firstAction.slice(0, 55), colX.actions, y, 9);
    y -= 13;
    if (risk.responsible) {
      draw(`Responsable : ${risk.responsible}`, colX.risk, y, 8, false, rgb(0.4, 0.4, 0.4));
      y -= 11;
    }
  }

  // Footer legal
  ensureSpace(60);
  y -= 14;
  draw('References legales', margin, y, 10, true); y -= 12;
  draw('Code du travail art. L4121-1 a L4121-5 - R4121-1 a R4121-4', margin, y, 8); y -= 10;
  draw('Conservation obligatoire 40 ans (Loi n 2021-1018 du 02/08/2021)', margin, y, 8); y -= 10;
  draw('Mise a jour annuelle et a chaque changement des conditions de travail.', margin, y, 8);

  const bytes = await pdf.save();
  return Buffer.from(bytes);
}
