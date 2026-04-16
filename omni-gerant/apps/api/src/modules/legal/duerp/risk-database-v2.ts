// BUSINESS RULE [CDC-2.4]: Base de risques V2 — metiers specifiques
// Source de reference : duerp-en-direct.fr, INRS, d-u-e-r-p.fr
// Chaque risque est rattache a son unite de travail avec mesures existantes ET proposees

export interface MetierRiskProfile {
  metierSlug: string;
  label: string;
  category: MetierCategory;
  nafCodes: string[];
  idcc?: string;
  legalReferences: string[];
  risks: MetierRisk[];
  workUnits: WorkUnitDef[];
}

export interface WorkUnitDef {
  id: string;
  name: string;
  description: string;
  typicalHeadcount: string;
}

// BUSINESS RULE [CDC-2.4]: Interface legacy (compatibilite ascendante)
export interface MetierRisk {
  id: string;
  name: string;
  description: string;
  workUnitId: string;
  situations: string[];
  defaultGravity: 1 | 2 | 3 | 4;
  defaultFrequency: 1 | 2 | 3 | 4;
  existingMeasures: string[];
  proposedActions: string[];
  category: RiskCategory;
}

// BUSINESS RULE [CDC-2.4]: Interface enrichie E0 — DetailedRisk
// Ajoute : consequences sante, risque residuel, lien tableaux MP, mesures hierarchisees L4121-2
export interface DetailedRisk extends MetierRisk {
  healthConsequences: string[];
  riskScore: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  associatedWorkUnitIds: string[];
  preventionMeasures: DetailedPreventionMeasure[];
  residualGravity?: 1 | 2 | 3 | 4;
  residualFrequency?: 1 | 2 | 3 | 4;
  residualRiskLevel?: 'low' | 'medium' | 'high' | 'critical';
  occupationalDiseaseTableIds?: string[];
  legalReferences?: string[];
}

// BUSINESS RULE [CDC-2.4]: Mesures de prevention hierarchisees selon les 9 principes L4121-2
export interface DetailedPreventionMeasure {
  id: string;
  description: string;
  principleLevel: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
  // 1=Eviter 2=Evaluer 3=Source 4=Adapter 5=Technique 6=Substituer 7=Planifier 8=Collectif 9=Instructions
  principleDescription: string;
  type: 'organizational' | 'technical' | 'human' | 'ppe';
  priority: 'immediate' | 'short_term' | 'medium_term';
  estimatedCostCents?: number;
  responsibleRole?: string;
  frequency?: string;
  verificationMethod?: string;
}

// BUSINESS RULE [CDC-2.4]: Labels des 9 principes generaux de prevention (Art. L4121-2)
export const PREVENTION_PRINCIPLES: Record<number, string> = {
  1: 'Eviter les risques',
  2: 'Evaluer les risques qui ne peuvent etre evites',
  3: 'Combattre les risques a la source',
  4: 'Adapter le travail a l\'homme',
  5: 'Tenir compte de l\'evolution de la technique',
  6: 'Remplacer ce qui est dangereux par ce qui l\'est moins',
  7: 'Planifier la prevention',
  8: 'Donner la priorite aux mesures de protection collective',
  9: 'Donner les instructions appropriees aux travailleurs',
};

// Helper: convert MetierRisk to DetailedRisk
export function toDetailedRisk(risk: MetierRisk, workUnits: WorkUnitDef[]): DetailedRisk {
  const score = risk.defaultGravity * risk.defaultFrequency;
  const level = score <= 4 ? 'low' : score <= 8 ? 'medium' : score <= 12 ? 'high' : 'critical';
  return {
    ...risk,
    healthConsequences: [],
    riskScore: score,
    riskLevel: level as 'low' | 'medium' | 'high' | 'critical',
    associatedWorkUnitIds: risk.workUnitId === '*' ? workUnits.map((wu) => wu.id) : [risk.workUnitId],
    preventionMeasures: risk.existingMeasures.map((m, i) => ({
      id: `${risk.id}-pm-${i}`,
      description: m,
      principleLevel: 9 as const,
      principleDescription: PREVENTION_PRINCIPLES[9]!,
      type: 'organizational' as const,
      priority: 'short_term' as const,
    })),
  };
}

export type MetierCategory =
  | 'agriculture' | 'sante_social' | 'services_divers' | 'tertiaire_bureau'
  | 'alimentaire_restauration' | 'btp_construction' | 'commerce_services'
  | 'beaute_bien_etre' | 'education_formation' | 'hotellerie_hebergement'
  | 'industrie_production' | 'transport_logistique' | 'proprete_environnement'
  | 'securite_gardiennage' | 'sport_loisirs';

export type RiskCategory =
  | 'physique' | 'chimique' | 'biologique' | 'ergonomique' | 'psychosocial'
  | 'routier' | 'electrique' | 'incendie' | 'chute_hauteur' | 'chute_plain_pied'
  | 'manutention' | 'machines' | 'thermique' | 'bruit' | 'vibrations'
  | 'rayonnement' | 'atmospheres_explosives';

// ── 6 risques universels (toutes UT, tous metiers) ──────────────────

export const UNIVERSAL_RISKS: MetierRisk[] = [
  { id: 'univ-routier', name: 'Risque routier', description: 'Accidents lors des deplacements professionnels', workUnitId: '*', situations: ['Trajets domicile-travail', 'Deplacements entre sites', 'Livraisons', 'Conditions meteo degradees'], defaultGravity: 3, defaultFrequency: 2, existingMeasures: ['Vehicules entretenus', 'Interdiction telephone au volant'], proposedActions: ['Formation conduite preventive', 'Planning avec temps de trajet', 'Verification mensuelle pneus', 'Politique telephone au volant affichee'], category: 'routier' },
  { id: 'univ-psychosocial', name: 'Risques psychosociaux', description: 'Stress, charge mentale, harcelement, violences', workUnitId: '*', situations: ['Surcharge de travail', 'Conflits interpersonnels', 'Manque de reconnaissance', 'Isolement', 'Horaires atypiques'], defaultGravity: 2, defaultFrequency: 2, existingMeasures: ['Entretiens individuels', 'Droit a la deconnexion'], proposedActions: ['Referent harcelement designe', 'Groupes de parole trimestriels', 'Formation management bienveillant', 'Procedure signalement affichee'], category: 'psychosocial' },
  { id: 'univ-biologique', name: 'Risque biologique', description: 'Exposition a des agents biologiques (virus, bacteries)', workUnitId: '*', situations: ['Contact avec le public', 'Epidemies saisonnieres', 'Surfaces contaminees'], defaultGravity: 2, defaultFrequency: 2, existingMeasures: ['Gel hydroalcoolique disponible', 'Nettoyage des surfaces'], proposedActions: ['Campagne vaccination grippe', 'Aeration renforcee 10 min/2h', 'Protocole retour maladie contagieuse'], category: 'biologique' },
  { id: 'univ-incendie', name: 'Risque incendie', description: 'Depart de feu dans les locaux professionnels', workUnitId: '*', situations: ['Stockage produits inflammables', 'Installations electriques defectueuses', 'Imprudence'], defaultGravity: 4, defaultFrequency: 1, existingMeasures: ['Extincteurs verifies annuellement', 'Consignes evacuation affichees'], proposedActions: ['Exercice evacuation annuel', 'Formation equipier premiere intervention (2 personnes)', 'Registre securite a jour', 'Detection incendie verifiee trimestriellement'], category: 'incendie' },
  { id: 'univ-chute-plain-pied', name: 'Chute de plain-pied', description: 'Glissade, trebuchement sur sol mouille ou encombre', workUnitId: '*', situations: ['Sol mouille', 'Cables au sol', 'Encombrement passages', 'Eclairage insuffisant', 'Marches usees'], defaultGravity: 2, defaultFrequency: 3, existingMeasures: ['Eclairage zones de circulation', 'Chaussures fermees'], proposedActions: ['Sol antiderapant dans zones humides', 'Rangement continu des passages', 'Signalisation sols mouilles immediate', 'Remplacement eclairage defaillant sous 48h'], category: 'chute_plain_pied' },
  { id: 'univ-electrique', name: 'Risque electrique', description: 'Contact avec installations electriques defectueuses', workUnitId: '*', situations: ['Prises defectueuses', 'Cables endommages', 'Multiprises surchargees', 'Intervention non habilitee'], defaultGravity: 3, defaultFrequency: 1, existingMeasures: ['Protection differentielle 30mA', 'Signalisation armoires electriques'], proposedActions: ['Verification electrique annuelle (decret)', 'Interdiction multiprises en cascade', 'Goulotte passe-cables', 'Remplacement cordons endommages sous 24h'], category: 'electrique' },
];

// ═══════════════════════════════════════════════════════════════════
// ELECTRICIEN BATIMENT (43.21A)
// Source : duerp-en-direct.fr — 12 risques, 9 UT
// ═══════════════════════════════════════════════════════════════════

