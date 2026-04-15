// BUSINESS RULE [CDC-2.4]: Base de risques pre-remplie par code NAF/APE
// Couverture complete de tous les secteurs d'activite francais

export interface RiskTemplate {
  id: string;
  category: string;
  name: string;
  description: string;
  default_gravity: number; // 1-4
  default_probability: number; // 1-4
  preventive_actions: string[];
}

export interface NafRiskProfile {
  naf_prefix: string;
  sector_name: string;
  risks: RiskTemplate[];
}

// ============================================================
// RISQUES COMMUNS A TOUS LES SECTEURS
// ============================================================

const COMMON_RISKS: RiskTemplate[] = [
  {
    id: 'common-routier',
    category: 'Routier',
    name: 'Risque routier',
    description: 'Risque d\'accident lors de deplacements professionnels',
    default_gravity: 4,
    default_probability: 2,
    preventive_actions: [
      'Entretien regulier des vehicules',
      'Respect du code de la route',
      'Limitation des deplacements (visioconference)',
      'Planification des trajets',
    ],
  },
  {
    id: 'common-psychosocial',
    category: 'Psychosocial',
    name: 'Risques psychosociaux',
    description: 'Stress, surcharge de travail, isolement, harcelement',
    default_gravity: 3,
    default_probability: 2,
    preventive_actions: [
      'Entretiens reguliers avec la direction',
      'Equilibre vie pro / vie perso',
      'Droit a la deconnexion',
      'Cellule d\'ecoute psychologique',
    ],
  },
  {
    id: 'common-biologique',
    category: 'Biologique',
    name: 'Risque biologique (pandemie)',
    description: 'Risque de contamination par agents biologiques',
    default_gravity: 2,
    default_probability: 2,
    preventive_actions: [
      'Gel hydroalcoolique a disposition',
      'Aeration des locaux',
      'Protocole en cas de pandemie',
    ],
  },
  {
    id: 'common-incendie',
    category: 'Incendie',
    name: 'Incendie / Explosion',
    description: 'Risque d\'incendie ou d\'explosion dans les locaux',
    default_gravity: 4,
    default_probability: 1,
    preventive_actions: [
      'Extincteurs verifies annuellement',
      'Plan d\'evacuation affiche',
      'Exercice d\'evacuation annuel',
      'Issues de secours degagees',
      'Detection incendie fonctionnelle',
    ],
  },
  {
    id: 'common-chute-plain-pied',
    category: 'Chute',
    name: 'Chute de plain-pied',
    description: 'Risque de chute sur sol glissant, encombre ou inegal',
    default_gravity: 2,
    default_probability: 2,
    preventive_actions: [
      'Entretien et nettoyage regulier des sols',
      'Eclairage adequat des zones de passage',
      'Signalisation des sols mouilles',
      'Chaussures adaptees',
    ],
  },
  {
    id: 'common-electrique',
    category: 'Electrique',
    name: 'Risque electrique',
    description: 'Risque d\'electrisation ou electrocution par installations defectueuses',
    default_gravity: 4,
    default_probability: 1,
    preventive_actions: [
      'Verification periodique des installations electriques',
      'Interdiction des branchements sauvages',
      'Disjoncteurs differentiels',
    ],
  },
];

// ============================================================
// SECTION A - AGRICULTURE, SYLVICULTURE, PECHE (01-03)
// ============================================================

const AGRICULTURE_RISKS: RiskTemplate[] = [
  {
    id: 'agri-machines',
    category: 'Mecanique',
    name: 'Risque lie aux machines agricoles',
    description: 'Risque d\'ecrasement, happement ou coupure par machines agricoles (tracteur, moissonneuse, broyeur)',
    default_gravity: 4,
    default_probability: 3,
    preventive_actions: [
      'Formation a la conduite d\'engins agricoles',
      'Protecteurs sur les parties mobiles',
      'Arret obligatoire avant intervention sur machine',
      'Port des EPI (gants, chaussures de securite)',
    ],
  },
  {
    id: 'agri-chimique',
    category: 'Chimique',
    name: 'Exposition aux produits phytosanitaires',
    description: 'Risque d\'intoxication par pesticides, herbicides, fongicides',
    default_gravity: 4,
    default_probability: 3,
    preventive_actions: [
      'Certiphyto obligatoire',
      'Port des EPI (combinaison, masque, gants)',
      'Local phytosanitaire aux normes',
      'Respect des delais de reentree',
      'Privilegier les alternatives biologiques',
    ],
  },
  {
    id: 'agri-animaux',
    category: 'Biologique',
    name: 'Risque lie aux animaux',
    description: 'Risque de blessure par animaux (coup, morsure, ecrasement, zoonose)',
    default_gravity: 3,
    default_probability: 3,
    preventive_actions: [
      'Contention adaptee des animaux',
      'Vaccination et suivi veterinaire',
      'Formation manipulation des animaux',
      'Hygiene des mains apres contact',
    ],
  },
  {
    id: 'agri-chute-hauteur',
    category: 'Chute',
    name: 'Chute de hauteur',
    description: 'Risque de chute depuis un engin, un silo, un grenier, un arbre',
    default_gravity: 4,
    default_probability: 2,
    preventive_actions: [
      'Acces securises aux silos et greniers',
      'Garde-corps et echelles conformes',
      'Harnais anti-chute pour travaux en hauteur',
    ],
  },
  {
    id: 'agri-tms',
    category: 'Ergonomique',
    name: 'TMS et manutention',
    description: 'Risque de troubles musculo-squelettiques (port de charges, postures penibles, gestes repetitifs)',
    default_gravity: 3,
    default_probability: 4,
    preventive_actions: [
      'Mecanisation des taches penibles',
      'Formation gestes et postures',
      'Alternance des taches',
      'Aides a la manutention',
    ],
  },
  {
    id: 'agri-meteo',
    category: 'Physique',
    name: 'Conditions climatiques extremes',
    description: 'Risque lie au travail en exterieur (chaleur, froid, intemperies, UV)',
    default_gravity: 3,
    default_probability: 3,
    preventive_actions: [
      'Amenagement des horaires en cas de forte chaleur',
      'Eau potable a disposition',
      'Vetements de protection adaptes',
      'Pauses regulieres a l\'abri',
    ],
  },
  {
    id: 'agri-ensevelissement',
    category: 'Mecanique',
    name: 'Risque d\'ensevelissement',
    description: 'Risque d\'ensevelissement dans un silo a grains ou une fosse',
    default_gravity: 4,
    default_probability: 1,
    preventive_actions: [
      'Interdiction d\'entrer seul dans un silo',
      'Dispositifs anti-ensevelissement',
      'Procedures d\'intervention specifiques',
      'Formation aux risques d\'asphyxie',
    ],
  },
];

const PECHE_RISKS: RiskTemplate[] = [
  {
    id: 'peche-noyade',
    category: 'Noyade',
    name: 'Risque de noyade / chute a la mer',
    description: 'Risque de chute par-dessus bord et de noyade',
    default_gravity: 4,
    default_probability: 3,
    preventive_actions: [
      'Port du gilet de sauvetage obligatoire',
      'Garde-corps et filiere de securite',
      'Formation survie en mer',
      'Balise de detresse individuelle',
    ],
  },
  {
    id: 'peche-meteo',
    category: 'Physique',
    name: 'Conditions meteorologiques',
    description: 'Risque lie aux intemperies, vagues, vent, froid en mer',
    default_gravity: 3,
    default_probability: 3,
    preventive_actions: [
      'Consultation meteo avant depart',
      'Vetements etanches et isolants',
      'Procedures en cas de mauvais temps',
    ],
  },
  {
    id: 'peche-engins',
    category: 'Mecanique',
    name: 'Risque lie aux engins de peche',
    description: 'Risque d\'ecrasement, happement par treuils, filets, cordages',
    default_gravity: 4,
    default_probability: 2,
    preventive_actions: [
      'Formation a l\'utilisation des engins',
      'Protections sur les treuils et poulies',
      'Gants de protection obligatoires',
      'Procedure de travail en binome',
    ],
  },
  {
    id: 'peche-tms',
    category: 'Ergonomique',
    name: 'TMS et port de charges',
    description: 'Risque de TMS lie au tri du poisson, port de caisses, postures contraignantes',
    default_gravity: 3,
    default_probability: 4,
    preventive_actions: [
      'Aides mecaniques au levage',
      'Rotation des postes',
      'Pauses regulieres',
    ],
  },
];

// ============================================================
// SECTION B - INDUSTRIES EXTRACTIVES (05-09)
// ============================================================

const EXTRACTION_RISKS: RiskTemplate[] = [
  {
    id: 'extract-effondrement',
    category: 'Mecanique',
    name: 'Effondrement / eboulement',
    description: 'Risque d\'effondrement de terrain, de galerie ou d\'eboulement de materiaux',
    default_gravity: 4,
    default_probability: 2,
    preventive_actions: [
      'Etude geotechnique prealable',
      'Boisage et soutenement des galeries',
      'Surveillance des mouvements de terrain',
      'Evacuation en cas d\'alerte',
    ],
  },
  {
    id: 'extract-poussieres',
    category: 'Chimique',
    name: 'Inhalation de poussieres',
    description: 'Risque de silicose et de pathologies respiratoires par inhalation de poussieres minerales',
    default_gravity: 4,
    default_probability: 3,
    preventive_actions: [
      'Arrosage pour limiter les poussieres',
      'Masques FFP3 obligatoires',
      'Suivi medical renforce',
      'Ventilation des espaces confines',
    ],
  },
  {
    id: 'extract-vibrations',
    category: 'Physique',
    name: 'Vibrations mecaniques',
    description: 'Risque de pathologies liees aux vibrations des engins et outils (marteau-piqueur, foreuse)',
    default_gravity: 3,
    default_probability: 3,
    preventive_actions: [
      'Engins avec amortisseurs de vibrations',
      'Limitation du temps d\'exposition',
      'Gants anti-vibrations',
      'Suivi medical (syndrome de Raynaud)',
    ],
  },
  {
    id: 'extract-explosion',
    category: 'Incendie',
    name: 'Explosion (gaz, poussieres, explosifs)',
    description: 'Risque d\'explosion lie aux gaz de mine, aux poussieres ou a l\'utilisation d\'explosifs',
    default_gravity: 4,
    default_probability: 2,
    preventive_actions: [
      'Detection continue des gaz',
      'Ventilation forcee',
      'Personnel habilite pour les explosifs',
      'Zones ATEX identifiees',
    ],
  },
  {
    id: 'extract-machines-lourdes',
    category: 'Mecanique',
    name: 'Engins lourds et machines',
    description: 'Risque d\'ecrasement par engins de chantier (pelleteuse, dumper, concasseur)',
    default_gravity: 4,
    default_probability: 2,
    preventive_actions: [
      'CACES obligatoire pour les conducteurs',
      'Gilets haute visibilite',
      'Balisage des zones de manoeuvre',
      'Avertisseurs sonores de recul',
    ],
  },
  {
    id: 'extract-bruit',
    category: 'Physique',
    name: 'Exposition au bruit',
    description: 'Risque de surdite lie aux machines d\'extraction et de broyage',
    default_gravity: 3,
    default_probability: 4,
    preventive_actions: [
      'Protections auditives obligatoires',
      'Capotage des machines bruyantes',
      'Suivi audiometrique',
      'Limitation du temps d\'exposition',
    ],
  },
];

// ============================================================
// SECTION C - INDUSTRIE MANUFACTURIERE (10-33)
// ============================================================

const INDUSTRIE_ALIMENTAIRE_RISKS: RiskTemplate[] = [
  {
    id: 'ial-contamination',
    category: 'Biologique',
    name: 'Contamination biologique',
    description: 'Risque de contamination par bacteries, moisissures lors de la manipulation d\'aliments',
    default_gravity: 3,
    default_probability: 3,
    preventive_actions: [
      'Plan HACCP',
      'Hygiene des mains stricte',
      'Tenues de travail propres',
      'Controle des temperatures',
      'Nettoyage et desinfection des surfaces',
    ],
  },
  {
    id: 'ial-froid',
    category: 'Physique',
    name: 'Travail au froid',
    description: 'Risque lie au travail en chambre froide ou environnement refrigere',
    default_gravity: 2,
    default_probability: 3,
    preventive_actions: [
      'Vetements isolants fournis',
      'Limitation du temps en chambre froide',
      'Pauses chaudes regulieres',
      'Systeme de securite anti-enfermement',
    ],
  },
  {
    id: 'ial-coupure',
    category: 'Mecanique',
    name: 'Coupure et laceration',
    description: 'Risque de coupure par machines de decoupe, couteaux, boites',
    default_gravity: 3,
    default_probability: 3,
    preventive_actions: [
      'Gants anti-coupure en cotte de mailles',
      'Protections sur les machines de decoupe',
      'Formation utilisation des equipements',
      'Tablier de protection',
    ],
  },
  {
    id: 'ial-tms',
    category: 'Ergonomique',
    name: 'TMS et gestes repetitifs',
    description: 'Risque de TMS lie aux gestes repetitifs (conditionnement, decoupe, tri)',
    default_gravity: 3,
    default_probability: 4,
    preventive_actions: [
      'Rotation des postes',
      'Amenagement ergonomique',
      'Pauses actives',
      'Automatisation des taches repetitives',
    ],
  },
  {
    id: 'ial-glissade',
    category: 'Chute',
    name: 'Glissade sur sol humide',
    description: 'Risque de chute sur sols gras, mouilles ou glissants',
    default_gravity: 2,
    default_probability: 4,
    preventive_actions: [
      'Sols antiderapants',
      'Nettoyage immediat des eclaboussures',
      'Chaussures de securite antiderapantes',
    ],
  },
  {
    id: 'ial-brulure',
    category: 'Thermique',
    name: 'Brulure thermique',
    description: 'Risque de brulure par contact avec fours, friteuses, vapeur, liquides chauds',
    default_gravity: 3,
    default_probability: 2,
    preventive_actions: [
      'Gants anti-chaleur',
      'Signalisation des zones chaudes',
      'Protection des canalisations de vapeur',
    ],
  },
];

