// BUSINESS RULE [CDC-2.4]: E7e — 6 metiers Hotellerie & Hebergement

import type { MetierRiskProfile } from './risk-database-v2.js';

function r(id: string, name: string, desc: string, wuId: string, sits: string[], g: 1|2|3|4, f: 1|2|3|4, exist: string[], proposed: string[], cat: string): MetierRiskProfile['risks'][number] {
  return { id, name, description: desc, workUnitId: wuId, situations: sits, defaultGravity: g, defaultFrequency: f, existingMeasures: exist, proposedActions: proposed, category: cat as MetierRiskProfile['risks'][number]['category'] };
}

function wu(id: string, name: string, desc: string, hc: string): MetierRiskProfile['workUnits'][number] {
  return { id, name, description: desc, typicalHeadcount: hc };
}

export const HOTELLERIE_TRADES: MetierRiskProfile[] = [
  // ── Hotel ─────────────────────────────────────────────────────
  {
    metierSlug: 'hotel', label: 'Hotel', category: 'hotellerie_hebergement',
    nafCodes: ['55.10Z'], idcc: '1979',
    legalReferences: ['Art. R123-1 (ERP)', 'Arrete du 25/06/1980 (securite ERP)', 'Tableau RG 57 (TMS)'],
    workUnits: [
      wu('hot-chambres', 'Etages / chambres', 'Menage des chambres, service lingerie', '3-15'),
      wu('hot-reception', 'Reception / accueil', 'Accueil, check-in/out, conciergerie', '1-4'),
      wu('hot-cuisine', 'Cuisine / petit-dejeuner', 'Preparation des repas et petit-dejeuner', '1-4'),
      wu('hot-technique', 'Local technique / maintenance', 'Entretien general, electricite, plomberie', '1-2'),
      wu('hot-buanderie', 'Buanderie', 'Lavage, sechage, repassage du linge', '1-3'),
    ],
    risks: [
      r('hot-tms', 'TMS (menage chambres)', 'Lombalgies et tendinites par menage repetitif des chambres', 'hot-chambres', ['Faire les lits (matelas lourd)', 'Aspiration/lavage sol a repetition', 'Port de linge sale et propre', 'Nettoyage salle de bain (posture basse)', 'Cadence elevee (15-20 chambres/jour)'], 3, 4, ['Chariot d\'etage'], ['Chariot d\'etage ergonomique complet', 'Draps et couettes legers', 'Manche telescopique pour le sol', 'Aspirateur leger dorsal', 'Cadence de chambres raisonnable', 'Formation gestes et postures']),
      r('hot-chimique', 'Risque chimique (produits menage)', 'Irritation par produits de nettoyage et desinfection des chambres', 'hot-chambres', ['Spray desinfectant salle de bain', 'Detartrant WC (acide)', 'Produit vitre', 'Melange de produits dangereux'], 2, 4, ['Gants menage'], ['Gants nitrile pour chaque femme de chambre', 'Doseurs automatiques', 'Interdiction des melanges', 'Produits eco-labellises', 'Aeration des chambres pendant le menage']),
      r('hot-chute', 'Chute (escaliers, salle de bain)', 'Glissade dans les salles de bain ou escaliers', 'hot-chambres', ['Salle de bain mouillee', 'Escalier de service', 'Couloir encombre', 'Sous-sol technique (humide)'], 2, 3, ['Chaussures antiderapantes'], ['Chaussures antiderapantes fournies', 'Eclairage des zones de service', 'Sol antiderapant dans les salles de bain']),
      r('hot-psychosocial', 'Risques psychosociaux', 'Stress par cadence, clients difficiles, horaires', 'hot-reception', ['Client mecontent (reclamation)', 'Horaires decales (reception 24/24)', 'Cadence de chambres elevee', 'Travail seul de nuit (reception)'], 3, 3, ['Rotation equipes'], ['Planning equitable des horaires', 'Formation gestion des reclamations', 'Soutien hierarchique', 'PTI pour le receptionniste de nuit']),
      r('hot-agression', 'Agression (clients)', 'Violence de clients alcoolises ou mecontents', 'hot-reception', ['Client alcoolise (bar de l\'hotel)', 'Client refusant de payer', 'Receptionniste seul de nuit'], 3, 2, ['Camera', 'Telephone'], ['Camera dans le hall', 'Bouton d\'alerte silencieux a la reception', 'Formation desescalade', 'Procedure d\'appel police']),
      r('hot-incendie', 'Incendie (ERP)', 'Incendie dans l\'hotel (obligation ERP renforcee)', 'hot-technique', ['Chambre (cigarette, court-circuit)', 'Cuisine (friteuse, four)', 'Buanderie (surchauffe)', 'Installation electrique ancienne'], 4, 1, ['SSI', 'Extincteurs', 'Plan evacuation'], ['SSI (Systeme de Securite Incendie) conforme', 'Exercice evacuation semestriel', 'Formation equipier de premiere intervention', 'Registre de securite a jour', 'Commission de securite ERP periodique']),
      r('hot-biologique', 'Risque biologique (linge, sanitaires)', 'Contamination par linge sale et nettoyage des sanitaires', 'hot-buanderie', ['Manipulation linge sale (sang, fluides)', 'Nettoyage WC', 'Piqure par objet dans les draps (aiguille)'], 2, 3, ['Gants'], ['Gants epais pour manipulation du linge', 'Tri du linge avec precaution', 'Lavage a temperature suffisante (60°C min)', 'Procedure si objet piquant trouve']),
    ],
  },

  // ── Camping ───────────────────────────────────────────────────
  {
    metierSlug: 'camping', label: 'Camping / Parc residentiel de loisirs', category: 'hotellerie_hebergement',
    nafCodes: ['55.30Z'], idcc: '1631',
    legalReferences: ['Art. D332-1 (hebergement de plein air)', 'Art. D1332-1 (piscine)', 'Arrete du 25/06/1980 (ERP)'],
    workUnits: [
      wu('camp-accueil', 'Accueil / reception', 'Accueil des campeurs, reservations', '1-2'),
      wu('camp-espaces', 'Espaces communs / sanitaires', 'Entretien sanitaires, espaces verts, voiries', '2-4'),
      wu('camp-piscine', 'Piscine / espace aquatique', 'Surveillance, entretien, traitement eau', '1-3'),
      wu('camp-technique', 'Service technique', 'Electricite, plomberie, espaces verts', '1-3'),
    ],
    risks: [
      r('camp-electrique', 'Risque electrique (branchements camping)', 'Electrocution par installations electriques exterieures en milieu humide', 'camp-technique', ['Bornes electriques emplacements (pluie)', 'Branchement caravane defectueux', 'Installation electrique vieillissante', 'Travail sous tension pour depannage'], 4, 2, ['Differentiel 30mA'], ['Differentiel 30mA sur chaque borne', 'Verification electrique annuelle (Consuel)', 'Habilitation electrique du technicien', 'Remplacement immediat des bornes defectueuses', 'IP44 minimum pour les prises exterieures']),
      r('camp-noyade', 'Noyade (piscine)', 'Noyade dans la piscine ou l\'espace aquatique', 'camp-piscine', ['Enfant non surveille', 'Adulte malaise dans l\'eau', 'Toboggan aquatique', 'Pataugeoire'], 4, 2, ['MNS present', 'Barriere'], ['Maitre nageur sauveteur (MNS) aux horaires d\'ouverture', 'Barriere conforme NF P90-306', 'Perche et bouee accessibles', 'Affichage des regles', 'Alarme immersion']),
      r('camp-chimique', 'Risque chimique (chlore piscine)', 'Intoxication par produits de traitement de la piscine', 'camp-piscine', ['Manipulation de chlore en galets/liquide', 'pH correcteur (acide sulfurique)', 'Stockage produits', 'Brouillard chlore'], 3, 3, ['Gants et lunettes'], ['Dosage automatique chlore et pH', 'EPI pour manipulation (gants, lunettes, masque)', 'Local produits ventile et ferme a cle', 'FDS affichees', 'Formation manipulation produits piscine']),
      r('camp-tms', 'TMS (entretien, menage)', 'Douleurs par entretien polyvalent (menage, espaces verts, technique)', 'camp-espaces', ['Nettoyage sanitaires repetitif', 'Tonte des espaces verts', 'Reparations techniques', 'Port de materiel'], 2, 3, ['Materiel ergonomique'], ['Chariot de nettoyage ergonomique', 'Tondeuse autoportee', 'Alternance des taches', 'Materiel adapte et entretenu']),
      r('camp-agression', 'Agression (campeurs)', 'Violence de campeurs (alcool, bruit)', 'camp-accueil', ['Campeur alcoolise', 'Conflit de voisinage entre emplacements', 'Rappel a l\'ordre (bruit nocturne)', 'Vol ou degradation'], 2, 2, ['Reglement interieur'], ['Formation gestion de conflit', 'Procedure d\'appel police/gendarmerie', 'Ne pas intervenir seul en cas de conflit grave']),
      r('camp-intemperies', 'Intemperies (travail exterieur)', 'Exposition aux intemperies (travail exterieur toute l\'annee)', 'camp-espaces', ['Chaleur estivale', 'Pluie', 'Orage (risque foudre)', 'UV prolonges'], 2, 3, ['Vetements adaptes'], ['Creme solaire et chapeau en ete', 'Vetements de pluie', 'Procedure orage (mise a l\'abri)', 'Eau fraiche a disposition']),
    ],
  },

  // ── Gite / Chambre d'hotes ────────────────────────────────────
  {
    metierSlug: 'gite-chambre-hotes', label: 'Gite / Chambre d\'hotes', category: 'hotellerie_hebergement',
    nafCodes: ['55.20Z'], idcc: '1979',
    legalReferences: ['Art. L324-3 (code tourisme)', 'Arrete du 25/06/1980 (ERP si > 15 personnes)'],
    workUnits: [
      wu('gite-chambres', 'Chambres / gite', 'Menage, preparation des chambres', '1'),
      wu('gite-cuisine', 'Cuisine / petit-dejeuner', 'Preparation du petit-dejeuner, table d\'hotes', '1'),
      wu('gite-exterieur', 'Exterieur / jardin', 'Entretien jardin, piscine, parking', '1'),
      wu('gite-accueil', 'Accueil', 'Accueil des hotes, information touristique', '1'),
    ],
    risks: [
      r('gite-polyvalence', 'Risques polyvalents (multi-taches)', 'Exposition a des risques varies par la polyvalence (menage+cuisine+entretien+jardin)', 'gite-chambres', ['Menage (chimique, TMS)', 'Cuisine (brulure, coupure)', 'Jardinage (machines, UV)', 'Petits travaux (electrique, chute)'], 2, 3, ['EPI basiques'], ['EPI adaptes a chaque tache', 'Formation polyvalente (hygiene, securite)', 'Materiel adapte et entretenu', 'Ne pas improviser sur l\'electrique']),
      r('gite-chute', 'Chute (escalier ancien, jardin)', 'Chute dans les escaliers anciens ou le jardin', 'gite-exterieur', ['Escalier ancien sans main courante', 'Jardin en pente', 'Sol mouille', 'Echelle pour entretien toiture'], 3, 2, ['Eclairage'], ['Main courante dans les escaliers', 'Eclairage automatique des zones de passage', 'Entretien du jardin (pas d\'obstacles)', 'Interdiction travaux en hauteur seul']),
      r('gite-isolement', 'Isolement (travail seul)', 'Travail seul en milieu rural sans secours proche', 'gite-chambres', ['Gerant seul toute la semaine', 'Zone rurale isolee', 'Malaise sans temoin'], 2, 3, ['Telephone'], ['Telephone charge en permanence', 'Voisin ou proche informe de la presence', 'Trousse de secours complete']),
      r('gite-incendie', 'Incendie (batiment ancien)', 'Incendie dans un batiment ancien (materiaux combustibles)', 'gite-chambres', ['Cheminee', 'Installation electrique ancienne', 'Batiment en bois', 'Bougies dans les chambres'], 4, 1, ['Detecteur fumee', 'Extincteur'], ['DAAF dans chaque chambre', 'Extincteur par niveau', 'Verification electrique', 'Consignes evacuation affichees', 'Interdiction bougies dans les chambres']),
      r('gite-biologique', 'Risque biologique (cuisine, linge)', 'Contamination alimentaire lors de la preparation des repas', 'gite-cuisine', ['Preparation table d\'hotes', 'Conservation des aliments', 'Linge (draps)', 'Nettoyage des sanitaires'], 2, 2, ['Hygiene basique'], ['Formation hygiene alimentaire', 'Chaine du froid respectee', 'Lavage linge a 60°C minimum']),
      r('gite-psychosocial', 'Risques psychosociaux (charge, saisonnalite)', 'Epuisement par charge de travail saisonniere et absence de repos', 'gite-accueil', ['Haute saison (sans jour de repos)', 'Gestion des reclamations', 'Astreinte permanente (hote sur place)', 'Isolement social (rural)'], 2, 3, ['Planning'], ['Jours de repos planifies meme en saison', 'Fermeture periodique', 'Reseau de collegues gites', 'Delegation de taches si possible']),
    ],
  },

  // ── Residence tourisme ────────────────────────────────────────
  {
    metierSlug: 'residence-tourisme', label: 'Residence de tourisme', category: 'hotellerie_hebergement',
    nafCodes: ['55.20Z'], idcc: '1979',
    legalReferences: ['Art. D321-1 (code tourisme)', 'Art. D1332-1 (piscine)', 'Arrete du 25/06/1980 (ERP)'],
    workUnits: [
      wu('rest-accueil', 'Accueil / reception', 'Accueil, check-in/out, informations', '1-2'),
      wu('rest-menage', 'Menage des appartements', 'Nettoyage et preparation des logements', '2-8'),
      wu('rest-piscine', 'Espace aquatique', 'Surveillance et entretien piscine', '1-2'),
      wu('rest-technique', 'Service technique', 'Maintenance, electricite, espaces verts', '1-2'),
    ],
    risks: [
      r('rest-tms', 'TMS (menage)', 'Lombalgies par menage repetitif des appartements', 'rest-menage', ['Faire les lits (equipement complet)', 'Nettoyage cuisine/vaisselle', 'Aspiration et lavage sol', 'Port de linge (escaliers sans ascenseur)'], 3, 4, ['Chariot'], ['Chariot de menage ergonomique', 'Manche telescopique', 'Linge leger', 'Cadence d\'appartements raisonnable', 'Formation gestes et postures']),
      r('rest-chimique', 'Risque chimique (produits menage)', 'Irritation par produits de nettoyage', 'rest-menage', ['Produits detartrants', 'Desinfection cuisine', 'Produit four', 'Spray vitre'], 2, 3, ['Gants'], ['Gants nitrile', 'Doseurs', 'Produits eco-labellises', 'Aeration pendant le menage']),
      r('rest-piscine', 'Noyade / chimique (piscine)', 'Noyade client ou intoxication par produits piscine', 'rest-piscine', ['Enfant sans surveillance', 'Manipulation chlore', 'Pataugeoire'], 4, 1, ['Barriere', 'Chlore auto'], ['Barriere NF P90-306', 'MNS si espace aquatique important', 'Dosage automatique', 'Formation PSC1 du personnel']),
      r('rest-chute', 'Chute (escalier, parking)', 'Chute dans les escaliers ou sur le parking', 'rest-technique', ['Escalier avec linge', 'Parking verglace', 'Sol mouille hall'], 2, 2, ['Eclairage', 'Sol antiderapant'], ['Sol antiderapant', 'Eclairage automatique', 'Salage parking en hiver']),
      r('rest-electrique', 'Risque electrique', 'Electrisation par installation electrique des appartements', 'rest-technique', ['Intervention sur prise defectueuse', 'Eclairage exterieur (humidite)', 'Cuisine (electromenager)'], 3, 1, ['Differentiel'], ['Habilitation electrique du technicien', 'Verification electrique annuelle', 'Appel electricien si doute']),
      r('rest-psychosocial', 'Risques psychosociaux', 'Stress par clients exigeants et saisonnalite', 'rest-accueil', ['Check-out collectif (samedi)', 'Client mecontent', 'Haute saison (surcharge)', 'Horaires decales'], 2, 3, ['Equipe suffisante'], ['Renfort en haute saison', 'Planning equitable', 'Procedure reclamation']),
    ],
  },

  // ── Auberge de jeunesse ───────────────────────────────────────
  {
    metierSlug: 'auberge-jeunesse', label: 'Auberge de jeunesse / Hostel', category: 'hotellerie_hebergement',
    nafCodes: ['55.20Z'], idcc: '1979',
    legalReferences: ['Art. R123-1 (ERP)', 'Vigipirate', 'Art. L322-1 (code tourisme)'],
    workUnits: [
      wu('aub-accueil', 'Accueil / reception', 'Accueil 24/24, check-in, bar', '1-2'),
      wu('aub-dortoirs', 'Dortoirs', 'Entretien des dortoirs et sanitaires communs', '1-3'),
      wu('aub-communs', 'Espaces communs / cuisine', 'Cuisine commune, salon, jardin', '1-2'),
      wu('aub-technique', 'Maintenance', 'Entretien general, depannage', '1'),
    ],
    risks: [
      r('aub-agression', 'Agression (public jeune, alcool)', 'Violence de clients alcoolises ou conflictuels', 'aub-accueil', ['Client alcoolise au bar', 'Conflit entre voyageurs (dortoir)', 'Vol dans le dortoir (accusation)', 'Refus de reglement'], 3, 3, ['Camera', 'Reglement interieur'], ['Camera de surveillance dans les espaces communs', 'Formation gestion de conflit', 'Procedure expulsion formalisee', 'Casiers securises (reduction vols)', 'Pas d\'intervention seul si personne agressive']),
      r('aub-tms', 'TMS (menage, linge)', 'Douleurs par menage des dortoirs et lits superposes', 'aub-dortoirs', ['Faire les lits superposes (position contraignante)', 'Port de linge', 'Aspiration dortoir', 'Nettoyage sanitaires communs'], 3, 3, ['Chariot'], ['Draps legers pour lits superposes', 'Echelle stable pour acces lit du haut', 'Chariot de menage', 'Cadence raisonnable']),
      r('aub-incendie', 'Incendie (ERP, dortoir)', 'Incendie dans un batiment avec dortoirs (evacuation complexe)', 'aub-dortoirs', ['Dortoir (nuit, nombreux occupants)', 'Cuisine commune (imprudence voyageur)', 'Surcharge electrique (multiprises)', 'Cigarette dans le dortoir'], 4, 1, ['SSI', 'Plan evacuation'], ['SSI conforme a la categorie ERP', 'Exercice evacuation semestriel', 'Detecteur dans chaque dortoir', 'Eclairage de securite', 'Formation evacuation du personnel']),
      r('aub-biologique', 'Risque biologique (dortoirs, sanitaires)', 'Contamination par hygiene collective (dortoirs, sanitaires partages)', 'aub-dortoirs', ['Sanitaires communs', 'Dortoir (air confine)', 'Cuisine commune (hygiene variable)', 'Punaises de lit'], 2, 3, ['Nettoyage quotidien'], ['Nettoyage desinfection quotidien des sanitaires', 'Aeration quotidienne des dortoirs', 'Protocole punaises de lit (detection, traitement)', 'Housse anti-punaise sur les matelas']),
      r('aub-psychosocial', 'Risques psychosociaux', 'Stress par travail de nuit, public divers, surcharge', 'aub-accueil', ['Travail de nuit seul a la reception', 'Public cosmopolite (barriere de langue)', 'Haute saison (surcharge)', 'Gestion des conflits de dortoir'], 2, 3, ['Rotation nuit'], ['PTI pour le travailleur de nuit', 'Rotation equitable des nuits', 'Formation interculturelle']),
      r('aub-chute', 'Chute (lits superposes, escaliers)', 'Chute depuis un lit superpose ou dans les escaliers', 'aub-dortoirs', ['Lit superieur (acces echelle)', 'Escalier encombre (sac a dos)', 'Sol mouille sanitaires'], 2, 2, ['Echelle fixe', 'Main courante'], ['Lits superposes conformes NF EN 747', 'Echelle fixe avec barres antiderapantes', 'Main courante dans les escaliers', 'Sol antiderapant sanitaires']),
    ],
  },

  // ── Food truck ────────────────────────────────────────────────
  {
    metierSlug: 'food-truck', label: 'Food truck / Cuisine ambulante', category: 'hotellerie_hebergement',
    nafCodes: ['56.10C'], idcc: '1979',
    legalReferences: ['Reglement CE 852/2004 (hygiene)', 'Art. R123-1 (si ERP)', 'Norme gaz NF DTU 61.1'],
    workUnits: [
      wu('ftruck-cuisine', 'Zone de cuisson / preparation', 'Cuisson, preparation dans le camion', '1-2'),
      wu('ftruck-service', 'Comptoir de service', 'Service des clients, encaissement', '1'),
      wu('ftruck-conduite', 'Conduite / installation', 'Conduite du camion et installation sur le site', '1'),
      wu('ftruck-stockage', 'Stockage / approvisionnement', 'Stockage des denrees, approvisionnement', '1'),
    ],
    risks: [
      r('ftruck-brulure', 'Brulure (friteuse, plancha)', 'Brulure par contact avec surfaces chaudes ou projections d\'huile', 'ftruck-cuisine', ['Friteuse dans espace exigu', 'Plancha surchauffee', 'Huile qui eclabousse', 'Espace de travail restreint'], 3, 3, ['Gants anti-chaleur'], ['Gants anti-chaleur EN 407', 'Ecran anti-projection sur friteuse', 'Tablier ignifuge', 'Trousse de secours (brulure)', 'Espacement suffisant entre les equipements']),
      r('ftruck-gaz', 'Risque gaz (explosion, intoxication)', 'Fuite de gaz propane/butane dans l\'espace confine du camion', 'ftruck-cuisine', ['Fuite sur raccord gaz', 'Flamme nue pres du detendeur', 'Bonbonne de gaz dans le camion', 'Ventilation insuffisante'], 4, 2, ['Detecteur gaz'], ['Detecteur de gaz fixe dans le camion', 'Tuyau gaz NF obligatoire', 'Vanne d\'arret accessible', 'Verification annuelle installation gaz', 'Ventilation haute et basse permanentes', 'Extincteur dans le camion']),
      r('ftruck-tms', 'TMS (espace exigu)', 'Douleurs par travail dans un espace tres restreint', 'ftruck-cuisine', ['Espace de travail exigu', 'Position debout prolongee', 'Gestes repetitifs', 'Manutention dans un espace restreint'], 2, 4, ['Tapis anti-fatigue'], ['Tapis anti-fatigue au sol', 'Organisation optimale de l\'espace', 'Pauses regulieres hors du camion', 'Chaussures confortables antiderapantes']),
      r('ftruck-routier', 'Risque routier (conduite)', 'Accident lors des deplacements avec le food truck', 'ftruck-conduite', ['Conduite d\'un vehicule lourd', 'Installation/desinstallation sur site', 'Stationnement en voirie'], 3, 2, ['Permis adapte'], ['Formation conduite vehicule lourd si necessaire', 'Balisage lors de l\'installation', 'Verification avant depart (gaz, equipements arimes)']),
      r('ftruck-hygiene', 'Risque biologique (hygiene alimentaire)', 'Contamination alimentaire par defaut de chaine du froid ou hygiene', 'ftruck-stockage', ['Chaine du froid (camion non frigorifique)', 'Lavage des mains (eau limitee)', 'Temperature exterieure elevee', 'Stockage limité'], 3, 2, ['Frigo embarque'], ['Formation HACCP obligatoire', 'Frigo embarque avec controle temperature', 'Point d\'eau avec savon', 'Nettoyage et desinfection quotidien du camion', 'Approvisionnement quotidien (stockage minimum)']),
      r('ftruck-incendie', 'Incendie (gaz, graisse)', 'Incendie par flamme ou inflammation de graisse dans le camion', 'ftruck-cuisine', ['Graisse en flamme (friteuse)', 'Gaz + flamme nue', 'Court-circuit electrique'], 4, 1, ['Extincteur'], ['Extincteur CO2 dans le camion', 'Couverture anti-feu', 'Nettoyage quotidien des graisses', 'Arret du gaz en fin de service']),
    ],
  },
];
