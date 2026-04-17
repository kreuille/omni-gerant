import type { JobCategory, PhysicalConstraint, WorkSchedule } from './hr.schemas.js';

// BUSINESS RULE [CDC-2.4]: Templates de postes pre-remplis par metier/code NAF
// L'utilisateur ajuste les effectifs et ajoute/supprime les postes selon sa situation reelle.

export interface JobPositionTemplate {
  name: string;
  category: JobCategory;
  typicalHeadcount: string;
  defaultWorkUnitSlugs: string[];
  typicalEquipment: string[];
  typicalChemicalExposures: string[];
  typicalPhysicalConstraints: PhysicalConstraint[];
  typicalSchedule: WorkSchedule;
  requiredTrainings: string[];
  medicalSurveillanceLevel: 'standard' | 'enhanced';
}

export interface JobTemplate {
  metierSlug: string;
  label: string;
  nafCodes: string[];
  positions: JobPositionTemplate[];
}

// ── Helper: default schedule ────────────────────────────────────────
function stdSchedule(overrides: Partial<WorkSchedule> = {}): WorkSchedule {
  return { type: 'standard', weeklyHours: 35, nightWork: false, weekendWork: false, outdoorWork: false, travelRequired: false, remoteWork: false, ...overrides };
}

// ── BTP (41-43) ─────────────────────────────────────────────────────
const btpTemplate: JobTemplate = {
  metierSlug: 'btp',
  label: 'BTP / Construction',
  nafCodes: ['41', '42', '43'],
  positions: [
    {
      name: 'Chef de chantier',
      category: 'technicien',
      typicalHeadcount: '1',
      defaultWorkUnitSlugs: ['chantier', 'bureau'],
      typicalEquipment: ['Radio', 'Plans', 'EPI complet'],
      typicalChemicalExposures: [],
      typicalPhysicalConstraints: [
        { type: 'prolonged_standing', frequency: 'daily' },
        { type: 'noise', frequency: 'frequent' },
      ],
      typicalSchedule: stdSchedule({ weeklyHours: 39, outdoorWork: true }),
      requiredTrainings: ['SST', 'AIPR'],
      medicalSurveillanceLevel: 'standard',
    },
    {
      name: 'Macon / Coffreur',
      category: 'ouvrier',
      typicalHeadcount: '2-6',
      defaultWorkUnitSlugs: ['chantier', 'stockage'],
      typicalEquipment: ['Betonniere', 'Coffrage', 'Echafaudage'],
      typicalChemicalExposures: ['Ciment', 'Adjuvants beton'],
      typicalPhysicalConstraints: [
        { type: 'manual_handling', frequency: 'daily' },
        { type: 'forced_postures', frequency: 'frequent' },
        { type: 'noise', frequency: 'frequent' },
        { type: 'height_work', frequency: 'frequent' },
      ],
      typicalSchedule: stdSchedule({ weeklyHours: 39, outdoorWork: true }),
      requiredTrainings: ['SST', 'Travail en hauteur', 'Gestes et postures'],
      medicalSurveillanceLevel: 'enhanced',
    },
    {
      name: 'Electricien batiment',
      category: 'ouvrier',
      typicalHeadcount: '1-3',
      defaultWorkUnitSlugs: ['chantier', 'electricite'],
      typicalEquipment: ['Outillage electro', 'Multimetre', 'Echelle'],
      typicalChemicalExposures: [],
      typicalPhysicalConstraints: [
        { type: 'height_work', frequency: 'frequent' },
        { type: 'forced_postures', frequency: 'frequent' },
      ],
      typicalSchedule: stdSchedule({ weeklyHours: 39, outdoorWork: true }),
      requiredTrainings: ['Habilitation electrique NF C 18-510', 'SST'],
      medicalSurveillanceLevel: 'enhanced',
    },
    {
      name: 'Plombier-chauffagiste',
      category: 'ouvrier',
      typicalHeadcount: '1-3',
      defaultWorkUnitSlugs: ['chantier', 'plomberie'],
      typicalEquipment: ['Chalumeau', 'Cintreuse', 'Outillage plomberie'],
      typicalChemicalExposures: ['Flux soudure', 'Plomb (ancien reseau)'],
      typicalPhysicalConstraints: [
        { type: 'forced_postures', frequency: 'daily' },
        { type: 'manual_handling', frequency: 'frequent' },
      ],
      typicalSchedule: stdSchedule({ weeklyHours: 39, outdoorWork: true }),
      requiredTrainings: ['SST', 'Manipulation fluides frigorigenes'],
      medicalSurveillanceLevel: 'enhanced',
    },
    {
      name: "Conducteur d'engins",
      category: 'ouvrier',
      typicalHeadcount: '1-2',
      defaultWorkUnitSlugs: ['chantier', 'demolition'],
      typicalEquipment: ['Pelleteuse', 'Chargeuse', 'Mini-pelle'],
      typicalChemicalExposures: [],
      typicalPhysicalConstraints: [
        { type: 'vibrations', frequency: 'daily' },
        { type: 'prolonged_sitting', frequency: 'daily' },
        { type: 'noise', frequency: 'daily' },
      ],
      typicalSchedule: stdSchedule({ weeklyHours: 39, outdoorWork: true }),
      requiredTrainings: ['CACES R482', 'SST'],
      medicalSurveillanceLevel: 'enhanced',
    },
    {
      name: 'Manoeuvre',
      category: 'ouvrier',
      typicalHeadcount: '2-4',
      defaultWorkUnitSlugs: ['chantier', 'stockage'],
      typicalEquipment: ['Brouette', 'Diable', 'Outillage de base'],
      typicalChemicalExposures: [],
      typicalPhysicalConstraints: [
        { type: 'manual_handling', frequency: 'daily' },
        { type: 'prolonged_standing', frequency: 'daily' },
      ],
      typicalSchedule: stdSchedule({ weeklyHours: 39, outdoorWork: true }),
      requiredTrainings: ['SST', 'Gestes et postures'],
      medicalSurveillanceLevel: 'standard',
    },
    {
      name: 'Apprenti',
      category: 'apprenti',
      typicalHeadcount: '1-2',
      defaultWorkUnitSlugs: ['chantier'],
      typicalEquipment: ['Selon specialite'],
      typicalChemicalExposures: [],
      typicalPhysicalConstraints: [
        { type: 'manual_handling', frequency: 'frequent' },
      ],
      typicalSchedule: stdSchedule({ weeklyHours: 35, outdoorWork: true }),
      requiredTrainings: ['SST'],
      medicalSurveillanceLevel: 'standard',
    },
    {
      name: 'Secretaire / Comptable',
      category: 'employe',
      typicalHeadcount: '1',
      defaultWorkUnitSlugs: ['bureau'],
      typicalEquipment: ['Ordinateur', 'Telephone'],
      typicalChemicalExposures: [],
      typicalPhysicalConstraints: [
        { type: 'prolonged_sitting', frequency: 'daily' },
      ],
      typicalSchedule: stdSchedule(),
      requiredTrainings: ['SST'],
      medicalSurveillanceLevel: 'standard',
    },
  ],
};