const ELECTRICIEN: MetierRiskProfile = {
  metierSlug: 'electricien',
  label: 'Electricien batiment',
  category: 'btp_construction',
  nafCodes: ['43.21A', '43.21B'],
  idcc: '1597',
  legalReferences: ['NF C 18-510 (habilitation electrique)', 'Arrete 26/04/2012', 'Art. R4544-1 a R4544-11', 'Directive ATEX 1999/92/CE'],
  workUnits: [
    { id: 'elec-prefab', name: 'Preparation / prefabrication atelier', description: 'Debit, cintrage, assemblage de chemins de cables et coffrets en atelier', typicalHeadcount: '1-3' },
    { id: 'elec-percage', name: 'Pose cheminements / percage / scellement', description: 'Percage beton, fixation chemins de cables, scellements chimiques', typicalHeadcount: '2-4' },
    { id: 'elec-tirage', name: 'Tirage cables / gaines', description: 'Passage et tirage de cables dans gaines et chemins de cables', typicalHeadcount: '2-4' },
    { id: 'elec-tableaux', name: 'Tableaux / coffrets / raccordements', description: 'Cablage, raccordement de tableaux electriques et coffrets', typicalHeadcount: '1-2' },
    { id: 'elec-essais', name: 'Essais / mise sous tension', description: 'Tests d\'isolement, mise en service, verification sous tension', typicalHeadcount: '1-2' },
    { id: 'elec-hauteur', name: 'Travail en hauteur (escabeaux, PIRL)', description: 'Interventions en hauteur sur escabeaux, plates-formes, nacelles', typicalHeadcount: '1-2' },
    { id: 'elec-coactivite', name: 'Coactivite chantier', description: 'Travail simultanement avec d\'autres corps de metier sur chantier', typicalHeadcount: '2-6' },
    { id: 'elec-conduite', name: 'Conduite / logistique', description: 'Deplacements vehicule, livraison materiel, approvisionnement chantier', typicalHeadcount: '1-2' },
    { id: 'elec-atelier', name: 'Atelier', description: 'Travaux de preparation, stockage outillage et materiel', typicalHeadcount: '1-2' },
  ],
  risks: [
    { id: 'elec-contact', name: 'Contact electrique direct/indirect', description: 'Electrisation ou electrocution lors de travaux sur tableaux ou raccordements', workUnitId: 'elec-tableaux', situations: ['Raccordement sous tension residuelle', 'Absence de consignation', 'Defaut isolement', 'Remise sous tension intempestive'], defaultGravity: 4, defaultFrequency: 3, existingMeasures: ['Habilitations electriques a jour', 'Procedure de consignation ecrite', 'VAT (verificateur d\'absence de tension)'], proposedActions: ['Kit de consignation complet par equipe', 'Audits de competences annuels', 'Schemas a jour sur chaque chantier', 'Cadenas de consignation individuels'], category: 'electrique' },
    { id: 'elec-arc', name: 'Arc electrique / brulures', description: 'Flash thermique lors de court-circuit ou mise sous tension', workUnitId: 'elec-essais', situations: ['Mise sous tension d\'un tableau', 'Court-circuit lors des essais', 'Serrage insuffisant d\'une borne'], defaultGravity: 4, defaultFrequency: 3, existingMeasures: ['Ecran facial', 'Gants isolants', 'Procedure d\'essai', 'Balisage zone'], proposedActions: ['EPI adaptes au niveau de tension (classe)', 'Outillage isole 1000V complet', 'Checklist pre-mise sous tension', 'Formation arc flash'], category: 'electrique' },
    { id: 'elec-poussieres', name: 'Inhalation poussieres (silice, platre)', description: 'Poussieres de beton et platre lors du percage et scellement', workUnitId: 'elec-percage', situations: ['Percage beton sans aspiration', 'Saignees dans murs platre', 'Scellement chimique en milieu confine'], defaultGravity: 3, defaultFrequency: 3, existingMeasures: ['Masques P2', 'Perforateur avec aspiration (quand disponible)'], proposedActions: ['Masques P3 obligatoires en interieur', 'Aspiration a la source couplee au perforateur', 'Ventilation 15 min apres travaux en local ferme', 'Suivi spirometrie si exposition reguliere'], category: 'chimique' },
    { id: 'elec-chaleur', name: 'Fortes chaleurs / deshydratation', description: 'Travail en combles, faux-plafonds ou chantiers non ventiles en ete', workUnitId: 'elec-coactivite', situations: ['Travail en combles non ventiles', 'Chantiers ete > 33°C', 'Faux-plafonds exigus'], defaultGravity: 4, defaultFrequency: 3, existingMeasures: ['Eau fraiche a disposition', 'Information equipe', 'Ventilation quand possible'], proposedActions: ['Plan canicule formalise', 'Identification des taches a forte exposition', 'Amenagement horaires (debut 6h en ete)', 'Suivi des episodes et mesures appliquees'], category: 'thermique' },
    { id: 'elec-chute-hauteur', name: 'Chute de hauteur', description: 'Chute depuis escabeau, PIRL, echelle ou nacelle', workUnitId: 'elec-hauteur', situations: ['Escabeau instable', 'PIRL mal positionne', 'Acces toiture sans protection', 'Travail en tremie'], defaultGravity: 3, defaultFrequency: 2, existingMeasures: ['Escabeaux conformes', 'Longe outil', 'Regle des 3 points d\'appui'], proposedActions: ['Plates-formes mobiles plutot qu\'escabeaux', 'Verification trimestrielle du materiel', 'Formation travail en hauteur recyclage 3 ans', 'Garde-corps perimetriques si > 1m'], category: 'chute_hauteur' },
    { id: 'elec-tms', name: 'TMS / gestes repetitifs', description: 'Troubles musculosquelettiques lies au tirage de cables et postures', workUnitId: 'elec-tirage', situations: ['Tirage cables en position bras leves', 'Postures contraignantes en vide sanitaire', 'Travail au sol prolonge', 'Prefabrication repetitive'], defaultGravity: 2, defaultFrequency: 3, existingMeasures: ['Tabourets reglables en atelier', 'Rotation des taches encouragee'], proposedActions: ['Alterner prefab atelier et pose chantier', 'Outils ergonomiques (derouleuse electrique)', 'Depistage TMS annuel', 'Pauses actives toutes les 2h'], category: 'ergonomique' },
    { id: 'elec-heurt', name: 'Heurt par engins / chute d\'objets', description: 'Collision avec engins de chantier ou chute de materiaux en zone coactivite', workUnitId: 'elec-coactivite', situations: ['Manoeuvre d\'engins a proximite', 'Chute d\'objets depuis echafaudage au-dessus', 'Travail sous pont roulant'], defaultGravity: 3, defaultFrequency: 2, existingMeasures: ['Casque chantier', 'Gilet haute visibilite', 'Plan de prevention', 'Balisage zone'], proposedActions: ['Coordination quotidienne avec autres corps de metier', 'Filets anti-chute sous zones de travail en hauteur', 'Zones d\'exclusion sous levage', 'Briefing securite debut de journee'], category: 'physique' },
    { id: 'elec-coupures', name: 'Coupures et projections', description: 'Blessures lors du denudage de cables, percage de coffrets, meulage', workUnitId: 'elec-prefab', situations: ['Denudage cables au cutter', 'Percage coffrets metalliques', 'Meulage chemins de cables', 'Eclats de beton au percage'], defaultGravity: 3, defaultFrequency: 3, existingMeasures: ['Lunettes de protection', 'Gants de travail', 'Outils isoles'], proposedActions: ['Inspection quotidienne de l\'outillage', 'Aspirateur d\'atelier', 'Affichage obligatoire EPI par poste', 'Denudeurs mecaniques plutot que cutters'], category: 'physique' },
    { id: 'elec-rps', name: 'Risques psychosociaux', description: 'Stress lie aux urgences, delais serres, pression client', workUnitId: 'elec-coactivite', situations: ['Delais chantier comprimes', 'Urgences depannage', 'Tensions avec autres corps de metier', 'Travail isole'], defaultGravity: 2, defaultFrequency: 3, existingMeasures: ['Objectifs clarifies', 'Rituels d\'equipe', 'Canal d\'escalade'], proposedActions: ['Documenter 3 scenarios RPS + mesures', 'Former les chefs d\'equipe', 'Revue mensuelle des irritants', 'Procedure travailleur isole'], category: 'psychosocial' },
    { id: 'elec-routier', name: 'Risque routier', description: 'Accidents vehicule lors des deplacements inter-chantiers et livraisons', workUnitId: 'elec-conduite', situations: ['Trajet inter-chantiers quotidien', 'Chargement vehicule instable', 'Fatigue fin de journee'], defaultGravity: 3, defaultFrequency: 2, existingMeasures: ['Interdiction telephone au volant', 'Entretien flotte'], proposedActions: ['Planning avec temps de trajet tampon', 'Verification pression pneus mensuelle', 'Arrimage materiel dans vehicule', 'Formation eco-conduite'], category: 'routier' },
    { id: 'elec-chute-objets', name: 'Chute d\'objets / cables au sol', description: 'Trebuchement sur cables, chute d\'outillage depuis echelle', workUnitId: 'elec-tirage', situations: ['Cables au sol en cours de tirage', 'Outils en hauteur non attaches', 'Deblais de percage au sol'], defaultGravity: 3, defaultFrequency: 3, existingMeasures: ['Chaussures de securite', 'Casque chantier'], proposedActions: ['Rangement continu cables/deblais', 'Pochettes outils ceinture', 'Briefing quotidien risques du jour', 'Balisage zones de tirage'], category: 'chute_plain_pied' },
    { id: 'elec-bruit', name: 'Bruit', description: 'Exposition au bruit lors du percage beton et travaux en coactivite', workUnitId: 'elec-percage', situations: ['Perforateur > 90 dB(A)', 'Rainureuse', 'Coactivite avec meulage/demolition'], defaultGravity: 2, defaultFrequency: 3, existingMeasures: ['Bouchons d\'oreilles fournis'], proposedActions: ['Casque anti-bruit EN 352 obligatoire au percage', 'Limitation duree exposition continue (2h max)', 'Perforateurs basse vibration', 'Audiogramme annuel si exposition reguliere'], category: 'bruit' },
  ],
};

// ═══════════════════════════════════════════════════════════════════
// RESTAURANT TRADITIONNEL (56.10A)
// Source : duerp-en-direct.fr — 9 risques, 8 UT
// ═══════════════════════════════════════════════════════════════════

const RESTAURANT: MetierRiskProfile = {
  metierSlug: 'restaurant',
  label: 'Restaurant traditionnel',
  category: 'alimentaire_restauration',
  nafCodes: ['56.10', '56.10A', '56.10B'],
  idcc: '1979',
  legalReferences: ['CCN HCR 30/04/1997', 'Reglement CE 852/2004 (HACCP)', 'Code construction ERP Type N', 'Art. R4228-20 (boissons alcoolisees)'],
  workUnits: [
    { id: 'rest-cuisine', name: 'Cuisine chaude (fourneaux, four, plancha)', description: 'Zone de cuisson des aliments, fours, friteuses, pianos', typicalHeadcount: '2-6' },
    { id: 'rest-decoupe', name: 'Preparation / decoupe (couteaux)', description: 'Poste de decoupe viandes, legumes, tranchage', typicalHeadcount: '1-3' },
    { id: 'rest-plonge', name: 'Plonge / nettoyage', description: 'Zone de lavage vaisselle, nettoyage des equipements de cuisine', typicalHeadcount: '1-2' },
    { id: 'rest-salle', name: 'Service en salle / bar', description: 'Salle de restaurant, bar, service des clients', typicalHeadcount: '2-6' },
    { id: 'rest-cave', name: 'Cave / chambre froide / reserve', description: 'Stockage denrees, chambres froides positives et negatives, cave', typicalHeadcount: '1-2' },
    { id: 'rest-reception', name: 'Reception marchandises', description: 'Zone de livraison et reception des fournisseurs', typicalHeadcount: '1' },
    { id: 'rest-bureau', name: 'Bureau / administratif', description: 'Gestion administrative, comptabilite, plannings', typicalHeadcount: '1' },
    { id: 'rest-toutes', name: 'Toutes unites', description: 'Risques transversaux a l\'ensemble de l\'etablissement', typicalHeadcount: '-' },
  ],
  risks: [
    { id: 'rest-brulure', name: 'Brulures / eclaboussures / vapeur', description: 'Contact avec surfaces chaudes, projections d\'huile bouillante, vapeur', workUnitId: 'rest-cuisine', situations: ['Manipulation plaques et grilles de four', 'Projections friteuse', 'Ouverture cocotte/four vapeur', 'Flambage au piano'], defaultGravity: 4, defaultFrequency: 3, existingMeasures: ['Gants thermiques EN 407', 'Couvercle friteuse', 'Manches longues coton', 'Signalisation surfaces chaudes'], proposedActions: ['Verification joints et fermetures des equipements', 'Formation premiers secours brulure', 'Thermometres sur postes critiques', 'Kit brulure accessible en 30 secondes'], category: 'thermique' },
    { id: 'rest-coupure', name: 'Coupures (couteaux, trancheur)', description: 'Laceration par couteaux, trancheuse a jambon, ouvre-boites', workUnitId: 'rest-decoupe', situations: ['Decoupe viandes/legumes', 'Nettoyage trancheuse', 'Ouverture conserves', 'Couteau mal affute qui derape'], defaultGravity: 4, defaultFrequency: 3, existingMeasures: ['Gants anti-coupure EN 388 niveau 5', 'Carter de protection trancheuse', 'Affutage regulier'], proposedActions: ['Plan de maintenance trancheuse (mensuel)', 'Collecteur lames usagees', 'Formation utilisation trancheuse', 'Tapis antiderapant plan de travail'], category: 'physique' },
    { id: 'rest-chute', name: 'Chutes (eau, graisses au sol)', description: 'Glissade sur sol rendu gras ou humide par les activites de cuisine et plonge', workUnitId: 'rest-plonge', situations: ['Sol mouille apres plonge', 'Projections de graisse', 'Fuite d\'eau', 'Dechets au sol'], defaultGravity: 3, defaultFrequency: 2, existingMeasures: ['Tapis antiderapants', 'Panneau sol mouille', 'Chaussures antiderapantes EN 20345'], proposedActions: ['Raclettes sol disponibles a chaque poste', 'Nettoyage continu pendant le service', 'Sol antiderapant certifie R12 minimum', 'Drainage sol cuisine verifie trimestriellement'], category: 'chute_plain_pied' },
    { id: 'rest-rps', name: 'RPS / cadence / clients difficiles', description: 'Stress de la cadence du service, gestion de clients alcoolises ou agressifs', workUnitId: 'rest-salle', situations: ['Rush du service midi/soir', 'Client mecontent ou alcoolise', 'Horaires coupes', 'Travail week-end et jours feries'], defaultGravity: 3, defaultFrequency: 2, existingMeasures: ['Organisation du service', 'Droit de refus de servir de l\'alcool', 'Eau a disposition'], proposedActions: ['Procedure de refus d\'alcool affichee', 'Renfort personnel en periodes de pointe', 'Briefing quotidien avant service', 'Planning publie 2 semaines a l\'avance'], category: 'psychosocial' },
    { id: 'rest-froid', name: 'Froid / glissades / manutentions en chambre froide', description: 'Exposition au froid, risque de glissade et port de charges en chambre froide/cave', workUnitId: 'rest-cave', situations: ['Entree en chambre froide negative (-18°C)', 'Manipulation cartons congeles', 'Sol glissant en chambre froide', 'Porte bloquee chambre froide'], defaultGravity: 3, defaultFrequency: 2, existingMeasures: ['Gants thermiques grand froid', 'Etageres stables', 'Eclairage chambre froide'], proposedActions: ['Degivrage regulier planifie', 'Poids max par carton defini (15kg)', 'Tapis antiderapant entree chambre froide', 'Systeme d\'alarme de securite porte chambre froide'], category: 'thermique' },
    { id: 'rest-manutention', name: 'Manutention / quai / reception', description: 'Port de charges lourdes lors de la reception des marchandises', workUnitId: 'rest-reception', situations: ['Reception futs de bieres', 'Cartons de conserves', 'Dechargement camion fournisseur'], defaultGravity: 2, defaultFrequency: 1, existingMeasures: ['Diable/chariot disponible', 'Organisation des livraisons'], proposedActions: ['Planification horaire des livraisons', 'Rangement immediat en reserve', 'Controle temperature a reception', 'Limite de poids affichee'], category: 'manutention' },
    { id: 'rest-rps-bureau', name: 'Risques psychosociaux administratifs', description: 'Surcharge administrative, gestion du personnel, comptabilite', workUnitId: 'rest-bureau', situations: ['Cumul gestion + service', 'Plannings complexes', 'Controles hygiene/administration'], defaultGravity: 2, defaultFrequency: 3, existingMeasures: ['Repartition des taches', 'Plannings affiches'], proposedActions: ['Temps administratif protege (pas pendant le service)', 'Logiciel de gestion simplifie', 'Acces ligne d\'ecoute professionnelle'], category: 'psychosocial' },
    { id: 'rest-tms-bureau', name: 'TMS poste bureautique', description: 'Douleurs liees a la posture assise prolongee sur poste administratif', workUnitId: 'rest-bureau', situations: ['Siege non regle', 'Ecran trop bas', 'Bureau encombre'], defaultGravity: 2, defaultFrequency: 2, existingMeasures: ['Siege ajustable'], proposedActions: ['Ecran a hauteur des yeux', 'Pauses mouvement toutes les 2h', 'Evaluation ergonomique du poste'], category: 'ergonomique' },
    { id: 'rest-chaleur', name: 'Fortes chaleurs', description: 'Deshydratation et malaise en cuisine et salle non climatisee', workUnitId: 'rest-toutes', situations: ['Cuisine > 35°C en ete', 'Service en terrasse plein soleil', 'Deshydratation', 'Perte de vigilance'], defaultGravity: 4, defaultFrequency: 3, existingMeasures: ['Eau fraiche a disposition', 'Information equipe', 'Ventilation/extraction cuisine'], proposedActions: ['Procedure canicule formalisee (hydratation, pauses, horaires)', 'Identification taches a forte exposition', 'Amenagement horaires en cas de pic', 'Suivi et tracabilite des episodes'], category: 'thermique' },
  ],
};

