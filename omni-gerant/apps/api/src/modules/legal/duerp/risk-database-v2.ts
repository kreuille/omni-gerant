// BUSINESS RULE [CDC-2.4]: Base de risques V2 — 161 metiers specifiques
// Organises en 15 categories conformement aux references du secteur (d-u-e-r-p.fr)
// Chaque metier contient 8-13 risques specifiques + 6 risques universels

export interface MetierRiskProfile {
  metierSlug: string;
  label: string;
  category: MetierCategory;
  nafCodes: string[];
  idcc?: string;
  legalReferences: string[];
  risks: MetierRisk[];
  workUnits: string[];
}

export interface MetierRisk {
  id: string;
  name: string;
  description: string;
  situations: string[];
  defaultGravity: 1 | 2 | 3 | 4;
  defaultFrequency: 1 | 2 | 3 | 4;
  preventiveMeasures: string[];
  category: RiskCategory;
}

export type MetierCategory =
  | 'agriculture'
  | 'sante_social'
  | 'services_divers'
  | 'tertiaire_bureau'
  | 'alimentaire_restauration'
  | 'btp_construction'
  | 'commerce_services'
  | 'beaute_bien_etre'
  | 'education_formation'
  | 'hotellerie_hebergement'
  | 'industrie_production'
  | 'transport_logistique'
  | 'proprete_environnement'
  | 'securite_gardiennage'
  | 'sport_loisirs'
  | 'audiovisuel_culture'
  | 'collectivites';

export type RiskCategory =
  | 'physique'
  | 'chimique'
  | 'biologique'
  | 'ergonomique'
  | 'psychosocial'
  | 'routier'
  | 'electrique'
  | 'incendie'
  | 'chute_hauteur'
  | 'chute_plain_pied'
  | 'manutention'
  | 'machines'
  | 'thermique'
  | 'bruit'
  | 'vibrations'
  | 'rayonnement'
  | 'atmospheres_explosives';

// ── 6 risques universels (presents dans tous les metiers) ───────────

export const UNIVERSAL_RISKS: MetierRisk[] = [
  {
    id: 'univ-routier',
    name: 'Risque routier',
    description: 'Risque lie aux deplacements professionnels en vehicule',
    situations: ['Trajets domicile-travail', 'Deplacements professionnels', 'Livraisons'],
    defaultGravity: 3,
    defaultFrequency: 2,
    preventiveMeasures: [
      'Formation a la conduite preventive',
      'Entretien regulier des vehicules',
      'Planning adapte pour eviter la fatigue au volant',
      'Interdiction du telephone au volant',
    ],
    category: 'routier',
  },
  {
    id: 'univ-psychosocial',
    name: 'Risques psychosociaux',
    description: 'Stress, charge mentale, harcelement, violences',
    situations: ['Surcharge de travail', 'Conflits interpersonnels', 'Manque de reconnaissance', 'Isolement'],
    defaultGravity: 2,
    defaultFrequency: 2,
    preventiveMeasures: [
      'Entretiens individuels reguliers',
      'Formation management bienveillant',
      'Mise en place d\'un referent harcelement',
      'Equilibre vie pro/perso',
    ],
    category: 'psychosocial',
  },
  {
    id: 'univ-biologique',
    name: 'Risque biologique',
    description: 'Exposition a des agents biologiques (virus, bacteries)',
    situations: ['Contact avec le public', 'Saison grippale', 'Pandemie'],
    defaultGravity: 2,
    defaultFrequency: 2,
    preventiveMeasures: [
      'Mise a disposition de gel hydroalcoolique',
      'Nettoyage et desinfection des surfaces',
      'Aeration des locaux',
      'Campagne de vaccination',
    ],
    category: 'biologique',
  },
  {
    id: 'univ-incendie',
    name: 'Risque incendie',
    description: 'Risque d\'incendie dans les locaux professionnels',
    situations: ['Stockage de produits inflammables', 'Installations electriques defectueuses', 'Acte de malveillance'],
    defaultGravity: 4,
    defaultFrequency: 1,
    preventiveMeasures: [
      'Extincteurs verifies annuellement',
      'Exercice d\'evacuation annuel',
      'Affichage des consignes de securite',
      'Formation equipiers de premiere intervention',
    ],
    category: 'incendie',
  },
  {
    id: 'univ-chute-plain-pied',
    name: 'Chute de plain-pied',
    description: 'Glissade, trebuchement sur sol mouille ou encombre',
    situations: ['Sol mouille', 'Cables au sol', 'Encombrement des passages', 'Eclairage insuffisant'],
    defaultGravity: 2,
    defaultFrequency: 3,
    preventiveMeasures: [
      'Sol antiderapant',
      'Eclairage suffisant des zones de circulation',
      'Signalisation des sols mouilles',
      'Rangement des zones de passage',
    ],
    category: 'chute_plain_pied',
  },
  {
    id: 'univ-electrique',
    name: 'Risque electrique',
    description: 'Contact avec des installations electriques',
    situations: ['Prises defectueuses', 'Cables endommages', 'Intervention sur armoire electrique'],
    defaultGravity: 3,
    defaultFrequency: 1,
    preventiveMeasures: [
      'Verification annuelle des installations electriques',
      'Interdiction d\'intervention non habilitee',
      'Protection differentielle sur les circuits',
      'Signalisation des armoires electriques',
    ],
    category: 'electrique',
  },
];

