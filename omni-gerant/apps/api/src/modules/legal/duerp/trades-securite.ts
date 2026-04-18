// BUSINESS RULE [CDC-2.4]: E7e — 3 metiers Securite & Gardiennage

import type { MetierRiskProfile } from './risk-database-v2.js';

function r(id: string, name: string, desc: string, wuId: string, sits: string[], g: 1|2|3|4, f: 1|2|3|4, exist: string[], proposed: string[], cat: string): MetierRiskProfile['risks'][number] {
  return { id, name, description: desc, workUnitId: wuId, situations: sits, defaultGravity: g, defaultFrequency: f, existingMeasures: exist, proposedActions: proposed, category: cat as MetierRiskProfile['risks'][number]['category'] };
}

function wu(id: string, name: string, desc: string, hc: string): MetierRiskProfile['workUnits'][number] {
  return { id, name, description: desc, typicalHeadcount: hc };
}

export const SECURITE_TRADES: MetierRiskProfile[] = [
  // ── Agent de securite ─────────────────────────────────────────
  {
    metierSlug: 'agent-securite', label: 'Agent de securite / Prevention', category: 'securite_gardiennage',
    nafCodes: ['80.10Z'], idcc: '1351',
    legalReferences: ['Livre VI code securite interieure', 'Carte professionnelle CNAPS', 'Art. R612-1 (conditions exercice)'],
    workUnits: [
      wu('secu-poste', 'Poste de securite / PC', 'Surveillance video, controle d\'acces', '1-2'),
      wu('secu-ronde', 'Ronde / surveillance', 'Rondes de surveillance dans le site', '1'),
      wu('secu-accueil', 'Accueil / filtrage', 'Controle d\'acces, filtrage des entrees', '1-2'),
      wu('secu-evenement', 'Evenement / foule', 'Securite evenementielle, gestion de foule', '2-10'),
    ],
    risks: [
      r('secu-agression', 'Agression physique', 'Violence physique lors d\'une intervention ou d\'un refus d\'acces', 'secu-accueil', ['Refus d\'acces a une personne', 'Interpellation d\'un voleur', 'Personne agressive (alcool, drogue)', 'Evenement avec foule hostile', 'Intrusion forcee'], 4, 3, ['Radio', 'Travail en binome'], ['Formation CQP/TFP avec module defense', 'Radio avec bouton alerte', 'Travail en binome pour interventions', 'Camera sur le poste de filtrage', 'Procedure d\'appel forces de l\'ordre', 'Gilet pare-coups si necessaire']),
      r('secu-psychosocial', 'Risques psychosociaux (isolement, nuit)', 'Stress par travail de nuit, isolement, confrontation a la violence', 'secu-poste', ['Travail de nuit seul', 'Confrontation a la violence repetee', 'Manque de reconnaissance', 'Horaires decales (12h de poste)', 'Isolement social'], 3, 4, ['Rotation des postes'], ['PTI (Protection Travailleur Isole)', 'Rotation equitable des nuits', 'Debriefing apres incident grave', 'Acces psychologue du travail', 'Limitation du temps de poste a 12h max']),
      r('secu-tms', 'TMS (station debout, assise)', 'Douleurs par station debout prolongee ou position assise au PC', 'secu-ronde', ['Station debout au filtrage (8-12h)', 'Position assise prolongee au PC', 'Ronde en terrain difficile', 'Port d\'equipement (radio, lampe)'], 2, 4, ['Chaussures confort'], ['Chaussures de securite confortables', 'Tapis anti-fatigue au poste', 'Siege ergonomique au PC', 'Alternance debout/assis/ronde', 'Pauses regulieres']),
      r('secu-chute', 'Chute (ronde, obscurite)', 'Chute lors des rondes de nuit en conditions d\'eclairage faible', 'secu-ronde', ['Ronde de nuit (eclairage insuffisant)', 'Sol inegal exterieur', 'Escalier de service', 'Parkings souterrains (humides)'], 2, 3, ['Lampe torche'], ['Lampe torche puissante de qualite', 'Chaussures de securite antiderapantes', 'Connaissance du site (reperage de jour)', 'Signalement des anomalies d\'eclairage']),
      r('secu-incendie', 'Incendie (premiere intervention)', 'Exposition a un incendie lors de la premiere intervention', 'secu-ronde', ['Depart de feu sur le site', 'Declenchement alarme incendie', 'Evacuation des personnes', 'Manipulation extincteur'], 3, 1, ['Formation SSI', 'Extincteurs'], ['Formation SSIAP obligatoire', 'Connaissance parfaite du SSI', 'Exercice evacuation regulier', 'EPI feu a disposition (ARI si SSIAP 2)']),
      r('secu-routier', 'Risque routier (deplacements)', 'Accident lors des deplacements entre les sites', 'secu-ronde', ['Trajet domicile-site (horaires decales)', 'Deplacement entre sites', 'Fatigue post-nuit'], 3, 2, ['Vehicule entretenu'], ['Planning permettant le repos', 'Pas de conduite apres 12h de poste', 'Vehicule de ronde entretenu']),
    ],
  },

  // ── Gardiennage ───────────────────────────────────────────────
  {
    metierSlug: 'gardiennage', label: 'Gardien d\'immeuble / Concierge', category: 'securite_gardiennage',
    nafCodes: ['81.10Z'], idcc: '1043',
    legalReferences: ['Convention collective gardiens d\'immeubles', 'Art. L7211-1 (concierge)', 'Art. R4227-1 (incendie)'],
    workUnits: [
      wu('gard-loge', 'Loge / bureau', 'Accueil des residents, gestion courrier', '1'),
      wu('gard-communs', 'Parties communes', 'Entretien hall, escaliers, local poubelles', '1'),
      wu('gard-technique', 'Locaux techniques', 'Chaufferie, local velo, parking', '1'),
      wu('gard-exterieur', 'Espaces exterieurs', 'Entretien cour, jardin, abords', '1'),
    ],
    risks: [
      r('gard-agression', 'Agression (residents, visiteurs)', 'Violence verbale ou physique de residents ou visiteurs indesirables', 'gard-loge', ['Resident en conflit', 'SDF ou squatteur', 'Livraison non autorisee', 'Nuisances sonores (intervention)'], 3, 2, ['Loge securisee'], ['Formation gestion de conflit', 'Interphone video', 'Procedure signalement au syndic', 'Ne pas intervenir seul si danger', 'Camera dans le hall']),
      r('gard-chimique', 'Risque chimique (produits entretien)', 'Irritation par produits de nettoyage des parties communes', 'gard-communs', ['Nettoyage hall (detergent)', 'Desinfection local poubelles', 'Desherbage (si chimique)', 'Produit deboucheur (soude)'], 2, 3, ['Gants menage'], ['Gants nitrile', 'Doseurs automatiques', 'Interdiction melanges', 'Produits eco-labellises preferees']),
      r('gard-tms', 'TMS (menage, poubelles)', 'Douleurs par manutention des poubelles et menage des communs', 'gard-communs', ['Sortie des poubelles (conteneurs lourds)', 'Lavage des escaliers (penche)', 'Salage en hiver (sacs de sel)', 'Petit entretien (postures variees)'], 3, 3, ['Chariot'], ['Conteneurs a roulettes', 'Manche telescopique pour le sol', 'Aide au transport des sacs de sel', 'Alternance des taches dans la journee']),
      r('gard-chute', 'Chute (escalier, sol mouille)', 'Chute dans les escaliers ou sur sol mouille lors du nettoyage', 'gard-communs', ['Escalier mouille apres lavage', 'Sol d\'entree mouille (pluie)', 'Cave (marches raides)', 'Verglas sur le trottoir'], 2, 3, ['Chaussures antiderapantes'], ['Chaussures antiderapantes', 'Panneau sol mouille', 'Nettoyage par section', 'Salage preventif des abords']),
      r('gard-incendie', 'Incendie (immeuble)', 'Premiere intervention en cas d\'incendie dans l\'immeuble', 'gard-technique', ['Depart de feu dans un appartement', 'Local poubelle (incendie)', 'Chaufferie', 'Parking souterrain'], 4, 1, ['Extincteur', 'Alarme'], ['Formation evacuation et extincteur', 'Connaissance des colonnes seches', 'Cles de desenfumage accessibles', 'Numero pompiers affiche']),
      r('gard-isolement', 'Isolement / travail seul', 'Travail seul dans les locaux techniques ou en cave', 'gard-technique', ['Intervention en chaufferie seul', 'Cave isolee', 'Parking souterrain de nuit', 'Malaise sans temoin'], 2, 3, ['Telephone'], ['Telephone portable charge', 'Signaler les interventions en sous-sol', 'PTI si gardien de nuit', 'Eclairage automatique en cave']),
    ],
  },

  // ── Agent cynophile ───────────────────────────────────────────
  {
    metierSlug: 'agent-cynophile', label: 'Agent de securite cynophile', category: 'securite_gardiennage',
    nafCodes: ['80.10Z'], idcc: '1351',
    legalReferences: ['Livre VI code securite interieure', 'Art. R622-1 (equipes cynophiles)', 'Arrete du 10/01/2014 (cynophile)'],
    workUnits: [
      wu('cyno-patrouille', 'Patrouille / ronde', 'Ronde de securite avec le chien', '1'),
      wu('cyno-chenil', 'Chenil / entretien', 'Soins au chien, alimentation, hygiene', '1'),
      wu('cyno-intervention', 'Zone d\'intervention', 'Detection, interception, intervention', '1'),
      wu('cyno-transport', 'Transport du chien', 'Deplacement vehicule avec le chien', '1'),
    ],
    risks: [
      r('cyno-morsure', 'Morsure (chien)', 'Morsure par son propre chien ou un chien adverse', 'cyno-chenil', ['Chien stresse ou excite', 'Entrainement (protection)', 'Nourrissage (protection de la nourriture)', 'Chien d\'un intrus (rencontre)'], 3, 3, ['Combinaison entrainement'], ['Formation conducteur cynophile certifiee', 'Equipement de protection pour l\'entrainement', 'Connaissance du comportement canin', 'Vaccination rage du chien', 'Desinfection immediate si morsure']),
      r('cyno-agression', 'Agression physique (intervention)', 'Violence lors d\'une intervention avec le chien', 'cyno-intervention', ['Interpellation d\'un intrus', 'Confrontation avec plusieurs personnes', 'Personne armee', 'Evenement avec foule hostile'], 4, 2, ['Radio', 'Chien dissuasif'], ['Formation defense operationnelle', 'Radio avec alerte', 'Procedure d\'appel renfort/police', 'Gilet pare-coups', 'Travail en equipe pour les interventions a risque']),
      r('cyno-zoonose', 'Zoonoses (chien)', 'Contamination par maladies du chien (teigne, puces, leptospirose)', 'cyno-chenil', ['Contact salive (lechage)', 'Manipulation dejections', 'Parasite du chien (puces, tiques)', 'Nettoyage du chenil'], 2, 3, ['Gants'], ['Suivi veterinaire regulier du chien', 'Vaccination et vermifugation a jour', 'Gants pour nettoyage chenil', 'Lavage des mains apres chaque contact']),
      r('cyno-tms', 'TMS (traction du chien, postures)', 'Douleurs par traction du chien en laisse et station debout', 'cyno-patrouille', ['Traction forte du chien (30-40 kg)', 'Position debout prolongee', 'Course avec le chien (intervention)', 'Port equipement (radio, lampe, longe)'], 2, 3, ['Laisse adaptee'], ['Harnais ergonomique avec amortisseur', 'Chaussures de securite confortables', 'Conditionnement physique regulier', 'Echauffement avant patrouille']),
      r('cyno-nuit', 'Travail de nuit / isolement', 'Risques lies au travail de nuit isole avec le chien', 'cyno-patrouille', ['Patrouille de nuit seul', 'Terrain mal eclaire', 'Zone industrielle isolee', 'Fatigue nocturne'], 3, 3, ['Lampe puissante', 'Radio'], ['PTI (Protection Travailleur Isole)', 'Lampe torche puissante', 'Radio avec GPS', 'Connaissance prealable du site', 'Rotation des nuits']),
      r('cyno-routier', 'Risque routier', 'Accident lors du transport du chien entre les sites', 'cyno-transport', ['Conduite avec chien dans le vehicule', 'Distraction par le chien', 'Deplacement de nuit (fatigue)'], 3, 2, ['Cage transport'], ['Cage de transport fixee dans le vehicule', 'Pas de chien en cabine pendant la conduite', 'Vehicule adapte et entretenu']),
    ],
  },
];