// ═══════════════════════════════════════════════════════════════════
// BOULANGERIE-PATISSERIE (10.71C)
// Source : duerp-en-direct.fr — 7 risques, 7 UT
// ═══════════════════════════════════════════════════════════════════

const BOULANGERIE: MetierRiskProfile = {
  metierSlug: 'boulangerie',
  label: 'Boulangerie-Patisserie',
  category: 'alimentaire_restauration',
  nafCodes: ['10.71C', '10.71A', '10.71B', '10.71D'],
  idcc: '843',
  legalReferences: ['Tableau RG n° 66 (asthme farine)', 'Decrets ATEX 2002-1553/1554', 'Art. R4222-1 (ventilation)', 'Art. L3122-1 (travail de nuit)'],
  workUnits: [
    { id: 'boul-four', name: 'Four / cuisson', description: 'Zone des fours a pain, fours patisserie, chambre de pousse', typicalHeadcount: '1-3' },
    { id: 'boul-petrin', name: 'Petrin / faconnage / laminoir', description: 'Zone petrissage, diviseuse, faconneuse, laminoir a pate', typicalHeadcount: '1-3' },
    { id: 'boul-patisserie', name: 'Patisserie / creme / chocolat', description: 'Laboratoire patisserie, preparation cremes, temperage chocolat', typicalHeadcount: '1-2' },
    { id: 'boul-plonge', name: 'Plonge / nettoyage', description: 'Nettoyage des ustensiles, bacs, plaques, sols du fournil', typicalHeadcount: '0-1' },
    { id: 'boul-vente', name: 'Vente comptoir / caisse', description: 'Boutique, vente au public, encaissement, tranchage pain', typicalHeadcount: '1-3' },
    { id: 'boul-stockage', name: 'Reception / stockage (farine / froid)', description: 'Silo a farine, reserve seche, chambre froide, reception livraisons', typicalHeadcount: '0-1' },
    { id: 'boul-toutes', name: 'Toutes unites', description: 'Risques transversaux a l\'ensemble de la boulangerie', typicalHeadcount: '-' },
  ],
  risks: [
    { id: 'boul-brulure', name: 'Brulures (four, plaques, sucre cuit)', description: 'Contact avec surfaces a 250°C+, projections de sucre caramelise, vapeur', workUnitId: 'boul-four', situations: ['Enfournement/defournement pain', 'Manipulation plaques brulantes', 'Cuisson sucre > 160°C', 'Ouverture four a vapeur'], defaultGravity: 4, defaultFrequency: 3, existingMeasures: ['Gants anti-chaleur EN 407', 'Manches longues coton', 'Pelle a enfourner longue'], proposedActions: ['Thermometre sur chaque four', 'Zones de depose securisees identifiees', 'Briefing brulure + kit premier secours brulure', 'Signalisation "en cours de refroidissement"'], category: 'thermique' },
    { id: 'boul-machine', name: 'Entrainement / ecrasement (petrin, laminoir)', description: 'Happement par organes mobiles du petrin, diviseuse ou laminoir', workUnitId: 'boul-petrin', situations: ['Nettoyage petrin en marche', 'Introduction main dans diviseuse', 'Laminoir sans carter', 'Defaut arret d\'urgence'], defaultGravity: 4, defaultFrequency: 3, existingMeasures: ['Carters de protection en place', 'Arret d\'urgence', 'Cles de securite'], proposedActions: ['Interdiction formelle nettoyage machine en marche', 'Maintenance preventive mensuelle', 'Affichage consigne de securite par machine', 'Procedure de consignation pour nettoyage'], category: 'machines' },
    { id: 'boul-farine', name: 'Irritation / asthme (poussieres farine)', description: 'Inhalation de poussieres de farine — Tableau RG n° 66 (rhinite, asthme)', workUnitId: 'boul-petrin', situations: ['Vidange sac de farine', 'Fleurage du plan de travail', 'Nettoyage a sec du fournil', 'Silo a farine (remplissage)'], defaultGravity: 3, defaultFrequency: 2, existingMeasures: ['Versement doux de la farine', 'Ventilation fournil', 'Masques P2 disponibles'], proposedActions: ['Silo avec extraction locale', 'Humidification legere avant balayage', 'Farines moins volatiles (T65 vs T55)', 'Spirometrie annuelle pour boulangers', 'Nettoyage humide plutot qu\'a sec'], category: 'chimique' },
    { id: 'boul-coupure', name: 'Coupures (couteaux, lames)', description: 'Coupures par couteaux de patisserie, lames de grignage, racloirs', workUnitId: 'boul-patisserie', situations: ['Decoupe pate feuilletee', 'Grignage du pain', 'Nettoyage ustensiles tranchants', 'Racloir qui glisse'], defaultGravity: 3, defaultFrequency: 2, existingMeasures: ['Gants anti-coupure fins', 'Couteaux affutes et entretenus'], proposedActions: ['Collecteur de lames usagees', 'Tapis antiderapant plan de travail', 'Rangement securise couteaux (bloc aimante)', 'Formation gestes de coupe securises'], category: 'physique' },
    { id: 'boul-manutention', name: 'Manutentions (sacs farine, bacs pate)', description: 'Port de charges lourdes (sacs 25kg, bacs de pate, plaques), gestes repetitifs', workUnitId: 'boul-stockage', situations: ['Reception sacs de farine 25kg', 'Transfert bacs de pate au four', 'Empilage plaques', 'Livraison commandes clients'], defaultGravity: 3, defaultFrequency: 2, existingMeasures: ['Diable disponible', 'Stockage charges lourdes en bas', 'Chariot a niveaux'], proposedActions: ['Passage aux sacs 10kg maximum', 'Basculeur hydraulique pour bacs lourds', 'Formation gestes et postures (recyclage 2 ans)', 'Rotation des taches manutention/faconnage'], category: 'manutention' },
    { id: 'boul-rps', name: 'RPS / horaires matinaux / cadence', description: 'Fatigue chronique liee au travail de nuit (3h-11h), pression des horaires', workUnitId: 'boul-vente', situations: ['Debut de poste a 3h-4h du matin', 'Weekend et jours feries', 'Rush vente matinale', 'Travail seul la nuit'], defaultGravity: 2, defaultFrequency: 1, existingMeasures: ['Planning anticipe', 'Pauses reglementaires', 'Eau et collation disponibles'], proposedActions: ['Renfort personnel le week-end', 'Tapis anti-fatigue au comptoir', 'Affichage courtoisie client', 'Visite medicale annuelle (travailleur de nuit)', 'Sieste compensatrice possible'], category: 'psychosocial' },
    { id: 'boul-chaleur', name: 'Fortes chaleurs', description: 'Temperature elevee en fournil (> 35°C), risque de deshydratation et malaise', workUnitId: 'boul-toutes', situations: ['Fournil en ete (> 40°C)', 'Production prolongee', 'Deshydratation insidieuse', 'Baisse de vigilance'], defaultGravity: 4, defaultFrequency: 3, existingMeasures: ['Eau fraiche a disposition', 'Information equipe', 'Ventilation/extraction fournil'], proposedActions: ['Procedure canicule (hydratation, pauses, horaires)', 'Identification taches forte exposition', 'Amenagement horaires ete (production 2h-8h)', 'Documentation episodes et mesures appliquees'], category: 'thermique' },
  ],
};

// ═══════════════════════════════════════════════════════════════════
// AIDE A DOMICILE (88.10A)
// Source : duerp-en-direct.fr — 13 risques, 4 UT
// ═══════════════════════════════════════════════════════════════════