// ── Restaurant (56.10A) ─────────────────────────────────────────────
const restaurantTemplate: JobTemplate = {
  metierSlug: 'restaurant',
  label: 'Restauration',
  nafCodes: ['56.10', '56.10A', '56.10B', '56.10C'],
  positions: [
    {
      name: 'Chef cuisinier',
      category: 'technicien',
      typicalHeadcount: '1',
      defaultWorkUnitSlugs: ['cuisine'],
      typicalEquipment: ['Couteaux', 'Fours', 'Friteuses', 'Piano'],
      typicalChemicalExposures: ['Produits de nettoyage'],
      typicalPhysicalConstraints: [
        { type: 'prolonged_standing', frequency: 'daily' },
        { type: 'extreme_temperatures', frequency: 'daily' },
        { type: 'repetitive_movements', frequency: 'daily' },
      ],
      typicalSchedule: stdSchedule({ weeklyHours: 39, weekendWork: true }),
      requiredTrainings: ['HACCP', 'SST'],
      medicalSurveillanceLevel: 'standard',
    },
    {
      name: 'Cuisinier / Commis',
      category: 'ouvrier',
      typicalHeadcount: '2-4',
      defaultWorkUnitSlugs: ['cuisine', 'plonge'],
      typicalEquipment: ['Couteaux', 'Trancheuse', 'Batteur'],
      typicalChemicalExposures: ['Produits de nettoyage'],
      typicalPhysicalConstraints: [
        { type: 'prolonged_standing', frequency: 'daily' },
        { type: 'extreme_temperatures', frequency: 'frequent' },
        { type: 'repetitive_movements', frequency: 'daily' },
        { type: 'manual_handling', frequency: 'frequent' },
      ],
      typicalSchedule: stdSchedule({ weeklyHours: 39, weekendWork: true }),
      requiredTrainings: ['HACCP', 'SST'],
      medicalSurveillanceLevel: 'standard',
    },
    {
      name: 'Serveur',
      category: 'employe',
      typicalHeadcount: '2-5',
      defaultWorkUnitSlugs: ['salle', 'terrasse', 'bar'],
      typicalEquipment: ['Plateau', 'Caisse'],
      typicalChemicalExposures: [],
      typicalPhysicalConstraints: [
        { type: 'prolonged_standing', frequency: 'daily' },
        { type: 'manual_handling', frequency: 'frequent' },
      ],
      typicalSchedule: stdSchedule({ weeklyHours: 39, weekendWork: true }),
      requiredTrainings: ['SST', 'Licence debit boissons'],
      medicalSurveillanceLevel: 'standard',
    },
    {
      name: 'Plongeur',
      category: 'ouvrier',
      typicalHeadcount: '1-2',
      defaultWorkUnitSlugs: ['plonge'],
      typicalEquipment: ['Lave-vaisselle industriel'],
      typicalChemicalExposures: ['Produits lessiviels industriels'],
      typicalPhysicalConstraints: [
        { type: 'prolonged_standing', frequency: 'daily' },
        { type: 'repetitive_movements', frequency: 'daily' },
        { type: 'extreme_temperatures', frequency: 'frequent' },
      ],
      typicalSchedule: stdSchedule({ weeklyHours: 39, weekendWork: true }),
      requiredTrainings: ['HACCP', 'SST'],
      medicalSurveillanceLevel: 'standard',
    },
    {
      name: 'Barman',
      category: 'employe',
      typicalHeadcount: '1-2',
      defaultWorkUnitSlugs: ['bar'],
      typicalEquipment: ['Verres', 'Machine a cafe', 'Tireuse'],
      typicalChemicalExposures: [],
      typicalPhysicalConstraints: [
        { type: 'prolonged_standing', frequency: 'daily' },
      ],
      typicalSchedule: stdSchedule({ weeklyHours: 39, weekendWork: true, nightWork: true }),
      requiredTrainings: ['SST', 'Licence debit boissons'],
      medicalSurveillanceLevel: 'enhanced',
    },
    {
      name: 'Gerant',
      category: 'dirigeant',
      typicalHeadcount: '1',
      defaultWorkUnitSlugs: ['bureau', 'salle'],
      typicalEquipment: ['Ordinateur', 'Caisse'],
      typicalChemicalExposures: [],
      typicalPhysicalConstraints: [
        { type: 'prolonged_standing', frequency: 'frequent' },
      ],
      typicalSchedule: stdSchedule({ weeklyHours: 45, weekendWork: true }),
      requiredTrainings: ['HACCP', 'SST'],
      medicalSurveillanceLevel: 'standard',
    },
  ],
};

