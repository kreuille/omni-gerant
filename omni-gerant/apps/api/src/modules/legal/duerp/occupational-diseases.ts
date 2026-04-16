// BUSINESS RULE [CDC-2.4]: Tableaux de maladies professionnelles
// Detection automatique des tableaux RG applicables depuis les risques identifies

export interface OccupationalDiseaseTable {
  tableNumber: string;
  name: string;
  description: string;
  riskTriggers: string[];
  sectors: string[];
  incubationPeriod: string;
  minExposureDuration: string | null;
  conditions: string;
}

// BUSINESS RULE [CDC-2.4]: Principaux tableaux de maladies professionnelles
export const OCCUPATIONAL_DISEASE_TABLES: OccupationalDiseaseTable[] = [
  {
    tableNumber: 'RG 57 A',
    name: 'Syndrome du canal carpien',
    description: 'Affections periarticulaires provoquees par certains gestes et postures de travail',
    riskTriggers: ['repetitive_movements', 'manutention', 'ergonomique'],
    sectors: ['boucherie', 'commerce', 'coiffure', 'boulangerie', 'restaurant'],
    incubationPeriod: '30 jours',
    minExposureDuration: null,
    conditions: 'Travaux comportant de facon habituelle des mouvements repetes ou prolonges des tendons flechisseurs',
  },
  {
    tableNumber: 'RG 65',
    name: 'Eczema allergique de contact',
    description: 'Lesions eczematiformes de mecanisme allergique',
    riskTriggers: ['chimique', 'dermatose'],
    sectors: ['coiffure', 'esthetique', 'nettoyage', 'garage-auto'],
    incubationPeriod: '15 jours',
    minExposureDuration: null,
    conditions: 'Manipulation ou emploi habituel de tous produits contenant des agents chimiques allergisants',
  },
  {
    tableNumber: 'RG 66',
    name: 'Asthme professionnel',
    description: 'Rhinite et asthmes professionnels — allergenes respiratoires',
    riskTriggers: ['chimique', 'poussieres', 'farine'],
    sectors: ['boulangerie', 'menuiserie', 'btp-general'],
    incubationPeriod: '7 jours',
    minExposureDuration: null,
    conditions: 'Travaux exposant a l\'inhalation de poussieres de farine, de bois, de cereales',
  },
  {
    tableNumber: 'RG 30/30bis',
    name: 'Cancers lies a l\'amiante',
    description: 'Affections professionnelles consecutives a l\'inhalation de poussieres d\'amiante',
    riskTriggers: ['amiante', 'poussieres'],
    sectors: ['btp-general', 'electricien'],
    incubationPeriod: '40 ans (latence longue)',
    minExposureDuration: '10 ans pour certaines pathologies',
    conditions: 'Travaux exposant a l\'inhalation de poussieres d\'amiante',
  },
  {
    tableNumber: 'RG 42',
    name: 'Surdite professionnelle',
    description: 'Deficit audiometrique bilateral par lesion cochleaire irreversible',
    riskTriggers: ['bruit'],
    sectors: ['btp-general', 'garage-auto', 'industrie'],
    incubationPeriod: '1 an',
    minExposureDuration: '1 an',
    conditions: 'Exposition prolongee a des niveaux de bruit > 85 dB(A)',
  },
  {
    tableNumber: 'RG 98',
    name: 'Lombalgies et sciatiques',
    description: 'Affections chroniques du rachis lombaire provoquees par la manutention manuelle',
    riskTriggers: ['manutention', 'manual_handling'],
    sectors: ['aide-domicile', 'commerce', 'btp-general', 'restaurant'],
    incubationPeriod: '6 mois',
    minExposureDuration: '5 ans',
    conditions: 'Travaux de manutention manuelle habituelle de charges lourdes',
  },
  {
    tableNumber: 'RG 79',
    name: 'Lesions du nez et des sinus',
    description: 'Affections provoquees par le bois',
    riskTriggers: ['poussieres', 'bois'],
    sectors: ['menuiserie', 'charpentier', 'btp-general'],
    incubationPeriod: '40 ans',
    minExposureDuration: '5 ans',
    conditions: 'Travaux d\'usinage des bois et materiaux en contenant',
  },
  {
    tableNumber: 'RG 58',
    name: 'Maladie de Parkinson',
    description: 'Maladie de Parkinson provoquee par les pesticides',
    riskTriggers: ['pesticides', 'phytosanitaires'],
    sectors: ['agriculture'],
    incubationPeriod: '1 an',
    minExposureDuration: '10 ans',
    conditions: 'Travaux exposant habituellement aux pesticides',
  },
];

// BUSINESS RULE [CDC-2.4]: Detection automatique des tableaux applicables
export function getApplicableDiseaseTables(
  riskCategories: string[],
  metierSlug?: string,
): OccupationalDiseaseTable[] {
  return OCCUPATIONAL_DISEASE_TABLES.filter((table) => {
    const matchesTrigger = table.riskTriggers.some((trigger) =>
      riskCategories.some((cat) => cat.toLowerCase().includes(trigger.toLowerCase())),
    );
    const matchesSector = metierSlug ? table.sectors.includes(metierSlug) : true;
    return matchesTrigger || matchesSector;
  });
}