const AIDE_DOMICILE: MetierRiskProfile = {
  metierSlug: 'aide-domicile',
  label: 'Aide a domicile',
  category: 'sante_social',
  nafCodes: ['88.10A', '88.10B', '88.10C', '88.91A'],
  idcc: '2941',
  legalReferences: ['CCN BAD IDCC 2941', 'Recommandation CNAM R497', 'Art. R4541-1 a R4541-11 (manutention)', 'Art. L3121-1 (travail de nuit)'],
  workUnits: [
    { id: 'ad-domicile', name: 'Interventions au domicile', description: 'Aide a la personne, menage, preparation repas au domicile du beneficiaire', typicalHeadcount: '5-20' },
    { id: 'ad-deplacement', name: 'Deplacements et trajets', description: 'Trajets en vehicule entre les domiciles des beneficiaires', typicalHeadcount: '5-20' },
    { id: 'ad-materiel', name: 'Preparation et gestion du materiel', description: 'Preparation des courses, materiel de soin, produits d\'entretien', typicalHeadcount: '1-3' },
    { id: 'ad-admin', name: 'Coordination et administratif', description: 'Bureau, plannings, transmissions, coordination equipe', typicalHeadcount: '1-3' },
  ],
  risks: [
    { id: 'ad-tms', name: 'TMS (aide lever/transfert/toilette)', description: 'Troubles musculosquelettiques lies a l\'aide a la personne (lever, transfert, toilette)', workUnitId: 'ad-domicile', situations: ['Aide au lever/coucher', 'Transfert lit-fauteuil', 'Toilette au lit', 'Manutention personne lourde sans aide mecanique'], defaultGravity: 4, defaultFrequency: 4, existingMeasures: ['Consignes posturales', 'Travail en binome quand possible'], proposedActions: ['Formation PRAP (recyclage 2 ans)', 'Evaluation charge par beneficiaire', 'Leve-personne installe si necessaire', 'Signalement des situations a risque au responsable'], category: 'manutention' },
    { id: 'ad-chute', name: 'Chutes de plain-pied au domicile', description: 'Glissade ou trebuchement dans un domicile encombre, mal eclaire ou avec obstacles', workUnitId: 'ad-domicile', situations: ['Sols encombres', 'Tapis non fixes', 'Escaliers etroits', 'Eclairage insuffisant', 'Animaux domestiques'], defaultGravity: 4, defaultFrequency: 3, existingMeasures: ['Chaussures fermees antiderapantes', 'Signalement des dangers au responsable'], proposedActions: ['Grille d\'evaluation des risques du domicile (1ere visite)', 'Eclairage portatif fourni', 'Fiche conseil amenagement domicile pour la famille', 'Bandes antiderapantes proposees pour les escaliers'], category: 'chute_plain_pied' },
    { id: 'ad-agression', name: 'Agressions verbales / physiques', description: 'Comportement agressif du beneficiaire desoriented ou de l\'entourage', workUnitId: 'ad-domicile', situations: ['Beneficiaire atteint de demence', 'Conflit familial', 'Refus de soins', 'Quartier difficile', 'Premiere visite'], defaultGravity: 4, defaultFrequency: 3, existingMeasures: ['Telephone charge en permanence', 'Procedure d\'alerte', 'Possibilite de retrait'], proposedActions: ['Formation desescalade (recyclage 2 ans)', 'Registre des incidents', 'Accompagnement systematique premiere visite', 'Fiche comportementale par beneficiaire'], category: 'psychosocial' },
    { id: 'ad-biologique', name: 'Risque biologique', description: 'Contact avec fluides corporels, dechets souilles, maladies contagieuses', workUnitId: 'ad-domicile', situations: ['Aide a la toilette', 'Change de protection', 'Contact avec personne malade', 'Manipulation dechets souilles'], defaultGravity: 4, defaultFrequency: 3, existingMeasures: ['Gants usage unique', 'Gel hydroalcoolique'], proposedActions: ['Kit EPI standardise par intervention', 'Protocole dechets souilles (sac ferme)', 'Vaccination a jour (grippe, hepatite B)', 'Procedure post-exposition sang (AES)'], category: 'biologique' },
    { id: 'ad-chimique', name: 'Risque chimique (produits menagers)', description: 'Irritation ou intoxication par melange de produits d\'entretien', workUnitId: 'ad-domicile', situations: ['Melange eau de javel + detartrant', 'Utilisation produit inconnu au domicile', 'Aerosols en espace confine', 'Produit sans etiquette'], defaultGravity: 3, defaultFrequency: 3, existingMeasures: ['Gants de menage', 'Aeration pendant le menage'], proposedActions: ['Interdiction formelle de melanger les produits', 'Fiche reflexe produits incompatibles distribuee', 'Produits fournis par l\'employeur (connus)', 'Formation FDS (fiche de donnees de securite)'], category: 'chimique' },
    { id: 'ad-rps', name: 'Risques psychosociaux', description: 'Charge emotionnelle, isolement, epuisement, confrontation a la fin de vie', workUnitId: 'ad-domicile', situations: ['Accompagnement fin de vie', 'Isolement (travail seul)', 'Charge emotionnelle quotidienne', 'Manque de reconnaissance', 'Burn-out'], defaultGravity: 3, defaultFrequency: 4, existingMeasures: ['Reunions d\'equipe', 'Contact responsable de secteur'], proposedActions: ['Groupes de parole trimestriels (obligatoire)', 'Circuit de signalement RPS', 'Optimisation plannings (temps de recuperation)', 'Acces psychologue du travail'], category: 'psychosocial' },
    { id: 'ad-routier', name: 'Accident de la route', description: 'Accident lors des trajets inter-domiciles, fatigue au volant', workUnitId: 'ad-deplacement', situations: ['Trajets inter-beneficiaires (5-10/jour)', 'Conditions meteo degradees', 'Fatigue en fin de tournee', 'Pression planning'], defaultGravity: 4, defaultFrequency: 3, existingMeasures: ['Rappel code de la route', 'Kit mains-libres'], proposedActions: ['Politique securite routiere formalisee', 'Optimisation tournees (reduction km)', 'Temps de trajet integre au planning (pas compresse)', 'Verification vehicule semestrielle (si vehicule personnel)'], category: 'routier' },
    { id: 'ad-chute-ext', name: 'Chutes exterieures', description: 'Glissade sur trottoir verglace, chute en portant des courses', workUnitId: 'ad-deplacement', situations: ['Verglas hivernal', 'Trottoir degrade', 'Port de courses en montant escalier', 'Parking non eclaire'], defaultGravity: 3, defaultFrequency: 3, existingMeasures: ['Chaussures antiderapantes', 'Prudence par temps de gel'], proposedActions: ['Sur-chaussures antiderapantes fournies en hiver', 'Temps tampon par temps de gel', 'Caddie roulant pour les courses', 'Signalement trottoirs dangereux a la mairie'], category: 'chute_plain_pied' },
    { id: 'ad-coupure', name: 'Coupures / piqures', description: 'Blessure par couteau de cuisine, aiguille, objet tranchant au domicile', workUnitId: 'ad-materiel', situations: ['Preparation des repas', 'Manipulation aiguilles (diabetique)', 'Objets tranchants dans poubelle', 'Verre casse'], defaultGravity: 4, defaultFrequency: 2, existingMeasures: ['Gants pour certaines taches', 'Prudence recommandee'], proposedActions: ['Formation manipulation objets piquants/tranchants', 'Trousse de premiers secours complete', 'Declaration AT immediate', 'Protocole AES (accident exposition au sang)'], category: 'physique' },
    { id: 'ad-manutention-courses', name: 'Manutention (courses, materiel)', description: 'Port de charges lourdes (packs d\'eau, courses, materiel de soin)', workUnitId: 'ad-materiel', situations: ['Pack d\'eau 9kg', 'Courses en quantite', 'Materiel d\'aide a la mobilite', 'Montee escaliers avec charges'], defaultGravity: 3, defaultFrequency: 3, existingMeasures: ['Repartition des charges', 'Sacs adaptes'], proposedActions: ['Chariot roulant fourni', 'Limite de poids definie (10kg max)', 'Encourager livraison a domicile pour gros volumes', 'Formation gestes et postures'], category: 'manutention' },
    { id: 'ad-tms-ecran', name: 'TMS ecran (poste administratif)', description: 'Douleurs liees au travail sur ecran pour les coordinateurs', workUnitId: 'ad-admin', situations: ['Posture prolongee devant ecran', 'Fatigue visuelle', 'Repetitivite saisie planning'], defaultGravity: 2, defaultFrequency: 3, existingMeasures: ['Poste de travail standard', 'Pauses informelles'], proposedActions: ['Evaluation ergonomique du poste', 'Micro-pauses programmees avec etirements', 'Ecran a hauteur des yeux', 'Souris ergonomique'], category: 'ergonomique' },
    { id: 'ad-rps-admin', name: 'RPS administratif', description: 'Pression plannings, interruptions, gestion conflits, surcharge', workUnitId: 'ad-admin', situations: ['Pression des plannings de derniere minute', 'Gestion des absences', 'Conflits entre intervenants', 'Surcharge d\'appels'], defaultGravity: 3, defaultFrequency: 3, existingMeasures: ['Coordination reguliere', 'Priorites definies'], proposedActions: ['Clarifier roles et circuits de communication', 'Monitoring charge de travail', 'Formation gestion du stress', 'Plage horaire sans interruption pour admin'], category: 'psychosocial' },
    { id: 'ad-chaleur', name: 'Fortes chaleurs', description: 'Deshydratation, malaise lors d\'interventions en ete (domiciles non climatises)', workUnitId: 'ad-domicile', situations: ['Domicile sans climatisation en ete', 'Menage par forte chaleur', 'Deshydratation insidieuse', 'Baisse de vigilance'], defaultGravity: 3, defaultFrequency: 2, existingMeasures: ['Eau a disposition', 'Alerte equipe', 'Ventilation quand possible'], proposedActions: ['Procedure canicule (hydratation, horaires, surveillance)', 'Identification beneficiaires/situations a risque', 'Tracabilite des mesures appliquees'], category: 'thermique' },
  ],
};

// ═══════════════════════════════════════════════════════════════════
// COIFFURE (96.02A)
// ═══════════════════════════════════════════════════════════════════