// ── Metiers par categorie ───────────────────────────────────────────
// Note: Seuls les risques SPECIFIQUES au metier sont listes ici.
// Les 6 risques universels sont ajoutes automatiquement.

const BTP_GENERAL: MetierRiskProfile = {
  metierSlug: 'btp-general',
  label: 'BTP general',
  category: 'btp_construction',
  nafCodes: ['41', '42', '43'],
  idcc: '1597',
  legalReferences: ['Art. R4532-56 a R4532-74 (PPSPS)', 'Decret 2012-639 (amiante)', 'Art. R4323-58 a R4323-90 (hauteur)', 'Decret 2006-892 (bruit/vibrations)'],
  workUnits: ['Chantier gros oeuvre', 'Chantier second oeuvre', 'Zone stockage materiaux', 'Zone demolition', 'Bureau / base de vie', 'Vehicules / deplacements'],
  risks: [
    { id: 'btp-chute-hauteur', name: 'Chute de hauteur', description: 'Chute depuis echafaudage, toiture, echelle, tranchee', situations: ['Travaux en toiture', 'Montage echafaudage', 'Travaux en tranchee'], defaultGravity: 4, defaultFrequency: 3, preventiveMeasures: ['Garde-corps collectifs', 'Filets de securite', 'Harnais antichute EN 361', 'Formation travail en hauteur', 'Verification echafaudages'], category: 'chute_hauteur' },
    { id: 'btp-ensevelissement', name: 'Ensevelissement', description: 'Effondrement de tranchee ou de structure', situations: ['Fouilles non blindees', 'Demolition', 'Terrassement'], defaultGravity: 4, defaultFrequency: 2, preventiveMeasures: ['Blindage des tranchees', 'Etude de sol prealable', 'Perimetre de securite', 'Procedures de demolition'], category: 'physique' },
    { id: 'btp-manutention', name: 'Manutention manuelle', description: 'Port de charges lourdes (parpaings, sacs de ciment, coffrages)', situations: ['Approvisionnement chantier', 'Coffrage', 'Maconnerie'], defaultGravity: 3, defaultFrequency: 4, preventiveMeasures: ['Aide mecanique a la manutention', 'Formation gestes et postures', 'Limitation du poids des charges', 'Organisation du stockage'], category: 'manutention' },
    { id: 'btp-machines', name: 'Risque machines et engins', description: 'Ecrasement, heurt par engins de chantier', situations: ['Manoeuvre d\'engins', 'Zone de grutage', 'Utilisation de machines portatives'], defaultGravity: 4, defaultFrequency: 3, preventiveMeasures: ['CACES obligatoire', 'Plan de circulation chantier', 'Gilets haute visibilite', 'Klaxon de recul'], category: 'machines' },
    { id: 'btp-bruit', name: 'Bruit', description: 'Exposition au bruit > 85 dB(A) (marteau-piqueur, disqueuse)', situations: ['Demolition', 'Decoupage', 'Percement'], defaultGravity: 3, defaultFrequency: 4, preventiveMeasures: ['Bouchons d\'oreilles EN 352', 'Alternance des taches bruyantes', 'Maintenance des outils', 'Audiogramme annuel'], category: 'bruit' },
    { id: 'btp-poussieres', name: 'Poussieres et fibres', description: 'Inhalation de poussieres de silice, ciment, bois, amiante', situations: ['Decoupage', 'Poncage', 'Demolition bati ancien'], defaultGravity: 3, defaultFrequency: 3, preventiveMeasures: ['Masque FFP3 EN 149', 'Aspiration a la source', 'Humidification', 'Reperage amiante avant travaux'], category: 'chimique' },
    { id: 'btp-vibrations', name: 'Vibrations', description: 'Vibrations corps entier (engins) et main-bras (marteau-piqueur)', situations: ['Conduite d\'engins', 'Utilisation d\'outils vibrants'], defaultGravity: 3, defaultFrequency: 3, preventiveMeasures: ['Sieges anti-vibrations', 'Limitation du temps d\'exposition', 'Outils anti-vibrations', 'Suivi medical renforce'], category: 'vibrations' },
    { id: 'btp-chimique', name: 'Risque chimique', description: 'Contact avec ciment, solvants, resines, peintures', situations: ['Maconnerie (ciment)', 'Peinture', 'Etancheite'], defaultGravity: 2, defaultFrequency: 3, preventiveMeasures: ['FDS disponibles sur chantier', 'Gants adaptes EN 374', 'Substitution produits dangereux', 'Ventilation zones confinement'], category: 'chimique' },
    { id: 'btp-thermique', name: 'Intemperies et temperatures extremes', description: 'Travail en exterieur par fortes chaleurs ou grand froid', situations: ['Canicule estivale', 'Gel hivernal', 'Pluie', 'Vent fort'], defaultGravity: 2, defaultFrequency: 3, preventiveMeasures: ['Plan canicule chantier', 'Eau fraiche a disposition', 'Pause reguliere', 'Report travaux par conditions extremes'], category: 'thermique' },
  ],
};