const INDUSTRIE_CHIMIQUE_RISKS: RiskTemplate[] = [
  {
    id: 'ich-chimique',
    category: 'Chimique',
    name: 'Exposition aux produits chimiques',
    description: 'Risque d\'intoxication, brulure chimique, sensibilisation par contact ou inhalation',
    default_gravity: 4,
    default_probability: 3,
    preventive_actions: [
      'Fiches de donnees de securite (FDS) accessibles',
      'EPI adaptes (masque, gants, lunettes, combinaison)',
      'Hottes aspirantes et ventilation forcee',
      'Substitution des produits les plus dangereux',
      'Formation risque chimique',
    ],
  },
  {
    id: 'ich-explosion',
    category: 'Incendie',
    name: 'Explosion / Incendie ATEX',
    description: 'Risque d\'explosion lie aux vapeurs, gaz ou poussieres inflammables',
    default_gravity: 4,
    default_probability: 2,
    preventive_actions: [
      'Zonage ATEX',
      'Equipements anti-etincelles',
      'Detection de gaz en continu',
      'Procedures de permis de feu',
      'Ventilation des zones de stockage',
    ],
  },
  {
    id: 'ich-reacteurs',
    category: 'Mecanique',
    name: 'Risque lie aux reacteurs et cuves',
    description: 'Risque de surpression, fuite, eclatement de reacteurs chimiques',
    default_gravity: 4,
    default_probability: 1,
    preventive_actions: [
      'Soupapes de securite verifiees',
      'Procedures de conduite strictes',
      'Maintenance preventive',
      'Capteurs de pression et temperature',
    ],
  },
  {
    id: 'ich-cmr',
    category: 'Chimique',
    name: 'Agents CMR (Cancerogenes, Mutagenes, Reprotoxiques)',
    description: 'Risque d\'exposition a des substances cancerogenes ou mutagenes',
    default_gravity: 4,
    default_probability: 2,
    preventive_actions: [
      'Substitution obligatoire si possible',
      'Travail en systeme clos',
      'Suivi medical renforce',
      'Fiche d\'exposition individuelle',
      'Registre des expositions',
    ],
  },
  {
    id: 'ich-environnement',
    category: 'Environnement',
    name: 'Pollution accidentelle',
    description: 'Risque de rejet accidentel de substances dangereuses dans l\'environnement',
    default_gravity: 4,
    default_probability: 1,
    preventive_actions: [
      'Bacs de retention sous les cuves',
      'Kit anti-pollution disponible',
      'Plan d\'urgence environnemental',
      'Formation du personnel',
    ],
  },
];

const INDUSTRIE_METALLURGIE_RISKS: RiskTemplate[] = [
  {
    id: 'imet-machines',
    category: 'Mecanique',
    name: 'Risque machines-outils',
    description: 'Risque de coupure, ecrasement, happement par machines (tour, fraiseuse, presse, cisaille)',
    default_gravity: 4,
    default_probability: 3,
    preventive_actions: [
      'Protecteurs fixes et mobiles sur les machines',
      'Arret d\'urgence accessible',
      'Formation et habilitation machines',
      'Consignation avant intervention de maintenance',
      'Port des EPI (lunettes, gants, chaussures)',
    ],
  },
  {
    id: 'imet-soudure',
    category: 'Chimique',
    name: 'Fumees de soudage',
    description: 'Risque d\'inhalation de fumees metalliques lors des operations de soudage',
    default_gravity: 3,
    default_probability: 3,
    preventive_actions: [
      'Aspiration a la source des fumees',
      'Masque a cartouche adapte',
      'Ventilation generale du local',
      'Suivi medical renforce (EFR)',
    ],
  },
  {
    id: 'imet-bruit',
    category: 'Physique',
    name: 'Bruit industriel',
    description: 'Risque de surdite lie aux machines, chaudronnerie, emboutissage',
    default_gravity: 3,
    default_probability: 4,
    preventive_actions: [
      'Protections auditives moulees',
      'Encoffrement des machines bruyantes',
      'Limitation du temps d\'exposition',
      'Audiometrie annuelle',
    ],
  },
  {
    id: 'imet-brulure',
    category: 'Thermique',
    name: 'Brulure (metal en fusion, projections)',
    description: 'Risque de brulure par projections de metal, laitier, ou contact avec pieces chaudes',
    default_gravity: 4,
    default_probability: 2,
    preventive_actions: [
      'Ecrans de protection',
      'Vetements ignifuges',
      'Gants et tablier de soudeur',
      'Organisation des postes pour eviter les projections',
    ],
  },
  {
    id: 'imet-manutention',
    category: 'Ergonomique',
    name: 'Manutention de pieces lourdes',
    description: 'Risque de TMS et d\'ecrasement lors de la manutention de pieces metalliques',
    default_gravity: 3,
    default_probability: 3,
    preventive_actions: [
      'Ponts roulants et palans',
      'Formation elingage',
      'Chaussures de securite avec coque',
      'Gants de manutention',
    ],
  },
];

const INDUSTRIE_BOIS_RISKS: RiskTemplate[] = [
  {
    id: 'ibois-machines',
    category: 'Mecanique',
    name: 'Machines a bois',
    description: 'Risque de coupure, amputation par scies, degauchisseuses, toupies, raboteuses',
    default_gravity: 4,
    default_probability: 3,
    preventive_actions: [
      'Protecteurs et guides sur toutes les machines',
      'Poussoirs pour l\'avancement des pieces',
      'Arrets d\'urgence accessibles',
      'Formation specifique machines a bois',
      'Interdiction du port de gants pres des machines rotatives',
    ],
  },
  {
    id: 'ibois-poussieres',
    category: 'Chimique',
    name: 'Poussieres de bois',
    description: 'Risque de cancer des sinus (bois durs) et pathologies respiratoires',
    default_gravity: 4,
    default_probability: 3,
    preventive_actions: [
      'Aspiration a la source sur chaque machine',
      'Silo a copeaux avec detection incendie',
      'Nettoyage par aspiration (pas de soufflette)',
      'Suivi medical renforce',
      'Masque FFP2 si aspiration insuffisante',
    ],
  },
  {
    id: 'ibois-incendie',
    category: 'Incendie',
    name: 'Incendie / Explosion de poussieres',
    description: 'Risque d\'incendie par accumulation de poussieres et copeaux de bois',
    default_gravity: 4,
    default_probability: 2,
    preventive_actions: [
      'Nettoyage regulier des poussieres deposees',
      'Installation electrique antidéflagrante',
      'Extincteurs adaptes',
      'Interdiction de fumer',
      'Event sur silo a poussieres',
    ],
  },
  {
    id: 'ibois-bruit',
    category: 'Physique',
    name: 'Bruit des machines',
    description: 'Risque de surdite lie aux scies, toupies, raboteuses',
    default_gravity: 3,
    default_probability: 4,
    preventive_actions: [
      'Protections auditives obligatoires',
      'Outils a faible emission sonore',
      'Encoffrement des machines',
    ],
  },
  {
    id: 'ibois-chimique',
    category: 'Chimique',
    name: 'Produits de traitement du bois',
    description: 'Risque d\'intoxication par vernis, lasures, colles, solvants, produits de traitement',
    default_gravity: 3,
    default_probability: 2,
    preventive_actions: [
      'Ventilation des cabines de finition',
      'Port de masque a cartouche',
      'Stockage des produits dans local ventile',
      'Privilegier les produits en phase aqueuse',
    ],
  },
];

const INDUSTRIE_TEXTILE_RISKS: RiskTemplate[] = [
  {
    id: 'itex-machines',
    category: 'Mecanique',
    name: 'Happement par machines textiles',
    description: 'Risque d\'happement par metiers a tisser, machines a coudre industrielles, calandres',
    default_gravity: 4,
    default_probability: 2,
    preventive_actions: [
      'Carter de protection sur les parties mobiles',
      'Arrets d\'urgence accessibles',
      'Vetements ajustes (pas de vetements flottants)',
      'Cheveux attaches',
    ],
  },
  {
    id: 'itex-bruit',
    category: 'Physique',
    name: 'Bruit des metiers a tisser',
    description: 'Risque de surdite lie au bruit des machines textiles',
    default_gravity: 3,
    default_probability: 4,
    preventive_actions: [
      'Protections auditives obligatoires',
      'Insonorisation des locaux',
      'Maintenance des machines',
    ],
  },
  {
    id: 'itex-tms',
    category: 'Ergonomique',
    name: 'TMS et gestes repetitifs',
    description: 'Risque de TMS lie aux gestes repetitifs (couture, tri, pliage, repassage)',
    default_gravity: 3,
    default_probability: 4,
    preventive_actions: [
      'Postes de travail ergonomiques',
      'Rotation des taches',
      'Pauses actives',
      'Outils ergonomiques (ciseaux, fer)',
    ],
  },
  {
    id: 'itex-chimique',
    category: 'Chimique',
    name: 'Produits de teinture et traitement',
    description: 'Risque d\'allergie et d\'intoxication par teintures, solvants, apprets',
    default_gravity: 3,
    default_probability: 2,
    preventive_actions: [
      'Ventilation des ateliers de teinture',
      'Gants et lunettes de protection',
      'FDS accessibles',
      'Substitution des produits les plus nocifs',
    ],
  },
  {
    id: 'itex-poussieres',
    category: 'Chimique',
    name: 'Poussieres de fibres textiles',
    description: 'Risque de byssinose et pathologies respiratoires par inhalation de fibres',
    default_gravity: 3,
    default_probability: 2,
    preventive_actions: [
      'Aspiration des poussieres',
      'Ventilation des ateliers',
      'Nettoyage regulier',
    ],
  },
];

// ============================================================
// SECTION D - PRODUCTION D'ELECTRICITE, GAZ (35)
// ============================================================

const ENERGIE_RISKS: RiskTemplate[] = [
  {
    id: 'nrj-electrique',
    category: 'Electrique',
    name: 'Risque electrique haute tension',
    description: 'Risque d\'electrocution par haute tension lors d\'interventions sur reseaux ou postes',
    default_gravity: 4,
    default_probability: 2,
    preventive_actions: [
      'Habilitation electrique obligatoire (H1V, H2V)',
      'Consignation/deconsignation stricte',
      'Verification d\'absence de tension (VAT)',
      'EPI isolants (gants, tapis, perche)',
      'Travail en equipe obligatoire',
    ],
  },
  {
    id: 'nrj-gaz',
    category: 'Chimique',
    name: 'Fuite de gaz / explosion',
    description: 'Risque d\'explosion ou d\'intoxication lie a une fuite de gaz',
    default_gravity: 4,
    default_probability: 2,
    preventive_actions: [
      'Detection de gaz en continu',
      'Ventilation des locaux',
      'Procedures d\'urgence en cas de fuite',
      'Interdiction de source d\'ignition',
    ],
  },
  {
    id: 'nrj-chute-hauteur',
    category: 'Chute',
    name: 'Chute de hauteur (pylones, postes)',
    description: 'Risque de chute lors d\'interventions sur pylones, toitures, postes de transformation',
    default_gravity: 4,
    default_probability: 2,
    preventive_actions: [
      'Harnais anti-chute',
      'Nacelle elevatrice privilegiee',
      'Formation travail en hauteur',
      'Verification des points d\'ancrage',
    ],
  },
  {
    id: 'nrj-arc',
    category: 'Thermique',
    name: 'Arc electrique / flash',
    description: 'Risque de brulure grave par arc electrique',
    default_gravity: 4,
    default_probability: 1,
    preventive_actions: [
      'Vetements anti-arc',
      'Ecran facial anti-arc',
      'Respect des distances de securite',
      'Procedures de consignation',
    ],
  },
];

// ============================================================
// SECTION E - EAU, ASSAINISSEMENT, DECHETS (36-39)
// ============================================================