const COIFFURE: MetierRiskProfile = {
  metierSlug: 'coiffure',
  label: 'Salon de coiffure',
  category: 'beaute_bien_etre',
  nafCodes: ['96.02A'],
  idcc: '2596',
  legalReferences: ['Tableau RG n° 65 (eczema)', 'Art. R4412-1 (agents chimiques)', 'Art. R4222-1 (ventilation locaux)'],
  workUnits: [
    { id: 'coif-coupe', name: 'Espace coupe / coiffage', description: 'Postes de coupe, brushing, coiffage, seche-cheveux', typicalHeadcount: '2-4' },
    { id: 'coif-couleur', name: 'Espace coloration / technique', description: 'Preparation et application colorations, permanentes, meches, decolorations', typicalHeadcount: '1-3' },
    { id: 'coif-bac', name: 'Bac a shampooing', description: 'Zone de lavage des cheveux, soins capillaires', typicalHeadcount: '1-2' },
    { id: 'coif-accueil', name: 'Accueil / caisse', description: 'Reception clients, prise de rendez-vous, encaissement, vente produits', typicalHeadcount: '1' },
    { id: 'coif-reserve', name: 'Reserve produits', description: 'Stockage des produits capillaires, colorations, materiel', typicalHeadcount: '0-1' },
  ],
  risks: [
    { id: 'coif-chimique', name: 'Risque chimique cutane et respiratoire', description: 'Exposition aux colorations (PPD, ammoniaque), permanentes (acide thioglycolique), decolorants (peroxyde)', workUnitId: 'coif-couleur', situations: ['Application coloration sans gants', 'Melange produits en espace non ventile', 'Decoloration (vapeurs peroxyde)', 'Contact cutane prolonge'], defaultGravity: 3, defaultFrequency: 4, existingMeasures: ['Gants nitrile usage unique EN 374', 'Ventilation du salon'], proposedActions: ['Hotte aspirante au-dessus du poste coloration', 'Creme protectrice mains avant et apres', 'Substitution : colorations sans ammoniaque', 'Fiche reflexe melange affichee au poste', 'Surveillance cutanee (dermatologue annuel si symptomes)'], category: 'chimique' },
    { id: 'coif-tms', name: 'TMS / gestes repetitifs', description: 'Syndrome du canal carpien, tendinites, lombalgies (station debout + gestes repetes)', workUnitId: 'coif-coupe', situations: ['Coupe aux ciseaux 6-8h/jour', 'Brushing bras leves', 'Station debout prolongee sans pause', 'Prise en pince repetitive'], defaultGravity: 2, defaultFrequency: 4, existingMeasures: ['Ciseaux ergonomiques disponibles', 'Tapis anti-fatigue a certains postes'], proposedActions: ['Ciseaux ergonomiques pour tous (prise large)', 'Tapis anti-fatigue a chaque poste', 'Alternance des taches (coupe/couleur/bac)', 'Repose-pieds disponible', 'Etirements 5 min matin et apres-midi'], category: 'ergonomique' },
    { id: 'coif-posture', name: 'Postures contraignantes (bac)', description: 'Flexion du dos au bac a shampooing, bras en elevation prolongee lors du coiffage', workUnitId: 'coif-bac', situations: ['Shampooing au bac (dos penche)', 'Soins capillaires prolonges', 'Client grand/petit necessitant adaptation posture'], defaultGravity: 2, defaultFrequency: 4, existingMeasures: ['Bac a shampooing inclinable'], proposedActions: ['Bac reglable en hauteur (electrique)', 'Tabouret roulant au bac', 'Pauses entre clients au bac', 'Limite de 3 shampooings consecutifs'], category: 'ergonomique' },
    { id: 'coif-dermatose', name: 'Dermatose professionnelle (RG 65)', description: 'Eczema de contact, dermatite irritative — Tableau RG n° 65', workUnitId: 'coif-couleur', situations: ['Contact prolonge eau + produits', 'Mains dans l\'eau > 2h/jour', 'Port de gants latex (allergie)'], defaultGravity: 2, defaultFrequency: 3, existingMeasures: ['Gants nitrile (pas latex)'], proposedActions: ['Creme reparatrice fournie (application apres le travail)', 'Surveillance cutanee reguliere', 'Consultation dermatologue si premiers signes', 'Rotation des taches pour limiter contact eau', 'Sechage complet des mains apres chaque lavage'], category: 'chimique' },
    { id: 'coif-coupure', name: 'Coupures (ciseaux, rasoir)', description: 'Coupure par ciseaux, rasoir de nuque, lames', workUnitId: 'coif-coupe', situations: ['Coupe rapide', 'Rasage nuque', 'Nettoyage outils tranchants', 'Enfant qui bouge'], defaultGravity: 1, defaultFrequency: 3, existingMeasures: ['Rangement securise ciseaux et rasoirs'], proposedActions: ['Kit premier secours accessible en 30 secondes', 'Ciseaux avec butee de securite pour apprentis', 'Collecteur aiguilles/lames', 'Formation gestes de securite pour apprentis'], category: 'physique' },
    { id: 'coif-brulure', name: 'Brulures (fers, seche-cheveux)', description: 'Brulure par fer a lisser (> 200°C), seche-cheveux professionnel, bigoudis chauffants', workUnitId: 'coif-coupe', situations: ['Lissage/bouclage', 'Seche-cheveux professionnel sur peau', 'Depot fer chaud sur plan de travail'], defaultGravity: 2, defaultFrequency: 3, existingMeasures: ['Support dedie pour fers chauds'], proposedActions: ['Gant thermique pour manipulation fer', 'Thermometre integre au fer (alerte > 220°C)', 'Support isolant a chaque poste', 'Verification eau bac (thermometre)'], category: 'thermique' },
    { id: 'coif-electrique', name: 'Risque electrique (appareils en zone humide)', description: 'Utilisation d\'appareils electriques a proximite de l\'eau au bac ou en coupe', workUnitId: 'coif-bac', situations: ['Seche-cheveux pres du bac', 'Prise defectueuse en zone humide', 'Cordon abime', 'Multiprise au sol'], defaultGravity: 3, defaultFrequency: 2, existingMeasures: ['Prise de terre obligatoire', 'Protection differentielle 30mA'], proposedActions: ['Verification annuelle installations electriques', 'Remplacement immediat cordons endommages', 'Interdiction multiprises au sol en zone humide', 'Controle visuel quotidien des appareils'], category: 'electrique' },
    { id: 'coif-psycho', name: 'Charge mentale et relationnelle', description: 'Exigences clients, cadence elevee, travail samedi, fatigue', workUnitId: 'coif-accueil', situations: ['Affluence samedi', 'Client mecontent', 'Travail sans coupure', 'Pression objectifs vente produits'], defaultGravity: 2, defaultFrequency: 3, existingMeasures: ['Planning equilibre', 'Pause dejeuner obligatoire'], proposedActions: ['1 jour de repos supplementaire en semaine', 'Formation gestion du stress et des conflits', 'Objectifs vente raisonnables', 'Amenagement planning (pas de samedi 2 semaines de suite)'], category: 'psychosocial' },
  ],
};

// ═══════════════════════════════════════════════════════════════════
// COMMERCE DE DETAIL (47.xx)
// ═══════════════════════════════════════════════════════════════════

const COMMERCE: MetierRiskProfile = {
  metierSlug: 'commerce',
  label: 'Commerce de detail',
  category: 'commerce_services',
  nafCodes: ['47'],
  idcc: '2216',
  legalReferences: ['ERP Type M', 'Art. R4541-1 a R4541-11 (manutention)', 'Accord 26/03/2010 (agressions)', 'Art. R4228-20 (locaux sociaux)'],
  workUnits: [
    { id: 'com-vente', name: 'Surface de vente', description: 'Zone de vente, rayons, presentation des produits', typicalHeadcount: '2-8' },
    { id: 'com-caisse', name: 'Caisse / accueil', description: 'Poste de caisse, accueil client, encaissement', typicalHeadcount: '1-4' },
    { id: 'com-reserve', name: 'Reserve / stockage', description: 'Reserve arriere, rayonnages, stockage des marchandises', typicalHeadcount: '1-3' },
    { id: 'com-livraison', name: 'Quai de livraison / reception', description: 'Zone de reception des marchandises, quai de dechargement', typicalHeadcount: '1-2' },
    { id: 'com-bureau', name: 'Bureau / administration', description: 'Bureau du responsable, gestion administrative', typicalHeadcount: '1' },
    { id: 'com-toutes', name: 'Toutes unites', description: 'Risques transversaux a l\'ensemble du commerce', typicalHeadcount: '-' },
  ],
  risks: [
    { id: 'com-manutention', name: 'Manutention et port de charges', description: 'Reception de marchandises, mise en rayon, depalettisation', workUnitId: 'com-reserve', situations: ['Depalettisation cartons', 'Mise en rayon produits lourds', 'Stockage en hauteur (escabeau)', 'Port de charges repetitif'], defaultGravity: 3, defaultFrequency: 3, existingMeasures: ['Transpalette et diable disponibles', 'Chariot de mise en rayon'], proposedActions: ['Formation gestes et postures (PRAP)', 'Charges lourdes stockees entre 0.5m et 1.5m', 'Limite de poids affichee (15kg)', 'Aide mecanique obligatoire au-dela de 15kg'], category: 'manutention' },
    { id: 'com-agression', name: 'Agressions et vols', description: 'Braquage, vol a l\'etalage avec violence, incivilites clients', workUnitId: 'com-caisse', situations: ['Braquage a la fermeture', 'Intervention sur vol a l\'etalage', 'Client agressif a la caisse', 'Manipulation de fonds en caisse'], defaultGravity: 4, defaultFrequency: 2, existingMeasures: ['Video-surveillance', 'Eclairage adequat', 'Coffre-fort temporise'], proposedActions: ['Procedure anti-braquage affichee et exercee', 'Formation desescalade', 'Fermeture a deux personnes minimum', 'Bouton d\'alerte discret en caisse', 'Depot banque quotidien (pas d\'accumulation fonds)'], category: 'psychosocial' },
    { id: 'com-tms', name: 'TMS en caisse', description: 'Gestes repetitifs de scan, station assise prolongee, manipulation produits', workUnitId: 'com-caisse', situations: ['Scan articles repetitif (8h)', 'Station assise rigide', 'Manipulation charges lourdes au tapis', 'Torsion pour ensachage'], defaultGravity: 2, defaultFrequency: 4, existingMeasures: ['Siege reglable', 'Tapis roulant de caisse'], proposedActions: ['Rotation des postes (caisse/rayon 2h max)', 'Siege avec soutien lombaire', 'Scanner omnidirectionnel (moins de gestes)', 'Pause active 5 min toutes les 2h'], category: 'ergonomique' },
    { id: 'com-chute-reserve', name: 'Chute de hauteur en reserve', description: 'Chute d\'objets stockes en hauteur, chute depuis escabeau', workUnitId: 'com-reserve', situations: ['Acces rayon superieur avec escabeau', 'Carton instable en haut de pile', 'Escabeau sur sol inegal'], defaultGravity: 3, defaultFrequency: 2, existingMeasures: ['Escabeau securise (3 marches max)', 'Stockage charges lourdes en bas'], proposedActions: ['Etageres fixees au mur (anti-basculement)', 'Rangement ordonne (lourd en bas, leger en haut)', 'Verification trimestrielle des rayonnages', 'Interdiction de monter sur les etageres'], category: 'chute_hauteur' },
    { id: 'com-circulation', name: 'Risque routier (livraison, parking)', description: 'Heurt par vehicule de livraison au quai, accident parking clients', workUnitId: 'com-livraison', situations: ['Manoeuvre camion livraison', 'Traversee parking avec chariot', 'Dechargement cote circulation'], defaultGravity: 3, defaultFrequency: 2, existingMeasures: ['Separation pietons/vehicules', 'Gilet haute visibilite au quai'], proposedActions: ['Signalisation au sol zone livraison', 'Miroirs convexes aux angles morts', 'Horaires de livraison fixes (hors ouverture si possible)', 'Gilet EN 20471 obligatoire au quai'], category: 'routier' },
    { id: 'com-froid', name: 'Ambiances thermiques (chambre froide)', description: 'Exposition au froid en chambre froide ou a la chaleur en reserve non ventilee', workUnitId: 'com-reserve', situations: ['Mise en rayon frais (chambre froide positive)', 'Chambre froide negative (-18°C)', 'Reserve non ventilee en ete'], defaultGravity: 2, defaultFrequency: 3, existingMeasures: ['Vetements thermiques fournis pour chambre froide'], proposedActions: ['Limitation temps en chambre froide negative (30 min max)', 'Boissons chaudes a disposition', 'Systeme d\'alarme securite porte chambre froide', 'Ventilation reserve en ete'], category: 'thermique' },
    { id: 'com-stress', name: 'Stress et charge mentale', description: 'Pression des objectifs commerciaux, affluence periodes de fetes, polyvalence', workUnitId: 'com-toutes', situations: ['Soldes et periodes de Noel', 'Objectifs de CA imposes', 'Polyvalence caisse/rayon/quai', 'Sous-effectif'], defaultGravity: 2, defaultFrequency: 3, existingMeasures: ['Planning anticipe'], proposedActions: ['Renforts saisonniers anticipes', 'Objectifs realistes et partages', 'Entretien individuel trimestriel', 'Formation gestion du stress'], category: 'psychosocial' },
  ],
};

// ═══════════════════════════════════════════════════════════════════
// GARAGE AUTOMOBILE (45.20A)
// ═══════════════════════════════════════════════════════════════════

