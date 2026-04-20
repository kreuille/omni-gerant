import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import type { Quote } from './quote.service.js';
import type { TenantProfile } from '../tenant/tenant.service.js';

// BUSINESS RULE [CDC-2.1 / P0-02]: PDF binaire devis (pdf-lib, pas de Chromium)
// Genere un vrai PDF application/pdf (pas du HTML deguise).

function formatCentsEur(cents: number): string {
  return (cents / 100).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    .replace(/\u00A0/g, ' ').replace(/\u202F/g, ' ') + ' EUR';
}

function formatRate(basisPoints: number): string {
  return (basisPoints / 100).toFixed(basisPoints % 100 === 0 ? 0 : 1) + '%';
}

function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString('fr-FR');
}

// Replace characters not supported by WinAnsi (Helvetica)
function toWinAnsi(s: string | null | undefined): string {
  if (!s) return '';
  return s.replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/\u2013/g, '-')
    .replace(/\u2014/g, '-')
    .replace(/\u2026/g, '...')
    .replace(/\u00A0/g, ' ')
    .replace(/\u202F/g, ' ');
}

export async function generateQuotePdfBinary(quote: Quote, tenant: TenantProfile | null): Promise<Buffer> {
  const pdf = await PDFDocument.create();
  pdf.setTitle(`Devis ${quote.number}`);
  pdf.setAuthor(tenant?.company_name ?? 'zenAdmin');
  pdf.setCreator('zenAdmin');
  pdf.setProducer('zenAdmin PDF');

  const page = pdf.addPage([595.28, 841.89]); // A4
  const { width, height } = page.getSize();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);

  const margin = 40;
  let y = height - margin;

  const draw = (text: string, x: number, yy: number, size = 10, bold = false, color = rgb(0, 0, 0)) => {
    page.drawText(toWinAnsi(text), { x, y: yy, size, font: bold ? fontBold : font, color });
  };

  // Header — left: emitter; right: "DEVIS N°"
  const companyName = tenant?.company_name ?? 'Votre entreprise';
  draw(companyName, margin, y, 14, true);
  y -= 16;
  if (tenant?.address) {
    draw(tenant.address.line1 ?? '', margin, y); y -= 12;
    draw(`${tenant.address.zip_code ?? ''} ${tenant.address.city ?? ''}`, margin, y); y -= 12;
  }
  if (tenant?.siret) { draw(`SIRET : ${tenant.siret}`, margin, y); y -= 12; }
  if (tenant?.tva_number) { draw(`TVA : ${tenant.tva_number}`, margin, y); y -= 12; }
  if (tenant?.email) { draw(tenant.email, margin, y); y -= 12; }
  if (tenant?.phone) { draw(tenant.phone, margin, y); y -= 12; }

  // Title box (right)
  draw(`DEVIS ${quote.number}`, width - margin - 200, height - margin, 18, true, rgb(0.1, 0.3, 0.6));
  draw(`Date : ${formatDate(quote.created_at)}`, width - margin - 200, height - margin - 22, 10);
  draw(`Validite : ${formatDate(quote.validity_date)}`, width - margin - 200, height - margin - 36, 10);

  // Client
  y = height - margin - 130;
  draw('Client', margin, y, 11, true); y -= 14;
  draw(quote.client_name ?? 'Client', margin, y, 10, true); y -= 12;
  if (quote.client_email) { draw(quote.client_email, margin, y); y -= 12; }

  // Quote title & description
  y -= 10;
  if (quote.title) { draw(quote.title, margin, y, 12, true); y -= 16; }
  if (quote.description) {
    for (const line of quote.description.split('\n').slice(0, 3)) {
      draw(line.slice(0, 100), margin, y, 9); y -= 11;
    }
  }

  // Table header
  y -= 10;
  const tableTop = y;
  const colX = { pos: margin, label: margin + 26, qty: margin + 310, unit: margin + 350, price: margin + 400, total: margin + 470 };
  draw('#', colX.pos, y, 9, true);
  draw('Designation', colX.label, y, 9, true);
  draw('Qte', colX.qty, y, 9, true);
  draw('Unite', colX.unit, y, 9, true);
  draw('PU HT', colX.price, y, 9, true);
  draw('Total HT', colX.total, y, 9, true);
  y -= 14;
  page.drawLine({ start: { x: margin, y: y + 4 }, end: { x: width - margin, y: y + 4 }, thickness: 0.5 });

  // Lines
  const productLines = quote.lines.filter((l) => l.type === 'line');
  for (const line of productLines) {
    if (y < margin + 100) {
      // new page
      const np = pdf.addPage([595.28, 841.89]);
      page.drawText('...', { x: margin, y: margin, size: 8, font });
      y = np.getSize().height - margin;
    }
    draw(String(line.position), colX.pos, y, 9);
    draw((line.label ?? '').slice(0, 55), colX.label, y, 9);
    draw(String(line.quantity), colX.qty, y, 9);
    draw(line.unit, colX.unit, y, 9);
    draw(formatCentsEur(line.unit_price_cents), colX.price, y, 9);
    draw(formatCentsEur(line.total_ht_cents), colX.total, y, 9);
    y -= 14;
  }

  // Totals
  y -= 10;
  page.drawLine({ start: { x: width - margin - 200, y: y + 6 }, end: { x: width - margin, y: y + 6 }, thickness: 0.5 });
  draw('Total HT', width - margin - 200, y, 10, true);
  draw(formatCentsEur(quote.total_ht_cents), width - margin - 100, y, 10);
  y -= 14;

  // TVA by rate
  const tvaMap = new Map<number, { base: number; tva: number }>();
  for (const line of productLines) {
    const existing = tvaMap.get(line.tva_rate) ?? { base: 0, tva: 0 };
    existing.base += line.total_ht_cents;
    existing.tva += Math.round((line.total_ht_cents * line.tva_rate) / 10000);
    tvaMap.set(line.tva_rate, existing);
  }
  for (const [rate, v] of tvaMap.entries()) {
    draw(`TVA ${formatRate(rate)}`, width - margin - 200, y, 10);
    draw(formatCentsEur(v.tva), width - margin - 100, y, 10);
    y -= 12;
  }

  draw('Total TTC', width - margin - 200, y, 11, true);
  draw(formatCentsEur(quote.total_ttc_cents), width - margin - 100, y, 11, true);
  y -= 20;

  // Mentions legales
  y -= 10;
  draw('Mentions legales', margin, y, 9, true); y -= 11;
  draw(`Devis valable jusqu'au ${formatDate(quote.validity_date)}.`, margin, y, 8); y -= 10;
  draw('Pour accord, merci de signer et dater avec la mention "Bon pour accord".', margin, y, 8); y -= 10;
  if (tenant?.legal_form) {
    draw(`${tenant.legal_form} - SIRET ${tenant.siret ?? ''}`, margin, y, 8); y -= 10;
  }

  // C1 : bloc signature eIDAS simple (si signe)
  const sig = quote.signature_data as null | { signer_name?: string; signer_first_name?: string; signed_at?: string; ip_address?: string; content_hash?: string; signature_hash?: string; signature_image?: string };
  if (sig && sig.signer_name) {
    y -= 14;
    page.drawLine({ start: { x: margin, y: y + 6 }, end: { x: width - margin, y: y + 6 }, thickness: 1, color: rgb(0.1, 0.45, 0.1) });
    draw('Signature electronique (eIDAS niveau simple)', margin, y, 10, true, rgb(0.1, 0.45, 0.1)); y -= 13;
    draw(`Signe par : ${sig.signer_first_name ?? ''} ${sig.signer_name}`, margin, y, 9); y -= 11;
    if (sig.signed_at) {
      const d = new Date(sig.signed_at);
      draw(`Date : ${d.toLocaleString('fr-FR')}`, margin, y, 9); y -= 11;
    }
    if (sig.ip_address) { draw(`IP : ${sig.ip_address}`, margin, y, 9); y -= 11; }
    if (sig.content_hash) {
      draw(`Empreinte SHA-256 : ${sig.content_hash.slice(0, 32)}...${sig.content_hash.slice(-8)}`, margin, y, 7, false, rgb(0.4, 0.4, 0.4)); y -= 9;
    }
    if (sig.signature_hash) {
      draw(`Preuve : ${sig.signature_hash.slice(0, 32)}...${sig.signature_hash.slice(-8)}`, margin, y, 7, false, rgb(0.4, 0.4, 0.4)); y -= 9;
    }
    draw('Ce document a ete signe electroniquement. Toute modification du contenu invalide la signature.', margin, y, 7, false, rgb(0.4, 0.4, 0.4));
  }

  const bytes = await pdf.save();
  return Buffer.from(bytes);
}