// ── Coiffure (96.02A) ───────────────────────────────────────────────
const coiffureTemplate: JobTemplate = {
  metierSlug: 'coiffure',
  label: 'Coiffure',
  nafCodes: ['96.02A'],
  positions: [
    {
      name: 'Coiffeur / Coiffeuse',
      category: 'ouvrier',
      typicalHeadcount: '2-4',
      defaultWorkUnitSlugs: ['coupe', 'coloration', 'bac'],
      typicalEquipment: ['Ciseaux', 'Seche-cheveux', 'Tondeuse', 'Fers'],
      typicalChemicalExposures: ['Colorations', 'Permanentes', 'Decolorants'],
      typicalPhysicalConstraints: [
        { type: 'prolonged_standing', frequency: 'daily' },
        { type: 'repetitive_movements', frequency: 'daily' },
        { type: 'forced_postures', frequency: 'frequent' },
      ],
      typicalSchedule: stdSchedule({ weeklyHours: 35, weekendWork: true }),
      requiredTrainings: ['BP Coiffure', 'SST'],
      medicalSurveillanceLevel: 'enhanced',
    },
    {
      name: 'Coloriste',
      category: 'ouvrier',
      typicalHeadcount: '1-2',
      defaultWorkUnitSlugs: ['coloration'],
      typicalEquipment: ['Bols coloration', 'Papier meches', 'Casques'],
      typicalChemicalExposures: ['Colorations capillaires', 'Oxydants', 'Ammoniaque'],
      typicalPhysicalConstraints: [
        { type: 'prolonged_standing', frequency: 'daily' },
        { type: 'repetitive_movements', frequency: 'daily' },
      ],
      typicalSchedule: stdSchedule({ weeklyHours: 35, weekendWork: true }),
      requiredTrainings: ['Formation coloration', 'SST'],
      medicalSurveillanceLevel: 'enhanced',
    },
    {
      name: 'Apprenti(e)',
      category: 'apprenti',
      typicalHeadcount: '1-2',
      defaultWorkUnitSlugs: ['bac', 'coupe'],
      typicalEquipment: ['Selon progression'],
      typicalChemicalExposures: ['Shampoings professionnels'],
      typicalPhysicalConstraints: [
        { type: 'prolonged_standing', frequency: 'daily' },
        { type: 'forced_postures', frequency: 'frequent' },
      ],
      typicalSchedule: stdSchedule({ weeklyHours: 35, weekendWork: true }),
      requiredTrainings: ['CAP Coiffure en cours'],
      medicalSurveillanceLevel: 'standard',
    },
    {
      name: 'Gerant(e)',
      category: 'dirigeant',
      typicalHeadcount: '1',
      defaultWorkUnitSlugs: ['accueil', 'coupe'],
      typicalEquipment: ['Caisse', 'Ordinateur'],
      typicalChemicalExposures: ['Colorations'],
      typicalPhysicalConstraints: [
        { type: 'prolonged_standing', frequency: 'daily' },
      ],
      typicalSchedule: stdSchedule({ weeklyHours: 40, weekendWork: true }),
      requiredTrainings: ['BP Coiffure', 'SST'],
      medicalSurveillanceLevel: 'standard',
    },
  ],
};