const GARAGE: MetierRiskProfile = {
  metierSlug: 'garage-auto',
  label: 'Garage automobile',
  category: 'commerce_services',
  nafCodes: ['45.20A', '45.20B'],
  idcc: '1090',
  legalReferences: ['Art. R4412-1 a R4412-93 (CMR)', 'Art. R4323-22 a R4323-35 (levage)', 'NF C 18-550 (HT vehicules)', 'Directive ATEX 1999/92/CE'],
  workUnits: [
    { id: 'gar-atelier', name: 'Atelier mecanique', description: 'Reparation et entretien courant des vehicules (vidange, freins, distribution)', typicalHeadcount: '2-6' },
    { id: 'gar-carrosserie', name: 'Carrosserie-peinture', description: 'Travaux de carrosserie, preparation et peinture en cabine', typicalHeadcount: '1-3' },
    { id: 'gar-reception', name: 'Reception / accueil client', description: 'Accueil client, devis, restitution vehicule', typicalHeadcount: '1' },
    { id: 'gar-magasin', name: 'Magasin pieces detachees', description: 'Stockage et distribution des pieces de rechange', typicalHeadcount: '1' },
    { id: 'gar-parking', name: 'Parking / aire exterieure', description: 'Stationnement vehicules, essais routiers, aire de lavage', typicalHeadcount: '1-2' },
    { id: 'gar-bureau', name: 'Bureau / administration', description: 'Gestion administrative, facturation, comptabilite', typicalHeadcount: '1' },
  ],
  risks: [
    { id: 'gar-chimique', name: 'Agents chimiques CMR', description: 'Exposition aux huiles usagees (HAP), liquide de frein, solvants, gaz d\'echappement', workUnitId: 'gar-atelier', situations: ['Vidange (contact huiles usagees)', 'Purge liquide de frein', 'Nettoyage pieces au solvant', 'Moteur tourne en atelier (gaz CO)'], defaultGravity: 3, defaultFrequency: 4, existingMeasures: ['Extraction gaz echappement a la source', 'Gants nitrile EN 374', 'FDS affichees'], proposedActions: ['Bidons de recuperation avec entonnoir (pas de vidange au sol)', 'Fontaine de nettoyage biologique (remplacement solvants)', 'Controle annuel qualite air atelier', 'Surveillance biologique mecaniciens (bilan sanguin)'], category: 'chimique' },
    { id: 'gar-ecrasement', name: 'Ecrasement sous vehicule', description: 'Chute de vehicule depuis pont elevateur, cric ou chandelles', workUnitId: 'gar-atelier', situations: ['Pont elevateur mal verrouille', 'Cric utilise seul (sans chandelles)', 'Vehicule mal cale', 'Defaut de maintenance du pont'], defaultGravity: 4, defaultFrequency: 2, existingMeasures: ['Pont elevateur controle annuellement', 'Chandelles de securite disponibles', 'Interdiction cric seul'], proposedActions: ['Verification quotidienne pont elevateur (check-list)', 'Chandelles obligatoires meme si pont', 'Procedure ecrite de levage', 'Maintenance preventive pont (semestrielle)'], category: 'machines' },
    { id: 'gar-bruit', name: 'Bruit', description: 'Exposition au bruit des outils pneumatiques (> 100 dB), disqueuse, compresseur', workUnitId: 'gar-atelier', situations: ['Deboulonnage pneumatique roues', 'Meulage/disquage', 'Compresseur en marche continue', 'Essai moteur en atelier'], defaultGravity: 2, defaultFrequency: 4, existingMeasures: ['Bouchons d\'oreilles fournis'], proposedActions: ['Casque anti-bruit EN 352 obligatoire au deboulonnage', 'Encoffrement compresseur', 'Clefs a chocs electriques (moins bruyantes)', 'Audiogramme annuel si exposition > 85 dB(A)', 'Affichage zones bruyantes'], category: 'bruit' },
    { id: 'gar-electrique-ht', name: 'Risque electrique haute tension vehicules', description: 'Electrisation lors d\'intervention sur vehicules hybrides/electriques (400-800V)', workUnitId: 'gar-atelier', situations: ['Maintenance batterie HT', 'Depannage vehicule hybride', 'Diagnostic systeme HT', 'Accident vehicule electrique (secours)'], defaultGravity: 4, defaultFrequency: 2, existingMeasures: ['Habilitation HT vehicules NF C 18-550'], proposedActions: ['EPI isolants specifiques HT (gants classe 0, tapis)', 'Consignation obligatoire avant intervention', 'Zone balisee "Danger HT"', 'Formation recyclage HT tous les 3 ans', 'Defibrillateur accessible en atelier'], category: 'electrique' },
    { id: 'gar-peinture', name: 'Risque peinture isocyanates (cabine)', description: 'Inhalation d\'isocyanates lors de la pulverisation de peintures polyurethane', workUnitId: 'gar-carrosserie', situations: ['Application peinture en cabine', 'Application vernis', 'Appret au pistolet', 'Nettoyage pistolet au solvant'], defaultGravity: 3, defaultFrequency: 3, existingMeasures: ['Cabine ventilee conforme', 'Masque a cartouche A2P3'], proposedActions: ['Combinaison jetable a chaque session', 'Controle debit ventilation cabine (trimestriel)', 'Surveillance biologique (test urinaire isocyanates)', 'Douche d\'urgence a l\'entree cabine', 'Remplacement cartouches masque selon duree d\'utilisation'], category: 'chimique' },
    { id: 'gar-postures', name: 'Postures contraignantes', description: 'Positions penibles sous vehicule, acces compartiment moteur, torsions', workUnitId: 'gar-atelier', situations: ['Travail sous caisse (allonge sur chariot)', 'Acces compartiment moteur (penche)', 'Depannage exterieur (positions improvisees)', 'Montage/demontage pneus'], defaultGravity: 2, defaultFrequency: 4, existingMeasures: ['Chariot roulant de mecanicien'], proposedActions: ['Pont a hauteur variable (reglable)', 'Alternance des taches (mecanique/reception)', 'Tabouret roulant atelier', 'Etirements en debut de poste'], category: 'ergonomique' },
    { id: 'gar-manutention', name: 'Manutention (pieces lourdes)', description: 'Port de charges lourdes : roues, moteurs, boites de vitesse, batteries', workUnitId: 'gar-atelier', situations: ['Changement roues (15-25kg par roue)', 'Depose moteur (> 100kg)', 'Reception pieces au magasin', 'Batteries (> 20kg)'], defaultGravity: 3, defaultFrequency: 3, existingMeasures: ['Cric rouleur pour roues', 'Potence atelier pour moteurs'], proposedActions: ['Chariot porte-roue a hauteur', 'Potence/palan obligatoire pour charges > 25kg', 'Formation gestes et postures', 'Rangement pieces par poids (lourd en bas)'], category: 'manutention' },
    { id: 'gar-incendie', name: 'Incendie atelier', description: 'Demarrage de feu par produits inflammables, etincelles, vehicules GPL/GNV', workUnitId: 'gar-atelier', situations: ['Soudure/meulage pres de carburant', 'Fuite carburant', 'Stockage huiles/solvants', 'Vehicule GPL en atelier'], defaultGravity: 4, defaultFrequency: 1, existingMeasures: ['Extincteurs CO2 et poudre', 'Armoire anti-feu pour produits', 'Interdiction flamme nue en zone stockage'], proposedActions: ['Detecteur GPL dans fosse', 'Verification annuelle extincteurs', 'Exercice evacuation annuel', 'Bac de retention sous stockage huiles', 'Permis de feu obligatoire pour soudure'], category: 'incendie' },
  ],
};

// ═══════════════════════════════════════════════════════════════════
// BTP GENERAL (41-43)
// ═══════════════════════════════════════════════════════════════════

const BTP_GENERAL: MetierRiskProfile = {
  metierSlug: 'btp-general',
  label: 'BTP general',
  category: 'btp_construction',
  nafCodes: ['41', '42', '43'],
  idcc: '1597',
  legalReferences: ['Art. R4532-56 a R4532-74 (PPSPS)', 'Decret 2012-639 (amiante)', 'Art. R4323-58 a R4323-90 (hauteur)', 'Decret 2006-892 (bruit/vibrations)'],
  workUnits: [
    { id: 'btp-gros-oeuvre', name: 'Chantier gros oeuvre', description: 'Fondations, murs, dalles, structure — zone principale de construction', typicalHeadcount: '4-15' },
    { id: 'btp-second-oeuvre', name: 'Chantier second oeuvre', description: 'Finitions : peinture, platrerie, carrelage, menuiserie', typicalHeadcount: '2-8' },
    { id: 'btp-demolition', name: 'Zone demolition / desamiantage', description: 'Demolition structures, retrait materiaux amiantiferes', typicalHeadcount: '2-6' },
    { id: 'btp-stockage', name: 'Zone stockage materiaux', description: 'Stockage materiaux, outillage, produits dangereux', typicalHeadcount: '1-3' },
    { id: 'btp-bureau', name: 'Bureau / base de vie', description: 'Bureau de chantier, vestiaires, refectoire', typicalHeadcount: '1-3' },
    { id: 'btp-vehicule', name: 'Vehicules / deplacements', description: 'Conduite entre chantiers, livraisons materiaux', typicalHeadcount: '1-4' },
  ],
  risks: [
    { id: 'btp-chute-hauteur', name: 'Chute de hauteur', description: 'Chute depuis echafaudage, toiture, echelle, tremie ou bordure de dalle', workUnitId: 'btp-gros-oeuvre', situations: ['Travaux en toiture sans protection', 'Montage/demontage echafaudage', 'Bordure de dalle sans garde-corps', 'Tremie ouverte', 'Echelle mal calee'], defaultGravity: 4, defaultFrequency: 3, existingMeasures: ['Garde-corps perimetriques', 'Harnais antichute EN 361', 'Formation travail en hauteur'], proposedActions: ['Filets de securite sous zones de travail', 'Verification echafaudages par personne competente', 'Platelage des tremies', 'Nacelle plutot qu\'echelle quand possible', 'Interdiction de travailler seul en hauteur'], category: 'chute_hauteur' },
    { id: 'btp-ensevelissement', name: 'Ensevelissement / effondrement', description: 'Effondrement de tranchee non blindee, eboulement de structure instable', workUnitId: 'btp-gros-oeuvre', situations: ['Fouille > 1.30m sans blindage', 'Demolition sans etude prealable', 'Terrain instable apres pluie', 'Stockage en bord de fouille'], defaultGravity: 4, defaultFrequency: 2, existingMeasures: ['Blindage des tranchees > 1.30m', 'Etude de sol prealable'], proposedActions: ['Perimetre de securite materialise', 'Interdiction de stockage en bord de fouille', 'Evacuation par temps de forte pluie', 'Verification quotidienne blindages'], category: 'physique' },
    { id: 'btp-manutention', name: 'Manutention manuelle', description: 'Port de charges lourdes : parpaings (20kg), sacs de ciment (25-35kg), coffrages', workUnitId: 'btp-gros-oeuvre', situations: ['Transport de parpaings', 'Coulage beton a la brouette', 'Coffrage/decoffrage', 'Approvisionnement etages'], defaultGravity: 3, defaultFrequency: 4, existingMeasures: ['Monte-materiaux', 'Brouette motorisee pour certains chantiers'], proposedActions: ['Aide mecanique obligatoire > 25kg', 'Formation gestes et postures (recyclage 2 ans)', 'Organisation stockage a hauteur de travail', 'Rotation des taches lourdes/legeres'], category: 'manutention' },
    { id: 'btp-engins', name: 'Risque machines et engins', description: 'Ecrasement ou heurt par engin de chantier (pelleteuse, grue, chariot)', workUnitId: 'btp-gros-oeuvre', situations: ['Manoeuvre de pelleteuse en zone de travail', 'Zone de grutage non balisee', 'Recul d\'un camion benne', 'Basculement d\'engin'], defaultGravity: 4, defaultFrequency: 3, existingMeasures: ['CACES obligatoire', 'Plan de circulation chantier', 'Gilet haute visibilite'], proposedActions: ['Camera de recul sur tous les engins', 'Balisage zones d\'evolution engins', 'Briefing securite chaque matin', 'Interdiction de passer sous une charge en grue'], category: 'machines' },
    { id: 'btp-bruit', name: 'Bruit (> 85 dB)', description: 'Exposition au bruit de marteau-piqueur, disqueuse, compresseur, beton vibre', workUnitId: 'btp-gros-oeuvre', situations: ['Demolition au BRH (> 110 dB)', 'Decoupage disqueuse', 'Vibration du beton', 'Compresseur sur chantier'], defaultGravity: 3, defaultFrequency: 4, existingMeasures: ['Bouchons d\'oreilles EN 352 fournis', 'Alternance taches bruyantes'], proposedActions: ['Casque antibruit EN 352 obligatoire en zone > 85 dB', 'Limitation exposition continue (2h max sans pause)', 'Choix d\'outillage basse vibration/bruit', 'Audiogramme annuel pour ouvriers exposes', 'Affichage "zone bruyante" materialise'], category: 'bruit' },
    { id: 'btp-poussieres', name: 'Poussieres et fibres (silice, amiante)', description: 'Inhalation de poussieres de silice, ciment, bois, amiante dans bati ancien', workUnitId: 'btp-demolition', situations: ['Decoupage beton (silice cristalline)', 'Poncage enduits', 'Demolition bati pre-1997 (amiante)', 'Sciage bois traite'], defaultGravity: 3, defaultFrequency: 3, existingMeasures: ['Masque FFP3 EN 149', 'Aspiration a la source quand disponible'], proposedActions: ['Reperage amiante obligatoire avant travaux (DAT)', 'Aspiration a la source sur chaque outil de coupe', 'Humidification pour abattre les poussieres', 'Spirometrie annuelle si exposition reguliere', 'Zone confinee pour travaux generant des poussieres'], category: 'chimique' },
    { id: 'btp-vibrations', name: 'Vibrations mecaniques', description: 'Vibrations corps entier (conduite d\'engins) et main-bras (marteau-piqueur)', workUnitId: 'btp-gros-oeuvre', situations: ['Conduite de pelleteuse sur terrain inegal', 'Utilisation marteau-piqueur', 'Compacteur vibrant', 'Perforateur beton'], defaultGravity: 3, defaultFrequency: 3, existingMeasures: ['Sieges anti-vibrations sur les engins'], proposedActions: ['Limitation temps d\'exposition (declaration CARSAT)', 'Outils anti-vibrations (poignees amorties)', 'Suivi medical renforce (examen osteo-articulaire)', 'Rotation des operateurs sur outils vibrants'], category: 'vibrations' },
    { id: 'btp-chimique', name: 'Risque chimique', description: 'Contact ou inhalation de ciment (chromate), solvants, resines, peintures', workUnitId: 'btp-second-oeuvre', situations: ['Maconnerie (ciment — dermatite chromate)', 'Application peinture solvantee', 'Etancheite bitume chaud', 'Collage resines epoxy'], defaultGravity: 2, defaultFrequency: 3, existingMeasures: ['FDS disponibles sur chantier', 'Gants adaptes EN 374'], proposedActions: ['Substitution : peintures aqueuses, colles sans solvant', 'Ventilation zone de travail en interieur', 'Creme protectrice mains avant ciment', 'Formation lecture FDS', 'Stockage produits dans armoire ventilee'], category: 'chimique' },
    { id: 'btp-intemperies', name: 'Intemperies et temperatures extremes', description: 'Travail en exterieur par fortes chaleurs, grand froid, pluie ou vent fort', workUnitId: 'btp-gros-oeuvre', situations: ['Canicule estivale (> 33°C)', 'Gel hivernal', 'Vent fort sur echafaudage', 'Pluie rendant les surfaces glissantes'], defaultGravity: 2, defaultFrequency: 3, existingMeasures: ['Eau fraiche a disposition', 'Pauses regulieres'], proposedActions: ['Plan canicule chantier formalise', 'Amenagement horaires ete (6h-13h)', 'Report travaux en hauteur par vent > 60 km/h', 'Vetements thermiques fournis en hiver', 'Abri de chantier disponible'], category: 'thermique' },
  ],
};