const RESTAURANT: MetierRiskProfile = {
  metierSlug: 'restaurant',
  label: 'Restaurant',
  category: 'alimentaire_restauration',
  nafCodes: ['56.10', '56.10A', '56.10B'],
  idcc: '1979',
  legalReferences: ['CCN HCR 30/04/1997', 'Reglement CE 852/2004 (HACCP)', 'Code construction ERP Type N'],
  workUnits: ['Cuisine', 'Salle de restaurant', 'Bar / Comptoir', 'Plonge', 'Reserve / Stockage', 'Terrasse'],
  risks: [
    { id: 'rest-brulure', name: 'Brulures thermiques', description: 'Contact avec surfaces chaudes, projections d\'huile, vapeur', situations: ['Utilisation du four', 'Friture', 'Service des plats chauds'], defaultGravity: 3, defaultFrequency: 4, preventiveMeasures: ['Gants anti-chaleur EN 407', 'Manche longue', 'Formation aux gestes de premiers secours', 'Signalisation surfaces chaudes'], category: 'thermique' },
    { id: 'rest-coupure', name: 'Coupures', description: 'Utilisation de couteaux, trancheuses, ouvre-boites', situations: ['Decoupe aliments', 'Utilisation trancheuse', 'Nettoyage lames'], defaultGravity: 2, defaultFrequency: 4, preventiveMeasures: ['Gants anti-coupure EN 388 niveau 5', 'Formation couteaux', 'Trancheuse avec protecteur', 'Rangement securise des couteaux'], category: 'physique' },
    { id: 'rest-chute', name: 'Chute et glissade', description: 'Sol gras ou mouille en cuisine', situations: ['Nettoyage cuisine', 'Renversement de liquides', 'Service en salle'], defaultGravity: 2, defaultFrequency: 4, preventiveMeasures: ['Chaussures antiderapantes EN ISO 20345', 'Sol antiderapant cuisine', 'Nettoyage immediat des dechets', 'Tapis antiderapants'], category: 'chute_plain_pied' },
    { id: 'rest-manutention', name: 'Manutention et TMS', description: 'Port de charges (caisses, futs, poubelles), gestes repetitifs', situations: ['Reception marchandises', 'Service plateau', 'Plonge'], defaultGravity: 2, defaultFrequency: 4, preventiveMeasures: ['Diable et chariot de manutention', 'Formation gestes et postures', 'Rotation des taches', 'Hauteur de travail adaptee'], category: 'manutention' },
    { id: 'rest-chimique', name: 'Produits de nettoyage', description: 'Contact avec detergents, degraissants, desinfectants', situations: ['Nettoyage cuisine', 'Desinfection surfaces', 'Debouchage'], defaultGravity: 2, defaultFrequency: 3, preventiveMeasures: ['Gants de protection', 'Formation aux FDS', 'Ventilation des locaux', 'Substitution par produits eco-labellises'], category: 'chimique' },
    { id: 'rest-incendie-cuisine', name: 'Incendie cuisine', description: 'Feu de friteuse, flambage, installation electrique', situations: ['Friture', 'Flambage', 'Court-circuit'], defaultGravity: 4, defaultFrequency: 2, preventiveMeasures: ['Extinction automatique hotte', 'Couverture anti-feu', 'Verification annuelle installations', 'Formation securite incendie'], category: 'incendie' },
    { id: 'rest-bruit', name: 'Bruit', description: 'Ambiance sonore elevee (musique, conversations, machines)', situations: ['Service en salle', 'Plonge industrielle', 'Musique ambiance'], defaultGravity: 1, defaultFrequency: 3, preventiveMeasures: ['Limiteur de bruit musical', 'Isolation phonique plonge', 'Traitement acoustique salle'], category: 'bruit' },
    { id: 'rest-agression', name: 'Agressions et incivilites', description: 'Clients agressifs, vols, violences verbales', situations: ['Service en terrasse', 'Fermeture tardive', 'Gestion conflits clients'], defaultGravity: 2, defaultFrequency: 2, preventiveMeasures: ['Formation gestion des conflits', 'Eclairage exterieur', 'Procedure de fermeture a deux', 'Video-surveillance'], category: 'psychosocial' },
    { id: 'rest-biologique', name: 'Risque alimentaire HACCP', description: 'Contamination croisee, chaine du froid, allergenes', situations: ['Preparation aliments', 'Stockage', 'Service'], defaultGravity: 3, defaultFrequency: 2, preventiveMeasures: ['Plan HACCP a jour', 'Releve temperature quotidien', 'Formation HACCP obligatoire', 'Tracabilite des allergenes'], category: 'biologique' },
  ],
};

