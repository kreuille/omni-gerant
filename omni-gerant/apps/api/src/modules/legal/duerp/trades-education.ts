// BUSINESS RULE [CDC-2.4]: E7d — 4 metiers Education & Formation
// Creche existe deja dans trades-sante.ts (E4)

import type { MetierRiskProfile } from './risk-database-v2.js';

function r(id: string, name: string, desc: string, wuId: string, sits: string[], g: 1|2|3|4, f: 1|2|3|4, exist: string[], proposed: string[], cat: string): MetierRiskProfile['risks'][number] {
  return { id, name, description: desc, workUnitId: wuId, situations: sits, defaultGravity: g, defaultFrequency: f, existingMeasures: exist, proposedActions: proposed, category: cat as MetierRiskProfile['risks'][number]['category'] };
}

function wu(id: string, name: string, desc: string, hc: string): MetierRiskProfile['workUnits'][number] {
  return { id, name, description: desc, typicalHeadcount: hc };
}

export const EDUCATION_TRADES: MetierRiskProfile[] = [
  // ── Ecole maternelle / primaire ───────────────────────────────
  {
    metierSlug: 'ecole-maternelle-primaire', label: 'Ecole maternelle et primaire', category: 'education_formation',
    nafCodes: ['85.10Z', '85.20Z'], idcc: '1261',
    legalReferences: ['Art. L421-1 (code education)', 'Circulaire 2015-205 (securite ecoles)', 'Vigipirate'],
    workUnits: [
      wu('ecol-classe', 'Salle de classe', 'Enseignement, activites pedagogiques', '1-2'),
      wu('ecol-cour', 'Cour de recreation', 'Surveillance des eleves pendant les recreations', '1-3'),
      wu('ecol-cantine', 'Cantine / periscolaire', 'Service de restauration et activites periscolaires', '2-4'),
      wu('ecol-admin', 'Bureau / salle des maitres', 'Preparation, correction, reunions', '1-5'),
    ],
    risks: [
      r('ecol-psychosocial', 'Risques psychosociaux (charge, parents)', 'Stress par charge de travail, parents difficiles, violences scolaires', 'ecol-classe', ['Parents agressifs ou exigeants', 'Surcharge administrative', 'Eleves en difficulte comportementale', 'Manque de reconnaissance', 'Preparation a domicile (temps invisible)'], 3, 3, ['Reunions d\'equipe'], ['Mediation parents-enseignants', 'Groupes d\'analyse de pratiques', 'Limitation des reunions hors temps scolaire', 'Soutien hierarchique en cas de conflit', 'Acces psychologue du travail']),
      r('ecol-bruit', 'Bruit (cour, cantine)', 'Exposition au bruit des enfants en cour et cantine (> 80 dB)', 'ecol-cour', ['Cour de recreation (cris)', 'Cantine (brouhaha)', 'Salle de motricite', 'Spectacle scolaire'], 2, 4, ['Revetements absorbants basiques'], ['Panneaux acoustiques en cantine', 'Amenagement des temps de recreation', 'Suivi audiometrique si symptomes', 'Micro-casque en salle de motricite']),
      r('ecol-biologique', 'Risque biologique (maladies infantiles)', 'Contamination par maladies infantiles (varicelle, gastro, poux)', 'ecol-classe', ['Enfant malade en classe', 'Contact avec les eleves', 'Nettoyage de vomissures', 'Epidemie de gastro/grippe'], 2, 3, ['Lavage mains', 'Protocole eviction'], ['Vaccination a jour (ROR, grippe)', 'Gel hydroalcoolique dans chaque classe', 'Protocole d\'eviction malade', 'Aeration des classes (10 min/2h)', 'Gants pour nettoyage de bodily fluids']),
      r('ecol-tms', 'TMS (postures, manutention)', 'Douleurs par postures de travail avec des petits et port de materiel', 'ecol-classe', ['Position basse (maternelle)', 'Port de materiel pedagogique', 'Station debout prolongee', 'Ecriture au tableau'], 2, 3, ['Mobilier adapte'], ['Mobilier enseignant a hauteur adulte en maternelle', 'Chariot pour transport de materiel', 'Tabouret a roulettes en maternelle', 'Tableau blanc a hauteur reglable']),
      r('ecol-chute', 'Chute (escaliers, cour)', 'Chute dans les escaliers ou la cour de recreation', 'ecol-cour', ['Escaliers (bousculade)', 'Cour (sol mouille, jeux)', 'Salle de sport', 'Sortie scolaire'], 2, 2, ['Main courante', 'Surveillants'], ['Revetement sol de cour conforme', 'Surveillance renforcee aux transitions', 'Main courante dans les escaliers', 'Eclairage des zones de passage']),
      r('ecol-agression', 'Agression (parents, intrusion)', 'Violence verbale de parents ou risque d\'intrusion malveillante', 'ecol-admin', ['Parent en colere', 'Intrusion dans l\'ecole', 'Plan Vigipirate', 'Menaces sur les reseaux sociaux'], 3, 2, ['Portail ferme', 'Interphone'], ['PPMS (Plan de Mise en Surete) a jour', 'Exercice PPMS annuel', 'Portail avec controle d\'acces', 'Formation gestion de conflit', 'Procedure signalement agression']),
    ],
  },

  // ── College / Lycee ───────────────────────────────────────────
  {
    metierSlug: 'college-lycee', label: 'College / Lycee (enseignement secondaire)', category: 'education_formation',
    nafCodes: ['85.31Z', '85.32Z'], idcc: '1261',
    legalReferences: ['Art. L421-1 (code education)', 'Vigipirate', 'PPMS obligatoire'],
    workUnits: [
      wu('lyc-classe', 'Salle de cours', 'Enseignement general, salle informatique', '1'),
      wu('lyc-labo', 'Laboratoire sciences', 'TP de physique-chimie, SVT', '1-2'),
      wu('lyc-atelier', 'Atelier (lycee pro)', 'Ateliers de formation professionnelle', '1-2'),
      wu('lyc-cour', 'Cour / vie scolaire', 'Surveillance, accueil, vie scolaire', '2-6'),
    ],
    risks: [
      r('lyc-agression', 'Agression (eleves, parents)', 'Violence verbale ou physique d\'eleves ou de parents', 'lyc-cour', ['Eleve agressif (conflit)', 'Parent mecontent', 'Harcelement entre eleves (intervention)', 'Zone de surveillance non visible', 'Confiscation d\'objet (telephone)'], 3, 3, ['Equipe vie scolaire', 'Camera'], ['Formation gestion des conflits', 'Camera de surveillance dans les zones a risque', 'Equipe mediation par les pairs', 'Procedure de signalement', 'Soutien psychologique post-incident', 'Main courante des incidents']),
      r('lyc-psychosocial', 'Risques psychosociaux', 'Burn-out par charge de travail, incivilites, manque de soutien', 'lyc-classe', ['Incivilites repetees en classe', 'Charge administrative croissante', 'Reforme permanente des programmes', 'Manque de reconnaissance', 'Travail a domicile non quantifie'], 3, 3, ['Medecine de prevention'], ['Groupes d\'analyse de pratiques', 'Medecine de prevention accessible', 'Formation gestion du stress', 'Allegement des taches administratives', 'Soutien hierarchique effectif']),
      r('lyc-chimique', 'Risque chimique (labos sciences)', 'Exposition a des produits chimiques en laboratoire de sciences', 'lyc-labo', ['TP de chimie (acides, bases)', 'Stockage de produits chimiques', 'Experience avec flamme', 'Vapeurs lors des manipulations'], 3, 2, ['Hotte aspirante', 'Lunettes'], ['Lunettes de protection pour tous (eleves + prof)', 'Hotte aspirante fonctionnelle', 'Stockage conforme des produits', 'Inventaire et FDS a jour', 'Douche de securite et rince-oeil']),
      r('lyc-machines', 'Machines (ateliers lycee pro)', 'Blessure par machine-outil en atelier de formation professionnelle', 'lyc-atelier', ['Tour, fraiseuse, scie', 'Soudure', 'Machines a bois', 'Eleve non vigilant'], 4, 2, ['Carter de protection', 'EPI obligatoires'], ['Machines avec carter et arret d\'urgence', 'EPI obligatoires en atelier (lunettes, chaussures, blouse)', 'Ratio eleves/enseignant respecte', 'Formation securite machines en debut d\'annee', 'Carnet de maintenance des machines']),
      r('lyc-bruit', 'Bruit (cantine, ateliers)', 'Exposition au bruit en cantine et ateliers', 'lyc-cour', ['Cantine (brouhaha)', 'Atelier (machines)', 'Salle de sport', 'Cour (recreation)'], 2, 3, ['Traitement acoustique basique'], ['Panneaux acoustiques en cantine', 'Casque antibruit en atelier', 'Suivi audiometrique pour les profs d\'atelier']),
      r('lyc-chute', 'Chute (escaliers, sport)', 'Chute dans les escaliers ou en cours d\'EPS', 'lyc-cour', ['Escaliers (bousculade entre cours)', 'Salle de sport', 'Sortie scolaire', 'Sol mouille hall d\'entree'], 2, 2, ['Main courante', 'Sol antiderapant'], ['Sens de circulation dans les escaliers', 'Sol antiderapant dans les zones humides', 'Eclairage des zones de passage', 'Surveillance aux interclasses']),
    ],
  },

  // ── Formation professionnelle ─────────────────────────────────
  {
    metierSlug: 'formation-professionnelle', label: 'Organisme de formation professionnelle', category: 'education_formation',
    nafCodes: ['85.59A', '85.59B'], idcc: '1516',
    legalReferences: ['Art. L6351-1 (code travail, formation)', 'Art. R4323-1 (equipements)', 'Certification Qualiopi'],
    workUnits: [
      wu('form-salle', 'Salle de formation', 'Cours theoriques, presentations', '1-2'),
      wu('form-pratique', 'Atelier / plateau technique', 'Formation pratique sur equipements', '1-2'),
      wu('form-bureau', 'Bureau / ingenierie', 'Conception de formations, administration', '1-3'),
      wu('form-deplacement', 'Deplacements', 'Formations sur site client', '1'),
    ],
    risks: [
      r('form-machines', 'Machines (plateau technique)', 'Blessure par machine lors des formations pratiques', 'form-pratique', ['Stagiaire non forme sur la machine', 'Machine de formation (soudure, usinage)', 'Erreur de manipulation', 'Equipement defectueux'], 3, 2, ['EPI fournis', 'Encadrement'], ['EPI fournis a chaque stagiaire', 'Ratio formateur/stagiaires respecte', 'Machine avec dispositifs de securite', 'Formation securite en debut de stage', 'Maintenance reguliere des equipements']),
      r('form-psychosocial', 'Risques psychosociaux', 'Stress par charge pedagogique, stagiaires difficiles, precarite', 'form-salle', ['Stagiaires en difficulte d\'apprentissage', 'Public en reinsertion', 'Charge de preparation', 'Statut precaire (vacataire)'], 2, 3, ['Reunions pedagogiques'], ['Reunions pedagogiques regulieres', 'Soutien de la direction en cas de conflit', 'Reconnaissance du temps de preparation']),
      r('form-tms', 'TMS (ecran, station debout)', 'Douleurs par station debout prolongee et travail sur ecran', 'form-salle', ['Station debout devant la classe (6h/jour)', 'Travail sur ecran (preparation)', 'Transport de materiel pedagogique'], 2, 3, ['Siege formateur'], ['Tabouret haut reglable pour le formateur', 'Poste informatique ergonomique', 'Chariot pour transport de materiel']),
      r('form-routier', 'Risque routier (deplacements)', 'Accident lors des deplacements sur site client', 'form-deplacement', ['Deplacements frequents', 'Transport de materiel lourd', 'Fatigue (journee longue + route)'], 3, 2, ['Vehicule entretenu'], ['Planning avec temps de trajet', 'Pas de conduite si fatigue', 'Vehicule de service entretenu']),
      r('form-chimique', 'Risque chimique (TP)', 'Exposition a des produits lors des travaux pratiques specifiques', 'form-pratique', ['Formation soudure (fumees)', 'Formation peinture (solvants)', 'Formation coiffure (produits capillaires)', 'Formation chimie (reactifs)'], 2, 2, ['Aspiration locale'], ['Ventilation et aspiration adaptees au type de formation', 'EPI specifiques a la formation', 'FDS des produits utilises']),
      r('form-incendie', 'Incendie (locaux)', 'Depart de feu dans les locaux de formation', 'form-salle', ['Installation electrique', 'Atelier avec produits inflammables', 'Nombre de personnes (capacite ERP)'], 3, 1, ['Extincteurs', 'Issue de secours'], ['Registre de securite a jour (ERP)', 'Exercice evacuation annuel', 'Formation evacuation des stagiaires', 'Detection incendie dans chaque salle']),
    ],
  },

  // ── Formation adultes / CFA ───────────────────────────────────
  {
    metierSlug: 'formation-adultes', label: 'Centre de formation d\'apprentis (CFA)', category: 'education_formation',
    nafCodes: ['85.32Z'], idcc: '1261',
    legalReferences: ['Art. L6231-1 (CFA)', 'Art. R4323-1 (equipements)', 'Certification Qualiopi'],
    workUnits: [
      wu('cfa-theorie', 'Salle enseignement general', 'Cours theoriques et generaux', '1-2'),
      wu('cfa-atelier', 'Atelier professionnel', 'Formation pratique aux gestes du metier', '1-2'),
      wu('cfa-internat', 'Internat / vie scolaire', 'Hebergement et encadrement des apprentis', '2-4'),
      wu('cfa-admin', 'Administration / coordination', 'Gestion des apprentis, lien entreprises', '1-3'),
    ],
    risks: [
      r('cfa-machines', 'Machines (ateliers)', 'Blessure par machine-outil en atelier de formation', 'cfa-atelier', ['Apprenti inattentif sur machine', 'Tour, fraiseuse, scie a ruban', 'Soudure (brulure, UV)', 'Equipement cuisine (trancheuse, four)'], 4, 2, ['Carter', 'EPI'], ['Machines avec dispositifs de securite complets', 'EPI obligatoires en atelier', 'Ratio formateur/apprenti respecte', 'Accueil securite de chaque nouvel apprenti', 'Carnet d\'habilitation machine']),
      r('cfa-agression', 'Agression (apprentis mineurs)', 'Violence entre apprentis ou envers les formateurs', 'cfa-internat', ['Conflit entre apprentis (internat)', 'Apprenti en difficulte (comportement)', 'Harcelement', 'Consommation d\'alcool/drogue (internat)'], 3, 2, ['Equipe educative', 'Reglement interieur'], ['Formation gestion des conflits', 'Reglement interieur strict', 'Surveillance renforcee internat', 'Mediation et accompagnement social']),
      r('cfa-psychosocial', 'Risques psychosociaux', 'Stress par public en difficulte et charge administrative', 'cfa-theorie', ['Apprentis en echec scolaire', 'Ruptures de contrat frequentes', 'Charge administrative (Qualiopi)', 'Lien avec les entreprises (conflits)'], 2, 3, ['Equipe pluridisciplinaire'], ['Cellule d\'ecoute pour les formateurs', 'Temps de concertation equipe', 'Reconnaissance du travail d\'accompagnement']),
      r('cfa-chimique', 'Risque chimique (ateliers specialises)', 'Exposition a des produits selon la filiere (cuisine, coiffure, auto)', 'cfa-atelier', ['Cuisine (produits nettoyage)', 'Coiffure (colorations)', 'Mecanique auto (solvants, huiles)', 'Peinture (solvants)'], 3, 2, ['Ventilation par atelier'], ['Ventilation adaptee a chaque filiere', 'EPI specifiques fournis', 'FDS affichees dans chaque atelier', 'Formation au risque chimique integree au cursus']),
      r('cfa-tms', 'TMS (postures d\'enseignement)', 'Douleurs par station debout prolongee et gestes de demonstration', 'cfa-theorie', ['Station debout 6-8h', 'Demonstration gestuelle repetee', 'Transport de materiel entre ateliers'], 2, 3, ['Poste ergonomique'], ['Tabouret reglable pour le formateur', 'Chariot pour transport materiel', 'Pauses entre les cours']),
      r('cfa-incendie', 'Incendie (ateliers, internat)', 'Depart de feu dans les ateliers ou l\'internat', 'cfa-atelier', ['Atelier avec produits inflammables', 'Internat (nuit)', 'Installation electrique ancienne', 'Cuisine (friteuse)'], 4, 1, ['Detection incendie', 'Plan evacuation'], ['Registre de securite ERP a jour', 'Exercice evacuation trimestriel (dont nuit pour internat)', 'Detection dans chaque piece', 'Issue de secours balisee', 'Commission de securite periodique']),
    ],
  },
];
