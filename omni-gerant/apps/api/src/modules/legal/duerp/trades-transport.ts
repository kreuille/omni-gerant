// BUSINESS RULE [CDC-2.4]: E7b — 10 metiers Transport & Logistique
// Sources : INRS, CARSAT, fiches metiers duerp-en-direct.fr

import type { MetierRiskProfile } from './risk-database-v2.js';

function r(id: string, name: string, desc: string, wuId: string, sits: string[], g: 1|2|3|4, f: 1|2|3|4, exist: string[], proposed: string[], cat: string): MetierRiskProfile['risks'][number] {
  return { id, name, description: desc, workUnitId: wuId, situations: sits, defaultGravity: g, defaultFrequency: f, existingMeasures: exist, proposedActions: proposed, category: cat as MetierRiskProfile['risks'][number]['category'] };
}

function wu(id: string, name: string, desc: string, hc: string): MetierRiskProfile['workUnits'][number] {
  return { id, name, description: desc, typicalHeadcount: hc };
}

export const TRANSPORT_TRADES: MetierRiskProfile[] = [
  // ── Transport routier marchandises ────────────────────────────
  {
    metierSlug: 'transport-routier-marchandises', label: 'Transport routier de marchandises', category: 'transport_logistique',
    nafCodes: ['49.41A', '49.41B', '49.41C'], idcc: '16',
    legalReferences: ['Reglement CE 561/2006 (temps conduite)', 'Tableau RG 97 (vibrations)', 'FIMO/FCO obligatoire'],
    workUnits: [
      wu('trm-conduite', 'Conduite PL/SPL', 'Conduite de poids lourds sur route', '1'),
      wu('trm-chargement', 'Chargement / dechargement', 'Manutention des marchandises sur quai ou chez client', '1-2'),
      wu('trm-arrimage', 'Arrimage / bache', 'Arrimage de la marchandise, bache de la remorque', '1'),
      wu('trm-admin', 'Bureau / gestion', 'Gestion des documents transport, planning', '1-2'),
    ],
    risks: [
      r('trm-routier', 'Risque routier (PL)', 'Accident de la route grave impliquant un poids lourd', 'trm-conduite', ['Conduite de nuit', 'Fatigue/endormissement', 'Conditions meteo degradees', 'Depassement temps de conduite'], 4, 4, ['Chronotachygraphe', 'FIMO/FCO'], ['Respect strict des temps de conduite/repos', 'Aides a la conduite (ESP, freinage urgence)', 'Formation eco-conduite', 'Limitation vitesse (bridage)', 'Politique anti-telephone au volant']),
      r('trm-tms-siege', 'TMS (conduite prolongee)', 'Douleurs dorsales par vibrations et position assise prolongee', 'trm-conduite', ['Position assise 8-10h/jour', 'Vibrations corps entier', 'Montee/descente de cabine', 'Siege mal regle'], 3, 4, ['Siege suspendu'], ['Siege pneumatique derniere generation', 'Marchepied cabine antiderapant', 'Exercices d\'etirement a chaque pause', 'Matelas ergonomique en couchette', 'Suivi medical renforce']),
      r('trm-manutention', 'Manutention (chargement)', 'Douleurs et blessures par manipulation de colis et palettes', 'trm-chargement', ['Chargement manual de colis', 'Manipulation transpalette sur quai', 'Port de charges lourdes', 'Chargement en vrac'], 3, 3, ['Transpalette', 'Gants'], ['Hayon elevateur sur le vehicule', 'Chariot embarque', 'Limite de poids par colis (25 kg)', 'Aide a la manutention chez les clients', 'Formation gestes et postures']),
      r('trm-chute', 'Chute (montee/descente, bache)', 'Chute depuis la cabine, le plateau ou lors du bachage', 'trm-arrimage', ['Montee/descente de cabine (marche mouillee)', 'Bachage de la remorque', 'Arrimage sur le plateau', 'Acces au chargement par l\'arriere'], 3, 3, ['Marchepied'], ['Systeme de bachage automatique', 'Marchepieds antiderapants entretenus', 'Chaussures de securite antiderapantes', 'Echelle d\'acces pour plateau', 'Interdiction montee sur la marchandise']),
      r('trm-psychosocial', 'Risques psychosociaux (isolement, pression)', 'Stress par pression des delais, isolement, eloignement familial', 'trm-conduite', ['Pression des delais de livraison', 'Isolement (longue distance)', 'Eloignement familial', 'Attente sur quai non payee'], 3, 3, ['Telephone mains-libres'], ['Planning realiste (temps de chargement inclus)', 'Communication reguliere avec l\'exploitation', 'Aires de repos correctes', 'Politique anti-attente sur quai']),
      r('trm-rps-agression', 'Agression (vol, braquage)', 'Agression ou vol lors des stationnements de nuit', 'trm-conduite', ['Stationnement sur parking non securise', 'Transport de marchandises de valeur', 'Stationnement en zone isolee'], 3, 2, ['Verrouillage cabine'], ['Parkings securises pour stationnement nuit', 'GPS avec suivi en temps reel', 'Alarme cabine', 'Consigne : ne jamais resister en cas de braquage']),
      r('trm-chimique', 'Risque chimique (gaz echappement)', 'Exposition aux gaz d\'echappement et emissions diesel', 'trm-chargement', ['Attente moteur au ralenti sur quai', 'Chargement en interieur (entrepot)', 'Ventilation insuffisante'], 2, 3, ['Extinction moteur au quai'], ['Extinction moteur systematique au chargement', 'Ventilation des quais', 'Vehicule norme Euro 6', 'Cabine avec filtration air']),
    ],
  },

  // ── Transport routier voyageurs ───────────────────────────────
  {
    metierSlug: 'transport-routier-voyageurs', label: 'Transport routier de voyageurs (autocar)', category: 'transport_logistique',
    nafCodes: ['49.39A', '49.39B'], idcc: '16',
    legalReferences: ['Reglement CE 561/2006', 'FIMO/FCO voyageurs', 'Art. R3113-1 (transport voyageurs)'],
    workUnits: [
      wu('trv-conduite', 'Conduite autocar', 'Conduite du vehicule de transport de voyageurs', '1'),
      wu('trv-accueil', 'Accueil / billetterie', 'Accueil passagers, controle titres, information', '1'),
      wu('trv-entretien', 'Entretien / nettoyage', 'Nettoyage interieur, verification technique', '1'),
      wu('trv-depot', 'Depot / parking', 'Manoeuvres au depot, stationnement', '1-2'),
    ],
    risks: [
      r('trv-routier', 'Risque routier', 'Accident de la route avec passagers a bord', 'trv-conduite', ['Circulation urbaine dense', 'Conditions meteo', 'Passager debout (freinage brusque)', 'Conduite de nuit'], 4, 3, ['Formation FIMO/FCO'], ['Vehicule equipe ESP et AEBS', 'Formation conduite defensive', 'Politique vitesse stricte', 'Controle alcoolemie aleatoire']),
      r('trv-agression', 'Agression passagers', 'Violence verbale ou physique de passagers', 'trv-accueil', ['Passager sans titre de transport', 'Passager alcoolise', 'Retard (mecontentement)', 'Conduite de nuit en zone difficile'], 3, 3, ['Vitre de protection (si bus urbain)'], ['Camera de surveillance embarquee', 'Bouton d\'alarme discret', 'Formation desescalade', 'Vitre de separation conducteur', 'Procedure retrait si danger']),
      r('trv-tms', 'TMS (conduite prolongee)', 'Douleurs dorsales par position assise prolongee et vibrations', 'trv-conduite', ['Conduite prolongee', 'Vibrations', 'Montee/descente repetee (bus urbain)', 'Siege non ergonomique'], 3, 4, ['Siege chauffeur suspendu'], ['Siege pneumatique reglable', 'Pauses reglementaires respectees', 'Etirements a chaque terminus']),
      r('trv-psychosocial', 'Risques psychosociaux', 'Stress par circulation, passagers, horaires', 'trv-conduite', ['Retard et pression horaire', 'Incivilites repetees', 'Horaires fractionnes', 'Travail week-end et jours feries'], 3, 3, ['Salle de repos au depot'], ['Planning avec temps de battement suffisant', 'Salle de repos equipee', 'Groupe de parole', 'Signalement facilite des incivilites']),
      r('trv-chute', 'Chute (montee/descente vehicule)', 'Chute lors de la montee ou descente du vehicule', 'trv-entretien', ['Marches mouillees', 'Descente precipitee', 'Nettoyage interieur (sol mouille)'], 2, 3, ['Marches antiderapantes'], ['Revetement antiderapant des marches', 'Chaussures antiderapantes', 'Eclairage marchepied']),
      r('trv-biologique', 'Risque biologique (passagers)', 'Contamination par virus/bacteries transportes par les passagers', 'trv-conduite', ['Contact passagers malades', 'Surfaces contaminees', 'Epidemies (grippe, Covid)'], 2, 3, ['Gel hydroalcoolique'], ['Ventilation de la cabine conducteur', 'Nettoyage desinfection quotidien', 'Gel hydroalcoolique a disposition', 'Vitre de separation conducteur']),
    ],
  },

  // ── Demenagement ──────────────────────────────────────────────
  {
    metierSlug: 'demenagement', label: 'Demenagement', category: 'transport_logistique',
    nafCodes: ['49.42Z'], idcc: '16',
    legalReferences: ['Tableau RG 57 (TMS)', 'Tableau RG 98 (lombalgies)', 'FIMO si > 3.5T'],
    workUnits: [
      wu('dem-chargement', 'Chargement / dechargement', 'Manipulation et port de meubles et cartons', '2-6'),
      wu('dem-conduite', 'Conduite camion', 'Conduite du vehicule de demenagement', '1'),
      wu('dem-emballage', 'Emballage / protection', 'Emballage des objets fragiles, protection meubles', '1-3'),
      wu('dem-escalier', 'Escaliers / acces difficiles', 'Port de charges dans les escaliers et passages etroits', '2-4'),
    ],
    risks: [
      r('dem-tms', 'TMS (manutention lourde)', 'Lombalgies et hernies discales par port de charges lourdes repetitif', 'dem-chargement', ['Port de meubles lourds (armoire, canape)', 'Cartons > 25 kg', 'Repetition tout au long de la journee', 'Electromenager (machine a laver 80 kg)'], 4, 4, ['Sangles de portage'], ['Sangles de portage ergonomiques', 'Chariot monte-escalier electrique', 'Diable renforce', 'Limite 25 kg par personne seule', 'Formation PRAP', 'Monte-meubles pour etages > 3']),
      r('dem-chute-escalier', 'Chute dans escaliers', 'Chute lors du port de charges dans les escaliers', 'dem-escalier', ['Escalier etroit avec charge encombrante', 'Marches usees', 'Visibilite reduite par le meuble', 'Sol mouille'], 4, 3, ['Chaussures antiderapantes'], ['Chaussures de securite antiderapantes EN 20345', 'Reconnaissance des lieux avant demenagement', 'Protection des marches (tapis)', 'Communication entre porteurs (haut/bas)', 'Monte-meubles si escalier dangereux']),
      r('dem-routier', 'Risque routier', 'Accident de la route avec camion de demenagement', 'dem-conduite', ['Conduite grand gabarit en ville', 'Fatigue (longue journee)', 'Stationnement en double file', 'Conduite longue distance'], 4, 2, ['Permis adapte', 'Vehicule entretenu'], ['Formation conduite grands gabarits', 'GPS professionnel (gabarit vehicule)', 'Balisage cones lors du stationnement', 'Respect temps de conduite']),
      r('dem-ecrasement', 'Ecrasement (meubles, objets)', 'Ecrasement d\'un membre par chute de meuble ou objet lourd', 'dem-chargement', ['Meuble qui bascule', 'Chargement instable dans le camion', 'Piano, coffre-fort (charges extremes)', 'Dechargement avec hayon'], 3, 3, ['Gants de manutention'], ['Chaussures de securite avec coque', 'Sangles d\'arrimage dans le camion', 'Evaluation prealable des charges', 'Gants anti-ecrasement', 'Refus de charges excessives']),
      r('dem-coupure', 'Coupure (verre, objets tranchants)', 'Coupure par bris de verre, miroirs ou objets tranchants', 'dem-emballage', ['Miroir non protege', 'Cadre en verre casse', 'Objet tranchant dans un carton', 'Demontage meubles (vis, agrafes)'], 2, 3, ['Gants'], ['Gants anti-coupure EN 388', 'Emballage systematique des objets fragiles', 'Marquage des cartons "fragile"', 'Trousse de secours dans le camion']),
      r('dem-psychosocial', 'Risques psychosociaux', 'Stress par charge physique, clients exigeants, delais', 'dem-chargement', ['Client mecontent', 'Retard sur planning', 'Charge physique intense', 'Conflits d\'equipe'], 2, 3, ['Communication equipe'], ['Planning realiste (temps de trajet inclus)', 'Pauses obligatoires', 'Communication equipe formalisee']),
    ],
  },

  // ── Coursier / Livreur ────────────────────────────────────────
  {
    metierSlug: 'coursier-livreur', label: 'Coursier / Livreur (deux-roues, utilitaire)', category: 'transport_logistique',
    nafCodes: ['53.20Z'], idcc: '16',
    legalReferences: ['Art. R431-1 (equipements deux-roues)', 'Tableau RG 57 (TMS)'],
    workUnits: [
      wu('cour-conduite', 'Conduite deux-roues / utilitaire', 'Conduite scooter, velo, utilitaire en ville', '1'),
      wu('cour-livraison', 'Livraison / remise colis', 'Remise du colis au destinataire', '1'),
      wu('cour-chargement', 'Chargement / tri', 'Chargement du vehicule, tri des colis', '1-2'),
      wu('cour-attente', 'Attente / point relais', 'Attente de commande, point de depart', '1'),
    ],
    risks: [
      r('cour-routier', 'Risque routier (deux-roues)', 'Accident de la route en deux-roues motorise ou velo en circulation urbaine', 'cour-conduite', ['Circulation dense en ville', 'Angle mort des vehicules', 'Sol mouille/verglace', 'Pression des delais de livraison'], 4, 4, ['Casque', 'Gilet HV'], ['Casque homologue ECE 22.06', 'Gants moto EN 13594', 'Blouson avec protections dorsale et coudes', 'Formation conduite defensive', 'Application GPS sans manipulation en roulant', 'Eclairage et retro-reflechissants']),
      r('cour-tms', 'TMS (port de colis)', 'Douleurs dorsales par port repetitif de colis et sac a dos', 'cour-livraison', ['Port de sac a dos lourd (velo)', 'Montee d\'escaliers avec colis', 'Position de conduite prolongee', 'Repetition (40-60 livraisons/jour)'], 3, 4, ['Sac a dos ergonomique'], ['Sac a dos avec bretelles rembourees', 'Limite de poids par livraison', 'Chariot pliable pour colis lourds', 'Etirements entre les livraisons']),
      r('cour-intemperies', 'Intemperies (pluie, froid, chaleur)', 'Exposition aux intemperies toute l\'annee a deux-roues', 'cour-conduite', ['Pluie (visibilite, adherence)', 'Froid hivernal', 'Chaleur estivale', 'Vent fort'], 2, 4, ['Equipement pluie'], ['Equipement pluie fourni (veste, pantalon)', 'Gants hiver chauffants', 'Sous-vetements thermiques fournis', 'Politique arret si conditions dangereuses (verglas)']),
      r('cour-agression', 'Agression (vol)', 'Agression lors de la livraison ou vol du vehicule/colis', 'cour-livraison', ['Livraison en zone difficile', 'Livraison de nuit', 'Colis de valeur', 'Vol du deux-roues'], 3, 2, ['Telephone charge'], ['Procedure de retrait si danger', 'Assurance vehicule vol/agression', 'Pas de transport de valeur apparente', 'Signalement des zones dangereuses']),
      r('cour-psychosocial', 'Risques psychosociaux (pression, precarite)', 'Stress par pression des delais, algorithmique, precarite du statut', 'cour-conduite', ['Pression de l\'application (temps de livraison)', 'Notation par les clients', 'Precarite (auto-entrepreneur)', 'Isolement professionnel'], 3, 3, ['Application mobile'], ['Temps de livraison realistes', 'Espace de pause accessible', 'Communication avec le dispatching', 'Information sur les droits sociaux']),
      r('cour-chute', 'Chute (escalier, glissade)', 'Chute dans les escaliers ou sur sol glissant lors de la livraison', 'cour-livraison', ['Escalier d\'immeuble avec colis', 'Hall d\'entree mouille', 'Trottoir glissant', 'Marches exterieur verglacees'], 2, 3, ['Chaussures fermees'], ['Chaussures antiderapantes', 'Lampe pour livraison nocturne', 'Prudence sur les surfaces mouillees']),
    ],
  },

  // ── Taxi / VTC ────────────────────────────────────────────────
  {
    metierSlug: 'taxi-vtc', label: 'Taxi / VTC', category: 'transport_logistique',
    nafCodes: ['49.32Z'], idcc: '2219',
    legalReferences: ['Loi Thevenoud 2014 (VTC)', 'Art. R231-1 (carte taxi)', 'Tableau RG 57'],
    workUnits: [
      wu('taxi-conduite', 'Conduite vehicule', 'Transport de passagers', '1'),
      wu('taxi-attente', 'Station / attente', 'Attente de clients en station ou application', '1'),
      wu('taxi-admin', 'Administration', 'Gestion courses, facturation, entretien vehicule', '1'),
      wu('taxi-bagages', 'Bagages / manutention', 'Chargement/dechargement des bagages passagers', '1'),
    ],
    risks: [
      r('taxi-routier', 'Risque routier', 'Accident de la route par conduite prolongee en circulation urbaine', 'taxi-conduite', ['Conduite nocturne', 'Fatigue (amplitude horaire)', 'Passager perturbateur', 'Conditions meteo'], 4, 4, ['Vehicule entretenu', 'Assurance RC pro'], ['Limitation amplitude horaire', 'Vehicule avec aides a la conduite (ESP, freinage)', 'Formation conduite preventive', 'Pause obligatoire toutes les 4h']),
      r('taxi-agression', 'Agression (clients)', 'Violence verbale ou physique de clients (nuit, alcool)', 'taxi-conduite', ['Client alcoolise de nuit', 'Desaccord sur le tarif', 'Quartier difficile', 'Client refusant de payer'], 3, 3, ['Verrouillage portes'], ['Camera embarquee dissuasive', 'Vitre de separation (si taxi)', 'Bouton d\'alerte silencieux', 'Formation desescalade', 'Paiement electronique (reduction cash)']),
      r('taxi-tms', 'TMS (conduite prolongee)', 'Douleurs dorsales par position assise prolongee et vibrations', 'taxi-conduite', ['Conduite 10-12h/jour', 'Siege non ergonomique', 'Vibrations urbaines', 'Montee/descente repetee (bagages)'], 3, 4, ['Siege reglable'], ['Siege avec soutien lombaire reglable', 'Coussin ergonomique', 'Exercices d\'etirement aux pauses', 'Limitation du temps de conduite']),
      r('taxi-psychosocial', 'Risques psychosociaux (horaires, isolement)', 'Stress par horaires nocturnes, isolement, clients difficiles', 'taxi-conduite', ['Travail de nuit', 'Week-ends et jours feries', 'Isolement professionnel', 'Pression de rentabilite'], 3, 3, ['Telephone'], ['Horaires de travail planifies', 'Reseau collegues (radio, application)', 'Acces medecin du travail']),
      r('taxi-biologique', 'Risque biologique (passagers)', 'Contamination par passagers malades en espace confine', 'taxi-conduite', ['Passager malade (toux, grippe)', 'Surfaces contaminees', 'Espace confine du vehicule'], 2, 3, ['Gel hydroalcoolique'], ['Aeration reguliere du vehicule', 'Nettoyage quotidien des surfaces de contact', 'Gel hydroalcoolique a disposition']),
      r('taxi-bagages', 'Manutention bagages', 'Douleurs par port de valises lourdes repetitif', 'taxi-bagages', ['Valises lourdes (gare, aeroport)', 'Chargement/dechargement du coffre', 'Position penchee sur le coffre'], 2, 3, ['Coffre large'], ['Limite de poids proposee au client', 'Technique de levage correcte', 'Vehicule avec coffre accessible']),
    ],
  },

  // ── Logistique / Entreposage ──────────────────────────────────
  {
    metierSlug: 'logistique-entreposage', label: 'Logistique / Entreposage', category: 'transport_logistique',
    nafCodes: ['52.10A', '52.10B'], idcc: '1486',
    legalReferences: ['Tableau RG 57 (TMS)', 'CACES R489 (chariots)', 'Art. R4323-1 (utilisation equipements)'],
    workUnits: [
      wu('log-reception', 'Quai de reception', 'Dechargement camions, controle marchandise', '2-6'),
      wu('log-stockage', 'Zone de stockage (racks)', 'Rangement en racks, gestion des emplacements', '2-8'),
      wu('log-preparation', 'Zone de preparation commandes', 'Picking, emballage, etiquetage', '4-20'),
      wu('log-expedition', 'Quai d\'expedition', 'Palettisation, chargement camions', '2-6'),
      wu('log-bureau', 'Bureau / gestion stocks', 'Gestion informatique des stocks, planning', '1-3'),
    ],
    risks: [
      r('log-chariot', 'Chariot elevateur (ecrasement, renversement)', 'Ecrasement par chariot elevateur ou renversement avec le conducteur', 'log-stockage', ['Croisement pietons/chariots', 'Manoeuvre en allee etroite', 'Charge instable en hauteur', 'Vitesse excessive', 'Renversement en virage'], 4, 3, ['CACES obligatoire', 'Allees balisees'], ['CACES R489 valide', 'Plan de circulation separe pietons/chariots', 'Vitesse limitee (10 km/h)', 'Miroirs aux intersections', 'Gilet HV obligatoire pour pietons', 'Chariot avec systeme anti-renversement']),
      r('log-chute-rack', 'Chute d\'objets depuis rack', 'Chute de palette ou colis depuis les racks en hauteur', 'log-stockage', ['Palette mal positionnee', 'Rack endommage (choc chariot)', 'Surcharge de rack', 'Vibration lors du passage chariot'], 4, 2, ['Filets anti-chute'], ['Verification trimestrielle des racks (norme EN 15635)', 'Filet ou grillage anti-chute sur les niveaux hauts', 'Protection pied de rack (sabots)', 'Charge max affichee par niveau', 'Procedure signalement rack endommage']),
      r('log-tms', 'TMS (preparation commandes)', 'Lombalgies par port repetitif de colis et postures de picking', 'log-preparation', ['Picking en niveau bas (penche)', 'Port de colis (5-25 kg) repetitif', 'Cadence elevee', 'Position debout prolongee'], 3, 4, ['Transpalette'], ['Voice-picking (mains libres)', 'Convoyeur pour colis lourds', 'Ergonomie des postes (hauteur)', 'Rotation des postes', 'Formation PRAP', 'Limite 25 kg par colis']),
      r('log-chute', 'Chute (quai, hauteur)', 'Chute depuis le quai ou lors de l\'acces aux racks en hauteur', 'log-reception', ['Bord de quai sans protection', 'Acces au rack par nacelle', 'Sol mouille ou encombre', 'Marches du quai usees'], 3, 3, ['Butees de quai'], ['Butees de quai conformes', 'Garde-corps bord de quai (rabattable)', 'Nacelle pour acces racks hauts (interdiction echelle)', 'Sol antiderapant', 'Eclairage suffisant']),
      r('log-circulation', 'Collision pietons/engins', 'Collision entre un pieton et un chariot ou transpalette electrique', 'log-preparation', ['Zone de picking traversee par chariot', 'Angle mort entre racks', 'Transpalette electrique silencieux', 'Personnel interimaire (meconnaissance)'], 3, 3, ['Gilet HV'], ['Separation physique pietons/chariots', 'Signalisation sonore des chariots', 'Gilet HV obligatoire pour tous', 'Accueil securite pour interimaires', 'Miroirs convexes aux angles']),
      r('log-incendie', 'Incendie (stockage)', 'Incendie dans les zones de stockage (cartons, plastiques, palettes bois)', 'log-stockage', ['Stockage de matieres combustibles', 'Installation electrique (chariot en charge)', 'Absence de compartimentage'], 4, 1, ['Sprinklers', 'Extincteurs'], ['Sprinklers conformes', 'Detection incendie dans chaque zone', 'Compartimentage des zones de stockage', 'Issue de secours balisee', 'Exercice evacuation annuel']),
      r('log-froid', 'Froid (chambre froide)', 'Exposition au froid en entrepot frigorifique (-20°C a +4°C)', 'log-stockage', ['Preparation commandes en froid positif', 'Travail en congelation (-20°C)', 'Alternance froid/chaud', 'Duree prolongee dans le froid'], 3, 3, ['Vetements chauds'], ['Vetements thermiques fournis et entretenus', 'Limitation du temps en chambre froide', 'Pauses dans local chauffe', 'Boissons chaudes disponibles']),
    ],
  },

  // ── Transport frigorifique ────────────────────────────────────
  {
    metierSlug: 'transport-frigorifique', label: 'Transport frigorifique', category: 'transport_logistique',
    nafCodes: ['49.41A'], idcc: '16',
    legalReferences: ['Accord ATP (transport perissables)', 'Reglement CE 561/2006', 'Reglement CE 853/2004 (chaine du froid)'],
    workUnits: [
      wu('trfr-conduite', 'Conduite camion frigo', 'Conduite vehicule frigorifique', '1'),
      wu('trfr-chargement', 'Chargement / dechargement', 'Manutention en ambiance froide', '1-2'),
      wu('trfr-controle', 'Controle temperature', 'Verification et enregistrement des temperatures', '1'),
      wu('trfr-entretien', 'Entretien groupe froid', 'Maintenance du groupe frigorifique', '1'),
    ],
    risks: [
      r('trfr-froid', 'Froid (ambiance frigorifique)', 'Hypothermie et gelures par travail en ambiance negative', 'trfr-chargement', ['Chargement en caisse negative (-20°C)', 'Ouverture prolongee du hayon', 'Alternance froid interieur/chaleur exterieur', 'Absence de vetements adaptes'], 3, 4, ['Vetements chauds'], ['Vetements grand froid (classe 3) fournis', 'Gants isoles pour manipulation', 'Limitation du temps en caisse negative', 'Pauses regulieres en cabine chauffee', 'Boissons chaudes a disposition']),
      r('trfr-routier', 'Risque routier', 'Accident de la route avec chargement frigorifique', 'trfr-conduite', ['Conduite de nuit (livraisons matinales)', 'Fatigue (horaires decales)', 'Circulation urbaine (livraison)', 'Route verglacee'], 4, 3, ['FIMO/FCO', 'Vehicule entretenu'], ['Respect strict temps de conduite', 'Aides a la conduite', 'Pneus hiver obligatoires', 'Planning avec marges de securite']),
      r('trfr-chimique', 'Risque chimique (fluides frigorigenes)', 'Intoxication par fuite de fluide frigorigene du groupe froid', 'trfr-entretien', ['Fuite sur le circuit frigorigene', 'Intervention sur le compresseur', 'Manipulation fluide lors de la recharge'], 3, 1, ['Entretien par specialiste'], ['Entretien du groupe froid par technicien agree', 'Detection fuite automatique', 'Ventilation avant intervention', 'Interdiction de reparer soi-meme le circuit']),
      r('trfr-tms', 'TMS (manutention en froid)', 'Douleurs par manutention de colis/palettes en ambiance froide', 'trfr-chargement', ['Port de caisses surgelees', 'Manipulation de crochets a viande', 'Position penchee dans la caisse', 'Raideur musculaire due au froid'], 3, 3, ['Transpalette', 'Gants isoles'], ['Hayon elevateur', 'Transpalette electrique embarque', 'Echauffement musculaire avant travail au froid', 'Gants isoles souples']),
      r('trfr-glissade', 'Glissade (givre, condensation)', 'Glissade sur sol givre dans la caisse ou sur le quai mouille', 'trfr-chargement', ['Givre au sol de la caisse', 'Condensation sur le quai', 'Hayon givré', 'Marches mouillees'], 3, 3, ['Chaussures antiderapantes'], ['Chaussures de securite antiderapantes grand froid', 'Tapis antiderapant sur le hayon', 'Degivrage regulier de la caisse', 'Eclairage interieur suffisant']),
      r('trfr-biologique', 'Risque biologique (denrees perissables)', 'Contamination par denrees alterees ou bacteries alimentaires', 'trfr-controle', ['Colis alimentaire endommage', 'Rupture de la chaine du froid', 'Nettoyage de la caisse apres fuite'], 2, 2, ['Gants usage unique'], ['Gants usage unique pour manipulation', 'Nettoyage et desinfection reguliere de la caisse', 'Enregistrement continu des temperatures']),
    ],
  },

  // ── Collecte de dechets ───────────────────────────────────────
  {
    metierSlug: 'collecte-dechets', label: 'Collecte de dechets / Ripeur', category: 'transport_logistique',
    nafCodes: ['38.11Z'], idcc: '2149',
    legalReferences: ['Art. R4512-1 (entreprises exterieures)', 'Tableau RG 57 (TMS)', 'Tableau RG 98 (lombalgies)'],
    workUnits: [
      wu('dech-collecte', 'Collecte en tournee', 'Ramassage des poubelles sur la voie publique', '3-4'),
      wu('dech-conduite', 'Conduite BOM', 'Conduite de la benne a ordures menageres', '1'),
      wu('dech-tri', 'Centre de tri', 'Tri des dechets recyclables sur tapis', '2-10'),
      wu('dech-decheterie', 'Decheterie', 'Accueil usagers, gestion des bennes', '1-2'),
    ],
    risks: [
      r('dech-routier', 'Risque routier (circulation)', 'Heurt par un vehicule lors de la collecte sur la voie publique', 'dech-collecte', ['Travail sur la chaussee', 'Circulation matinale', 'Visibilite reduite (nuit)', 'Automobiliste inattentif'], 4, 4, ['Gilet HV', 'Gyrophare BOM'], ['Gilet HV classe 3 obligatoire', 'Eclairage et gyrophare sur la BOM', 'Tournees aux heures creuses', 'Formation securite routiere', 'Bande retro-reflechissante sur les vetements']),
      r('dech-tms', 'TMS (manutention repetitive)', 'Lombalgies par manipulation repetitive de conteneurs lourds', 'dech-collecte', ['Tirage de conteneurs 4 roues', 'Levee de sacs (10-15 kg)', 'Course derriere la BOM', 'Montee/descente marchepied'], 4, 4, ['Leve-conteneur mecanique'], ['BOM avec leve-conteneur automatique', 'Conteneurs 4 roues pour tous les particuliers', 'Vitesse de tournee adaptee', 'Rotation entre conduite et collecte', 'Formation gestes et postures']),
      r('dech-biologique', 'Risque biologique (dechets)', 'Contamination par dechets contamines (aiguilles, couches, aliments)', 'dech-collecte', ['Sac perce (aiguille usagee)', 'Contact dechets putrescibles', 'Dejections animales', 'Dechets medicaux en poubelle classique'], 3, 4, ['Gants de protection'], ['Gants anti-piqure et anti-coupure', 'Vaccination tetanos et hepatite B', 'Kit AES dans chaque BOM', 'Interdiction de tasser les dechets a la main', 'Lavage des mains et desinfection apres chaque tournee']),
      r('dech-chimique', 'Risque chimique (produits jetes)', 'Exposition a des produits chimiques jetes dans les poubelles', 'dech-collecte', ['Solvant ou peinture en poubelle', 'Aerosol sous pression', 'Produit menager concentre', 'Amiante dans les encombrants'], 3, 2, ['Gants', 'Consignes tri'], ['Refus de collecte si danger visible', 'EPI adaptes (masque si odeur suspecte)', 'Procedure en cas de produit dangereux', 'Communication aux usagers sur les dechets interdits']),
      r('dech-ecrasement', 'Ecrasement (benne, leve-conteneur)', 'Ecrasement par le mecanisme de compaction ou leve-conteneur', 'dech-collecte', ['Bras du leve-conteneur en mouvement', 'Compacteur en fonctionnement', 'Marchepied arriere (chute sous la BOM)', 'Manoeuvre en marche arriere'], 4, 2, ['Arret d\'urgence', 'Camera de recul'], ['Camera et radar de recul', 'Arret d\'urgence accessible du marchepied', 'Interdiction de toucher le leve-conteneur en fonctionnement', 'Detecteur de presence autour de la BOM']),
      r('dech-bruit', 'Bruit (BOM, compacteur)', 'Exposition au bruit du compacteur et de la circulation (> 85 dB)', 'dech-collecte', ['Compacteur en fonctionnement', 'Vidage de conteneurs verre', 'Circulation urbaine', 'Klaxons'], 2, 4, ['Bouchons d\'oreille'], ['Bouchons moules fournis', 'BOM avec compacteur insonorise', 'Collecte verre avec equipement antibruit', 'Suivi audiometrique annuel']),
    ],
  },

  // ── Messagerie express ────────────────────────────────────────
  {
    metierSlug: 'messagerie-express', label: 'Messagerie express / Colis', category: 'transport_logistique',
    nafCodes: ['53.20Z'], idcc: '16',
    legalReferences: ['Tableau RG 57 (TMS)', 'Code de la route', 'Art. R4541-1 (manutention)'],
    workUnits: [
      wu('msg-tri', 'Hub de tri / plateforme', 'Tri mecanise et manuel des colis', '5-50'),
      wu('msg-tournee', 'Tournee de livraison', 'Livraison en vehicule utilitaire leger', '1'),
      wu('msg-chargement', 'Chargement vehicule', 'Chargement du vehicule au hub', '1'),
      wu('msg-admin', 'Bureau / dispatching', 'Gestion des tournees, dispatching', '1-3'),
    ],
    risks: [
      r('msg-tms', 'TMS (manutention colis)', 'Lombalgies par manipulation repetitive de colis (50-150 colis/jour)', 'msg-tournee', ['Port de colis (1-30 kg)', 'Montee d\'escaliers avec colis', 'Chargement/dechargement vehicule', 'Cadence elevee'], 3, 4, ['Diable pliable'], ['Diable pliable dans chaque vehicule', 'Chariot monte-escalier pour colis lourds', 'Organisation de la tournee (charges lourdes en premier)', 'Limite de poids par colis', 'Formation gestes et postures']),
      r('msg-routier', 'Risque routier (utilitaire)', 'Accident de la route en utilitaire leger en milieu urbain', 'msg-tournee', ['Conduite en ville dense', 'Stationnement en double file', 'Fatigue (longue journee)', 'Pression des delais'], 3, 3, ['Vehicule entretenu'], ['GPS avec planification tournee', 'Vehicule equipe camera de recul', 'Respect du code de la route (pas de double file)', 'Temps de tournee realiste']),
      r('msg-chute', 'Chute (escalier, vehicule)', 'Chute en montant/descendant du vehicule ou dans les escaliers', 'msg-tournee', ['Descente du vehicule (marchepied)', 'Escalier d\'immeuble', 'Sol mouille', 'Course pour gagner du temps'], 2, 3, ['Chaussures fermees'], ['Chaussures antiderapantes', 'Descente cote trottoir', 'Ne pas courir', 'Eclairage si livraison nocturne']),
      r('msg-psychosocial', 'Risques psychosociaux (pression, cadence)', 'Stress par pression des indicateurs de livraison et isolement', 'msg-tournee', ['Nombre de colis a livrer (objectif)', 'Clients absents (avis de passage)', 'Reclamations', 'Isolement toute la journee'], 3, 3, ['Communication dispatching'], ['Objectifs de livraison realistes', 'Points relais pour colis non livres', 'Communication reguliere avec le hub', 'Pause dejeuner effective']),
      r('msg-agression', 'Agression (vol de colis)', 'Agression lors de la livraison ou vol de colis dans le vehicule', 'msg-tournee', ['Vehicule ouvert pour livraison', 'Livraison en zone sensible', 'Colis de valeur visible'], 2, 2, ['Verrouillage vehicule'], ['Verrouillage systematique du vehicule', 'Pas de colis de valeur en vue', 'Procedure de retrait si danger']),
      r('msg-hub-mecanise', 'Machines (tapis, convoyeur au hub)', 'Happage par tapis roulant ou convoyeur au centre de tri', 'msg-tri', ['Tapis de tri en mouvement', 'Debourrage convoyeur', 'Colis coince dans le mecanisme'], 3, 2, ['Arret d\'urgence', 'Carter'], ['Arret d\'urgence a chaque poste', 'Carter sur les parties mobiles', 'Interdiction d\'intervention machine en marche', 'Formation securite machines']),
    ],
  },

  // ── Transport maritime/fluvial ────────────────────────────────
  {
    metierSlug: 'transport-fluvial', label: 'Transport fluvial / Batellerie', category: 'transport_logistique',
    nafCodes: ['50.40Z'], idcc: '3017',
    legalReferences: ['Code des transports (livre II)', 'Reglement general de police fluviale', 'Tableau RG 57 (TMS)'],
    workUnits: [
      wu('fluv-navigation', 'Navigation / timonerie', 'Conduite de la peniche ou du bateau', '1-2'),
      wu('fluv-chargement', 'Chargement / dechargement', 'Operations de chargement en vrac ou conteneurs', '1-2'),
      wu('fluv-pont', 'Pont / manoeuvres', 'Amarrage, eclusage, entretien du pont', '1-2'),
      wu('fluv-machine', 'Salle des machines', 'Entretien moteur et equipements', '1'),
    ],
    risks: [
      r('fluv-noyade', 'Noyade / chute a l\'eau', 'Chute dans l\'eau depuis le pont ou le quai', 'fluv-pont', ['Manoeuvre d\'amarrage', 'Passage d\'ecluse', 'Pont mouille et glissant', 'Travail seul de nuit'], 4, 3, ['Gilet de sauvetage'], ['Gilet de sauvetage autogonflant porte en permanence', 'Bouee de sauvetage a chaque acces pont', 'Garde-corps conformes', 'Echelle de remontee', 'Homme a la mer (alarme)']),
      r('fluv-ecrasement', 'Ecrasement (amarrage, ecluse)', 'Ecrasement par cordages sous tension ou entre quai et peniche', 'fluv-pont', ['Amarrage (cordage sous tension)', 'Eclusage (mouvement du bateau)', 'Accostage (espace entre quai et bord)', 'Bollard d\'amarrage'], 4, 2, ['Gants', 'Procedure ecluse'], ['Gants de manoeuvre', 'Bollards d\'amarrage conformes', 'Ne jamais mettre le pied entre quai et bateau', 'Formation manoeuvre ecluse', 'Communication radio avec eclusier']),
      r('fluv-bruit', 'Bruit (moteur, equipements)', 'Surdite professionnelle par exposition au bruit du moteur', 'fluv-machine', ['Salle des machines (> 90 dB)', 'Navigation moteur au ralenti', 'Equipements de pont (treuil)'], 3, 3, ['Casque antibruit'], ['Casque antibruit EN 352 en salle des machines', 'Insonorisation de la salle des machines', 'Suivi audiometrique annuel']),
      r('fluv-tms', 'TMS (amarrage, manutention)', 'Douleurs par manipulation des cordages et manutention', 'fluv-chargement', ['Traction de cordages lourds', 'Manutention en espace restreint', 'Position de conduite prolongee'], 3, 3, ['Treuil electrique'], ['Treuil electrique pour amarrage', 'Siege ergonomique en timonerie', 'Equipe suffisante pour les manoeuvres']),
      r('fluv-chimique', 'Risque chimique (carburant, cargaison)', 'Exposition au gasoil et aux matieres transportees', 'fluv-machine', ['Avitaillement en carburant', 'Fuite de gasoil', 'Cargaison chimique (matiere dangereuse)', 'Gaz d\'echappement moteur'], 3, 2, ['Gants nitrile', 'Ventilation'], ['EPI pour avitaillement', 'Ventilation salle des machines', 'Formation TMD si marchandises dangereuses', 'Bac de retention fuites']),
      r('fluv-isolement', 'Isolement (vie a bord)', 'Isolement professionnel et psychosocial par vie embarquee', 'fluv-navigation', ['Vie a bord en continu', 'Navigation solitaire', 'Eloignement familial', 'Travail de nuit'], 2, 3, ['Telephone', 'VHF'], ['Communication reguliere avec l\'armateur', 'Telephone satellite si zone blanche', 'Rotation des equipages', 'Temps de repos a quai suffisant']),
    ],
  },
];