// ═══════════════════════════════════════════════════════════════════
// BUREAU / TERTIAIRE (62-71)
// ═══════════════════════════════════════════════════════════════════

const BUREAU: MetierRiskProfile = {
  metierSlug: 'bureau',
  label: 'Bureau / Tertiaire / IT',
  category: 'tertiaire_bureau',
  nafCodes: ['62', '63', '69', '70', '71'],
  legalReferences: ['Art. R4542-1 a R4542-19 (ecrans)', 'NF EN 12464-1 (eclairage)', 'Art. R4228-1 (locaux sociaux)'],
  workUnits: [
    { id: 'bur-poste', name: 'Bureau / poste de travail', description: 'Poste informatique, bureau individuel ou open space', typicalHeadcount: '2-20' },
    { id: 'bur-reunion', name: 'Salle de reunion', description: 'Espaces de reunion, visioconference, brainstorming', typicalHeadcount: '2-15' },
    { id: 'bur-accueil', name: 'Accueil / reception', description: 'Zone d\'accueil des visiteurs et clients', typicalHeadcount: '1-2' },
    { id: 'bur-archives', name: 'Archives / stockage', description: 'Local de stockage documents, fournitures, serveur informatique', typicalHeadcount: '0-1' },
  ],
  risks: [
    { id: 'bur-ecran', name: 'Travail sur ecran (fatigue visuelle, TMS)', description: 'Fatigue visuelle, secheresse oculaire, douleurs cervicales et poignets', workUnitId: 'bur-poste', situations: ['Ecran non regle (trop haut/bas)', 'Reflets sur ecran', 'Travail prolonge > 4h sans pause', 'Double ecran mal positionne'], defaultGravity: 2, defaultFrequency: 4, existingMeasures: ['Ecran fourni', 'Siege de bureau standard'], proposedActions: ['Ecran a hauteur des yeux (support reglable)', 'Regle 20/20/20 (pause visuelle toutes les 20 min)', 'Clavier et souris ergonomiques', 'Eclairage 500 lux sans reflet direct', 'Evaluation ergonomique du poste (annuelle)'], category: 'ergonomique' },
    { id: 'bur-sedentarite', name: 'Sedentarite', description: 'Position assise prolongee, risques cardiovasculaires, lombalgies', workUnitId: 'bur-poste', situations: ['Journee complete assise (8h)', 'Reunions longues sans mouvement', 'Teletravail sans amenagement'], defaultGravity: 2, defaultFrequency: 4, existingMeasures: ['Pauses non encadrees'], proposedActions: ['Bureau assis-debout (au moins 1 par equipe)', 'Pauses actives 5 min toutes les 2h', 'Encourager marche (reunions debout courtes)', 'Partenariat salle de sport ou forfait mobilite'], category: 'ergonomique' },
    { id: 'bur-stress', name: 'Stress et charge mentale', description: 'Pression des deadlines, surcharge informationnelle, interruptions en open space', workUnitId: 'bur-poste', situations: ['Delais serres', 'Multi-taches permanent', 'Interruptions en open space', 'Mails/notifications continus', 'Reunions excessives'], defaultGravity: 2, defaultFrequency: 3, existingMeasures: ['Droit a la deconnexion (charte)'], proposedActions: ['Plages "focus" sans reunion ni interruption', 'Espaces calmes / bulles de concentration', 'Maximum 3h de reunions par jour', 'Entretien charge de travail semestriel', 'Formation gestion du temps et des priorites'], category: 'psychosocial' },
    { id: 'bur-harcelement', name: 'Harcelement moral ou sexuel', description: 'Risque de harcelement dans les relations hierarchiques ou entre collegues', workUnitId: 'bur-poste', situations: ['Relations hierarchiques desequilibrees', 'Mise a l\'ecart', 'Propos deplaces', 'Surcharge intentionnelle'], defaultGravity: 3, defaultFrequency: 1, existingMeasures: ['Referent harcelement designe'], proposedActions: ['Procedure de signalement affichee et accessible', 'Sensibilisation annuelle obligatoire (tous les salaries)', 'Charte de bonne conduite signee', 'Canal de signalement anonyme', 'Enquete climat social annuelle'], category: 'psychosocial' },
    { id: 'bur-qualite-air', name: 'Qualite de l\'air interieur', description: 'CO2, polluants interieurs, climatisation mal entretenue, syndrome du batiment malsain', workUnitId: 'bur-reunion', situations: ['Salle de reunion fermee > 1h', 'Climatisation non entretenue', 'Imprimante laser dans le bureau', 'Moquette emettant des COV'], defaultGravity: 1, defaultFrequency: 3, existingMeasures: ['Aeration possible (fenetres)'], proposedActions: ['Entretien climatisation annuel (filtres)', 'Capteur CO2 dans salles de reunion', 'Aeration quotidienne 15 min (matin)', 'Imprimantes dans local dedie (pas dans le bureau)', 'Plantes depolluantes (complementaire)'], category: 'biologique' },
    { id: 'bur-tms', name: 'TMS posture assise', description: 'Lombalgies, cervicalgies, syndrome du canal carpien', workUnitId: 'bur-poste', situations: ['Siege non regle (hauteur, dossier)', 'Ecran decentre (rotation cervicale)', 'Souris trop eloignee', 'Pieds ne touchent pas le sol'], defaultGravity: 2, defaultFrequency: 4, existingMeasures: ['Siege reglable fourni'], proposedActions: ['Siege avec soutien lombaire reglable', 'Formation reglage poste de travail (auto-evaluation)', 'Repose-pieds si necessaire', 'Evaluation ergonomique par le medecin du travail'], category: 'ergonomique' },
    { id: 'bur-isolement', name: 'Isolement en teletravail', description: 'Perte de lien social, difficulte a deconnecter, surcharge en teletravail', workUnitId: 'bur-poste', situations: ['Teletravail 100% prolonge', 'Equipes distribuees (pas de contact physique)', 'Nouveau collaborateur en teletravail', 'Difficulte a poser des limites'], defaultGravity: 2, defaultFrequency: 3, existingMeasures: ['Outils collaboratifs (visio, chat)'], proposedActions: ['Maximum 3 jours teletravail/semaine', 'Reunions d\'equipe en presentiel hebdomadaires', 'Droit a la deconnexion apres 19h', 'Onboarding presentiel pour les nouveaux', 'Point individuel manager bi-mensuel'], category: 'psychosocial' },
  ],
};

// ═══════════════════════════════════════════════════════════════════
// PHARMACIE D'OFFICINE (47.73Z)
// ═══════════════════════════════════════════════════════════════════