const DECHETS_EAU_RISKS: RiskTemplate[] = [
  {
    id: 'dech-biologique',
    category: 'Biologique',
    name: 'Risque biologique (eaux usees, dechets)',
    description: 'Risque d\'infection par contact avec eaux usees, dechets, boues (leptospirose, hepatite)',
    default_gravity: 4,
    default_probability: 3,
    preventive_actions: [
      'Vaccination (leptospirose, hepatite A)',
      'Gants etanches et bottes',
      'Lavage des mains obligatoire',
      'Douche disponible sur site',
      'Interdiction de manger sur le lieu de travail',
    ],
  },
  {
    id: 'dech-chimique',
    category: 'Chimique',
    name: 'Exposition aux gaz toxiques',
    description: 'Risque d\'intoxication par H2S, CO, methane dans les reseaux et stations',
    default_gravity: 4,
    default_probability: 2,
    preventive_actions: [
      'Detecteur 4 gaz obligatoire',
      'Ventilation avant entree en espace confine',
      'ARI disponible',
      'Procedures d\'entree en espace confine',
    ],
  },
  {
    id: 'dech-espace-confine',
    category: 'Mecanique',
    name: 'Espace confine',
    description: 'Risque d\'asphyxie, intoxication ou noyade en espace confine (regard, cuve, bassin)',
    default_gravity: 4,
    default_probability: 2,
    preventive_actions: [
      'Autorisation d\'entree formalisee',
      'Surveillant exterieur obligatoire',
      'Harnais et treuil de sauvetage',
      'Ventilation mecanique',
    ],
  },
  {
    id: 'dech-mecanique',
    category: 'Mecanique',
    name: 'Equipements mecaniques',
    description: 'Risque d\'ecrasement par compacteurs, broyeurs, bennes a ordures',
    default_gravity: 4,
    default_probability: 2,
    preventive_actions: [
      'Consignation des machines avant intervention',
      'Protecteurs sur les parties mobiles',
      'Gilet haute visibilite',
      'Balisage des zones de manoeuvre',
    ],
  },
  {
    id: 'dech-manutention',
    category: 'Ergonomique',
    name: 'Manutention de conteneurs',
    description: 'Risque de TMS lie au port et manipulation de conteneurs, sacs, futs',
    default_gravity: 3,
    default_probability: 4,
    preventive_actions: [
      'Aides mecaniques (leve-conteneur)',
      'Formation gestes et postures',
      'Limitation du poids des conteneurs',
    ],
  },
];

// ============================================================
// SECTION F - CONSTRUCTION / BTP (41-43)
// ============================================================

const BTP_RISKS: RiskTemplate[] = [
  {
    id: 'btp-chute-hauteur',
    category: 'Chute',
    name: 'Chute de hauteur',
    description: 'Risque de chute lors de travaux en hauteur (echafaudages, toitures, echelles)',
    default_gravity: 4,
    default_probability: 3,
    preventive_actions: [
      'Port du harnais de securite obligatoire',
      'Verification des echafaudages avant utilisation',
      'Formation travail en hauteur',
      'Mise en place de garde-corps',
      'Filets de protection anti-chute',
    ],
  },
  {
    id: 'btp-chute-plain-pied',
    category: 'Chute',
    name: 'Chute de plain-pied',
    description: 'Risque de chute sur sol glissant, encombre ou inegal',
    default_gravity: 2,
    default_probability: 3,
    preventive_actions: [
      'Rangement et nettoyage regulier du chantier',
      'Chaussures de securite antiderapantes',
      'Balisage des zones dangereuses',
    ],
  },
  {
    id: 'btp-amiante',
    category: 'Chimique',
    name: 'Exposition a l\'amiante',
    description: 'Risque d\'inhalation de fibres d\'amiante lors de travaux de renovation',
    default_gravity: 4,
    default_probability: 2,
    preventive_actions: [
      'Diagnostic amiante avant travaux',
      'Formation SS3/SS4 obligatoire',
      'Equipements de protection respiratoire',
      'Suivi medical renforce',
    ],
  },
  {
    id: 'btp-bruit',
    category: 'Physique',
    name: 'Exposition au bruit',
    description: 'Risque de surdite lie aux machines et outils',
    default_gravity: 3,
    default_probability: 3,
    preventive_actions: [
      'Protections auditives obligatoires',
      'Choix d\'outils moins bruyants',
      'Rotation des postes exposes',
      'Mesures sonometriques regulieres',
    ],
  },
  {
    id: 'btp-port-charges',
    category: 'Ergonomique',
    name: 'Port de charges lourdes',
    description: 'Risque de TMS lie au port et manutention de charges',
    default_gravity: 3,
    default_probability: 4,
    preventive_actions: [
      'Aides a la manutention (diable, chariot)',
      'Formation gestes et postures',
      'Limitation du poids unitaire (25 kg max)',
      'Organisation du travail (pauses, rotation)',
    ],
  },
  {
    id: 'btp-electrique',
    category: 'Electrique',
    name: 'Risque electrique',
    description: 'Risque d\'electrisation ou electrocution',
    default_gravity: 4,
    default_probability: 2,
    preventive_actions: [
      'Habilitation electrique obligatoire',
      'Verification des installations',
      'Utilisation d\'outils isoles',
      'Consignation avant intervention',
    ],
  },
  {
    id: 'btp-ensevelissement',
    category: 'Mecanique',
    name: 'Ensevelissement en tranchee',
    description: 'Risque d\'ensevelissement lors de travaux en fouille ou tranchee',
    default_gravity: 4,
    default_probability: 2,
    preventive_actions: [
      'Blindage des tranchees au-dela de 1,30 m',
      'Talutage conforme',
      'Interdiction de stocker en bord de fouille',
      'Etude de sol prealable',
    ],
  },
  {
    id: 'btp-engins',
    category: 'Mecanique',
    name: 'Engins de chantier',
    description: 'Risque d\'ecrasement, renversement par engins (grue, pelleteuse, chariot)',
    default_gravity: 4,
    default_probability: 2,
    preventive_actions: [
      'CACES obligatoire',
      'Plan de circulation du chantier',
      'Gilet haute visibilite',
      'Avertisseur de recul',
    ],
  },
];

// ============================================================
// SECTION G - COMMERCE (45-47)
// ============================================================

const COMMERCE_RISKS: RiskTemplate[] = [
  {
    id: 'com-tms',
    category: 'Ergonomique',
    name: 'TMS (troubles musculo-squelettiques)',
    description: 'Risque de TMS lie a la manutention, mise en rayon, station debout prolongee',
    default_gravity: 2,
    default_probability: 4,
    preventive_actions: [
      'Aides a la manutention (transpalette, rolls)',
      'Tapis anti-fatigue aux caisses',
      'Formation gestes et postures',
      'Pauses regulieres',
      'Sieges assis-debout aux caisses',
    ],
  },
  {
    id: 'com-agression',
    category: 'Psychosocial',
    name: 'Agression / violence externe',
    description: 'Risque d\'agression verbale ou physique (braquage, incivilites clients)',
    default_gravity: 3,
    default_probability: 2,
    preventive_actions: [
      'Procedure de securite (caisse limitee en especes)',
      'Videosurveillance',
      'Formation gestion de conflit',
      'Bouton d\'alerte silencieux',
      'Soutien psychologique apres incident',
    ],
  },
  {
    id: 'com-chute-objets',
    category: 'Chute',
    name: 'Chute d\'objets en reserve',
    description: 'Risque de chute de cartons, palettes stockees en hauteur',
    default_gravity: 3,
    default_probability: 2,
    preventive_actions: [
      'Rangement correct des reserves (lourd en bas)',
      'Rayonnage fixe au mur',
      'Echelle ou escabeau conforme',
      'Casque en zone de stockage haute',
    ],
  },
  {
    id: 'com-chute-plain-pied',
    category: 'Chute',
    name: 'Chute de plain-pied',
    description: 'Risque de chute dans le magasin ou en reserve',
    default_gravity: 2,
    default_probability: 3,
    preventive_actions: [
      'Entretien des sols',
      'Eclairage adequat',
      'Rangement des zones de passage',
      'Signalisation sols mouilles',
    ],
  },
  {
    id: 'com-travail-isole',
    category: 'Organisationnel',
    name: 'Travail isole',
    description: 'Risque lie au travail seul (ouverture, fermeture, livraison)',
    default_gravity: 3,
    default_probability: 2,
    preventive_actions: [
      'Dispositif d\'alerte (PTI/DATI)',
      'Procedure de verification reguliere',
      'Telephone toujours accessible',
    ],
  },
];

const COMMERCE_AUTO_RISKS: RiskTemplate[] = [
  {
    id: 'auto-mecanique',
    category: 'Mecanique',
    name: 'Risque mecanique (vehicules)',
    description: 'Risque d\'ecrasement, coincement lors des reparations automobiles',
    default_gravity: 4,
    default_probability: 2,
    preventive_actions: [
      'Ponts elevateurs verifies',
      'Chandelles de securite',
      'Calage des vehicules',
      'Formation a la securite atelier',
    ],
  },
  {
    id: 'auto-chimique',
    category: 'Chimique',
    name: 'Produits chimiques automobile',
    description: 'Risque d\'exposition aux huiles, solvants, liquide de frein, batteries',
    default_gravity: 3,
    default_probability: 3,
    preventive_actions: [
      'Gants et lunettes de protection',
      'Ventilation de l\'atelier',
      'Stockage conforme des produits',
      'Collecte des huiles usagees',
    ],
  },
  ...COMMERCE_RISKS,
];

// ============================================================
// SECTION H - TRANSPORTS ET ENTREPOSAGE (49-53)
// ============================================================

const TRANSPORT_ROUTIER_RISKS: RiskTemplate[] = [
  {
    id: 'tr-routier',
    category: 'Routier',
    name: 'Accident de la route',
    description: 'Risque d\'accident de circulation lors des tournees de livraison ou transport',
    default_gravity: 4,
    default_probability: 3,
    preventive_actions: [
      'Formation eco-conduite et securite routiere',
      'Limitation de la vitesse',
      'Respect des temps de conduite et repos',
      'Entretien regulier des vehicules',
      'Chronotachygraphe obligatoire',
    ],
  },
  {
    id: 'tr-manutention',
    category: 'Ergonomique',
    name: 'Manutention et chargement',
    description: 'Risque de TMS lors du chargement/dechargement des marchandises',
    default_gravity: 3,
    default_probability: 4,
    preventive_actions: [
      'Hayon elevateur',
      'Transpalette et diable',
      'Formation gestes et postures',
      'Limitation du poids des colis',
    ],
  },
  {
    id: 'tr-chute-quai',
    category: 'Chute',
    name: 'Chute depuis le vehicule ou le quai',
    description: 'Risque de chute lors de la montee/descente du vehicule ou depuis le quai de chargement',
    default_gravity: 3,
    default_probability: 3,
    preventive_actions: [
      'Marches antiderapantes sur vehicules',
      'Garde-corps sur les quais',
      'Eclairage des zones de chargement',
      'Cales de roue',
    ],
  },
  {
    id: 'tr-marchandises-dangereuses',
    category: 'Chimique',
    name: 'Transport de marchandises dangereuses',
    description: 'Risque d\'accident impliquant des matieres dangereuses (ADR)',
    default_gravity: 4,
    default_probability: 1,
    preventive_actions: [
      'Formation ADR obligatoire',
      'Signalisation du vehicule',
      'Equipements de securite (extincteur, kit ADR)',
      'Itineraires adaptes',
    ],
  },
  {
    id: 'tr-fatigue',
    category: 'Psychosocial',
    name: 'Fatigue et somnolence',
    description: 'Risque d\'accident lie a la fatigue, conduite de nuit, horaires decales',
    default_gravity: 4,
    default_probability: 2,
    preventive_actions: [
      'Respect strict des temps de repos',
      'Pauses toutes les 2 heures',
      'Amenagement des horaires',
      'Cabine de repos confortable',
    ],
  },
  {
    id: 'tr-travail-isole',
    category: 'Organisationnel',
    name: 'Travail isole du chauffeur',
    description: 'Risque lie a l\'isolement du chauffeur lors des tournees',
    default_gravity: 3,
    default_probability: 3,
    preventive_actions: [
      'Telephone portable charge',
      'GPS et suivi de flotte',
      'Procedure d\'alerte',
      'Contact regulier avec le depot',
    ],
  },
];

const ENTREPOSAGE_RISKS: RiskTemplate[] = [
  {
    id: 'ent-chariots',
    category: 'Mecanique',
    name: 'Chariots elevateurs',
    description: 'Risque de collision, ecrasement, renversement de chariot elevateur',
    default_gravity: 4,
    default_probability: 2,
    preventive_actions: [
      'CACES R489 obligatoire',
      'Plan de circulation',
      'Gilet haute visibilite pour les pietons',
      'Miroirs et balisage dans les allees',
      'Limitation de vitesse',
    ],
  },
  {
    id: 'ent-chute-objets',
    category: 'Chute',
    name: 'Chute de charges / palettes',
    description: 'Risque de chute de palettes ou colis depuis les racks de stockage',
    default_gravity: 4,
    default_probability: 2,
    preventive_actions: [
      'Rack conformes et verifies',
      'Filets et butees sur les racks',
      'Formation au gerbage',
      'Casque en zone de stockage',
    ],
  },
  {
    id: 'ent-tms',
    category: 'Ergonomique',
    name: 'TMS (preparation de commandes)',
    description: 'Risque de TMS lie au picking, port de charges, gestes repetitifs',
    default_gravity: 3,
    default_probability: 4,
    preventive_actions: [
      'Mise a hauteur ergonomique',
      'Convoyeurs et aides mecaniques',
      'Rotation des postes',
      'Pauses regulieres',
    ],
  },
  {
    id: 'ent-froid',
    category: 'Physique',
    name: 'Travail au froid (entrepot frigorifique)',
    description: 'Risque lie au travail prolonge en chambre froide negative (-20°C)',
    default_gravity: 3,
    default_probability: 3,
    preventive_actions: [
      'Vetements grand froid fournis',
      'Temps d\'exposition limite',
      'Pauses chaudes',
      'Securite anti-enfermement',
    ],
  },
];