const COIFFURE: MetierRiskProfile = {
  metierSlug: 'coiffure',
  label: 'Coiffure',
  category: 'beaute_bien_etre',
  nafCodes: ['96.02A'],
  idcc: '2596',
  legalReferences: ['Tableau RG n° 65 (eczema)', 'Art. R4412-1 (agents chimiques)'],
  workUnits: ['Espace coupe', 'Espace coloration / technique', 'Bac a shampooing', 'Accueil / caisse', 'Reserve produits'],
  risks: [
    { id: 'coif-chimique', name: 'Risque chimique cutane et respiratoire', description: 'Exposition aux colorations, permanentes, decolorants, ammoniac', situations: ['Application coloration', 'Permanente', 'Decoloration', 'Melange produits'], defaultGravity: 3, defaultFrequency: 4, preventiveMeasures: ['Gants nitrile a usage unique EN 374', 'Ventilation renforcee zone coloration', 'Creme protectrice mains', 'Substitution ammoniaque par produits sans ammoniac'], category: 'chimique' },
    { id: 'coif-tms', name: 'Troubles musculosquelettiques', description: 'Gestes repetitifs (coupe, brushing), station debout prolongee', situations: ['Coupe aux ciseaux', 'Brushing', 'Shampooing au bac'], defaultGravity: 2, defaultFrequency: 4, preventiveMeasures: ['Ciseaux ergonomiques', 'Repose-pieds et tapis anti-fatigue', 'Alternance des taches', 'Bac a shampooing reglable en hauteur'], category: 'ergonomique' },
    { id: 'coif-posture', name: 'Postures contraignantes', description: 'Position penchee au bac, bras en elevation', situations: ['Shampooing', 'Coupe precision', 'Coiffage en hauteur'], defaultGravity: 2, defaultFrequency: 4, preventiveMeasures: ['Fauteuil reglable en hauteur', 'Bac basculant ergonomique', 'Pauses regulieres', 'Etirements'], category: 'ergonomique' },
    { id: 'coif-coupure', name: 'Coupures', description: 'Ciseaux, rasoir, lames', situations: ['Coupe', 'Rasage nuque', 'Nettoyage outils'], defaultGravity: 1, defaultFrequency: 3, preventiveMeasures: ['Rangement securise des outils tranchants', 'Kit premiers soins', 'Ciseaux avec butee de securite'], category: 'physique' },
    { id: 'coif-brulure', name: 'Brulures', description: 'Fer a lisser, seche-cheveux professionnel, eau chaude', situations: ['Lissage', 'Brushing haute temperature', 'Eau trop chaude au bac'], defaultGravity: 2, defaultFrequency: 3, preventiveMeasures: ['Gant thermique pour fer', 'Thermometre eau bac', 'Rangement outils chauds sur support dedie'], category: 'thermique' },
    { id: 'coif-dermatose', name: 'Dermatose professionnelle', description: 'Eczema, dermatite de contact (Tableau RG 65)', situations: ['Contact prolonge eau', 'Manipulation produits chimiques', 'Port gants latex'], defaultGravity: 2, defaultFrequency: 3, preventiveMeasures: ['Gants nitrile (pas latex)', 'Creme reparatrice apres le travail', 'Surveillance cutanee reguliere', 'Consultation dermatologue si symptomes'], category: 'chimique' },
    { id: 'coif-psycho', name: 'Charge mentale et relationnelle', description: 'Exigences clients, cadence elevee, travail samedi', situations: ['Periodes de forte affluence', 'Reclamations clients', 'Travail sans coupure'], defaultGravity: 2, defaultFrequency: 3, preventiveMeasures: ['Planning equilibre', 'Pause dejeuner obligatoire', 'Formation gestion du stress', 'Management bienveillant'], category: 'psychosocial' },
    { id: 'coif-electrique-outils', name: 'Risque electrique outils', description: 'Utilisation d\'appareils electriques dans environnement humide', situations: ['Seche-cheveux pres du bac', 'Fer a lisser', 'Prise defectueuse'], defaultGravity: 3, defaultFrequency: 2, preventiveMeasures: ['Verification annuelle appareils', 'Prise terre obligatoire', 'Protection differentielle 30mA', 'Remplacement cordons endommages'], category: 'electrique' },
  ],
};

const COMMERCE: MetierRiskProfile = {
  metierSlug: 'commerce',
  label: 'Commerce de detail',
  category: 'commerce_services',
  nafCodes: ['47'],
  idcc: '2216',
  legalReferences: ['ERP Type M', 'Art. R4541-1 a R4541-11 (manutention)', 'Accord 26/03/2010 (agression)'],
  workUnits: ['Surface de vente', 'Caisse / Accueil', 'Reserve / Stockage', 'Bureau / Administration', 'Livraison / Quai', 'Vitrine / Exterieur'],
  risks: [
    { id: 'com-manutention', name: 'Manutention et port de charges', description: 'Mise en rayon, reception livraisons, rangement reserve', situations: ['Reception marchandises', 'Mise en rayon', 'Inventaire'], defaultGravity: 2, defaultFrequency: 4, preventiveMeasures: ['Transpalette et diable', 'Formation gestes et postures', 'Hauteur de stockage limitee', 'Aide a la manutention'], category: 'manutention' },
    { id: 'com-agression', name: 'Agressions et vols', description: 'Braquage, vol a l\'etalage, incivilites clients', situations: ['Encaissement', 'Fermeture magasin', 'Intervention vol'], defaultGravity: 3, defaultFrequency: 2, preventiveMeasures: ['Video-surveillance', 'Eclairage adequat', 'Procedure anti-braquage', 'Formation desescalade', 'Coffre-fort temporise'], category: 'psychosocial' },
    { id: 'com-tms-caisse', name: 'TMS en caisse', description: 'Gestes repetitifs, station assise prolongee, manipulation produits', situations: ['Scan articles', 'Encaissement', 'Ensachage'], defaultGravity: 2, defaultFrequency: 4, preventiveMeasures: ['Siege ergonomique reglable', 'Tapis de caisse roulant', 'Rotation des postes', 'Pause reguliere'], category: 'ergonomique' },
    { id: 'com-chute-reserve', name: 'Chute en reserve', description: 'Chute d\'objets stockes en hauteur, echelle instable', situations: ['Acces rayon haut', 'Destocker articles', 'Rangement reserve'], defaultGravity: 3, defaultFrequency: 2, preventiveMeasures: ['Escabeau securise', 'Stockage charges lourdes en bas', 'Etageres fixees au mur', 'Rangement ordonne'], category: 'chute_hauteur' },
    { id: 'com-circulation', name: 'Circulation vehicules', description: 'Zone livraison, parking clients', situations: ['Livraison camion', 'Manoeuvre quai', 'Traversee parking'], defaultGravity: 3, defaultFrequency: 2, preventiveMeasures: ['Separation pietons/vehicules', 'Signalisation au sol', 'Gilet haute visibilite', 'Miroirs convexes'], category: 'routier' },
    { id: 'com-stress', name: 'Stress et charge mentale', description: 'Objectifs commerciaux, affluence periodes de fetes', situations: ['Soldes', 'Periodes de Noel', 'Reclamations clients'], defaultGravity: 2, defaultFrequency: 3, preventiveMeasures: ['Renforts saisonniers', 'Formation gestion du stress', 'Management participatif'], category: 'psychosocial' },
    { id: 'com-froid', name: 'Ambiances thermiques', description: 'Travail pres des chambres froides ou en zone non chauffee', situations: ['Mise en rayon frais', 'Travail en chambre froide', 'Quai de reception'], defaultGravity: 2, defaultFrequency: 3, preventiveMeasures: ['Vetements thermiques fournis', 'Limitation du temps en chambre froide', 'Boissons chaudes a disposition'], category: 'thermique' },
    { id: 'com-ergonomie', name: 'Ecran et poste bureautique', description: 'Travail sur ecran en zone caisse ou bureau', situations: ['Gestion stock informatisee', 'Caisse informatique', 'Bureau administratif'], defaultGravity: 1, defaultFrequency: 3, preventiveMeasures: ['Ecran a hauteur des yeux', 'Clavier et souris ergonomiques', 'Pause visuelle toutes les 2h'], category: 'ergonomique' },
  ],
};