// ── Commerce (47.xx) ────────────────────────────────────────────────
const commerceTemplate: JobTemplate = {
  metierSlug: 'commerce',
  label: 'Commerce de detail',
  nafCodes: ['47'],
  positions: [
    {
      name: 'Vendeur / Vendeuse',
      category: 'employe',
      typicalHeadcount: '2-5',
      defaultWorkUnitSlugs: ['vente', 'caisse'],
      typicalEquipment: ['Caisse', 'Portique antivol'],
      typicalChemicalExposures: [],
      typicalPhysicalConstraints: [
        { type: 'prolonged_standing', frequency: 'daily' },
        { type: 'manual_handling', frequency: 'frequent' },
      ],
      typicalSchedule: stdSchedule({ weeklyHours: 35, weekendWork: true }),
      requiredTrainings: ['SST', 'Gestes et postures'],
      medicalSurveillanceLevel: 'standard',
    },
    {
      name: 'Magasinier',
      category: 'ouvrier',
      typicalHeadcount: '1-2',
      defaultWorkUnitSlugs: ['reserve', 'livraison'],
      typicalEquipment: ['Transpalette', 'Diable', 'Echelle'],
      typicalChemicalExposures: [],
      typicalPhysicalConstraints: [
        { type: 'manual_handling', frequency: 'daily' },
        { type: 'prolonged_standing', frequency: 'daily' },
      ],
      typicalSchedule: stdSchedule({ weeklyHours: 35 }),
      requiredTrainings: ['CACES R485', 'SST', 'Gestes et postures'],
      medicalSurveillanceLevel: 'standard',
    },
    {
      name: 'Responsable rayon',
      category: 'technicien',
      typicalHeadcount: '1-2',
      defaultWorkUnitSlugs: ['vente', 'reserve'],
      typicalEquipment: ['Ordinateur', 'PDA'],
      typicalChemicalExposures: [],
      typicalPhysicalConstraints: [
        { type: 'prolonged_standing', frequency: 'frequent' },
      ],
      typicalSchedule: stdSchedule({ weeklyHours: 39, weekendWork: true }),
      requiredTrainings: ['SST'],
      medicalSurveillanceLevel: 'standard',
    },
    {
      name: 'Caissier / Caissiere',
      category: 'employe',
      typicalHeadcount: '1-3',
      defaultWorkUnitSlugs: ['caisse'],
      typicalEquipment: ['Caisse enregistreuse', 'TPE'],
      typicalChemicalExposures: [],
      typicalPhysicalConstraints: [
        { type: 'prolonged_sitting', frequency: 'daily' },
        { type: 'repetitive_movements', frequency: 'daily' },
      ],
      typicalSchedule: stdSchedule({ weeklyHours: 35, weekendWork: true }),
      requiredTrainings: ['SST'],
      medicalSurveillanceLevel: 'standard',
    },
    {
      name: 'Gerant',
      category: 'dirigeant',
      typicalHeadcount: '1',
      defaultWorkUnitSlugs: ['bureau', 'vente'],
      typicalEquipment: ['Ordinateur'],
      typicalChemicalExposures: [],
      typicalPhysicalConstraints: [],
      typicalSchedule: stdSchedule({ weeklyHours: 45, weekendWork: true }),
      requiredTrainings: ['SST'],
      medicalSurveillanceLevel: 'standard',
    },
  ],
};

