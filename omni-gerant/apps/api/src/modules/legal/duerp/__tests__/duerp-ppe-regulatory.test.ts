import { describe, it, expect } from 'vitest';
import {
  ALL_PPE, getExtendedPPEForRisk, getExtendedPPEForSector,
  createRegulatoryWatchService,
} from '../duerp-ppe-regulatory.service.js';

describe('E12 — PPE database and regulatory watch', () => {

  // ═══════════════════════════════════════════════════════════════
  // 1. PPE database
  // ═══════════════════════════════════════════════════════════════

  describe('PPE database', () => {
    it('should have at least 25 PPE entries', () => {
      expect(ALL_PPE.length).toBeGreaterThanOrEqual(25);
    });

    it('should have EN norms for each PPE', () => {
      for (const ppe of ALL_PPE) {
        expect(ppe.norm.length, `${ppe.ppeName} should have a norm`).toBeGreaterThan(0);
      }
    });

    it('should find PPE for BTP sector', () => {
      const ppe = getExtendedPPEForSector('btp-general');
      expect(ppe.length).toBeGreaterThan(0);
      const names = ppe.map((p) => p.ppeName);
      expect(names.some((n) => n.toLowerCase().includes('casque'))).toBe(true);
      expect(names.some((n) => n.toLowerCase().includes('harnais'))).toBe(true);
    });

    it('should find harnais for chute hauteur', () => {
      const ppe = getExtendedPPEForRisk('chute_hauteur');
      expect(ppe.length).toBeGreaterThan(0);
      expect(ppe.some((p) => p.norm.includes('EN 361'))).toBe(true);
    });

    it('should find PPE for bruit', () => {
      const ppe = getExtendedPPEForRisk('bruit');
      expect(ppe.length).toBeGreaterThan(0);
      expect(ppe.some((p) => p.norm.includes('EN 352'))).toBe(true);
    });

    it('should find PPE for chimique', () => {
      const ppe = getExtendedPPEForRisk('chimique');
      expect(ppe.length).toBeGreaterThan(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // 2. Extended PPE for E7 sectors
  // ═══════════════════════════════════════════════════════════════

  describe('Extended PPE for new sectors', () => {
    it('should find anti-coupure tronconneuse for exploitation forestiere', () => {
      const ppe = getExtendedPPEForSector('exploitation-forestiere');
      expect(ppe.some((p) => p.norm.includes('EN 381'))).toBe(true);
    });

    it('should find ARI for sapeurs-pompiers', () => {
      const ppe = getExtendedPPEForSector('sapeurs-pompiers');
      expect(ppe.some((p) => p.ppeName.includes('ARI'))).toBe(true);
    });

    it('should find DVA for moniteur-ski', () => {
      const ppe = getExtendedPPEForSector('moniteur-ski');
      expect(ppe.some((p) => p.ppeName.includes('DVA'))).toBe(true);
    });

    it('should find bombe equitation for centre-equestre', () => {
      const ppe = getExtendedPPEForSector('centre-equestre');
      expect(ppe.some((p) => p.norm.includes('EN 1384'))).toBe(true);
    });

    it('should find detecteur multi-gaz for assainissement', () => {
      const ppe = getExtendedPPEForSector('assainissement');
      expect(ppe.some((p) => p.ppeName.includes('Detecteur'))).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // 3. Regulatory watch
  // ═══════════════════════════════════════════════════════════════

  describe('Regulatory watch', () => {
    it('should have at least 5 regulatory updates', () => {
      const svc = createRegulatoryWatchService();
      expect(svc.getAll().length).toBeGreaterThanOrEqual(5);
    });

    it('should filter updates by sector (BTP)', () => {
      const svc = createRegulatoryWatchService();
      const updates = svc.getRelevantForSector('btp-general');
      expect(updates.length).toBeGreaterThan(0);
      // BTP should get amiante and chute updates
      expect(updates.some((u) => u.title.toLowerCase().includes('amiante') || u.title.toLowerCase().includes('chute'))).toBe(true);
    });

    it('should filter updates by NAF code prefix', () => {
      const svc = createRegulatoryWatchService();
      const updates = svc.getRelevantForNaf('43.21A'); // BTP NAF code
      expect(updates.length).toBeGreaterThan(0);
    });

    it('should include universal updates (* sectors) for any sector', () => {
      const svc = createRegulatoryWatchService();
      const updates = svc.getRelevantForSector('restaurant');
      const universal = updates.filter((u) => u.affectedSectors.includes('*'));
      expect(universal.length).toBeGreaterThan(0);
    });

    it('should filter action_required updates', () => {
      const svc = createRegulatoryWatchService();
      const actionRequired = svc.getActionRequired();
      expect(actionRequired.length).toBeGreaterThan(0);
      for (const u of actionRequired) {
        expect(u.severity).toBe('action_required');
      }
    });

    it('should add a new regulatory update', () => {
      const svc = createRegulatoryWatchService();
      const before = svc.getAll().length;
      svc.addUpdate({
        title: 'Nouvelle reglementation test',
        description: 'Description test',
        type: 'new_regulation',
        affectedNafCodes: [],
        affectedSectors: ['restaurant'],
        affectedRiskTypes: [],
        effectiveDate: new Date('2025-01-01'),
        source: 'Test',
        sourceUrl: null,
        severity: 'info',
      });
      expect(svc.getAll().length).toBe(before + 1);
    });

    it('should include pesticide disease table for agriculture sectors', () => {
      const svc = createRegulatoryWatchService();
      const updates = svc.getRelevantForSector('viticulture');
      expect(updates.some((u) => u.type === 'new_disease_table')).toBe(true);
    });

    it('should sort by effective date (newest first)', () => {
      const svc = createRegulatoryWatchService();
      const all = svc.getAll();
      for (let i = 0; i < all.length - 1; i++) {
        expect(all[i]!.effectiveDate.getTime()).toBeGreaterThanOrEqual(all[i + 1]!.effectiveDate.getTime());
      }
    });
  });
});