const BOULANGERIE: MetierRiskProfile = {
  metierSlug: 'boulangerie',
  label: 'Boulangerie-Patisserie',
  category: 'alimentaire_restauration',
  nafCodes: ['10.71C', '10.71A', '10.71B', '10.71D'],
  idcc: '843',
  legalReferences: ['Tableau RG n° 66 (asthme farine)', 'Decrets ATEX 2002-1553/1554'],
  workUnits: ['Fournil', 'Boutique / Vente', 'Laboratoire patisserie', 'Reserve / Silo a farine', 'Zone livraison', 'Local technique / Nettoyage'],
  risks: [
    { id: 'boul-farine', name: 'Poussieres de farine (asthme)', description: 'Inhalation de poussieres de farine — Tableau RG 66', situations: ['Petrissage', 'Fleurage', 'Vidange silo farine', 'Nettoyage fournil'], defaultGravity: 3, defaultFrequency: 4, preventiveMeasures: ['Masque FFP2 EN 149', 'Aspiration a la source', 'Farine en sac etanche', 'Spirometrie annuelle', 'Humidification de l\'air'], category: 'chimique' },
    { id: 'boul-brulure', name: 'Brulures (four, plaques)', description: 'Contact avec four a 250°C, plaques chaudes, sucre cuit', situations: ['Enfournement', 'Defournement', 'Cuisson sucre', 'Nettoyage four'], defaultGravity: 3, defaultFrequency: 4, preventiveMeasures: ['Gants anti-chaleur EN 407 (250°C min)', 'Pelle a enfourner longue', 'Signalisation four chaud', 'Kit brulure disponible'], category: 'thermique' },
    { id: 'boul-nuit', name: 'Travail de nuit', description: 'Horaires decales (3h-11h), fatigue chronique', situations: ['Production nocturne', 'Preparation avant ouverture', 'Week-ends et jours feries'], defaultGravity: 2, defaultFrequency: 4, preventiveMeasures: ['Visite medicale annuelle nuit', 'Eclairage adapte', 'Sieste de compensation', 'Planning anticipe'], category: 'psychosocial' },
    { id: 'boul-manutention', name: 'Manutention manuelle', description: 'Port de sacs de farine (25kg), bacs de pate, plaques', situations: ['Reception farine', 'Petrissage', 'Transfert pate', 'Stockage'], defaultGravity: 3, defaultFrequency: 4, preventiveMeasures: ['Sacs 10kg maximum', 'Chariot elevateur', 'Basculeur de bacs', 'Formation gestes et postures'], category: 'manutention' },
    { id: 'boul-atex', name: 'Risque ATEX (explosion poussiere)', description: 'Atmospheres explosives dues a la concentration de farine', situations: ['Silo a farine', 'Zone petrissage', 'Nettoyage a sec'], defaultGravity: 4, defaultFrequency: 1, preventiveMeasures: ['Zonage ATEX du fournil', 'Ventilation anti-deflagrante', 'Materiel electrique ATEX', 'Interdiction flamme nue en zone ATEX'], category: 'atmospheres_explosives' },
    { id: 'boul-machines', name: 'Machines (petrin, diviseuse, laminoir)', description: 'Risque de happement, ecrasement, coupure', situations: ['Petrissage', 'Division', 'Laminage'], defaultGravity: 3, defaultFrequency: 3, preventiveMeasures: ['Carter de protection sur chaque machine', 'Arret d\'urgence accessible', 'Formation utilisation machines', 'Maintenance preventive'], category: 'machines' },
    { id: 'boul-sol', name: 'Sol glissant', description: 'Sol du fournil gras ou recouvert de farine', situations: ['Nettoyage', 'Production', 'Deplacement'], defaultGravity: 2, defaultFrequency: 3, preventiveMeasures: ['Chaussures antiderapantes', 'Nettoyage regulier', 'Revetement sol antiderapant'], category: 'chute_plain_pied' },
    { id: 'boul-chaleur', name: 'Ambiances chaudes', description: 'Temperature elevee pres du four (> 35°C)', situations: ['Enfournement', 'Production estivale', 'Defournement serie'], defaultGravity: 2, defaultFrequency: 4, preventiveMeasures: ['Ventilation / extraction fournil', 'Eau fraiche a disposition', 'Pause chaleur', 'Vetements legers de travail'], category: 'thermique' },
  ],
};