// ── Boulangerie (10.71C) ────────────────────────────────────────────
const boulangerieTemplate: JobTemplate = {
  metierSlug: 'boulangerie',
  label: 'Boulangerie-Patisserie',
  nafCodes: ['10.71C', '10.71A', '10.71B', '10.71D'],
  positions: [
    {
      name: 'Boulanger',
      category: 'ouvrier',
      typicalHeadcount: '1-3',
      defaultWorkUnitSlugs: ['fournil'],
      typicalEquipment: ['Petrin', 'Four', 'Diviseuse', 'Chambre de pousse'],
      typicalChemicalExposures: ['Farine (poussieres)', 'Levure'],
      typicalPhysicalConstraints: [
        { type: 'manual_handling', frequency: 'daily' },
        { type: 'extreme_temperatures', frequency: 'daily' },
        { type: 'night_work', frequency: 'daily' },
        { type: 'prolonged_standing', frequency: 'daily' },
      ],
      typicalSchedule: stdSchedule({ type: 'night', weeklyHours: 39, nightWork: true }),
      requiredTrainings: ['CAP Boulanger', 'SST'],
      medicalSurveillanceLevel: 'enhanced',
    },
    {
      name: 'Patissier',
      category: 'ouvrier',
      typicalHeadcount: '1-2',
      defaultWorkUnitSlugs: ['labo-patisserie'],
      typicalEquipment: ['Four', 'Batteur', 'Laminoir', 'Chambre froide'],
      typicalChemicalExposures: ['Farine (poussieres)', 'Colorants alimentaires'],
      typicalPhysicalConstraints: [
        { type: 'prolonged_standing', frequency: 'daily' },
        { type: 'repetitive_movements', frequency: 'daily' },
        { type: 'extreme_temperatures', frequency: 'frequent' },
      ],
      typicalSchedule: stdSchedule({ weeklyHours: 39, nightWork: true }),
      requiredTrainings: ['CAP Patissier', 'SST'],
      medicalSurveillanceLevel: 'enhanced',
    },
    {
      name: 'Vendeuse',
      category: 'employe',
      typicalHeadcount: '1-3',
      defaultWorkUnitSlugs: ['boutique'],
      typicalEquipment: ['Caisse', 'Trancheuse a pain'],
      typicalChemicalExposures: [],
      typicalPhysicalConstraints: [
        { type: 'prolonged_standing', frequency: 'daily' },
        { type: 'repetitive_movements', frequency: 'frequent' },
      ],
      typicalSchedule: stdSchedule({ weeklyHours: 35, weekendWork: true }),
      requiredTrainings: ['SST', 'Hygiene alimentaire'],
      medicalSurveillanceLevel: 'standard',
    },
    {
      name: 'Apprenti(e)',
      category: 'apprenti',
      typicalHeadcount: '1-2',
      defaultWorkUnitSlugs: ['fournil', 'labo-patisserie'],
      typicalEquipment: ['Selon progression'],
      typicalChemicalExposures: ['Farine (poussieres)'],
      typicalPhysicalConstraints: [
        { type: 'prolonged_standing', frequency: 'daily' },
        { type: 'manual_handling', frequency: 'frequent' },
      ],
      typicalSchedule: stdSchedule({ weeklyHours: 35 }),
      requiredTrainings: ['CAP en cours'],
      medicalSurveillanceLevel: 'standard',
    },
    {
      name: 'Gerant',
      category: 'dirigeant',
      typicalHeadcount: '1',
      defaultWorkUnitSlugs: ['fournil', 'boutique'],
      typicalEquipment: ['Tous'],
      typicalChemicalExposures: [],
      typicalPhysicalConstraints: [
        { type: 'prolonged_standing', frequency: 'frequent' },
      ],
      typicalSchedule: stdSchedule({ weeklyHours: 50, nightWork: true, weekendWork: true }),
      requiredTrainings: ['SST'],
      medicalSurveillanceLevel: 'standard',
    },
  ],
};