// ============================================================
// SECTION I - HEBERGEMENT ET RESTAURATION (55-56)
// ============================================================

const HOTELLERIE_RISKS: RiskTemplate[] = [
  {
    id: 'hot-chute',
    category: 'Chute',
    name: 'Chute de plain-pied',
    description: 'Risque de chute sur sols mouilles (cuisine, salle de bain, piscine)',
    default_gravity: 2,
    default_probability: 3,
    preventive_actions: [
      'Sols antiderapants',
      'Signalisation sols mouilles',
      'Chaussures antiderapantes pour le personnel',
    ],
  },
  {
    id: 'hot-tms',
    category: 'Ergonomique',
    name: 'TMS (menage, service)',
    description: 'Risque de TMS lie au menage des chambres, port de plateaux, station debout',
    default_gravity: 3,
    default_probability: 4,
    preventive_actions: [
      'Chariot de menage ergonomique',
      'Draps faciles a manipuler',
      'Rotation des taches',
      'Pauses regulieres',
    ],
  },
  {
    id: 'hot-chimique',
    category: 'Chimique',
    name: 'Produits d\'entretien',
    description: 'Risque d\'allergie ou brulure chimique par produits de nettoyage et desinfection',
    default_gravity: 2,
    default_probability: 3,
    preventive_actions: [
      'Gants de protection',
      'Formation a l\'utilisation des produits',
      'Ne jamais melanger les produits',
      'Ventilation lors de l\'utilisation',
    ],
  },
  {
    id: 'hot-agression',
    category: 'Psychosocial',
    name: 'Violence et incivilites des clients',
    description: 'Risque d\'agression verbale ou physique par les clients (reception, bar)',
    default_gravity: 3,
    default_probability: 2,
    preventive_actions: [
      'Formation gestion de conflits',
      'Procedure d\'alerte',
      'Travail en binome en soiree',
      'Soutien psychologique',
    ],
  },
  {
    id: 'hot-travail-nuit',
    category: 'Organisationnel',
    name: 'Travail de nuit / horaires atypiques',
    description: 'Risque lie au travail de nuit, coupures, horaires decales',
    default_gravity: 2,
    default_probability: 3,
    preventive_actions: [
      'Suivi medical renforce',
      'Amenagement des plannings',
      'Salle de repos',
      'Repas equilibres mis a disposition',
    ],
  },
];

const RESTAURATION_RISKS: RiskTemplate[] = [
  {
    id: 'resto-brulure',
    category: 'Thermique',
    name: 'Brulure',
    description: 'Risque de brulure par contact avec surfaces chaudes, huile, vapeur',
    default_gravity: 3,
    default_probability: 3,
    preventive_actions: [
      'Equipements de protection (gants anti-chaleur)',
      'Signalisation des zones chaudes',
      'Formation premiers secours',
      'Kit brulure accessible',
    ],
  },
  {
    id: 'resto-coupure',
    category: 'Mecanique',
    name: 'Coupure',
    description: 'Risque de coupure par couteaux, trancheurs, boites de conserve',
    default_gravity: 2,
    default_probability: 4,
    preventive_actions: [
      'Gants anti-coupure pour la decoupe',
      'Couteaux bien aiguises (moins de force)',
      'Formation utilisation des machines',
      'Rangement securise des objets tranchants',
    ],
  },
  {
    id: 'resto-glissade',
    category: 'Chute',
    name: 'Glissade / chute de plain-pied',
    description: 'Risque de chute sur sol gras ou mouille en cuisine',
    default_gravity: 2,
    default_probability: 4,
    preventive_actions: [
      'Sol antiderapant',
      'Nettoyage immediat des eclaboussures',
      'Chaussures de securite antiderapantes',
    ],
  },
  {
    id: 'resto-tms',
    category: 'Ergonomique',
    name: 'TMS (troubles musculo-squelettiques)',
    description: 'Risque de TMS lie aux gestes repetitifs, station debout prolongee, port de charges',
    default_gravity: 3,
    default_probability: 3,
    preventive_actions: [
      'Amenagement ergonomique des postes',
      'Rotation des taches',
      'Pauses regulieres',
      'Formation gestes et postures',
    ],
  },
  {
    id: 'resto-incendie',
    category: 'Incendie',
    name: 'Incendie en cuisine',
    description: 'Risque d\'incendie lie aux equipements de cuisson et graisse',
    default_gravity: 4,
    default_probability: 2,
    preventive_actions: [
      'Extincteurs adaptes (classe F)',
      'Couverture anti-feu accessible',
      'Entretien regulier des hottes et conduits',
      'Formation evacuation',
    ],
  },
  {
    id: 'resto-hygiene',
    category: 'Biologique',
    name: 'Contamination alimentaire',
    description: 'Risque de contamination biologique lors de la preparation des aliments',
    default_gravity: 3,
    default_probability: 2,
    preventive_actions: [
      'Plan HACCP',
      'Lavage des mains frequent',
      'Respect de la chaine du froid',
      'Nettoyage et desinfection des plans de travail',
    ],
  },
];

// ============================================================
// SECTION J - INFORMATION ET COMMUNICATION (58-63)
// ============================================================

const NUMERIQUE_RISKS: RiskTemplate[] = [
  {
    id: 'num-ecran',
    category: 'Ergonomique',
    name: 'Travail sur ecran prolonge',
    description: 'Risque de fatigue visuelle, TMS (dos, poignets, nuque) lie au travail sur ecran',
    default_gravity: 2,
    default_probability: 4,
    preventive_actions: [
      'Ecran a hauteur des yeux',
      'Siege ergonomique reglable',
      'Pause visuelle (regle 20-20-20)',
      'Clavier et souris ergonomiques',
      'Eclairage adapte (pas de reflets)',
    ],
  },
  {
    id: 'num-sedentarite',
    category: 'Ergonomique',
    name: 'Sedentarite',
    description: 'Risque cardiovasculaire et metabolique lie a la position assise prolongee',
    default_gravity: 3,
    default_probability: 4,
    preventive_actions: [
      'Bureau assis-debout',
      'Pauses actives toutes les heures',
      'Encouragement a l\'activite physique',
      'Reunions debout ou en marchant',
    ],
  },
  {
    id: 'num-rps',
    category: 'Psychosocial',
    name: 'Charge mentale et burn-out',
    description: 'Risque de burn-out lie a la charge cognitive, deadlines, hyperconnexion',
    default_gravity: 3,
    default_probability: 3,
    preventive_actions: [
      'Droit a la deconnexion effectif',
      'Charge de travail regulee',
      'Entretiens reguliers',
      'Cellule d\'ecoute psychologique',
      'Teletravail encadre',
    ],
  },
  {
    id: 'num-teletravail',
    category: 'Organisationnel',
    name: 'Risques du teletravail',
    description: 'Risque d\'isolement, de TMS, de trouble de la frontiere pro/perso en teletravail',
    default_gravity: 2,
    default_probability: 3,
    preventive_actions: [
      'Equipement ergonomique fourni',
      'Points d\'equipe reguliers',
      'Horaires cadres',
      'Jours de presence obligatoire',
    ],
  },
  {
    id: 'num-electrique',
    category: 'Electrique',
    name: 'Risque electrique (serveurs, data center)',
    description: 'Risque d\'electrocution lors d\'interventions sur les baies serveurs',
    default_gravity: 3,
    default_probability: 1,
    preventive_actions: [
      'Habilitation electrique pour les techniciens',
      'Procedures d\'intervention',
      'Sols antistatiques',
    ],
  },
];

// ============================================================
// SECTION K - ACTIVITES FINANCIERES ET ASSURANCE (64-66)
// ============================================================

const FINANCE_RISKS: RiskTemplate[] = [
  {
    id: 'fin-agression',
    category: 'Psychosocial',
    name: 'Agression / braquage',
    description: 'Risque d\'agression ou de braquage (agences bancaires, transport de fonds)',
    default_gravity: 4,
    default_probability: 1,
    preventive_actions: [
      'Vitres blindees et sas de securite',
      'Alarme silencieuse',
      'Formation comportement en cas de braquage',
      'Soutien psychologique post-incident',
      'Limitation des especes en agence',
    ],
  },
  {
    id: 'fin-ecran',
    category: 'Ergonomique',
    name: 'Travail sur ecran',
    description: 'Risque de fatigue visuelle et TMS lie au travail administratif prolonge',
    default_gravity: 2,
    default_probability: 4,
    preventive_actions: [
      'Poste de travail ergonomique',
      'Pauses visuelles regulieres',
      'Eclairage adapte',
    ],
  },
  {
    id: 'fin-rps',
    category: 'Psychosocial',
    name: 'Stress et pression commerciale',
    description: 'Risque de stress lie aux objectifs commerciaux, reclamations clients, charge mentale',
    default_gravity: 3,
    default_probability: 3,
    preventive_actions: [
      'Objectifs realistes et reajustes',
      'Formations gestion du stress',
      'Droit a la deconnexion',
      'Management bienveillant',
    ],
  },
  {
    id: 'fin-incivilites',
    category: 'Psychosocial',
    name: 'Incivilites et tension client',
    description: 'Risque de violence verbale lors de refus de credit, reclamations, litiges',
    default_gravity: 2,
    default_probability: 3,
    preventive_actions: [
      'Formation gestion de conflits',
      'Amenagement des espaces d\'accueil',
      'Procedure d\'alerte',
    ],
  },
];

// ============================================================
// SECTION L - ACTIVITES IMMOBILIERES (68)
// ============================================================

const IMMOBILIER_RISKS: RiskTemplate[] = [
  {
    id: 'immo-deplacements',
    category: 'Routier',
    name: 'Deplacements frequents',
    description: 'Risque d\'accident de la route lors des visites de biens',
    default_gravity: 4,
    default_probability: 2,
    preventive_actions: [
      'Entretien du vehicule',
      'Planification des visites',
      'Eviter les heures de pointe',
    ],
  },
  {
    id: 'immo-agression',
    category: 'Psychosocial',
    name: 'Agression lors de visites',
    description: 'Risque d\'agression dans des logements vides, isolement lors de visites',
    default_gravity: 3,
    default_probability: 2,
    preventive_actions: [
      'Visites en binome si possible',
      'Dispositif d\'alerte (PTI)',
      'Informer un collegue de son planning',
      'Verification de l\'identite des visiteurs',
    ],
  },
  {
    id: 'immo-chute',
    category: 'Chute',
    name: 'Chute lors de visites',
    description: 'Risque de chute dans des immeubles en travaux, escaliers, caves',
    default_gravity: 2,
    default_probability: 2,
    preventive_actions: [
      'Chaussures adaptees',
      'Lampe torche pour les parties sombres',
      'Prudence dans les immeubles vetustes',
    ],
  },
  {
    id: 'immo-ecran',
    category: 'Ergonomique',
    name: 'Travail administratif sur ecran',
    description: 'Risque de TMS et fatigue visuelle lie au travail de bureau',
    default_gravity: 2,
    default_probability: 3,
    preventive_actions: [
      'Poste de travail ergonomique',
      'Pauses regulieres',
    ],
  },
];

// ============================================================
// SECTION M - ACTIVITES SPECIALISEES, SCIENTIFIQUES, TECHNIQUES (69-75)
// ============================================================

const BUREAU_CONSEIL_RISKS: RiskTemplate[] = [
  {
    id: 'bur-ecran',
    category: 'Ergonomique',
    name: 'Travail sur ecran prolonge',
    description: 'Risque de fatigue visuelle, TMS cervicales et dorsales, canal carpien',
    default_gravity: 2,
    default_probability: 4,
    preventive_actions: [
      'Poste de travail ergonomique (ecran, siege, clavier)',
      'Pause visuelle toutes les 20 minutes',
      'Bureau assis-debout',
      'Souris verticale / trackball',
    ],
  },
  {
    id: 'bur-rps',
    category: 'Psychosocial',
    name: 'Risques psychosociaux',
    description: 'Risque de stress, surmenage, burn-out lie a la charge de travail et aux delais',
    default_gravity: 3,
    default_probability: 3,
    preventive_actions: [
      'Charge de travail regulee',
      'Droit a la deconnexion',
      'Entretiens individuels reguliers',
      'Acces a un psychologue du travail',
    ],
  },
  {
    id: 'bur-sedentarite',
    category: 'Ergonomique',
    name: 'Sedentarite',
    description: 'Risque cardiovasculaire lie a la position assise prolongee',
    default_gravity: 3,
    default_probability: 3,
    preventive_actions: [
      'Pauses actives encouragees',
      'Activite physique encouragee',
      'Bureau assis-debout',
    ],
  },
  {
    id: 'bur-deplacements',
    category: 'Routier',
    name: 'Deplacements professionnels',
    description: 'Risque routier lors des deplacements chez les clients',
    default_gravity: 4,
    default_probability: 1,
    preventive_actions: [
      'Privilegier les transports en commun ou visio',
      'Planification des deplacements',
      'Entretien du vehicule',
    ],
  },
];

