import { describe, it, expect } from 'vitest';
import { generateFacturxXml, type FacturxInvoiceData } from '../facturx/facturx-xml.js';
import { validateFacturxDataDetailed, validateFacturxXml } from '../facturx/facturx-validator.js';
import { generateFacturxPdf, generateXmpMetadata } from '../facturx/facturx-pdf.js';
import { computeInvoiceContentHash } from '../invoice-signature.service.js';

const baseData: FacturxInvoiceData = {
  number: 'FAC-2026-00042',
  type_code: '380',
  issue_date: new Date('2026-04-15'),
  due_date: new Date('2026-05-15'),
  currency: 'EUR',
  seller: { name: 'YOKTO', siret: '89024639000029', vat_number: 'FR12890246390', address_line: '1 rue du Test', zip_code: '75001', city: 'Paris', country_code: 'FR' },
  buyer: { name: 'ACME SAS', siret: '12345678901234', address_line: '5 av. Client', zip_code: '69001', city: 'Lyon', country_code: 'FR' },
  lines: [
    { position: 1, label: 'Prestation conseil', quantity: 10, unit: 'h', unit_price_cents: 12000, tva_rate: 20, total_ht_cents: 120000 },
    { position: 2, label: 'Frais deplacement', quantity: 1, unit: 'unit', unit_price_cents: 8000, tva_rate: 20, total_ht_cents: 8000 },
  ],
  tax_groups: [{ tva_rate: 20, base_ht_cents: 128000, tva_cents: 25600 }],
  total_ht_cents: 128000,
  total_tva_cents: 25600,
  total_ttc_cents: 153600,
  payment_terms_days: 30,
};

describe('F2 — EN 16931 profil generation', () => {
  it('genere XML avec guideline EN 16931', () => {
    const xml = generateFacturxXml({ ...baseData, profile: 'EN 16931' });
    expect(xml).toContain('urn:cen.eu:en16931:2017');
  });

  it('genere XML MINIMUM avec guideline minimum', () => {
    const xml = generateFacturxXml({ ...baseData, profile: 'MINIMUM' });
    expect(xml).toContain('urn:factur-x.eu:1p0:minimum');
  });

  it('EN 16931 inclut payment means si fournis', () => {
    const xml = generateFacturxXml({
      ...baseData,
      profile: 'EN 16931',
      payment_means_code: '30',
      iban: 'FR7612345678901234567890123',
      bic: 'BNPAFRPP',
      buyer_reference: 'PO-2026-001',
    });
    expect(xml).toContain('<ram:TypeCode>30</ram:TypeCode>');
    expect(xml).toContain('FR7612345678901234567890123');
    expect(xml).toContain('BNPAFRPP');
    expect(xml).toContain('PO-2026-001');
  });

  it('EXTENDED utilise guideline conformant', () => {
    const xml = generateFacturxXml({ ...baseData, profile: 'EXTENDED' });
    expect(xml).toContain('conformant');
  });
});

describe('F3 — Validation EN 16931 BR rules', () => {
  it('base valide passe sans erreur', () => {
    const report = validateFacturxDataDetailed({ ...baseData, profile: 'EN 16931' });
    expect(report.valid).toBe(true);
  });

  it('numero manquant -> BR-01 error', () => {
    const report = validateFacturxDataDetailed({ ...baseData, number: '' });
    expect(report.issues.some((i) => i.rule === 'BR-01')).toBe(true);
    expect(report.valid).toBe(false);
  });

  it('pays vendeur non ISO -> BR-09 error', () => {
    const report = validateFacturxDataDetailed({ ...baseData, seller: { ...baseData.seller, country_code: 'France' } });
    expect(report.issues.some((i) => i.rule === 'BR-09')).toBe(true);
  });

  it('somme lignes != total HT -> BR-CO-10 error', () => {
    const report = validateFacturxDataDetailed({ ...baseData, total_ht_cents: 999999 });
    expect(report.issues.some((i) => i.rule === 'BR-CO-10')).toBe(true);
  });

  it('HT + TVA != TTC -> BR-CO-15 error', () => {
    const report = validateFacturxDataDetailed({ ...baseData, total_ttc_cents: 999999 });
    expect(report.issues.some((i) => i.rule === 'BR-CO-15')).toBe(true);
  });

  it('IBAN invalide -> BT-84 error (EN 16931)', () => {
    const report = validateFacturxDataDetailed({ ...baseData, profile: 'EN 16931', iban: 'INVALID_IBAN' });
    expect(report.issues.some((i) => i.rule === 'BT-84')).toBe(true);
  });

  it('quantite negative -> BT-129 error', () => {
    const bad = { ...baseData, lines: [{ ...baseData.lines[0]!, quantity: -1 }] };
    const report = validateFacturxDataDetailed(bad);
    expect(report.issues.some((i) => i.rule === 'BT-129')).toBe(true);
  });

  it('taux TVA negatif -> BT-152 error', () => {
    const bad = { ...baseData, lines: [{ ...baseData.lines[0]!, tva_rate: -20 }] };
    const report = validateFacturxDataDetailed(bad);
    expect(report.issues.some((i) => i.rule === 'BT-152')).toBe(true);
  });
});