// ── Garage automobile (45.20A) ──────────────────────────────────────
const garageTemplate: JobTemplate = {
  metierSlug: 'garage',
  label: 'Garage automobile',
  nafCodes: ['45.20A', '45.20B'],
  positions: [
    {
      name: 'Mecanicien',
      category: 'ouvrier',
      typicalHeadcount: '2-4',
      defaultWorkUnitSlugs: ['atelier'],
      typicalEquipment: ['Pont elevateur', 'Cric', 'Outillage mecanique', 'Diagnostic'],
      typicalChemicalExposures: ['Huiles moteur', 'Liquide de frein', 'Solvants', 'Gaz echappement'],
      typicalPhysicalConstraints: [
        { type: 'forced_postures', frequency: 'daily' },
        { type: 'manual_handling', frequency: 'frequent' },
        { type: 'noise', frequency: 'frequent' },
      ],
      typicalSchedule: stdSchedule({ weeklyHours: 39 }),
      requiredTrainings: ['Habilitation HT vehicules', 'SST'],
      medicalSurveillanceLevel: 'enhanced',
    },
    {
      name: 'Carrossier-peintre',
      category: 'ouvrier',
      typicalHeadcount: '1-2',
      defaultWorkUnitSlugs: ['carrosserie'],
      typicalEquipment: ['Cabine peinture', 'Ponceuse', 'Compresseur'],
      typicalChemicalExposures: ['Peintures isocyanates', 'Solvants organiques', 'Mastic polyester'],
      typicalPhysicalConstraints: [
        { type: 'forced_postures', frequency: 'daily' },
        { type: 'noise', frequency: 'frequent' },
      ],
      typicalSchedule: stdSchedule({ weeklyHours: 39 }),
      requiredTrainings: ['Risque chimique', 'SST'],
      medicalSurveillanceLevel: 'enhanced',
    },
    {
      name: 'Receptionniste',
      category: 'employe',
      typicalHeadcount: '1',
      defaultWorkUnitSlugs: ['reception'],
      typicalEquipment: ['Ordinateur', 'Telephone'],
      typicalChemicalExposures: [],
      typicalPhysicalConstraints: [
        { type: 'prolonged_sitting', frequency: 'daily' },
      ],
      typicalSchedule: stdSchedule(),
      requiredTrainings: ['SST'],
      medicalSurveillanceLevel: 'standard',
    },
    {
      name: 'Magasinier pieces',
      category: 'employe',
      typicalHeadcount: '1',
      defaultWorkUnitSlugs: ['magasin'],
      typicalEquipment: ['Etageres', 'Transpalette', 'Ordinateur'],
      typicalChemicalExposures: [],
      typicalPhysicalConstraints: [
        { type: 'manual_handling', frequency: 'frequent' },
        { type: 'prolonged_standing', frequency: 'daily' },
      ],
      typicalSchedule: stdSchedule(),
      requiredTrainings: ['SST', 'Gestes et postures'],
      medicalSurveillanceLevel: 'standard',
    },
    {
      name: "Chef d'atelier",
      category: 'technicien',
      typicalHeadcount: '1',
      defaultWorkUnitSlugs: ['atelier', 'bureau'],
      typicalEquipment: ['Diagnostic electronique', 'Ordinateur'],
      typicalChemicalExposures: ['Huiles moteur'],
      typicalPhysicalConstraints: [
        { type: 'prolonged_standing', frequency: 'frequent' },
      ],
      typicalSchedule: stdSchedule({ weeklyHours: 39 }),
      requiredTrainings: ['Habilitation HT vehicules', 'SST'],
      medicalSurveillanceLevel: 'standard',
    },
  ],
};

