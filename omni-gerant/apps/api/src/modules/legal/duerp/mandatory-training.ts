// BUSINESS RULE [CDC-2.4]: Formations obligatoires par secteur
// Le DUERP genere automatiquement la liste des formations requises par poste/UT

export interface MandatoryTraining {
  id: string;
  name: string;
  description: string;
  sectors: string[];
  frequency: string;
  duration: string;
  legalBasis: string;
  certifyingBody: string | null;
  validityYears: number | null;
}

export const MANDATORY_TRAININGS: MandatoryTraining[] = [
  {
    id: 'sst',
    name: 'SST (Sauveteur Secouriste du Travail)',
    description: 'Formation aux premiers secours en milieu professionnel',
    sectors: ['*'], // tous secteurs
    frequency: 'Initiale + recyclage tous les 2 ans',
    duration: '14h initiale, 7h recyclage',
    legalBasis: 'Art. R4224-15',
    certifyingBody: 'INRS',
    validityYears: 2,
  },
  {
    id: 'habilitation-electrique',
    name: 'Habilitation electrique NF C 18-510',
    description: 'Habilitation pour travaux electriques ou au voisinage',
    sectors: ['electricien', 'btp-general', 'industrie'],
    frequency: 'Initiale + recyclage tous les 3 ans',
    duration: '14-21h selon niveau',
    legalBasis: 'Arrete 26/04/2012',
    certifyingBody: null,
    validityYears: 3,
  },
  {
    id: 'caces',
    name: 'CACES (par categorie R489, R486, R482...)',
    description: 'Certificat d\'aptitude a la conduite en securite',
    sectors: ['btp-general', 'commerce', 'logistique', 'agriculture'],
    frequency: 'Initiale + renouvellement tous les 5 ans',
    duration: '14-35h selon categorie',
    legalBasis: 'Art. R4323-55',
    certifyingBody: 'Organisme certifie',
    validityYears: 5,
  },
  {
    id: 'ss4-amiante',
    name: 'SS4 (Sous-section 4 amiante)',
    description: 'Formation travaux pouvant exposer a l\'amiante',
    sectors: ['btp-general', 'electricien'],
    frequency: 'Initiale + recyclage tous les 3 ans',
    duration: '35h initiale, 7h recyclage',
    legalBasis: 'Decret 2012-639',
    certifyingBody: 'Organisme certifie',
    validityYears: 3,
  },
  {
    id: 'haccp',
    name: 'HACCP / Hygiene alimentaire',
    description: 'Formation en hygiene alimentaire pour la restauration',
    sectors: ['restaurant', 'boulangerie', 'boucherie', 'traiteur'],
    frequency: 'Formation initiale obligatoire',
    duration: '14h',
    legalBasis: 'Decret 2011-731',
    certifyingBody: 'Organisme enregistre Draaf',
    validityYears: null, // pas de renouvellement obligatoire
  },
  {
    id: 'certiphyto',
    name: 'Certiphyto',
    description: 'Certificat individuel produits phytopharmaceutiques',
    sectors: ['agriculture'],
    frequency: 'Initiale + renouvellement tous les 5 ans',
    duration: '14-21h',
    legalBasis: 'Art. L254-3 Code rural',
    certifyingBody: 'Vivea / FAFSEA',
    validityYears: 5,
  },
  {
    id: 'prap',
    name: 'Gestes et postures / PRAP',
    description: 'Prevention des risques lies a l\'activite physique',
    sectors: ['aide-domicile', 'commerce', 'logistique', 'restaurant'],
    frequency: 'Initiale + recyclage tous les 2 ans',
    duration: '14h',
    legalBasis: 'Art. R4541-8',
    certifyingBody: 'INRS',
    validityYears: 2,
  },
  {
    id: 'hauteur',
    name: 'Travail en hauteur',
    description: 'Formation a la prevention des chutes de hauteur',
    sectors: ['btp-general', 'nettoyage'],
    frequency: 'Initiale + recyclage tous les 3 ans',
    duration: '7-14h',
    legalBasis: 'Art. R4323-89',
    certifyingBody: null,
    validityYears: 3,
  },
  {
    id: 'risque-chimique',
    name: 'Risque chimique',
    description: 'Formation a la manipulation de produits chimiques dangereux',
    sectors: ['garage-auto', 'nettoyage', 'industrie', 'coiffure'],
    frequency: 'Initiale + recyclage tous les 3 ans',
    duration: '7h',
    legalBasis: 'Art. R4412-38',
    certifyingBody: null,
    validityYears: 3,
  },
  {
    id: 'ssiap',
    name: 'SSIAP (Securite incendie)',
    description: 'Service de securite incendie et d\'assistance a personnes',
    sectors: ['commerce', 'hotellerie', 'erp'],
    frequency: 'Initiale + recyclage tous les 3 ans',
    duration: '70h SSIAP1',
    legalBasis: 'Arrete 02/05/2005',
    certifyingBody: 'Prefecture',
    validityYears: 3,
  },
  {
    id: 'ht-vehicules',
    name: 'Habilitation HT vehicules (UTE C 18-550)',
    description: 'Habilitation pour intervention sur vehicules electriques/hybrides',
    sectors: ['garage-auto'],
    frequency: 'Initiale + recyclage tous les 3 ans',
    duration: '14h',
    legalBasis: 'NF C 18-550',
    certifyingBody: null,
    validityYears: 3,
  },
  {
    id: 'desescalade',
    name: 'Desescalade / gestion agression',
    description: 'Gestion des situations d\'agression et de violence',
    sectors: ['commerce', 'aide-domicile', 'ambulancier'],
    frequency: 'Recommande tous les 2 ans',
    duration: '7-14h',
    legalBasis: 'ANI 26/03/2010',
    certifyingBody: null,
    validityYears: 2,
  },
];

// BUSINESS RULE [CDC-2.4]: Detection formations obligatoires par secteur
export function getMandatoryTrainingsForSector(metierSlug: string): MandatoryTraining[] {
  return MANDATORY_TRAININGS.filter((t) =>
    t.sectors.includes('*') || t.sectors.includes(metierSlug),
  );
}

export function getTrainingById(id: string): MandatoryTraining | undefined {
  return MANDATORY_TRAININGS.find((t) => t.id === id);
}
