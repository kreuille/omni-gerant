import { describe, it, expect } from 'vitest';
import {
  detectTva, detectTvaRate, detectClientType, detectActivitySector,
  checkFranchiseThreshold, FRANCHISE_THRESHOLDS,
  type TvaDetectionInput,
} from '../tva-engine.js';
import {
  generateMentionsLegales, checkBtpAttestation,
  type CompanyProfile, type MentionsLegalesInput,
} from '../mentions-legales.js';

// ── Helper ──────────────────────────────────────────────────────────

function makeCompany(overrides: Partial<CompanyProfile> = {}): CompanyProfile {
  return {
    companyName: 'Test SARL',
    formeJuridique: 'sarl',
    siret: '12345678901234',
    rcsCity: 'Paris',
    capitalCents: 100000,
    regimeTva: 'reel_simplifie',
    ...overrides,
  };
}

// ═══════════════════════════════════════════════════════════════════
// 1. Moteur TVA — detection regime
// ═══════════════════════════════════════════════════════════════════

describe('Moteur TVA — regime', () => {
  it('should detect franchise en base for auto-entrepreneur', () => {
    const result = detectTva({
      regimeTva: 'franchise_base',
      formeJuridique: 'auto_entrepreneur',
      clientType: 'france_particulier',
    });
    expect(result.regime).toBe('franchise_base');
    expect(result.rate).toBe(0);
    expect(result.mention).toContain('293 B');
  });

  it('should detect export hors UE', () => {
    const result = detectTva({
      regimeTva: 'reel_normal',
      formeJuridique: 'sas',
      clientType: 'hors_ue',
    });
    expect(result.regime).toBe('export_hors_ue');
    expect(result.rate).toBe(0);
    expect(result.mention).toContain('262-I');
  });

  it('should detect intracom UE with TVA number', () => {
    const result = detectTva({
      regimeTva: 'reel_normal',
      formeJuridique: 'sas',
      clientType: 'ue_pro',
      clientTvaNumber: 'DE123456789',
    });
    expect(result.regime).toBe('intracom_ue');
    expect(result.autoliquidation).toBe(true);
    expect(result.mention).toContain('283-2');
    expect(result.mention).toContain('DE123456789');
  });

  it('should detect sous-traitance BTP', () => {
    const result = detectTva({
      regimeTva: 'reel_simplifie',
      formeJuridique: 'sarl',
      clientType: 'france_pro',
      isSousTraitanceBtp: true,
    });
    expect(result.regime).toBe('sous_traitance_btp');
    expect(result.autoliquidation).toBe(true);
    expect(result.mention).toContain('283-2 nonies');
  });

  it('should detect exoneration for sante', () => {
    const result = detectTva({
      regimeTva: 'reel_simplifie',
      formeJuridique: 'sel',
      clientType: 'france_particulier',
      activitySector: 'sante_actes_medicaux',
    });
    expect(result.regime).toBe('exonere');
    expect(result.rate).toBe(0);
    expect(result.mention).toContain('261-4-1');
  });

  it('should detect exoneration for formation agree', () => {
    const result = detectTva({
      regimeTva: 'reel_simplifie',
      formeJuridique: 'sarl',
      clientType: 'france_pro',
      activitySector: 'formation_agree',
    });
    expect(result.regime).toBe('exonere');
    expect(result.mention).toContain('261-4-4');
  });

  it('should detect standard 20% for IT', () => {
    const result = detectTva({
      regimeTva: 'reel_normal',
      formeJuridique: 'sas',
      clientType: 'france_pro',
      activitySector: 'it_conseil',
    });
    expect(result.regime).toBe('standard');
    expect(result.rate).toBe(2000);
  });
});

// ═══════════════════════════════════════════════════════════════════
// 2. Moteur TVA — detection taux
// ═══════════════════════════════════════════════════════════════════