const LABORATOIRE_RISKS: RiskTemplate[] = [
  {
    id: 'lab-chimique',
    category: 'Chimique',
    name: 'Exposition aux produits chimiques',
    description: 'Risque d\'intoxication, brulure chimique, allergie par manipulation de reactifs',
    default_gravity: 4,
    default_probability: 2,
    preventive_actions: [
      'Hottes aspirantes et sorbonnes',
      'EPI (lunettes, gants, blouse)',
      'FDS disponibles',
      'Stockage conforme et incompatibilites respectees',
    ],
  },
  {
    id: 'lab-biologique',
    category: 'Biologique',
    name: 'Risque biologique (agents infectieux)',
    description: 'Risque de contamination par agents pathogenes (laboratoire de biologie)',
    default_gravity: 4,
    default_probability: 2,
    preventive_actions: [
      'PSM (Poste de securite microbiologique)',
      'Procedures de manipulation strictes',
      'Vaccination du personnel',
      'Gestion des dechets DASRI',
    ],
  },
  {
    id: 'lab-radioactif',
    category: 'Physique',
    name: 'Rayonnements ionisants',
    description: 'Risque d\'irradiation lors de la manipulation de sources radioactives ou rayons X',
    default_gravity: 4,
    default_probability: 1,
    preventive_actions: [
      'PCR (Personne Competente en Radioprotection)',
      'Dosimetrie individuelle',
      'Ecrans de protection (plomb)',
      'Limitation du temps d\'exposition',
    ],
  },
  {
    id: 'lab-incendie',
    category: 'Incendie',
    name: 'Incendie / explosion de solvants',
    description: 'Risque d\'incendie ou explosion lie aux solvants et gaz utilises',
    default_gravity: 4,
    default_probability: 1,
    preventive_actions: [
      'Stockage limite au poste de travail',
      'Armoire ventilee pour solvants',
      'Interdiction des flammes nues',
      'Extincteurs adaptes',
    ],
  },
];

const VETERINAIRE_RISKS: RiskTemplate[] = [
  {
    id: 'vet-morsure',
    category: 'Biologique',
    name: 'Morsure / griffure animale',
    description: 'Risque de morsure, griffure, coup par les animaux manipules',
    default_gravity: 3,
    default_probability: 3,
    preventive_actions: [
      'Contention adaptee (museliere, cage)',
      'Gants de protection epais',
      'Formation manipulation animale',
      'Vaccination antirabique',
    ],
  },
  {
    id: 'vet-zoonose',
    category: 'Biologique',
    name: 'Zoonoses',
    description: 'Risque de contamination par des maladies transmissibles de l\'animal a l\'homme',
    default_gravity: 3,
    default_probability: 2,
    preventive_actions: [
      'Hygiene des mains stricte',
      'Port de gants',
      'Vaccinations a jour',
      'Suivi medical',
    ],
  },
  {
    id: 'vet-chimique',
    category: 'Chimique',
    name: 'Exposition aux medicaments veterinaires',
    description: 'Risque d\'exposition aux anesthesiques, cytostatiques, radiations (radio)',
    default_gravity: 3,
    default_probability: 2,
    preventive_actions: [
      'Ventilation lors de l\'utilisation d\'anesthesiques gazeux',
      'Gants lors des manipulations',
      'Tablier plombe pour les radios',
    ],
  },
  ...BUREAU_CONSEIL_RISKS.filter(r => r.id === 'bur-rps'),
];

// ============================================================
// SECTION N - ACTIVITES DE SERVICES ADMINISTRATIFS (77-82)
// ============================================================

const NETTOYAGE_RISKS: RiskTemplate[] = [
  {
    id: 'net-chimique',
    category: 'Chimique',
    name: 'Produits d\'entretien dangereux',
    description: 'Risque d\'allergie, brulure, intoxication par produits de nettoyage concentres',
    default_gravity: 3,
    default_probability: 3,
    preventive_actions: [
      'Gants et lunettes de protection',
      'Ne jamais melanger les produits (javel + acide = chlore)',
      'Ventilation des locaux',
      'Formation aux pictogrammes de danger',
      'Dosage correct des produits',
    ],
  },
  {
    id: 'net-chute',
    category: 'Chute',
    name: 'Chute de plain-pied et de hauteur',
    description: 'Risque de chute sur sols mouilles ou depuis un escabeau',
    default_gravity: 3,
    default_probability: 3,
    preventive_actions: [
      'Chaussures antiderapantes obligatoires',
      'Signalisation sols mouilles',
      'Escabeau conforme (pas de chaise)',
      'Technique de nettoyage sans mouiller excessivement',
    ],
  },
  {
    id: 'net-tms',
    category: 'Ergonomique',
    name: 'TMS (gestes repetitifs, postures)',
    description: 'Risque de TMS lie aux gestes repetitifs (balayage, essuyage, aspirateur)',
    default_gravity: 3,
    default_probability: 4,
    preventive_actions: [
      'Materiel ergonomique (manche reglable)',
      'Alternance des taches',
      'Formation gestes et postures',
      'Pauses regulieres',
    ],
  },
  {
    id: 'net-biologique',
    category: 'Biologique',
    name: 'Risque biologique (sanitaires, dechets)',
    description: 'Risque de contamination lors du nettoyage de sanitaires ou de la collecte de dechets',
    default_gravity: 2,
    default_probability: 3,
    preventive_actions: [
      'Gants jetables',
      'Lavage des mains frequent',
      'Vaccination hepatite B conseillee',
      'Collecte securisee des dechets',
    ],
  },
  {
    id: 'net-travail-isole',
    category: 'Organisationnel',
    name: 'Travail isole (menage de nuit)',
    description: 'Risque d\'isolement lors du nettoyage en horaires decales, de nuit',
    default_gravity: 3,
    default_probability: 3,
    preventive_actions: [
      'Dispositif PTI (Protection Travailleur Isole)',
      'Telephone portable',
      'Procedure de pointage regulier',
    ],
  },
];

const INTERIM_RISKS: RiskTemplate[] = [
  {
    id: 'int-multi-postes',
    category: 'Organisationnel',
    name: 'Changements frequents de poste',
    description: 'Risque lie a la meconnaissance des postes successifs et de leurs dangers specifiques',
    default_gravity: 3,
    default_probability: 3,
    preventive_actions: [
      'Accueil securite systematique a chaque mission',
      'Formation au poste avant prise de fonction',
      'Livret de securite',
      'Tuteur designe',
    ],
  },
  {
    id: 'int-rps',
    category: 'Psychosocial',
    name: 'Precarite et stress',
    description: 'Risque psychosocial lie a la precarite de l\'emploi, isolement, pression',
    default_gravity: 2,
    default_probability: 3,
    preventive_actions: [
      'Entretiens de suivi reguliers',
      'Information sur les droits',
      'Accompagnement par l\'agence',
    ],
  },
  ...BUREAU_CONSEIL_RISKS.filter(r => r.id === 'bur-ecran'),
];

const SECURITE_PRIVEE_RISKS: RiskTemplate[] = [
  {
    id: 'sec-agression',
    category: 'Psychosocial',
    name: 'Agression physique et verbale',
    description: 'Risque d\'agression lors d\'interventions, de controles d\'acces, de rondes',
    default_gravity: 4,
    default_probability: 3,
    preventive_actions: [
      'Formation aux techniques de mediation',
      'Travail en binome',
      'Equipements de protection (gilet pare-coups)',
      'Radio et dispositif d\'alerte',
      'Soutien psychologique',
    ],
  },
  {
    id: 'sec-travail-nuit',
    category: 'Organisationnel',
    name: 'Travail de nuit et isole',
    description: 'Risque lie au travail de nuit, isolement lors des rondes',
    default_gravity: 3,
    default_probability: 3,
    preventive_actions: [
      'Dispositif PTI/DATI',
      'Rondes de securite planifiees',
      'Contact radio regulier',
      'Suivi medical nuit',
    ],
  },
  {
    id: 'sec-station-debout',
    category: 'Ergonomique',
    name: 'Station debout prolongee',
    description: 'Risque de TMS et troubles circulatoires par la station debout prolongee',
    default_gravity: 2,
    default_probability: 4,
    preventive_actions: [
      'Chaussures de confort',
      'Tapis anti-fatigue',
      'Pauses assises',
      'Bas de contention',
    ],
  },
  {
    id: 'sec-chien',
    category: 'Biologique',
    name: 'Risque lie aux chiens de garde',
    description: 'Risque de morsure par les chiens d\'intervention',
    default_gravity: 3,
    default_probability: 2,
    preventive_actions: [
      'Formation maitre-chien',
      'Equipement de protection (gants, manchettes)',
      'Vaccination antirabique',
    ],
  },
];

// ============================================================
// SECTION O - ADMINISTRATION PUBLIQUE (84)
// ============================================================

const ADMINISTRATION_RISKS: RiskTemplate[] = [
  ...BUREAU_CONSEIL_RISKS,
  {
    id: 'adm-accueil',
    category: 'Psychosocial',
    name: 'Violence du public',
    description: 'Risque d\'agression verbale ou physique par les usagers (guichet, accueil)',
    default_gravity: 3,
    default_probability: 2,
    preventive_actions: [
      'Amenagement des espaces d\'accueil (hygiaphone)',
      'Formation gestion de l\'agressivite',
      'Bouton d\'alerte',
      'Soutien psychologique',
    ],
  },
];

// ============================================================
// SECTION P - ENSEIGNEMENT (85)
// ============================================================

const ENSEIGNEMENT_RISKS: RiskTemplate[] = [
  {
    id: 'ens-vocal',
    category: 'Physique',
    name: 'Troubles de la voix',
    description: 'Risque de dysphonie lie a l\'usage intensif de la voix',
    default_gravity: 2,
    default_probability: 3,
    preventive_actions: [
      'Micro et amplification en classe',
      'Formation a l\'usage de la voix',
      'Hydratation frequente',
      'Environnement acoustique adapte',
    ],
  },
  {
    id: 'ens-rps',
    category: 'Psychosocial',
    name: 'Risques psychosociaux',
    description: 'Risque de stress, epuisement, violences verbales (eleves, parents)',
    default_gravity: 3,
    default_probability: 3,
    preventive_actions: [
      'Soutien de l\'equipe pedagogique',
      'Mediation et cellule d\'ecoute',
      'Formation gestion de classe',
      'Procedures anti-harcelement',
    ],
  },
  {
    id: 'ens-station-debout',
    category: 'Ergonomique',
    name: 'Station debout prolongee',
    description: 'Risque de TMS et troubles veineux par la station debout en classe',
    default_gravity: 2,
    default_probability: 3,
    preventive_actions: [
      'Chaussures confortables',
      'Tabouret haut disponible',
      'Alternance assis/debout',
    ],
  },
  {
    id: 'ens-chimique',
    category: 'Chimique',
    name: 'Produits chimiques (TP)',
    description: 'Risque chimique lors de travaux pratiques (sciences, technologie)',
    default_gravity: 3,
    default_probability: 1,
    preventive_actions: [
      'Hotte aspirante dans les salles de TP',
      'EPI pour les eleves et enseignants',
      'FDS disponibles',
      'Stockage conforme des produits',
    ],
  },
  {
    id: 'ens-chute',
    category: 'Chute',
    name: 'Chute (escaliers, cour)',
    description: 'Risque de chute dans les escaliers, la cour, les salles de sport',
    default_gravity: 2,
    default_probability: 2,
    preventive_actions: [
      'Mains courantes en bon etat',
      'Eclairage des escaliers',
      'Entretien des sols',
      'Surveillance de la cour',
    ],
  },
];

// ============================================================
// SECTION Q - SANTE HUMAINE ET ACTION SOCIALE (86-88)
// ============================================================