const GARAGE: MetierRiskProfile = {
  metierSlug: 'garage-auto',
  label: 'Garage automobile',
  category: 'commerce_services',
  nafCodes: ['45.20A', '45.20B'],
  idcc: '1090',
  legalReferences: ['Art. R4412-1 a R4412-93 (CMR)', 'Art. R4323-22 a R4323-35 (levage)', 'NF C 18-550'],
  workUnits: ['Atelier mecanique', 'Carrosserie-peinture', 'Reception / accueil', 'Magasin pieces', 'Parking / aire lavage', 'Bureau / administration'],
  risks: [
    { id: 'gar-chimique', name: 'Agents chimiques CMR', description: 'Huiles usagees, liquide de frein, solvants, gaz d\'echappement', situations: ['Vidange', 'Freinage', 'Nettoyage pieces', 'Demarrage moteur en atelier'], defaultGravity: 3, defaultFrequency: 4, preventiveMeasures: ['Extraction gaz echappement a la source', 'Gants nitrile EN 374', 'FDS affichees', 'Bidons de recuperation huiles'], category: 'chimique' },
    { id: 'gar-ecrasement', name: 'Ecrasement sous vehicule', description: 'Chute de vehicule depuis pont ou cric', situations: ['Travail sous vehicule', 'Levage sur pont', 'Utilisation cric'], defaultGravity: 4, defaultFrequency: 2, preventiveMeasures: ['Pont elevateur controle annuellement', 'Chandelles de securite obligatoires', 'Interdiction cric seul', 'Formation utilisation pont'], category: 'machines' },
    { id: 'gar-bruit', name: 'Bruit', description: 'Outils pneumatiques, disqueuse, compresseur', situations: ['Deboulonnage pneumatique', 'Meulage', 'Compresseur en marche'], defaultGravity: 2, defaultFrequency: 4, preventiveMeasures: ['Protections auditives EN 352', 'Encoffrement compresseur', 'Outils electriques moins bruyants'], category: 'bruit' },
    { id: 'gar-electrique-veh', name: 'Risque electrique vehicules', description: 'Intervention sur vehicules electriques/hybrides haute tension', situations: ['Maintenance batterie HT', 'Depannage hybride', 'Diagnostic HT'], defaultGravity: 4, defaultFrequency: 2, preventiveMeasures: ['Habilitation HT vehicules NF C 18-550', 'EPI isolants specifiques', 'Consignation obligatoire', 'Zone balisee HT'], category: 'electrique' },
    { id: 'gar-manutention', name: 'Manutention manuelle', description: 'Port de pieces lourdes (roues, moteurs, boites de vitesse)', situations: ['Changement roues', 'Depose moteur', 'Reception pieces'], defaultGravity: 3, defaultFrequency: 3, preventiveMeasures: ['Cric rouleur pour roues', 'Potence pour moteurs lourds', 'Formation gestes et postures'], category: 'manutention' },
    { id: 'gar-peinture', name: 'Risque peinture isocyanates', description: 'Pulverisation peintures polyurethane en cabine', situations: ['Peinture carrosserie', 'Vernis', 'Appret'], defaultGravity: 3, defaultFrequency: 3, preventiveMeasures: ['Cabine ventilee conforme', 'Masque a cartouche A2P3', 'Combinaison jetable', 'Surveillance biologique'], category: 'chimique' },
    { id: 'gar-postures', name: 'Postures contraignantes', description: 'Position sous vehicule, acces difficile compartiment moteur', situations: ['Mecanique sous capot', 'Travail sous caisse', 'Depannage exterieur'], defaultGravity: 2, defaultFrequency: 4, preventiveMeasures: ['Tabouret roulant atelier', 'Pont a hauteur reglable', 'Alternance des taches'], category: 'ergonomique' },
    { id: 'gar-incendie-atelier', name: 'Incendie atelier', description: 'Produits inflammables, etincelles, vehicules GPL/GNV', situations: ['Soudure', 'Meulage pres carburant', 'Stockage huiles'], defaultGravity: 4, defaultFrequency: 1, preventiveMeasures: ['Extincteurs CO2 et poudre', 'Armoire anti-feu pour produits', 'Interdiction flamme nue en zone stockage', 'Detecteur GPL'], category: 'incendie' },
  ],
};