// ── Aide a domicile (88.10A) ────────────────────────────────────────
const aideDomicileTemplate: JobTemplate = {
  metierSlug: 'aide-domicile',
  label: 'Aide a domicile',
  nafCodes: ['88.10A', '88.10B', '88.10C', '88.91A'],
  positions: [
    {
      name: 'Aide a domicile / AVS',
      category: 'ouvrier',
      typicalHeadcount: '5-20',
      defaultWorkUnitSlugs: ['domicile', 'trajet'],
      typicalEquipment: ['Vehicule personnel', 'Produits menagers'],
      typicalChemicalExposures: ['Produits menagers', 'Desinfectants'],
      typicalPhysicalConstraints: [
        { type: 'manual_handling', frequency: 'daily' },
        { type: 'forced_postures', frequency: 'frequent' },
        { type: 'driving', frequency: 'daily' },
        { type: 'prolonged_standing', frequency: 'daily' },
      ],
      typicalSchedule: stdSchedule({ weeklyHours: 35, travelRequired: true, weekendWork: true }),
      requiredTrainings: ['SST', 'Gestes et postures', 'PRAP'],
      medicalSurveillanceLevel: 'standard',
    },
    {
      name: 'Auxiliaire de vie',
      category: 'ouvrier',
      typicalHeadcount: '2-8',
      defaultWorkUnitSlugs: ['domicile-handicap'],
      typicalEquipment: ['Leve-personne', 'Fauteuil roulant', 'Lit medicalise'],
      typicalChemicalExposures: ['Desinfectants', 'Produits de soin'],
      typicalPhysicalConstraints: [
        { type: 'manual_handling', frequency: 'daily' },
        { type: 'forced_postures', frequency: 'daily' },
        { type: 'driving', frequency: 'daily' },
      ],
      typicalSchedule: stdSchedule({ weeklyHours: 35, travelRequired: true, weekendWork: true }),
      requiredTrainings: ['SST', 'PRAP', 'Manutention personnes'],
      medicalSurveillanceLevel: 'standard',
    },
    {
      name: 'Responsable secteur',
      category: 'technicien',
      typicalHeadcount: '1-2',
      defaultWorkUnitSlugs: ['bureau', 'trajet'],
      typicalEquipment: ['Ordinateur', 'Telephone'],
      typicalChemicalExposures: [],
      typicalPhysicalConstraints: [
        { type: 'driving', frequency: 'frequent' },
        { type: 'prolonged_sitting', frequency: 'daily' },
      ],
      typicalSchedule: stdSchedule({ travelRequired: true }),
      requiredTrainings: ['SST'],
      medicalSurveillanceLevel: 'standard',
    },
    {
      name: 'Gerant / Directeur',
      category: 'dirigeant',
      typicalHeadcount: '1',
      defaultWorkUnitSlugs: ['bureau'],
      typicalEquipment: ['Ordinateur'],
      typicalChemicalExposures: [],
      typicalPhysicalConstraints: [],
      typicalSchedule: stdSchedule(),
      requiredTrainings: ['SST'],
      medicalSurveillanceLevel: 'standard',
    },
  ],
};