const SANTE_RISKS: RiskTemplate[] = [
  {
    id: 'san-biologique',
    category: 'Biologique',
    name: 'Risque infectieux (AES)',
    description: 'Risque d\'accident d\'exposition au sang et de contamination par agents infectieux',
    default_gravity: 4,
    default_probability: 3,
    preventive_actions: [
      'Conteneurs OPCT a proximite',
      'Gants systematiques pour les soins',
      'Vaccination Hepatite B obligatoire',
      'Protocole AES affiche',
      'Materiel securise (aiguilles retractables)',
    ],
  },
  {
    id: 'san-manutention',
    category: 'Ergonomique',
    name: 'Manutention de patients',
    description: 'Risque de TMS lie au port, transfert et mobilisation des patients',
    default_gravity: 3,
    default_probability: 4,
    preventive_actions: [
      'Leve-malade et verticalisateur',
      'Drap de transfert',
      'Formation manutention de personnes',
      'Travail en binome pour les mobilisations',
      'Lit a hauteur variable',
    ],
  },
  {
    id: 'san-chimique',
    category: 'Chimique',
    name: 'Exposition aux produits chimiques',
    description: 'Risque d\'exposition aux desinfectants, cytostatiques, formol, gaz anesthesiques',
    default_gravity: 3,
    default_probability: 2,
    preventive_actions: [
      'Hottes pour la preparation des cytostatiques',
      'Gants adaptes a la manipulation',
      'Ventilation des locaux',
      'Substitution par des produits moins nocifs',
    ],
  },
  {
    id: 'san-rps',
    category: 'Psychosocial',
    name: 'Epuisement professionnel',
    description: 'Risque de burn-out, compassion fatigue, violence des patients ou familles',
    default_gravity: 3,
    default_probability: 3,
    preventive_actions: [
      'Groupes de parole',
      'Psychologue du travail accessible',
      'Organisation du temps de travail',
      'Procedures de gestion de la violence',
    ],
  },
  {
    id: 'san-rayonnements',
    category: 'Physique',
    name: 'Rayonnements ionisants',
    description: 'Risque d\'irradiation (radiologie, scanner, radiotherapie)',
    default_gravity: 4,
    default_probability: 1,
    preventive_actions: [
      'Dosimetrie individuelle',
      'Tablier et protege-thyroide plombes',
      'Optimisation des doses (ALARA)',
      'Signalisation des zones controlees',
    ],
  },
  {
    id: 'san-chute',
    category: 'Chute',
    name: 'Chute de plain-pied (sols mouilles)',
    description: 'Risque de chute dans les couloirs, chambres (sols laves, eclaboussures)',
    default_gravity: 2,
    default_probability: 3,
    preventive_actions: [
      'Chaussures antiderapantes',
      'Signalisation des sols mouilles',
      'Eclairage adequat',
    ],
  },
  {
    id: 'san-nuit',
    category: 'Organisationnel',
    name: 'Travail de nuit et postes',
    description: 'Risque lie au travail en horaires decales, gardes, astreintes',
    default_gravity: 3,
    default_probability: 3,
    preventive_actions: [
      'Suivi medical renforce',
      'Repos compensateur',
      'Salle de repos',
      'Alimentation equilibree de nuit',
    ],
  },
];

const ACTION_SOCIALE_RISKS: RiskTemplate[] = [
  {
    id: 'soc-agression',
    category: 'Psychosocial',
    name: 'Violence des usagers',
    description: 'Risque d\'agression verbale ou physique par les personnes accompagnees',
    default_gravity: 3,
    default_probability: 3,
    preventive_actions: [
      'Formation gestion de l\'agressivite',
      'Travail en binome',
      'Procedure d\'alerte',
      'Soutien psychologique',
      'Debriefing apres incident',
    ],
  },
  {
    id: 'soc-manutention',
    category: 'Ergonomique',
    name: 'Manutention de personnes',
    description: 'Risque de TMS lie a l\'aide a la mobilite, aux transferts, a la toilette',
    default_gravity: 3,
    default_probability: 4,
    preventive_actions: [
      'Aides techniques (leve-personne, drap de transfert)',
      'Formation gestes et postures',
      'Travail en binome',
      'Lit medicalise a hauteur variable',
    ],
  },
  {
    id: 'soc-rps',
    category: 'Psychosocial',
    name: 'Epuisement emotionnel',
    description: 'Risque de burn-out lie a la charge emotionnelle, aux situations de detresse des usagers',
    default_gravity: 3,
    default_probability: 3,
    preventive_actions: [
      'Supervision et analyse des pratiques',
      'Groupes de parole',
      'Conges et repos respectes',
      'Psychologue du travail',
    ],
  },
  {
    id: 'soc-routier',
    category: 'Routier',
    name: 'Deplacements a domicile',
    description: 'Risque routier lors des visites a domicile',
    default_gravity: 4,
    default_probability: 3,
    preventive_actions: [
      'Vehicule de service entretenu',
      'Planning de tournee optimise',
      'Eviter les heures de pointe',
      'Formation eco-conduite',
    ],
  },
  {
    id: 'soc-travail-isole',
    category: 'Organisationnel',
    name: 'Travail isole a domicile',
    description: 'Risque d\'isolement lors des interventions a domicile',
    default_gravity: 3,
    default_probability: 3,
    preventive_actions: [
      'Telephone portable charge',
      'Dispositif PTI/DATI',
      'Planning connu des collegues',
      'Procedure d\'alerte en cas de non-retour',
    ],
  },
  {
    id: 'soc-biologique',
    category: 'Biologique',
    name: 'Risque biologique (soins a domicile)',
    description: 'Risque infectieux lors de soins d\'hygiene, de manipulation de dechets',
    default_gravity: 3,
    default_probability: 2,
    preventive_actions: [
      'Gants jetables pour les soins',
      'Gel hydroalcoolique',
      'Vaccination a jour',
      'Elimination des dechets de soins',
    ],
  },
];

// ============================================================
// SECTION R - ARTS, SPECTACLES, ACTIVITES RECREATIVES (90-93)
// ============================================================

const SPECTACLE_RISKS: RiskTemplate[] = [
  {
    id: 'spec-chute-hauteur',
    category: 'Chute',
    name: 'Chute de hauteur (scene, gril)',
    description: 'Risque de chute depuis la scene, les passerelles, le gril technique, les echafaudages',
    default_gravity: 4,
    default_probability: 2,
    preventive_actions: [
      'Garde-corps et lignes de vie',
      'Harnais anti-chute',
      'Formation travail en hauteur',
      'Verification des structures',
    ],
  },
  {
    id: 'spec-electrique',
    category: 'Electrique',
    name: 'Risque electrique (eclairage, son)',
    description: 'Risque d\'electrocution lors de branchements son et lumiere',
    default_gravity: 4,
    default_probability: 2,
    preventive_actions: [
      'Habilitation electrique pour les techniciens',
      'Verification du materiel avant chaque representation',
      'Mise a la terre de tous les equipements',
    ],
  },
  {
    id: 'spec-bruit',
    category: 'Physique',
    name: 'Exposition au bruit',
    description: 'Risque de surdite lie aux concerts, spectacles, repetitions (> 85 dB)',
    default_gravity: 3,
    default_probability: 3,
    preventive_actions: [
      'Bouchons moules pour les musiciens',
      'Limitation des niveaux sonores',
      'Pauses auditives',
      'Audiometrie annuelle',
    ],
  },
  {
    id: 'spec-manutention',
    category: 'Ergonomique',
    name: 'Manutention (montage/demontage)',
    description: 'Risque de TMS lie au montage et demontage de decors, structures, materiel lourd',
    default_gravity: 3,
    default_probability: 3,
    preventive_actions: [
      'Aides mecaniques (palan, chariot)',
      'Formation elingage',
      'Travail en equipe',
      'Chaussures de securite',
    ],
  },
  {
    id: 'spec-horaires',
    category: 'Organisationnel',
    name: 'Horaires atypiques et intermittence',
    description: 'Risque lie au travail de nuit, week-end, horaires variables, precarite',
    default_gravity: 2,
    default_probability: 3,
    preventive_actions: [
      'Planning anticipe au maximum',
      'Temps de repos respecte',
      'Restauration disponible',
    ],
  },
];

const SPORT_RISKS: RiskTemplate[] = [
  {
    id: 'sport-physique',
    category: 'Ergonomique',
    name: 'Blessure sportive',
    description: 'Risque de blessure musculaire, articulaire, fracture lors de la pratique ou l\'encadrement',
    default_gravity: 3,
    default_probability: 3,
    preventive_actions: [
      'Echauffement systematique',
      'Materiel conforme et entretenu',
      'Trousse de premiers secours',
      'Formation aux gestes de premiers secours',
    ],
  },
  {
    id: 'sport-noyade',
    category: 'Noyade',
    name: 'Risque de noyade',
    description: 'Risque de noyade dans les piscines, plans d\'eau, activites nautiques',
    default_gravity: 4,
    default_probability: 1,
    preventive_actions: [
      'Maitres-nageurs qualifies',
      'Materiel de sauvetage',
      'Surveillance constante des bassins',
      'Reglement interieur affiche',
    ],
  },
  {
    id: 'sport-agression',
    category: 'Psychosocial',
    name: 'Violence et incivilites',
    description: 'Risque d\'agression entre sportifs, supporters, ou envers les arbitres/educateurs',
    default_gravity: 3,
    default_probability: 2,
    preventive_actions: [
      'Charte de bonne conduite',
      'Service d\'ordre lors d\'evenements',
      'Procedure d\'exclusion',
      'Formation gestion de conflit',
    ],
  },
];

// ============================================================
// SECTION S - AUTRES ACTIVITES DE SERVICES (94-96)
// ============================================================

const COIFFURE_ESTHETIQUE_RISKS: RiskTemplate[] = [
  {
    id: 'coif-chimique',
    category: 'Chimique',
    name: 'Produits chimiques (coloration, permanente)',
    description: 'Risque d\'allergie, dermatite, asthme par exposition aux colorations, decolorations, permanentes',
    default_gravity: 3,
    default_probability: 3,
    preventive_actions: [
      'Gants obligatoires pour les produits',
      'Ventilation du salon',
      'Test d\'allergie (48h avant coloration)',
      'Creme protectrice pour les mains',
      'Substitution par des produits moins nocifs',
    ],
  },
  {
    id: 'coif-tms',
    category: 'Ergonomique',
    name: 'TMS (bras leves, station debout)',
    description: 'Risque de TMS lie a la station debout, bras leves, gestes repetitifs',
    default_gravity: 3,
    default_probability: 4,
    preventive_actions: [
      'Tabouret a roulettes reglable en hauteur',
      'Siege du client a hauteur variable',
      'Pauses regulieres',
      'Exercices d\'etirement',
    ],
  },
  {
    id: 'coif-coupure',
    category: 'Mecanique',
    name: 'Coupure (ciseaux, rasoir)',
    description: 'Risque de coupure par les instruments tranchants',
    default_gravity: 2,
    default_probability: 2,
    preventive_actions: [
      'Instruments en bon etat',
      'Rangement securise',
      'Trousse de premiers secours',
    ],
  },
  {
    id: 'coif-biologique',
    category: 'Biologique',
    name: 'Risque biologique (contact cutane)',
    description: 'Risque infectieux par contact cutane (mycoses, parasites, sang)',
    default_gravity: 2,
    default_probability: 2,
    preventive_actions: [
      'Desinfection des instruments',
      'Serviettes a usage unique au bac',
      'Lavage des mains entre clients',
    ],
  },
];

const REPARATION_RISKS: RiskTemplate[] = [
  {
    id: 'rep-electrique',
    category: 'Electrique',
    name: 'Risque electrique',
    description: 'Risque d\'electrisation lors de la reparation d\'appareils electriques/electroniques',
    default_gravity: 4,
    default_probability: 2,
    preventive_actions: [
      'Habilitation electrique',
      'Mise hors tension avant intervention',
      'Outils isoles',
      'Tapis isolant',
    ],
  },
  {
    id: 'rep-tms',
    category: 'Ergonomique',
    name: 'TMS (postures contraignantes)',
    description: 'Risque de TMS lie aux postures penibles lors de reparations',
    default_gravity: 2,
    default_probability: 3,
    preventive_actions: [
      'Plan de travail a hauteur adaptee',
      'Eclairage de precision',
      'Pauses regulieres',
    ],
  },
  {
    id: 'rep-chimique',
    category: 'Chimique',
    name: 'Fumees de soudure et flux',
    description: 'Risque d\'inhalation de fumees lors de soudure de composants electroniques',
    default_gravity: 2,
    default_probability: 2,
    preventive_actions: [
      'Aspiration des fumees de soudage',
      'Ventilation du local',
      'Soudure sans plomb',
    ],
  },
];

// ============================================================
// SECTION T - ACTIVITES DES MENAGES (97)
// ============================================================