describe('Moteur TVA — taux par secteur', () => {
  const testCases: Array<[string, number]> = [
    ['btp_renovation', 1000],
    ['btp_neuf', 2000],
    ['btp_energie', 550],
    ['restauration_sur_place', 1000],
    ['restauration_emporter', 550],
    ['hotellerie', 1000],
    ['transport_voyageurs', 1000],
    ['aide_domicile', 1000],
    ['spectacle_vivant', 550],
    ['presse', 210],
    ['medicament_rembourse', 210],
    ['alimentaire', 550],
    ['livres', 550],
    ['it_conseil', 2000],
    ['commerce_general', 2000],
    ['beaute', 2000],
    ['sante_actes_medicaux', 0],
    ['formation_agree', 0],
    ['sci_location_nue', 0],
  ];

  it.each(testCases)('sector %s should have rate %d', (sector, expectedRate) => {
    const rate = detectTvaRate(sector as Parameters<typeof detectTvaRate>[0]);
    expect(rate).toBe(expectedRate);
  });

  it('should default to 20% for unknown sector', () => {
    expect(detectTvaRate(undefined)).toBe(2000);
    expect(detectTvaRate('autre')).toBe(2000);
  });
});

// ═══════════════════════════════════════════════════════════════════
// 3. Detection type client
// ═══════════════════════════════════════════════════════════════════

describe('Detection type client', () => {
  it('should detect france particulier', () => {
    expect(detectClientType({ country: 'FR', isProfessional: false })).toBe('france_particulier');
  });

  it('should detect france pro', () => {
    expect(detectClientType({ country: 'FR', isProfessional: true })).toBe('france_pro');
  });

  it('should detect UE pro with TVA number', () => {
    expect(detectClientType({ country: 'DE', isEu: true, isProfessional: true, tvaNumber: 'DE123' })).toBe('ue_pro');
  });

  it('should detect UE particulier', () => {
    expect(detectClientType({ country: 'DE', isEu: true, isProfessional: false })).toBe('ue_particulier');
  });

  it('should detect hors UE', () => {
    expect(detectClientType({ country: 'US', isEu: false })).toBe('hors_ue');
  });
});

// ═══════════════════════════════════════════════════════════════════
// 4. Detection secteur activite depuis NAF
// ═══════════════════════════════════════════════════════════════════

describe('Detection secteur activite depuis NAF', () => {
  const nafTests: Array<[string, string]> = [
    ['43.22A', 'btp_renovation'],
    ['56.10A', 'restauration_sur_place'],
    ['55.10Z', 'hotellerie'],
    ['62.01Z', 'it_conseil'],
    ['47.11F', 'commerce_general'],
    ['96.02A', 'beaute'],
    ['86.10Z', 'sante_actes_medicaux'],
    ['85.10Z', 'formation_agree'],
    ['68.20A', 'immobilier'],
    ['88.10A', 'aide_domicile'],
  ];

  it.each(nafTests)('NAF %s should detect sector %s', (naf, expectedSector) => {
    expect(detectActivitySector(naf)).toBe(expectedSector);
  });
});

// ═══════════════════════════════════════════════════════════════════
// 5. Alerte seuil franchise
// ═══════════════════════════════════════════════════════════════════

describe('Alerte seuil franchise', () => {
  it('should be OK under 80% threshold', () => {
    const alert = checkFranchiseThreshold(2000000, 'services'); // 20 000 EUR
    expect(alert.level).toBe('ok');
  });

  it('should warn at 80% threshold', () => {
    const alert = checkFranchiseThreshold(3000000, 'services'); // 30 000 EUR (~82% of 36 800)
    expect(alert.level).toBe('warning');
  });

  it('should danger above base threshold', () => {
    const alert = checkFranchiseThreshold(3700000, 'services'); // 37 000 EUR > 36 800
    expect(alert.level).toBe('danger');
  });

  it('should exceeded above majored threshold', () => {
    const alert = checkFranchiseThreshold(4000000, 'services'); // 40 000 EUR > 39 100
    expect(alert.level).toBe('exceeded');
  });

  it('should use vente thresholds for vente', () => {
    const alert = checkFranchiseThreshold(9000000, 'vente'); // 90 000 EUR < 91 900
    expect(alert.level).toBe('warning');
  });
});