const PHARMACIE: MetierRiskProfile = {
  metierSlug: 'pharmacie',
  label: 'Pharmacie d\'officine',
  category: 'sante_social',
  nafCodes: ['47.73Z'],
  idcc: '1996',
  legalReferences: ['Code de la sante publique', 'Art. R4412-1 (agents chimiques)', 'Art. R4541-1 (manutention)'],
  workUnits: [
    { id: 'pha-comptoir', name: 'Comptoir / dispensation', description: 'Zone de dispensation des medicaments, conseil aux patients', typicalHeadcount: '2-5' },
    { id: 'pha-back', name: 'Back-office / preparation', description: 'Preparation des ordonnances, verification, stockage courant', typicalHeadcount: '1-3' },
    { id: 'pha-reserve', name: 'Reserve / stockage', description: 'Reserve de medicaments, reception livraisons, gestion stocks', typicalHeadcount: '1' },
    { id: 'pha-labo', name: 'Laboratoire / preparations', description: 'Preparations magistrales, dermocosmétique', typicalHeadcount: '0-1' },
  ],
  risks: [
    { id: 'pha-agression', name: 'Agressions / braquage', description: 'Vol de stupefiants, braquage, incivilites patients', workUnitId: 'pha-comptoir', situations: ['Demande de stupefiants sans ordonnance', 'Braquage a la fermeture', 'Client agressif', 'File d\'attente longue en periode epidemique'], defaultGravity: 4, defaultFrequency: 2, existingMeasures: ['Video-surveillance', 'Vitre de protection', 'Coffre stupefiants'], proposedActions: ['Procedure anti-braquage formalisee et exercee', 'Bouton d\'alerte silencieux', 'Formation desescalade', 'Fermeture a deux', 'Eclairage exterieur renforce'], category: 'psychosocial' },
    { id: 'pha-station-debout', name: 'Station debout prolongee / TMS', description: 'Station debout 8h au comptoir, gestes repetitifs de dispensation', workUnitId: 'pha-comptoir', situations: ['Dispensation au comptoir (debout toute la journee)', 'Scan ordonnances repetitif', 'Mouvements repetitifs de saisie'], defaultGravity: 2, defaultFrequency: 4, existingMeasures: ['Tapis anti-fatigue a certains postes'], proposedActions: ['Tapis anti-fatigue a chaque poste comptoir', 'Siege assis-debout disponible', 'Rotation comptoir/back-office toutes les 2h', 'Chaussures avec soutien de voute plantaire'], category: 'ergonomique' },
    { id: 'pha-chimique', name: 'Risque chimique (preparations)', description: 'Exposition aux principes actifs lors de preparations magistrales', workUnitId: 'pha-labo', situations: ['Pesee de poudres', 'Melange de preparations', 'Nettoyage materiel', 'Manipulation cytotoxiques (rare)'], defaultGravity: 3, defaultFrequency: 2, existingMeasures: ['Gants de laboratoire', 'Hotte aspirante (si existante)'], proposedActions: ['Hotte a flux laminaire pour preparations sensibles', 'Masque FFP2 pour poudres', 'FDS affichees au labo', 'Protocole de nettoyage apres preparation'], category: 'chimique' },
    { id: 'pha-manutention', name: 'Manutention (cartons, bacs)', description: 'Reception et rangement des livraisons quotidiennes (cartons de medicaments)', workUnitId: 'pha-reserve', situations: ['Reception livraison quotidienne (10-20 cartons)', 'Rangement en reserve (etageres hautes)', 'Bacs de retour', 'Escabeau pour rayons hauts'], defaultGravity: 2, defaultFrequency: 3, existingMeasures: ['Chariot de livraison', 'Rangement des lourds en bas'], proposedActions: ['Escabeau securise (antiderapant)', 'Limite de poids par carton connue', 'Etageres a hauteur d\'homme (pas > 1.80m)', 'Rotation de la tache reception entre l\'equipe'], category: 'manutention' },
    { id: 'pha-biologique', name: 'Risque biologique (contact patients)', description: 'Contamination par patients malades, manipulation de tests', workUnitId: 'pha-comptoir', situations: ['Contact avec patients contagieux', 'Tests antigéniques COVID/grippe', 'Vaccination en officine', 'Manipulation DASRI'], defaultGravity: 3, defaultFrequency: 3, existingMeasures: ['Gel hydroalcoolique', 'Masques disponibles'], proposedActions: ['Vitre plexiglass au comptoir (permanent)', 'Kit DASRI avec collecteur aiguilles', 'Vaccination a jour de l\'equipe', 'Formation AES (accident exposition au sang)', 'Aeration renforcee espace patients'], category: 'biologique' },
    { id: 'pha-rps', name: 'Charge mentale / responsabilite', description: 'Responsabilite de dispensation, erreur medicamenteuse, clients exigeants', workUnitId: 'pha-comptoir', situations: ['Erreur de dispensation (risque vital)', 'Demandes hors competence', 'Gardes de nuit/dimanche', 'Affluence epidemique'], defaultGravity: 2, defaultFrequency: 3, existingMeasures: ['Double controle des ordonnances'], proposedActions: ['Logiciel de dispensation avec alertes interactions', 'Procedure de double verification des dosages a risque', 'Planning gardes equilibre', 'Formation gestion du stress'], category: 'psychosocial' },
  ],
};

// ═══════════════════════════════════════════════════════════════════
// PLOMBIER-CHAUFFAGISTE (43.22A)
// ═══════════════════════════════════════════════════════════════════

const PLOMBIER: MetierRiskProfile = {
  metierSlug: 'plombier',
  label: 'Plombier-chauffagiste',
  category: 'btp_construction',
  nafCodes: ['43.22A', '43.22B'],
  idcc: '1597',
  legalReferences: ['Art. R4534-1 (travaux BTP)', 'NF C 18-510 (habilitation electrique)', 'Art. R4412-1 (agents chimiques)', 'Arrete du 2 aout 1977 (soudage)'],
  workUnits: [
    { id: 'plb-chantier', name: 'Chantier (neuf ou renovation)', description: 'Travaux d\'installation sur chantier de construction ou en renovation', typicalHeadcount: '1-4' },
    { id: 'plb-depannage', name: 'Depannage / intervention urgente', description: 'Interventions chez le particulier pour fuites, pannes chauffage', typicalHeadcount: '1' },
    { id: 'plb-soudure', name: 'Brasage / soudure', description: 'Assemblage par brasage, soudure au chalumeau, sertissage', typicalHeadcount: '1-2' },
    { id: 'plb-atelier', name: 'Atelier / preparation', description: 'Debit de tubes, prefabrication, stockage materiel', typicalHeadcount: '1-2' },
    { id: 'plb-vehicule', name: 'Vehicule / deplacements', description: 'Conduite camionnette, transport materiel et outillage', typicalHeadcount: '1-2' },
  ],
  risks: [
    { id: 'plb-brulure', name: 'Brulures (chalumeau, tubes chauds)', description: 'Brulure par chalumeau (> 800°C), contact avec tubes brases, eau chaude', workUnitId: 'plb-soudure', situations: ['Brasage cuivre au chalumeau', 'Contact tube juste brase', 'Projection soudure', 'Eau chaude sous pression'], defaultGravity: 3, defaultFrequency: 3, existingMeasures: ['Gants cuir soudeur', 'Lunettes soudure'], proposedActions: ['Ecran thermique protecteur a chaque brasage', 'Signalisation "tube chaud" apres brasage', 'Extincteur a proximite du poste', 'Permis de feu en milieu occupe'], category: 'thermique' },
    { id: 'plb-postures', name: 'Postures contraignantes', description: 'Travail dans des positions penibles : vides sanitaires, combles, sous evier', workUnitId: 'plb-chantier', situations: ['Sous evier (dos courbe)', 'Vide sanitaire (ramper)', 'Combles (position accroupie)', 'Gaines techniques etroites'], defaultGravity: 2, defaultFrequency: 4, existingMeasures: ['Genouilleres disponibles'], proposedActions: ['Tapis de protection genoux/dos', 'Alternance interventions contraignantes/non contraignantes', 'Outillage a manche long', 'Etirements debut et fin de journee'], category: 'ergonomique' },
    { id: 'plb-chimique', name: 'Risque chimique (flux, colles, plomb)', description: 'Exposition aux flux de soudure, colles PVC, decapant, plomb sur ancien reseau', workUnitId: 'plb-soudure', situations: ['Fumees de flux de brasage', 'Collage PVC (solvants)', 'Decapage ancien reseau plomb', 'Purge reseaux anciens'], defaultGravity: 3, defaultFrequency: 3, existingMeasures: ['Gants de protection', 'Ventilation quand possible'], proposedActions: ['Masque A2 pour brasage en espace confine', 'Substitution : colles sans solvant quand possible', 'Formation risque plomb (ancien reseau)', 'Lavage mains avant repas (exposition plomb)', 'FDS affichees dans le vehicule'], category: 'chimique' },
    { id: 'plb-legionelle', name: 'Risque biologique (legionelle, eaux usees)', description: 'Exposition a la legionelle dans les reseaux d\'eau chaude, contact eaux usees', workUnitId: 'plb-depannage', situations: ['Intervention sur ballon eau chaude (aerosols)', 'Debouchage canalisations', 'Contact eaux vannes', 'Nettoyage fosse septique'], defaultGravity: 3, defaultFrequency: 2, existingMeasures: ['Gants etanches', 'Hygiene des mains'], proposedActions: ['Masque FFP2 si intervention sur ballon ECS > 50°C', 'Gants longs etanches pour eaux usees', 'Vaccination hepatite A recommandee', 'Protocole hygiene apres intervention assainissement'], category: 'biologique' },
    { id: 'plb-manutention', name: 'Manutention (chaudieres, radiateurs, tubes)', description: 'Port de charges lourdes : chaudieres (50-100kg), radiateurs, tubes de 6m', workUnitId: 'plb-chantier', situations: ['Installation chaudiere murale (40-60kg)', 'Transport radiateurs en fonte', 'Manipulation tubes cuivre/PER en longueur', 'Montee d\'escalier avec chaudiere'], defaultGravity: 3, defaultFrequency: 3, existingMeasures: ['Diable disponible', 'Travail a deux pour les charges lourdes'], proposedActions: ['Monte-charge/treuil pour chaudieres a l\'etage', 'Chariot escalier pour pieces lourdes', 'Limite de poids par personne (25kg)', 'Livraison directe a l\'etage par fournisseur'], category: 'manutention' },
    { id: 'plb-electrique', name: 'Risque electrique', description: 'Contact electrique lors du raccordement de chaudieres, cumulus, pompes', workUnitId: 'plb-depannage', situations: ['Raccordement chaudiere electrique', 'Intervention sur cumulus', 'Proximite tableau electrique non consigne'], defaultGravity: 3, defaultFrequency: 2, existingMeasures: ['VAT (verificateur absence tension)', 'Habilitation electrique basique'], proposedActions: ['Habilitation electrique BS/BE a jour', 'Outillage isole 1000V', 'Procedure de consignation avant intervention', 'Verification absence tension systematique'], category: 'electrique' },
    { id: 'plb-chute', name: 'Chute de hauteur', description: 'Chute depuis echelle, escabeau ou toiture lors d\'intervention sur chauffage', workUnitId: 'plb-chantier', situations: ['Acces toiture (chaudiere, VMC)', 'Echelle appuyee sur gouttiere', 'Intervention en faux-plafond', 'Acces comble par trappe'], defaultGravity: 3, defaultFrequency: 2, existingMeasures: ['Echelle conforme', 'Regle des 3 points d\'appui'], proposedActions: ['Nacelle ou PIRL plutot qu\'echelle', 'Garde-corps si intervention reguliere en toiture', 'Formation travail en hauteur', 'Eclairage portatif pour combles'], category: 'chute_hauteur' },
    { id: 'plb-routier', name: 'Risque routier', description: 'Accidents lors des deplacements entre chantiers/depannages (5-10/jour)', workUnitId: 'plb-vehicule', situations: ['Deplacements frequents (50-100 km/jour)', 'Urgence depannage (pression)', 'Vehicule charge (equilibre)', 'Fatigue en fin de tournee'], defaultGravity: 3, defaultFrequency: 3, existingMeasures: ['Vehicule entretenu', 'GPS'], proposedActions: ['Optimisation tournees (reduction km)', 'Temps de trajet integre (pas compresse)', 'Arrimage du materiel dans le vehicule', 'Formation eco-conduite'], category: 'routier' },
  ],
};

// ── Imports des modules de metiers ───────────────────────────────────

import { BTP_TRADES } from './trades-btp.js';
import { ALIMENTAIRE_TRADES } from './trades-alimentaire.js';
import { COMMERCE_TRADES } from './trades-commerce.js';
import { SANTE_TRADES } from './trades-sante.js';
import { TERTIAIRE_TRADES } from './trades-tertiaire.js';
import { INDUSTRIE_TRADES } from './trades-industrie.js';

// ── Registre complet ────────────────────────────────────────────────

export const METIER_RISK_DATABASE: MetierRiskProfile[] = [
  BTP_GENERAL,
  ELECTRICIEN,
  PLOMBIER,
  RESTAURANT,
  BOULANGERIE,
  COIFFURE,
  COMMERCE,
  GARAGE,
  AIDE_DOMICILE,
  BUREAU,
  PHARMACIE,
  ...BTP_TRADES,
  ...ALIMENTAIRE_TRADES,
  ...COMMERCE_TRADES,
  ...SANTE_TRADES,
  ...TERTIAIRE_TRADES,
  ...INDUSTRIE_TRADES,
];

// ── Lookup functions ────────────────────────────────────────────────

export function findMetierByNaf(nafCode: string): MetierRiskProfile | undefined {
  const exact = METIER_RISK_DATABASE.find((m) => m.nafCodes.includes(nafCode));
  if (exact) return exact;
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

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

export function calculateRiskScore(gravity: number, frequency: number): number {
  return gravity * frequency;
}

export function getRiskLevel(score: number): RiskLevel {
  if (score <= 4) return 'low';
  if (score <= 8) return 'medium';
  if (score <= 12) return 'high';
  return 'critical';
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
    case 'low': return '#22c55e';
    case 'medium': return '#eab308';
    case 'high': return '#f97316';
    case 'critical': return '#ef4444';
  }
}