const EMPLOI_DOMICILE_RISKS: RiskTemplate[] = [
  {
    id: 'dom-chute',
    category: 'Chute',
    name: 'Chute au domicile',
    description: 'Risque de chute dans des logements non adaptes (escaliers, tapis, encombrement)',
    default_gravity: 3,
    default_probability: 3,
    preventive_actions: [
      'Chaussures fermees antiderapantes',
      'Rangement des zones de passage',
      'Eclairage adequat demande',
      'Escabeau (pas de chaise)',
    ],
  },
  {
    id: 'dom-chimique',
    category: 'Chimique',
    name: 'Produits menagers',
    description: 'Risque d\'allergie et intoxication par produits d\'entretien au domicile',
    default_gravity: 2,
    default_probability: 3,
    preventive_actions: [
      'Gants de menage obligatoires',
      'Ne jamais melanger les produits',
      'Aerer pendant le menage',
    ],
  },
  {
    id: 'dom-tms',
    category: 'Ergonomique',
    name: 'TMS (menage, repassage)',
    description: 'Risque de TMS lie au menage, repassage, port de courses',
    default_gravity: 3,
    default_probability: 4,
    preventive_actions: [
      'Materiel ergonomique fourni si possible',
      'Alternance des taches',
      'Limitation des charges',
    ],
  },
  {
    id: 'dom-isolement',
    category: 'Organisationnel',
    name: 'Travail isole et harcelement',
    description: 'Risque d\'isolement, de harcelement ou d\'agression au domicile de l\'employeur',
    default_gravity: 3,
    default_probability: 2,
    preventive_actions: [
      'Telephone portable a disposition',
      'Contact regulier avec l\'employeur principal',
      'Droit de retrait si danger',
    ],
  },
];

// ============================================================
// RISQUES SPECIFIQUES - ESPACES VERTS / PAYSAGISTE (81.30Z)
// ============================================================

const ESPACES_VERTS_RISKS: RiskTemplate[] = [
  {
    id: 'ev-machines',
    category: 'Mecanique',
    name: 'Machines de coupe',
    description: 'Risque de coupure, amputation par tondeuse, tronconneuse, debroussailleuse, taille-haie',
    default_gravity: 4,
    default_probability: 3,
    preventive_actions: [
      'EPI complets (visiere, gants, jambieres pour tronconneuse)',
      'Formation a l\'utilisation de chaque machine',
      'Entretien regulier des machines',
      'Arret moteur avant intervention',
    ],
  },
  {
    id: 'ev-bruit',
    category: 'Physique',
    name: 'Bruit des engins',
    description: 'Risque de surdite lie aux machines (tondeuse, souffleur, tronconneuse)',
    default_gravity: 3,
    default_probability: 4,
    preventive_actions: [
      'Protections auditives obligatoires',
      'Materiel a faible emission sonore',
      'Respect de la reglementation horaire',
    ],
  },
  {
    id: 'ev-chimique',
    category: 'Chimique',
    name: 'Produits phytosanitaires',
    description: 'Risque d\'intoxication par herbicides, insecticides, engrais chimiques',
    default_gravity: 3,
    default_probability: 2,
    preventive_actions: [
      'Certiphyto obligatoire',
      'EPI (combinaison, masque, gants)',
      'Privilegier le desherbage mecanique',
      'Respect des doses et delais',
    ],
  },
  {
    id: 'ev-tms',
    category: 'Ergonomique',
    name: 'TMS et postures penibles',
    description: 'Risque de TMS lie au port de charges, postures accroupies, vibrations',
    default_gravity: 3,
    default_probability: 4,
    preventive_actions: [
      'Aides mecaniques (brouette motorisee)',
      'Genouilleres pour le travail au sol',
      'Alternance des taches',
      'Pauses regulieres',
    ],
  },
  {
    id: 'ev-meteo',
    category: 'Physique',
    name: 'Travail en exterieur (meteo)',
    description: 'Risque lie au travail en exterieur (chaleur, froid, UV, pluie, orage)',
    default_gravity: 3,
    default_probability: 3,
    preventive_actions: [
      'Amenagement des horaires en ete',
      'Eau a disposition',
      'Protection solaire (chapeau, creme)',
      'Arret en cas d\'orage',
    ],
  },
  {
    id: 'ev-allergies',
    category: 'Biologique',
    name: 'Allergies et piqures',
    description: 'Risque d\'allergie aux pollens, piqures d\'insectes (guepes, tiques)',
    default_gravity: 2,
    default_probability: 3,
    preventive_actions: [
      'Kit d\'allergie (antihistaminiques, adrenaline pour les allergiques)',
      'Vetements couvrants contre les tiques',
      'Inspection corporelle apres travail en zone boisee',
    ],
  },
];

// ============================================================
// ASSEMBLAGE FINAL : TOUS LES PROFILS NAF
// ============================================================

