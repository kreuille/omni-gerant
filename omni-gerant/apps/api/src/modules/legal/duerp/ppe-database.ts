// BUSINESS RULE [CDC-2.4]: EPI (Equipements de Protection Individuelle) par risque
// Association risque → EPI avec normes EN applicables

export interface PPERequirement {
  id: string;
  riskType: string;
  ppeName: string;
  norm: string;
  sectors: string[];
  mandatory: boolean;
}

export const PPE_DATABASE: PPERequirement[] = [
  { id: 'ppe-coupure', riskType: 'coupure', ppeName: 'Gants anti-coupure', norm: 'EN 388 niveau 5', sectors: ['boucherie', 'restaurant'], mandatory: true },
  { id: 'ppe-brulure', riskType: 'brulure_thermique', ppeName: 'Gants anti-chaleur', norm: 'EN 407 (250°C min)', sectors: ['boulangerie', 'restaurant'], mandatory: true },
  { id: 'ppe-harnais', riskType: 'chute_hauteur', ppeName: 'Harnais antichute', norm: 'EN 361', sectors: ['btp-general', 'nettoyage'], mandatory: true },
  { id: 'ppe-auditif', riskType: 'bruit', ppeName: 'Protection auditive', norm: 'EN 352-1/2', sectors: ['btp-general', 'garage-auto', 'industrie'], mandatory: true },
  { id: 'ppe-chimique-gants', riskType: 'chimique', ppeName: 'Gants nitrile', norm: 'EN 374', sectors: ['nettoyage', 'garage-auto', 'coiffure'], mandatory: true },
  { id: 'ppe-poussieres', riskType: 'poussieres', ppeName: 'Masque FFP2/FFP3', norm: 'EN 149', sectors: ['btp-general', 'boulangerie', 'agriculture'], mandatory: true },
  { id: 'ppe-chaussures', riskType: 'chute_plain_pied', ppeName: 'Chaussures antiderapantes', norm: 'EN ISO 20345 S1P/S3', sectors: ['restaurant', 'nettoyage', 'boucherie'], mandatory: true },
  { id: 'ppe-arc', riskType: 'arc_electrique', ppeName: 'Combinaison arc flash', norm: 'ATPV rated', sectors: ['electricien'], mandatory: true },
  { id: 'ppe-lunettes', riskType: 'projection', ppeName: 'Lunettes de protection', norm: 'EN 166', sectors: ['garage-auto', 'nettoyage', 'laboratoire'], mandatory: true },
  { id: 'ppe-froid', riskType: 'froid', ppeName: 'Vetements thermiques', norm: 'EN 342', sectors: ['boucherie', 'entreposage'], mandatory: true },
  { id: 'ppe-bio', riskType: 'biologique', ppeName: 'Masque chirurgical/FFP2 + gants', norm: 'EN 14683 / EN 149', sectors: ['aide-domicile', 'ambulancier', 'creche'], mandatory: true },
  { id: 'ppe-hivis', riskType: 'circulation', ppeName: 'Gilet haute visibilite', norm: 'EN ISO 20471 classe 2', sectors: ['btp-general', 'logistique', 'voirie'], mandatory: true },
  { id: 'ppe-casque', riskType: 'chute_objets', ppeName: 'Casque de chantier', norm: 'EN 397', sectors: ['btp-general'], mandatory: true },
];

// BUSINESS RULE [CDC-2.4]: Detection EPI requis par risque
export function getPPEForRisk(riskType: string): PPERequirement[] {
  return PPE_DATABASE.filter((ppe) =>
    riskType.toLowerCase().includes(ppe.riskType.toLowerCase()) ||
    ppe.riskType.toLowerCase().includes(riskType.toLowerCase()),
  );
}

export function getPPEForSector(metierSlug: string): PPERequirement[] {
  return PPE_DATABASE.filter((ppe) => ppe.sectors.includes(metierSlug));
}