// ── Bureau / Tertiaire (62-63, 69-71) ───────────────────────────────
const bureauTemplate: JobTemplate = {
  metierSlug: 'bureau',
  label: 'Bureau / Tertiaire',
  nafCodes: ['62', '63', '69', '70', '71'],
  positions: [
    {
      name: 'Collaborateur / Consultant',
      category: 'employe',
      typicalHeadcount: '2-10',
      defaultWorkUnitSlugs: ['bureau', 'reunion'],
      typicalEquipment: ['Ordinateur', 'Ecran'],
      typicalChemicalExposures: [],
      typicalPhysicalConstraints: [
        { type: 'prolonged_sitting', frequency: 'daily' },
      ],
      typicalSchedule: stdSchedule({ remoteWork: true }),
      requiredTrainings: ['SST'],
      medicalSurveillanceLevel: 'standard',
    },
    {
      name: 'Secretaire / Assistante',
      category: 'employe',
      typicalHeadcount: '1-2',
      defaultWorkUnitSlugs: ['accueil', 'bureau'],
      typicalEquipment: ['Ordinateur', 'Telephone', 'Imprimante'],
      typicalChemicalExposures: [],
      typicalPhysicalConstraints: [
        { type: 'prolonged_sitting', frequency: 'daily' },
      ],
      typicalSchedule: stdSchedule(),
      requiredTrainings: ['SST'],
      medicalSurveillanceLevel: 'standard',
    },
    {
      name: 'Responsable / Manager',
      category: 'cadre',
      typicalHeadcount: '1-2',
      defaultWorkUnitSlugs: ['bureau', 'reunion'],
      typicalEquipment: ['Ordinateur'],
      typicalChemicalExposures: [],
      typicalPhysicalConstraints: [
        { type: 'prolonged_sitting', frequency: 'daily' },
      ],
      typicalSchedule: stdSchedule({ remoteWork: true }),
      requiredTrainings: ['SST'],
      medicalSurveillanceLevel: 'standard',
    },
    {
      name: 'Gerant / Associe',
      category: 'dirigeant',
      typicalHeadcount: '1-3',
      defaultWorkUnitSlugs: ['bureau'],
      typicalEquipment: ['Ordinateur'],
      typicalChemicalExposures: [],
      typicalPhysicalConstraints: [],
      typicalSchedule: stdSchedule({ remoteWork: true }),
      requiredTrainings: ['SST'],
      medicalSurveillanceLevel: 'standard',
    },
  ],
};

// ── All templates ───────────────────────────────────────────────────
export const JOB_TEMPLATES: JobTemplate[] = [
  btpTemplate,
  restaurantTemplate,
  coiffureTemplate,
  commerceTemplate,
  boulangerieTemplate,
  garageTemplate,
  aideDomicileTemplate,
  bureauTemplate,
];

// BUSINESS RULE [CDC-2.4]: Resolution de template par code NAF
export function findTemplateByNaf(nafCode: string): JobTemplate | undefined {
  // Try exact match first
  const exact = JOB_TEMPLATES.find((t) => t.nafCodes.includes(nafCode));
  if (exact) return exact;

  // Try prefix match (e.g., '43.22A' matches '43')
  const prefix2 = nafCode.slice(0, 2);
  return JOB_TEMPLATES.find((t) => t.nafCodes.some((code) => code === prefix2 || nafCode.startsWith(code)));
}

// BUSINESS RULE [CDC-2.4]: Auto-fill effectifs proportionnellement au total Pappers
export function autofillHeadcounts(template: JobTemplate, totalEffectif: number): Array<{ name: string; category: JobCategory; headcount: number }> {
  // Parse typical headcounts to get min/max
  const parsed = template.positions.map((p) => {
    const match = p.typicalHeadcount.match(/^(\d+)(?:-(\d+))?$/);
    const min = match ? parseInt(match[1]!, 10) : 1;
    const max = match && match[2] ? parseInt(match[2]!, 10) : min;
    return { ...p, min, max };
  });

  // Sum of minimums
  const sumMin = parsed.reduce((acc, p) => acc + p.min, 0);

  if (totalEffectif <= sumMin) {
    // Not enough staff: assign minimums, reduce non-essential
    return parsed.map((p) => ({
      name: p.name,
      category: p.category,
      headcount: Math.max(p.category === 'dirigeant' ? 1 : 0, Math.min(p.min, totalEffectif > 0 ? 1 : 0)),
    }));
  }

  // Distribute proportionally between min and max
  const sumMax = parsed.reduce((acc, p) => acc + p.max, 0);
  const ratio = Math.min(1, (totalEffectif - sumMin) / Math.max(1, sumMax - sumMin));

  const result = parsed.map((p) => ({
    name: p.name,
    category: p.category,
    headcount: Math.round(p.min + (p.max - p.min) * ratio),
  }));

  // Adjust to match total exactly
  const currentTotal = result.reduce((acc, p) => acc + p.headcount, 0);
  const diff = totalEffectif - currentTotal;
  if (diff !== 0 && result.length > 0) {
    // Add/remove from the largest non-dirigeant position
    const adjustable = result
      .filter((p) => p.category !== 'dirigeant')
      .sort((a, b) => b.headcount - a.headcount);
    if (adjustable.length > 0) {
      adjustable[0]!.headcount = Math.max(0, adjustable[0]!.headcount + diff);
    }
  }

  return result;
}