const AIDE_DOMICILE: MetierRiskProfile = {
  metierSlug: 'aide-domicile',
  label: 'Aide a domicile',
  category: 'sante_social',
  nafCodes: ['88.10A', '88.10B', '88.10C'],
  idcc: '2941',
  legalReferences: ['CCN BAD IDCC 2941', 'Recommandation CNAM R497'],
  workUnits: ['Domicile personne agee', 'Domicile handicap', 'Trajet entre beneficiaires', 'Bureau administratif', 'Vehicule de service', 'Entretien menager'],
  risks: [
    { id: 'ad-manutention', name: 'Manutention de personnes', description: 'Aide au lever/coucher, transfert lit-fauteuil, toilette', situations: ['Lever/coucher beneficiaire', 'Aide a la toilette', 'Transfert'], defaultGravity: 3, defaultFrequency: 4, preventiveMeasures: ['Leve-personne si necessaire', 'Formation PRAP', 'Evaluation charge beneficiaire', 'Materiel adapte au domicile'], category: 'manutention' },
    { id: 'ad-routier', name: 'Risque routier trajet', description: 'Deplacements frequents entre domiciles, fatigue au volant', situations: ['Trajets inter-beneficiaires', 'Conditions meteo', 'Planning serre'], defaultGravity: 3, defaultFrequency: 4, preventiveMeasures: ['Vehicule entretenu', 'Planning avec temps de trajet', 'Pas de conduite sous fatigue', 'Indemnites kilometriques'], category: 'routier' },
    { id: 'ad-psycho', name: 'Risques psychosociaux', description: 'Isolement, charge emotionnelle, deces beneficiaire', situations: ['Travail isole', 'Fin de vie', 'Comportement agressif beneficiaire'], defaultGravity: 3, defaultFrequency: 3, preventiveMeasures: ['Groupes de parole', 'Soutien psychologique', 'Entretien regulier avec responsable secteur', 'Formation gestion des situations difficiles'], category: 'psychosocial' },
    { id: 'ad-biologique', name: 'Risque biologique', description: 'Contact avec fluides corporels, maladies contagieuses', situations: ['Aide a la toilette', 'Soins', 'Contact personne malade'], defaultGravity: 2, defaultFrequency: 3, preventiveMeasures: ['Gants a usage unique', 'Gel hydroalcoolique', 'Vaccination a jour', 'Formation hygiene'], category: 'biologique' },
    { id: 'ad-chimique-menage', name: 'Produits menagers', description: 'Utilisation de produits de nettoyage au domicile', situations: ['Menage', 'Desinfection', 'Lessive'], defaultGravity: 2, defaultFrequency: 3, preventiveMeasures: ['Produits fournis par l\'employeur', 'Gants de menage', 'Aeration pendant le menage', 'Formation aux FDS'], category: 'chimique' },
    { id: 'ad-chute-domicile', name: 'Chute au domicile', description: 'Encombrement, tapis, animaux domestiques, escaliers', situations: ['Menage', 'Deplacement dans le domicile', 'Escaliers'], defaultGravity: 2, defaultFrequency: 3, preventiveMeasures: ['Evaluation des risques au domicile', 'Chaussures fermees antiderapantes', 'Signalement des dangers', 'Eclairage suffisant'], category: 'chute_plain_pied' },
    { id: 'ad-agression', name: 'Agressions', description: 'Comportement agressif du beneficiaire ou de l\'entourage', situations: ['Beneficiaire desoriente', 'Conflit familial', 'Quartier difficile'], defaultGravity: 3, defaultFrequency: 2, preventiveMeasures: ['Formation desescalade', 'Telephone charge en permanence', 'Procedure d\'alerte', 'Accompagnement premiere visite'], category: 'psychosocial' },
    { id: 'ad-tms', name: 'TMS menage', description: 'Gestes repetitifs de menage, aspirateur, repassage', situations: ['Aspirateur', 'Repassage', 'Nettoyage sols'], defaultGravity: 2, defaultFrequency: 4, preventiveMeasures: ['Materiel ergonomique', 'Rotation des taches', 'Pause reguliere', 'Hauteur plan de travail adaptee'], category: 'ergonomique' },
  ],
};