describe('F3 — Validation XML structure', () => {
  it('XML genere valide structure', () => {
    const xml = generateFacturxXml({ ...baseData, profile: 'EN 16931' });
    const r = validateFacturxXml(xml);
    expect(r.ok).toBe(true);
  });

  it('XML tronque -> invalide', () => {
    const r = validateFacturxXml('<?xml version="1.0"?><rsm:CrossIndustryInvoice>');
    expect(r.ok).toBe(false);
  });
});

describe('F1 — PDF/A-3 generation', () => {
  it('genere PDF avec XML embedded', async () => {
    const xml = generateFacturxXml({ ...baseData, profile: 'EN 16931' });
    const r = await generateFacturxPdf(
      {
        employer: { name: 'YOKTO', siret: '89024639000029' },
        client: { name: 'ACME SAS' },
        number: baseData.number,
        issueDate: baseData.issue_date,
        dueDate: baseData.due_date,
        lines: baseData.lines.map((l) => ({ label: l.label, quantity: l.quantity, unitPriceCents: l.unit_price_cents, tvaRate: l.tva_rate * 100, totalHtCents: l.total_ht_cents })),
        totalHtCents: baseData.total_ht_cents,
        totalTvaCents: baseData.total_tva_cents,
        totalTtcCents: baseData.total_ttc_cents,
      },
      xml,
      'EN 16931',
    );
    if (!r.ok) console.error('PDF gen error:', r.error);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.pdfaVersion).toBe('3B');
      expect(r.value.profile).toBe('EN 16931');
      // PDF buffer commence par %PDF
      expect(r.value.pdf_buffer.toString('utf-8', 0, 5)).toBe('%PDF-');
      // XML complet embedded
      expect(r.value.xml_content.length).toBeGreaterThan(500);
    }
  });

  it('XMP metadata contient namespace fx', () => {
    const xmp = generateXmpMetadata('FAC-001', 'EN 16931');
    expect(xmp).toContain('urn:factur-x:pdfa:CrossIndustryDocument');
    expect(xmp).toContain('EN 16931');
    expect(xmp).toContain('pdfaid:part>3');
  });
});

describe('F5 — Signature invoice hash', () => {
  it('hash reproductible sur meme contenu', () => {
    const inv = {
      number: 'FAC-001', issue_date: new Date('2026-01-01'), due_date: new Date('2026-01-31'),
      client_id: 'cli-1', total_ttc_cents: 120000, total_ht_cents: 100000, total_tva_cents: 20000,
    };
    const lines = [{ label: 'Service', quantity: 1, total_ht_cents: 100000 }];
    const h1 = computeInvoiceContentHash(inv, lines);
    const h2 = computeInvoiceContentHash(inv, lines);
    expect(h1).toBe(h2);
    expect(h1).toMatch(/^[a-f0-9]{64}$/);
  });

  it('hash different si montant change', () => {
    const inv1 = { number: 'FAC-001', issue_date: new Date(), due_date: new Date(), client_id: 'c', total_ttc_cents: 100, total_ht_cents: 83, total_tva_cents: 17 };
    const inv2 = { ...inv1, total_ttc_cents: 200 };
    const h1 = computeInvoiceContentHash(inv1, []);
    const h2 = computeInvoiceContentHash(inv2, []);
    expect(h1).not.toBe(h2);
  });
});