// ═══════════════════════════════════════════════════════════════════
// 6. Mentions legales
// ═══════════════════════════════════════════════════════════════════

describe('Mentions legales', () => {
  it('should generate header mentions for SARL', () => {
    const result = generateMentionsLegales({
      company: makeCompany(),
      clientType: 'france_particulier',
      tvaRegime: 'standard',
    });
    expect(result.headerMentions).toContain('Test SARL');
    expect(result.headerMentions.some((m) => m.includes('SARL au capital'))).toBe(true);
    expect(result.headerMentions.some((m) => m.includes('SIRET'))).toBe(true);
    expect(result.headerMentions.some((m) => m.includes('RCS Paris'))).toBe(true);
  });

  it('should generate header mentions for auto-entrepreneur', () => {
    const result = generateMentionsLegales({
      company: makeCompany({ formeJuridique: 'auto_entrepreneur', regimeTva: 'franchise_base' }),
      clientType: 'france_particulier',
      tvaRegime: 'franchise_base',
    });
    expect(result.headerMentions.some((m) => m.includes('Micro-entreprise'))).toBe(true);
    expect(result.tvaMention).toContain('293 B');
  });

  it('should include retractation for particulier', () => {
    const result = generateMentionsLegales({
      company: makeCompany(),
      clientType: 'france_particulier',
      tvaRegime: 'standard',
    });
    expect(result.paymentMentions.some((m) => m.includes('retractation'))).toBe(true);
  });

  it('should include penalites for pro', () => {
    const result = generateMentionsLegales({
      company: makeCompany(),
      clientType: 'france_pro',
      tvaRegime: 'standard',
    });
    expect(result.paymentMentions.some((m) => m.includes('penalites'))).toBe(true);
    expect(result.paymentMentions.some((m) => m.includes('40 EUR'))).toBe(true);
  });

  it('should include decennale for BTP', () => {
    const result = generateMentionsLegales({
      company: makeCompany({
        nafCode: '43.22A',
        decennaleNumber: 'DEC-123',
        decennaleInsurer: 'AXA',
        rcProNumber: 'RC-456',
        rcProInsurer: 'MAIF',
        rmNumber: 'RM-789',
        rmCity: 'Lyon',
      }),
      clientType: 'france_particulier',
      tvaRegime: 'standard',
    });
    expect(result.sectorMentions.some((m) => m.includes('decennale'))).toBe(true);
    expect(result.sectorMentions.some((m) => m.includes('AXA'))).toBe(true);
    expect(result.sectorMentions.some((m) => m.includes('RC Professionnelle'))).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════
// 7. Attestation BTP CERFA
// ═══════════════════════════════════════════════════════════════════

describe('Attestation BTP CERFA 1301-SD', () => {
  it('should require attestation for BTP particulier at 10%', () => {
    const result = checkBtpAttestation('43.22A', 'france_particulier', 1000);
    expect(result.required).toBe(true);
    expect(result.cerfa).toBe('CERFA 1301-SD');
    expect(result.conditions.length).toBeGreaterThan(0);
  });

  it('should require attestation for BTP particulier at 5.5%', () => {
    const result = checkBtpAttestation('43.22A', 'france_particulier', 550);
    expect(result.required).toBe(true);
  });

  it('should NOT require attestation for BTP pro', () => {
    const result = checkBtpAttestation('43.22A', 'france_pro', 1000);
    expect(result.required).toBe(false);
  });

  it('should NOT require attestation for non-BTP', () => {
    const result = checkBtpAttestation('62.01Z', 'france_particulier', 2000);
    expect(result.required).toBe(false);
  });

  it('should NOT require attestation at 20%', () => {
    const result = checkBtpAttestation('43.22A', 'france_particulier', 2000);
    expect(result.required).toBe(false);
  });
});