const BUREAU_TERTIAIRE: MetierRiskProfile = {
  metierSlug: 'bureau',
  label: 'Bureau / Tertiaire',
  category: 'tertiaire_bureau',
  nafCodes: ['62', '63', '69', '70', '71'],
  legalReferences: ['Art. R4542-1 a R4542-19 (ecrans)', 'NF EN 12464-1 (eclairage)'],
  workUnits: ['Bureau / poste de travail', 'Salle de reunion', 'Accueil / reception', 'Archives / stockage'],
  risks: [
    { id: 'bur-ecran', name: 'Travail sur ecran', description: 'Fatigue visuelle, TMS du membre superieur', situations: ['Travail prolonge sur ordinateur', 'Mauvaise ergonomie du poste'], defaultGravity: 2, defaultFrequency: 4, preventiveMeasures: ['Ecran a hauteur des yeux', 'Pause visuelle 20/20/20', 'Clavier et souris ergonomiques', 'Eclairage adapte 500 lux'], category: 'ergonomique' },
    { id: 'bur-sedentarite', name: 'Sedentarite', description: 'Position assise prolongee, risques cardiovasculaires', situations: ['Journee complete en bureau', 'Reunions longues'], defaultGravity: 2, defaultFrequency: 4, preventiveMeasures: ['Bureau assis-debout', 'Pauses actives toutes les 2h', 'Encourager la marche', 'Salle de sport ou partenariat'], category: 'ergonomique' },
    { id: 'bur-stress', name: 'Stress et charge mentale', description: 'Deadlines, surcharge informationnelle, open space', situations: ['Delais serres', 'Multi-taches', 'Interruptions frequentes'], defaultGravity: 2, defaultFrequency: 3, preventiveMeasures: ['Droit a la deconnexion', 'Gestion des priorites', 'Espaces calmes', 'Teletravail'], category: 'psychosocial' },
    { id: 'bur-qualite-air', name: 'Qualite de l\'air interieur', description: 'Climatisation, ventilation insuffisante, CO2', situations: ['Salle de reunion fermee', 'Climatisation mal entretenue'], defaultGravity: 1, defaultFrequency: 3, preventiveMeasures: ['Entretien climatisation annuel', 'Aeration quotidienne', 'Plantes depolluantes', 'Capteur CO2'], category: 'biologique' },
    { id: 'bur-harcelement', name: 'Harcelement', description: 'Harcelement moral ou sexuel', situations: ['Relations hierarchiques', 'Open space', 'Isolement'], defaultGravity: 3, defaultFrequency: 1, preventiveMeasures: ['Referent harcelement designe', 'Charte de bonne conduite', 'Procedure de signalement', 'Sensibilisation annuelle'], category: 'psychosocial' },
    { id: 'bur-tms-siege', name: 'TMS posture assise', description: 'Douleurs dorsales, cervicales liees a la position assise', situations: ['Siege non regle', 'Ecran trop bas/haut', 'Bureau encombre'], defaultGravity: 2, defaultFrequency: 4, preventiveMeasures: ['Siege reglable avec soutien lombaire', 'Formation ergonomie poste', 'Evaluation annuelle postes de travail'], category: 'ergonomique' },
    { id: 'bur-electrique-info', name: 'Risque electrique informatique', description: 'Multiprises surchargees, cables au sol', situations: ['Branchement de peripheriques', 'Cables sous les bureaux'], defaultGravity: 2, defaultFrequency: 2, preventiveMeasures: ['Goulotte passe-cables', 'Multiprises avec protection', 'Verification electrique annuelle'], category: 'electrique' },
    { id: 'bur-isolement-teletravail', name: 'Isolement en teletravail', description: 'Perte de lien social, difficulte a deconnecter', situations: ['Teletravail 100%', 'Equipes distribuees'], defaultGravity: 2, defaultFrequency: 3, preventiveMeasures: ['Maximum 3j teletravail/semaine', 'Reunions d\'equipe regulieres', 'Outils collaboratifs', 'Droit a la deconnexion'], category: 'psychosocial' },
  ],
};

// ── Registre complet des metiers ────────────────────────────────────

export const METIER_RISK_DATABASE: MetierRiskProfile[] = [
  BTP_GENERAL,
  RESTAURANT,
  COIFFURE,
  COMMERCE,
  BOULANGERIE,
  GARAGE,
  AIDE_DOMICILE,
  BUREAU_TERTIAIRE,
];

// ── Lookup functions ────────────────────────────────────────────────

export function findMetierByNaf(nafCode: string): MetierRiskProfile | undefined {
  // Exact match
  const exact = METIER_RISK_DATABASE.find((m) => m.nafCodes.includes(nafCode));
  if (exact) return exact;

  // Prefix match (e.g., '43.22A' → '43')
  const prefix2 = nafCode.slice(0, 2);
  return METIER_RISK_DATABASE.find((m) =>
    m.nafCodes.some((code) => code === prefix2 || nafCode.startsWith(code)),
  );
}

export function findMetierBySlug(slug: string): MetierRiskProfile | undefined {
  return METIER_RISK_DATABASE.find((m) => m.metierSlug === slug);
}

export function getRisksForMetier(metierSlug: string): MetierRisk[] {
  const profile = findMetierBySlug(metierSlug);
  if (!profile) return [...UNIVERSAL_RISKS];
  return [...profile.risks, ...UNIVERSAL_RISKS];
}

export function getRisksForNaf(nafCode: string): MetierRisk[] {
  const profile = findMetierByNaf(nafCode);
  if (!profile) return [...UNIVERSAL_RISKS];
  return [...profile.risks, ...UNIVERSAL_RISKS];
}

// ── Matrice 4x4 conforme ────────────────────────────────────────────

// BUSINESS RULE [CDC-2.4]: Matrice gravite x frequence conforme
export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

export function calculateRiskScore(gravity: number, frequency: number): number {
  return gravity * frequency;
}

export function getRiskLevel(score: number): RiskLevel {
  if (score <= 4) return 'low';       // Vert
  if (score <= 8) return 'medium';    // Jaune
  if (score <= 12) return 'high';     // Orange
  return 'critical';                   // Rouge
}

export function getRiskLevelLabel(level: RiskLevel): string {
  switch (level) {
    case 'low': return 'Faible';
    case 'medium': return 'Moyen';
    case 'high': return 'Eleve';
    case 'critical': return 'Critique';
  }
}

export function getRiskColor(level: RiskLevel): string {
  switch (level) {
    case 'low': return '#22c55e';      // green-500
    case 'medium': return '#eab308';   // yellow-500
    case 'high': return '#f97316';     // orange-500
    case 'critical': return '#ef4444'; // red-500
  }
}