const NAF_RISK_PROFILES: NafRiskProfile[] = [
  // SECTION A - Agriculture, sylviculture, peche (01-03)
  { naf_prefix: '01', sector_name: 'Agriculture - Culture et elevage', risks: [...AGRICULTURE_RISKS, ...COMMON_RISKS] },
  { naf_prefix: '02', sector_name: 'Sylviculture et exploitation forestiere', risks: [...AGRICULTURE_RISKS, ...COMMON_RISKS] },
  { naf_prefix: '03', sector_name: 'Peche et aquaculture', risks: [...PECHE_RISKS, ...COMMON_RISKS] },

  // SECTION B - Industries extractives (05-09)
  { naf_prefix: '05', sector_name: 'Extraction de houille et lignite', risks: [...EXTRACTION_RISKS, ...COMMON_RISKS] },
  { naf_prefix: '06', sector_name: 'Extraction d\'hydrocarbures', risks: [...EXTRACTION_RISKS, ...COMMON_RISKS] },
  { naf_prefix: '07', sector_name: 'Extraction de minerais metalliques', risks: [...EXTRACTION_RISKS, ...COMMON_RISKS] },
  { naf_prefix: '08', sector_name: 'Autres industries extractives (carrieres, sable)', risks: [...EXTRACTION_RISKS, ...COMMON_RISKS] },
  { naf_prefix: '09', sector_name: 'Services de soutien aux industries extractives', risks: [...EXTRACTION_RISKS, ...COMMON_RISKS] },

  // SECTION C - Industrie manufacturiere (10-33)
  { naf_prefix: '10', sector_name: 'Industrie alimentaire', risks: [...INDUSTRIE_ALIMENTAIRE_RISKS, ...COMMON_RISKS] },
  { naf_prefix: '11', sector_name: 'Fabrication de boissons', risks: [...INDUSTRIE_ALIMENTAIRE_RISKS, ...COMMON_RISKS] },
  { naf_prefix: '12', sector_name: 'Fabrication de produits a base de tabac', risks: [...INDUSTRIE_ALIMENTAIRE_RISKS, ...COMMON_RISKS] },
  { naf_prefix: '13', sector_name: 'Fabrication de textiles', risks: [...INDUSTRIE_TEXTILE_RISKS, ...COMMON_RISKS] },
  { naf_prefix: '14', sector_name: 'Industrie de l\'habillement', risks: [...INDUSTRIE_TEXTILE_RISKS, ...COMMON_RISKS] },
  { naf_prefix: '15', sector_name: 'Industrie du cuir et de la chaussure', risks: [...INDUSTRIE_TEXTILE_RISKS, ...COMMON_RISKS] },
  { naf_prefix: '16', sector_name: 'Travail du bois et fabrication d\'articles en bois', risks: [...INDUSTRIE_BOIS_RISKS, ...COMMON_RISKS] },
  { naf_prefix: '17', sector_name: 'Industrie du papier et du carton', risks: [...INDUSTRIE_BOIS_RISKS, ...COMMON_RISKS] },
  { naf_prefix: '18', sector_name: 'Imprimerie et reproduction', risks: [...INDUSTRIE_CHIMIQUE_RISKS.filter(r => r.id !== 'ich-reacteurs'), ...COMMON_RISKS] },
  { naf_prefix: '19', sector_name: 'Cokefaction et raffinage', risks: [...INDUSTRIE_CHIMIQUE_RISKS, ...COMMON_RISKS] },
  { naf_prefix: '20', sector_name: 'Industrie chimique', risks: [...INDUSTRIE_CHIMIQUE_RISKS, ...COMMON_RISKS] },
  { naf_prefix: '21', sector_name: 'Industrie pharmaceutique', risks: [...INDUSTRIE_CHIMIQUE_RISKS, ...LABORATOIRE_RISKS, ...COMMON_RISKS] },
  { naf_prefix: '22', sector_name: 'Fabrication de produits en caoutchouc et plastique', risks: [...INDUSTRIE_CHIMIQUE_RISKS.filter(r => ['ich-chimique', 'ich-explosion'].includes(r.id)), ...INDUSTRIE_METALLURGIE_RISKS.filter(r => ['imet-machines', 'imet-bruit', 'imet-manutention'].includes(r.id)), ...COMMON_RISKS] },
  { naf_prefix: '23', sector_name: 'Fabrication d\'autres produits mineraux non metalliques', risks: [...EXTRACTION_RISKS.filter(r => ['extract-poussieres', 'extract-vibrations', 'extract-bruit'].includes(r.id)), ...INDUSTRIE_METALLURGIE_RISKS.filter(r => ['imet-machines', 'imet-brulure', 'imet-manutention'].includes(r.id)), ...COMMON_RISKS] },
  { naf_prefix: '24', sector_name: 'Metallurgie', risks: [...INDUSTRIE_METALLURGIE_RISKS, ...COMMON_RISKS] },
  { naf_prefix: '25', sector_name: 'Fabrication de produits metalliques', risks: [...INDUSTRIE_METALLURGIE_RISKS, ...COMMON_RISKS] },
  { naf_prefix: '26', sector_name: 'Fabrication de produits informatiques et electroniques', risks: [...INDUSTRIE_CHIMIQUE_RISKS.filter(r => r.id === 'ich-chimique'), ...NUMERIQUE_RISKS.filter(r => r.id !== 'num-teletravail'), ...COMMON_RISKS] },
  { naf_prefix: '27', sector_name: 'Fabrication d\'equipements electriques', risks: [...INDUSTRIE_METALLURGIE_RISKS.filter(r => ['imet-machines', 'imet-bruit', 'imet-manutention'].includes(r.id)), ...ENERGIE_RISKS.filter(r => r.id === 'nrj-electrique'), ...COMMON_RISKS] },
  { naf_prefix: '28', sector_name: 'Fabrication de machines et equipements', risks: [...INDUSTRIE_METALLURGIE_RISKS, ...COMMON_RISKS] },
  { naf_prefix: '29', sector_name: 'Industrie automobile', risks: [...INDUSTRIE_METALLURGIE_RISKS, ...COMMON_RISKS] },
  { naf_prefix: '30', sector_name: 'Fabrication d\'autres materiels de transport', risks: [...INDUSTRIE_METALLURGIE_RISKS, ...COMMON_RISKS] },
  { naf_prefix: '31', sector_name: 'Fabrication de meubles', risks: [...INDUSTRIE_BOIS_RISKS, ...COMMON_RISKS] },
  { naf_prefix: '32', sector_name: 'Autres industries manufacturieres', risks: [...INDUSTRIE_METALLURGIE_RISKS.filter(r => ['imet-machines', 'imet-bruit', 'imet-manutention'].includes(r.id)), ...COMMON_RISKS] },
  { naf_prefix: '33', sector_name: 'Reparation et installation de machines industrielles', risks: [...INDUSTRIE_METALLURGIE_RISKS, ...COMMON_RISKS] },

  // SECTION D - Production d'electricite, gaz (35)
  { naf_prefix: '35', sector_name: 'Production et distribution d\'electricite, gaz, vapeur', risks: [...ENERGIE_RISKS, ...COMMON_RISKS] },

  // SECTION E - Eau, assainissement, dechets (36-39)
  { naf_prefix: '36', sector_name: 'Captage, traitement et distribution d\'eau', risks: [...DECHETS_EAU_RISKS, ...COMMON_RISKS] },
  { naf_prefix: '37', sector_name: 'Collecte et traitement des eaux usees', risks: [...DECHETS_EAU_RISKS, ...COMMON_RISKS] },
  { naf_prefix: '38', sector_name: 'Collecte, traitement et elimination des dechets', risks: [...DECHETS_EAU_RISKS, ...COMMON_RISKS] },
  { naf_prefix: '39', sector_name: 'Depollution et gestion des sites', risks: [...DECHETS_EAU_RISKS, ...INDUSTRIE_CHIMIQUE_RISKS.filter(r => r.id === 'ich-chimique'), ...COMMON_RISKS] },

  // SECTION F - Construction / BTP (41-43)
  { naf_prefix: '41', sector_name: 'BTP - Construction de batiments', risks: [...BTP_RISKS, ...COMMON_RISKS] },
  { naf_prefix: '42', sector_name: 'BTP - Genie civil', risks: [...BTP_RISKS, ...COMMON_RISKS] },
  { naf_prefix: '43', sector_name: 'BTP - Travaux de construction specialises', risks: [...BTP_RISKS, ...COMMON_RISKS] },

  // SECTION G - Commerce (45-47)
  { naf_prefix: '45', sector_name: 'Commerce et reparation automobile', risks: [...COMMERCE_AUTO_RISKS, ...COMMON_RISKS] },
  { naf_prefix: '46', sector_name: 'Commerce de gros', risks: [...COMMERCE_RISKS, ...ENTREPOSAGE_RISKS.filter(r => ['ent-chariots', 'ent-chute-objets', 'ent-tms'].includes(r.id)), ...COMMON_RISKS] },
  { naf_prefix: '47', sector_name: 'Commerce de detail', risks: [...COMMERCE_RISKS, ...COMMON_RISKS] },

  // SECTION H - Transports et entreposage (49-53)
  { naf_prefix: '49', sector_name: 'Transports terrestres et par conduites', risks: [...TRANSPORT_ROUTIER_RISKS, ...COMMON_RISKS] },
  { naf_prefix: '50', sector_name: 'Transports par eau', risks: [...PECHE_RISKS.filter(r => ['peche-noyade', 'peche-meteo'].includes(r.id)), ...TRANSPORT_ROUTIER_RISKS.filter(r => ['tr-manutention', 'tr-marchandises-dangereuses'].includes(r.id)), ...COMMON_RISKS] },
  { naf_prefix: '51', sector_name: 'Transports aeriens', risks: [...TRANSPORT_ROUTIER_RISKS.filter(r => ['tr-manutention', 'tr-fatigue'].includes(r.id)), ...COMMON_RISKS] },
  { naf_prefix: '52', sector_name: 'Entreposage et services auxiliaires des transports', risks: [...ENTREPOSAGE_RISKS, ...COMMON_RISKS] },
  { naf_prefix: '53', sector_name: 'Activites de poste et de courrier', risks: [...TRANSPORT_ROUTIER_RISKS.filter(r => ['tr-routier', 'tr-manutention', 'tr-chute-quai'].includes(r.id)), ...COMMON_RISKS] },

  // SECTION I - Hebergement et restauration (55-56)
  { naf_prefix: '55', sector_name: 'Hebergement (hotellerie)', risks: [...HOTELLERIE_RISKS, ...COMMON_RISKS] },
  { naf_prefix: '56', sector_name: 'Restauration', risks: [...RESTAURATION_RISKS, ...COMMON_RISKS] },

  // SECTION J - Information et communication (58-63)
  { naf_prefix: '58', sector_name: 'Edition (livres, logiciels, jeux)', risks: [...NUMERIQUE_RISKS, ...COMMON_RISKS] },
  { naf_prefix: '59', sector_name: 'Production de films, musique, television', risks: [...SPECTACLE_RISKS.filter(r => ['spec-electrique', 'spec-bruit', 'spec-horaires'].includes(r.id)), ...NUMERIQUE_RISKS, ...COMMON_RISKS] },
  { naf_prefix: '60', sector_name: 'Programmation et diffusion (radio, television)', risks: [...NUMERIQUE_RISKS, ...COMMON_RISKS] },
  { naf_prefix: '61', sector_name: 'Telecommunications', risks: [...NUMERIQUE_RISKS, ...BTP_RISKS.filter(r => r.id === 'btp-chute-hauteur'), ...COMMON_RISKS] },
  { naf_prefix: '62', sector_name: 'Programmation informatique et conseil en informatique', risks: [...NUMERIQUE_RISKS, ...COMMON_RISKS] },
  { naf_prefix: '63', sector_name: 'Services d\'information (data, portails web)', risks: [...NUMERIQUE_RISKS, ...COMMON_RISKS] },

  // SECTION K - Activites financieres et d'assurance (64-66)
  { naf_prefix: '64', sector_name: 'Services financiers (banques)', risks: [...FINANCE_RISKS, ...COMMON_RISKS] },
  { naf_prefix: '65', sector_name: 'Assurance et reassurance', risks: [...FINANCE_RISKS.filter(r => r.id !== 'fin-agression'), ...COMMON_RISKS] },
  { naf_prefix: '66', sector_name: 'Activites auxiliaires de services financiers', risks: [...FINANCE_RISKS.filter(r => r.id !== 'fin-agression'), ...COMMON_RISKS] },

  // SECTION L - Activites immobilieres (68)
  { naf_prefix: '68', sector_name: 'Activites immobilieres', risks: [...IMMOBILIER_RISKS, ...COMMON_RISKS] },

  // SECTION M - Activites specialisees, scientifiques et techniques (69-75)
  { naf_prefix: '69', sector_name: 'Activites juridiques et comptables', risks: [...BUREAU_CONSEIL_RISKS, ...COMMON_RISKS] },
  { naf_prefix: '70', sector_name: 'Activites de siege social et conseil de gestion', risks: [...BUREAU_CONSEIL_RISKS, ...COMMON_RISKS] },
  { naf_prefix: '71', sector_name: 'Architecture, ingenierie, controle technique', risks: [...BUREAU_CONSEIL_RISKS, ...BTP_RISKS.filter(r => ['btp-chute-hauteur', 'btp-chute-plain-pied'].includes(r.id)), ...COMMON_RISKS] },
  { naf_prefix: '72', sector_name: 'Recherche et developpement scientifique', risks: [...LABORATOIRE_RISKS, ...BUREAU_CONSEIL_RISKS, ...COMMON_RISKS] },
  { naf_prefix: '73', sector_name: 'Publicite et etudes de marche', risks: [...BUREAU_CONSEIL_RISKS, ...COMMON_RISKS] },
  { naf_prefix: '74', sector_name: 'Autres activites specialisees (design, photo, traduction)', risks: [...BUREAU_CONSEIL_RISKS, ...COMMON_RISKS] },
  { naf_prefix: '75', sector_name: 'Activites veterinaires', risks: [...VETERINAIRE_RISKS, ...COMMON_RISKS] },

  // SECTION N - Activites de services administratifs et de soutien (77-82)
  { naf_prefix: '77', sector_name: 'Location et location-bail', risks: [...BUREAU_CONSEIL_RISKS, ...COMMON_RISKS] },
  { naf_prefix: '78', sector_name: 'Activites liees a l\'emploi (interim, placement)', risks: [...INTERIM_RISKS, ...COMMON_RISKS] },
  { naf_prefix: '79', sector_name: 'Agences de voyage et voyagistes', risks: [...BUREAU_CONSEIL_RISKS, ...COMMON_RISKS] },
  { naf_prefix: '80', sector_name: 'Enquetes et securite privee', risks: [...SECURITE_PRIVEE_RISKS, ...COMMON_RISKS] },
  { naf_prefix: '81', sector_name: 'Services relatifs aux batiments et amenagement paysager', risks: [...NETTOYAGE_RISKS, ...ESPACES_VERTS_RISKS, ...COMMON_RISKS] },
  { naf_prefix: '82', sector_name: 'Activites administratives et de soutien aux entreprises', risks: [...BUREAU_CONSEIL_RISKS, ...COMMON_RISKS] },

  // SECTION O - Administration publique (84)
  { naf_prefix: '84', sector_name: 'Administration publique et defense', risks: [...ADMINISTRATION_RISKS, ...COMMON_RISKS] },

  // SECTION P - Enseignement (85)
  { naf_prefix: '85', sector_name: 'Enseignement', risks: [...ENSEIGNEMENT_RISKS, ...COMMON_RISKS] },

  // SECTION Q - Sante humaine et action sociale (86-88)
  { naf_prefix: '86', sector_name: 'Activites pour la sante humaine (hopitaux, medecins)', risks: [...SANTE_RISKS, ...COMMON_RISKS] },
  { naf_prefix: '87', sector_name: 'Hebergement medico-social et social', risks: [...SANTE_RISKS.filter(r => ['san-biologique', 'san-manutention', 'san-rps', 'san-chute', 'san-nuit'].includes(r.id)), ...ACTION_SOCIALE_RISKS, ...COMMON_RISKS] },
  { naf_prefix: '88', sector_name: 'Action sociale sans hebergement (aide a domicile)', risks: [...ACTION_SOCIALE_RISKS, ...COMMON_RISKS] },

  // SECTION R - Arts, spectacles et activites recreatives (90-93)
  { naf_prefix: '90', sector_name: 'Activites creatives, artistiques et de spectacle', risks: [...SPECTACLE_RISKS, ...COMMON_RISKS] },
  { naf_prefix: '91', sector_name: 'Bibliotheques, musees et autres activites culturelles', risks: [...BUREAU_CONSEIL_RISKS, ...COMMERCE_RISKS.filter(r => r.id === 'com-chute-plain-pied'), ...COMMON_RISKS] },
  { naf_prefix: '92', sector_name: 'Organisation de jeux de hasard et d\'argent', risks: [...FINANCE_RISKS.filter(r => ['fin-agression', 'fin-ecran', 'fin-rps'].includes(r.id)), ...COMMON_RISKS] },
  { naf_prefix: '93', sector_name: 'Activites sportives, recreatives et de loisirs', risks: [...SPORT_RISKS, ...COMMON_RISKS] },

  // SECTION S - Autres activites de services (94-96)
  { naf_prefix: '94', sector_name: 'Activites des organisations associatives', risks: [...BUREAU_CONSEIL_RISKS, ...COMMON_RISKS] },
  { naf_prefix: '95', sector_name: 'Reparation d\'ordinateurs et de biens personnels', risks: [...REPARATION_RISKS, ...COMMON_RISKS] },
  { naf_prefix: '96', sector_name: 'Coiffure, soins de beaute et autres services personnels', risks: [...COIFFURE_ESTHETIQUE_RISKS, ...COMMON_RISKS] },

  // SECTION T - Activites des menages (97)
  { naf_prefix: '97', sector_name: 'Activites des menages en tant qu\'employeurs de personnel domestique', risks: [...EMPLOI_DOMICILE_RISKS, ...COMMON_RISKS] },

  // SECTION U - Activites extraterritoriales (99)
  { naf_prefix: '99', sector_name: 'Activites des organisations extraterritoriales', risks: [...BUREAU_CONSEIL_RISKS, ...COMMON_RISKS] },
];

/**
 * Get risk profile by NAF/APE code
 */
export function getRisksByNafCode(nafCode: string | null | undefined): NafRiskProfile {
  if (!nafCode) {
    return {
      naf_prefix: '',
      sector_name: 'Secteur non identifie',
      risks: [...COMMON_RISKS],
    };
  }

  // Extract 2-digit prefix from NAF code (e.g., "43.21A" -> "43")
  const prefix = nafCode.replace(/[.\s]/g, '').substring(0, 2);

  const profile = NAF_RISK_PROFILES.find((p) => p.naf_prefix === prefix);
  if (profile) return profile;

  // Fallback: return common risks with sector number
  return {
    naf_prefix: prefix,
    sector_name: `Secteur ${prefix} (profil generique)`,
    risks: [...COMMON_RISKS],
  };
}

/**
 * Get all available NAF profiles (for UI listing)
 */
export function getAllNafProfiles(): { naf_prefix: string; sector_name: string; risk_count: number }[] {
  return NAF_RISK_PROFILES.map((p) => ({
    naf_prefix: p.naf_prefix,
    sector_name: p.sector_name,
    risk_count: p.risks.length,
  }));
}

/**
 * Calculate risk level from gravity and probability
 * BUSINESS RULE [CDC-2.4]: Matrice des risques Gravite (1-4) x Probabilite (1-4)
 */
export function calculateRiskLevel(gravity: number, probability: number): {
  score: number;
  level: 'faible' | 'modere' | 'eleve' | 'critique';
  color: string;
} {
  const score = gravity * probability;

  if (score <= 3) return { score, level: 'faible', color: 'green' };
  if (score <= 6) return { score, level: 'modere', color: 'yellow' };
  if (score <= 9) return { score, level: 'eleve', color: 'orange' };
  return { score, level: 'critique', color: 'red' };
}

// BUSINESS RULE [CDC-2.4]: Detection produits chimiques dans achats
const CHEMICAL_KEYWORDS = [
  'solvant', 'diluant', 'peinture', 'vernis', 'colle', 'resine',
  'acide', 'soude', 'javel', 'chlore', 'ammoniac', 'acetone',
  'white spirit', 'trichlorethylene', 'formaldehyde', 'plomb',
  'amiante', 'silice', 'ciment', 'fibre', 'isocyanate',
  'pesticide', 'herbicide', 'insecticide', 'fongicide',
  'desinfectant', 'detergent', 'degraissant',
];

const EQUIPMENT_KEYWORDS = [
  'echafaudage', 'nacelle', 'grue', 'chariot', 'transpalette',
  'scie', 'perceuse', 'meuleuse', 'disqueuse', 'compresseur',
  'chalumeau', 'poste a souder', 'betonniere',
  'tronconneuse', 'debroussailleuse', 'tondeuse',
  'presse', 'tour', 'fraiseuse', 'cisaille',
  'marteau-piqueur', 'foreuse', 'concasseur',
];

/**
 * Detect if a purchase description suggests chemical or equipment risks
 */
export function detectPurchaseRisks(
  description: string,
): { type: 'chemical' | 'equipment'; keywords: string[] }[] {
  const lower = description.toLowerCase();
  const detected: { type: 'chemical' | 'equipment'; keywords: string[] }[] = [];

  const chemicalMatches = CHEMICAL_KEYWORDS.filter((kw) => lower.includes(kw));
  if (chemicalMatches.length > 0) {
    detected.push({ type: 'chemical', keywords: chemicalMatches });
  }

  const equipmentMatches = EQUIPMENT_KEYWORDS.filter((kw) => lower.includes(kw));
  if (equipmentMatches.length > 0) {
    detected.push({ type: 'equipment', keywords: equipmentMatches });
  }

  return detected;
}
