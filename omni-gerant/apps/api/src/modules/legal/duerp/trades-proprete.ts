// BUSINESS RULE [CDC-2.4]: E7c — 8 metiers Proprete & Environnement
// Sources : INRS, FEP (Federation Proprete), fiches metiers

import type { MetierRiskProfile } from './risk-database-v2.js';

function r(id: string, name: string, desc: string, wuId: string, sits: string[], g: 1|2|3|4, f: 1|2|3|4, exist: string[], proposed: string[], cat: string): MetierRiskProfile['risks'][number] {
  return { id, name, description: desc, workUnitId: wuId, situations: sits, defaultGravity: g, defaultFrequency: f, existingMeasures: exist, proposedActions: proposed, category: cat as MetierRiskProfile['risks'][number]['category'] };
}

function wu(id: string, name: string, desc: string, hc: string): MetierRiskProfile['workUnits'][number] {
  return { id, name, description: desc, typicalHeadcount: hc };
}

export const PROPRETE_TRADES: MetierRiskProfile[] = [
  // ── Nettoyage bureaux ─────────────────────────────────────────
  {
    metierSlug: 'nettoyage-bureaux', label: 'Nettoyage de bureaux / locaux tertiaires', category: 'proprete_environnement',
    nafCodes: ['81.21Z'], idcc: '3043',
    legalReferences: ['Art. R4512-1 (entreprises exterieures)', 'Tableau RG 65 (dermatoses)', 'Tableau RG 66 (respiratoires)'],
    workUnits: [
      wu('netb-bureaux', 'Bureaux / open space', 'Nettoyage des postes de travail, sols, poubelles', '1-3'),
      wu('netb-sanitaires', 'Sanitaires', 'Nettoyage et desinfection des WC et salles d\'eau', '1'),
      wu('netb-communs', 'Parties communes', 'Couloirs, hall, escaliers, ascenseur', '1-2'),
      wu('netb-stockage', 'Local produits / materiel', 'Stockage des produits et du materiel de nettoyage', '1'),
    ],
    risks: [
      r('netb-chimique', 'Risque chimique (produits nettoyage)', 'Irritation cutanee et respiratoire par produits de nettoyage', 'netb-sanitaires', ['Melange javel + acide (chlore)', 'Produit detartrant acide', 'Desinfectant concentre', 'Spray en espace confine (sanitaires)'], 3, 4, ['Gants menage'], ['Interdiction formelle des melanges', 'Gants nitrile EN 374 obligatoires', 'Doseurs automatiques', 'Produits eco-labellises quand possible', 'FDS dans le local produits', 'Aeration avant et pendant nettoyage sanitaires']),
      r('netb-tms', 'TMS (postures, repetition)', 'Douleurs par gestes repetitifs et postures contraignantes', 'netb-bureaux', ['Lavage sol a plat (penche)', 'Aspiration prolongee', 'Nettoyage vitres en hauteur', 'Vidage poubelles repetitif'], 3, 4, ['Materiel ergonomique basique'], ['Chariot de nettoyage ergonomique complet', 'Manche telescopique pour le sol (pas de courbure)', 'Aspirateur dorsal pour grands espaces', 'Rotation des taches', 'Formation gestes et postures']),
      r('netb-chute', 'Chute de plain-pied', 'Glissade sur sol mouille apres nettoyage', 'netb-communs', ['Sol fraichement lave', 'Escalier mouille', 'Cable electrique au sol', 'Eclairage insuffisant (nettoyage de nuit)'], 2, 3, ['Chaussures antiderapantes'], ['Chaussures antiderapantes fournies', 'Panneau "sol mouille"', 'Nettoyage par bandes (zone seche accessible)', 'Eclairage portatif si necessaire']),
      r('netb-isolement', 'Isolement (travail seul de nuit)', 'Travail isole de nuit sans secours accessible', 'netb-bureaux', ['Nettoyage en horaire decale (nuit)', 'Seul dans le batiment', 'Absence de vigile', 'Malaise sans temoin'], 3, 3, ['Telephone portable'], ['PTI (Protection Travailleur Isole) avec detection chute', 'Ronde de verification par le client', 'Telephone avec numero d\'urgence', 'Consigne en cas de malaise (ne pas s\'enfermer)']),
      r('netb-electrique', 'Risque electrique', 'Electrisation par appareils electriques en milieu humide', 'netb-sanitaires', ['Aspirateur (fil endommage)', 'Autolaveuse', 'Prise dans les sanitaires (humidite)'], 2, 2, ['Materiel verifie'], ['Verification visuelle du materiel avant utilisation', 'Signalement immediat de fil endommage', 'Differentiel sur les prises']),
      r('netb-psychosocial', 'Risques psychosociaux', 'Manque de reconnaissance, horaires decales, precarite', 'netb-bureaux', ['Horaires decales (6h ou 21h)', 'Manque de consideration', 'Temps partiel subi', 'Contact limite avec l\'employeur'], 2, 3, ['Contact regulier encadrement'], ['Visite reguliere du chef d\'equipe', 'Horaires en journee quand possible', 'Reunion d\'equipe mensuelle', 'Information sur les droits']),
    ],
  },

  // ── Nettoyage industriel ──────────────────────────────────────
  {
    metierSlug: 'nettoyage-industriel', label: 'Nettoyage industriel', category: 'proprete_environnement',
    nafCodes: ['81.22Z'], idcc: '3043',
    legalReferences: ['Art. R4512-1 (plan de prevention)', 'Art. R4222-1 (espace confine)', 'Tableau RG 84 (solvants)'],
    workUnits: [
      wu('neti-usine', 'Nettoyage en usine', 'Nettoyage de machines, sols industriels, ateliers', '2-6'),
      wu('neti-confine', 'Espace confine', 'Nettoyage de cuves, silos, reservoirs', '2-3'),
      wu('neti-exterieur', 'Nettoyage exterieur', 'Facades, toitures, parking, voiries', '2-4'),
      wu('neti-materiel', 'Materiel lourd', 'Nettoyeur haute pression, autolaveuse industrielle', '1-2'),
    ],
    risks: [
      r('neti-chimique', 'Risque chimique (solvants, acides)', 'Intoxication par produits chimiques industriels concentres', 'neti-usine', ['Solvants de degraissage', 'Acides pour detartrage industriel', 'Soude caustique', 'Produits du client (residus en cuve)'], 3, 3, ['Gants et lunettes'], ['EPI adaptes au produit (FDS)', 'Masque a cartouche adapte (A2B2P3)', 'Combinaison chimique si projection', 'Plan de prevention avec le client', 'Connaissance des produits du site client']),
      r('neti-confine', 'Espace confine (cuve, silo)', 'Asphyxie ou intoxication en espace confine (cuve, reservoir)', 'neti-confine', ['Nettoyage de cuve chimique', 'Nettoyage de silo alimentaire', 'Reservoir d\'eau', 'Fosse de decantation'], 4, 2, ['Procedure confine'], ['Permis de penetrer obligatoire', 'Detecteur multi-gaz (O2, CO, H2S, LIE)', 'Ventilation forcee avant entree', 'Surveillance exterieure permanente (binome)', 'Harnais avec treuil de sauvetage', 'Formation espace confine recyclage annuel']),
      r('neti-haute-pression', 'Haute pression (blessure, projection)', 'Blessure par jet haute pression (200-500 bar) et projections', 'neti-materiel', ['Jet HP sur la peau (injection sous-cutanee)', 'Projection de debris', 'Recul du pistolet', 'Fuite sur le flexible'], 3, 3, ['Gants HP', 'Lunettes'], ['Gants anti-perforation HP', 'Bottes de securite', 'Visiere de protection', 'Flexible avec gaine de securite anti-coup de fouet', 'Distance securite 1m minimum du jet', 'Formation utilisation HP']),
      r('neti-chute-hauteur', 'Chute de hauteur', 'Chute lors du nettoyage de toitures, facades, structures en hauteur', 'neti-exterieur', ['Nettoyage toiture', 'Nettoyage facade sur nacelle', 'Nettoyage cuve en hauteur', 'Echelle pour acces'], 4, 2, ['Harnais'], ['Nacelle (CACES R486) plutot qu\'echelle', 'Harnais EN 361 + ligne de vie', 'Garde-corps perimetriques', 'Balisage de la zone en dessous']),
      r('neti-tms', 'TMS (postures, materiel lourd)', 'Douleurs par manipulation de materiel lourd et postures contraignantes', 'neti-usine', ['Lance HP (vibrations, poids)', 'Position a genoux ou accroupie', 'Port de flexibles (poids)', 'Autolaveuse (poussee)'], 3, 3, ['Equipement ergonomique'], ['Lance HP legere et ergonomique', 'Enrouleur automatique de flexible', 'Autolaveuse autotractee', 'Alternance des taches']),
      r('neti-bruit', 'Bruit (HP, machines)', 'Exposition au bruit du nettoyeur haute pression et de l\'usine client', 'neti-usine', ['Nettoyeur HP en fonctionnement (> 90 dB)', 'Environnement industriel bruyant', 'Souffleur industriel'], 3, 3, ['Bouchons d\'oreille'], ['Casque antibruit EN 352', 'HP insonorise', 'Limitation temps d\'exposition']),
      r('neti-glissade', 'Glissade (sols industriels)', 'Chute sur sol industriel rendu glissant par le nettoyage', 'neti-usine', ['Sol mouille', 'Presence d\'huile residuelle', 'Savon/detergent au sol', 'Zone de passage non balisee'], 2, 3, ['Chaussures antiderapantes'], ['Bottes de securite antiderapantes', 'Balisage zone humide', 'Nettoyage par section']),
    ],
  },

  // ── Nettoyage vitrerie ────────────────────────────────────────
  {
    metierSlug: 'nettoyage-vitrerie', label: 'Nettoyage de vitres / Laveur de vitres', category: 'proprete_environnement',
    nafCodes: ['81.21Z'], idcc: '3043',
    legalReferences: ['Art. R4323-58 (travaux en hauteur)', 'Arrete du 19/03/1993 (echafaudages)', 'NF EN 365 (harnais)'],
    workUnits: [
      wu('vitr-interieur', 'Vitres interieures', 'Nettoyage de vitres accessibles depuis l\'interieur', '1-2'),
      wu('vitr-facade', 'Facade exterieure', 'Nettoyage de vitres en hauteur par l\'exterieur', '1-2'),
      wu('vitr-nacelle', 'Nacelle / plateforme', 'Nettoyage depuis nacelle auto-elevatrice ou suspendue', '1-2'),
      wu('vitr-perche', 'Perche telescopique', 'Nettoyage a l\'eau pure avec perche depuis le sol', '1'),
    ],
    risks: [
      r('vitr-chute-hauteur', 'Chute de hauteur', 'Chute depuis nacelle, echelle ou echafaudage lors du nettoyage de facade', 'vitr-facade', ['Nacelle suspendue (defaillance)', 'Echelle mal calée', 'Penchement excessif', 'Vent fort'], 4, 3, ['Harnais EN 361'], ['Harnais + longe avec absorbeur d\'energie', 'Nacelle avec CACES R486 obligatoire', 'Echelle interdite au-dessus de 3m', 'Arret travaux si vent > 60 km/h', 'Controle nacelle annuel (VGP)', 'Perche eau pure comme alternative basse hauteur']),
      r('vitr-chimique', 'Risque chimique (produits vitres)', 'Irritation par produits nettoyants pour vitres', 'vitr-interieur', ['Spray nettoyant en espace ferme', 'Acide pour taches minerales', 'Inhalation de brouillard de pulverisation'], 2, 3, ['Gants'], ['Produits peu toxiques (eau pure osmosee preferee)', 'Gants nitrile', 'Aeration lors de l\'utilisation de produits', 'Doseurs automatiques']),
      r('vitr-tms', 'TMS (bras leves, perche)', 'Douleurs epaules et dos par gestes repetitifs bras leves et perche lourde', 'vitr-perche', ['Perche telescopique (5-15 m, poids)', 'Raclette bras leves', 'Mouilleur en extension', 'Position debout prolongee'], 3, 3, ['Perche legere'], ['Perche carbone legere', 'Harnais de maintien perche', 'Alternance taches (interieur/exterieur)', 'Pauses regulieres', 'Chariot porte-materiel']),
      r('vitr-intemperies', 'Intemperies (travail exterieur)', 'Exposition au froid, pluie et vent lors du travail en facade', 'vitr-facade', ['Travail sous la pluie', 'Vent sur nacelle', 'Froid hivernal', 'Soleil direct en ete'], 2, 3, ['Vetements de pluie'], ['Vetements de travail adaptes a la saison', 'Report si vent fort ou orage', 'Protection solaire en ete']),
      r('vitr-chute-objet', 'Chute d\'objet (raclette, seau)', 'Chute d\'outils ou de seau depuis la hauteur de travail', 'vitr-nacelle', ['Raclette qui tombe de la nacelle', 'Seau renverse', 'Outils non attaches', 'Passants en dessous'], 3, 2, ['Zone de balisage'], ['Balisage de la zone en dessous', 'Attache outils a la nacelle', 'Seau avec crochet', 'Interdiction de passage sous la nacelle']),
      r('vitr-electrique', 'Risque electrique (nacelle, cables)', 'Electrocution par contact avec lignes electriques depuis la nacelle', 'vitr-nacelle', ['Nacelle pres de lignes electriques', 'Cables aeriens non reperes', 'Perche metallique pres de fils'], 4, 1, ['Reperage prealable'], ['Reperage des lignes electriques avant travaux', 'Distance de securite reglementaire', 'Perche en materiau isolant', 'Contact avec le gestionnaire du reseau si necessaire']),
    ],
  },

  // ── Blanchisserie ─────────────────────────────────────────────
  {
    metierSlug: 'blanchisserie', label: 'Blanchisserie industrielle', category: 'proprete_environnement',
    nafCodes: ['96.01A'], idcc: '2002',
    legalReferences: ['Tableau RG 12 (tetrachloroethylene)', 'Art. R4222-1 (ventilation)', 'Art. R4323-1 (machines)'],
    workUnits: [
      wu('blan-reception', 'Tri / reception linge', 'Tri du linge sale par categorie', '2-4'),
      wu('blan-lavage', 'Zone lavage', 'Machines a laver industrielles, laveuses-essoreuses', '1-3'),
      wu('blan-sechage', 'Sechage / repassage', 'Sechoirs, calandres, presses a repasser', '2-6'),
      wu('blan-expedition', 'Pliage / expedition', 'Pliage, conditionnement, expedition', '2-4'),
    ],
    risks: [
      r('blan-brulure', 'Brulure (vapeur, calandre)', 'Brulure par vapeur, calandre ou presse a repasser', 'blan-sechage', ['Contact calandre chaude', 'Jet de vapeur (fuite)', 'Presse a repasser', 'Ouverture hublot machine en fonctionnement'], 3, 3, ['Gants anti-chaleur'], ['Gants anti-chaleur EN 407 pres des machines', 'Carter de protection sur calandre', 'Arret automatique si ouverture hublot', 'Marquage zones chaudes au sol', 'Formation utilisation machines']),
      r('blan-chimique', 'Risque chimique (detergents, perchloro)', 'Irritation ou intoxication par produits de lavage industriels', 'blan-lavage', ['Dosage detergent concentre', 'Perchloro (nettoyage a sec)', 'Assouplissant concentre', 'Vapeurs lors de l\'ouverture machines'], 3, 3, ['Gants', 'Ventilation'], ['Dosage automatique des produits', 'Gants nitrile EN 374', 'Ventilation conforme (aspiration sur machines)', 'Substitution perchloro par aquanettoyage', 'FDS accessibles']),
      r('blan-machines', 'Machines (happage, ecrasement)', 'Happage par rouleaux de calandre ou machine a plier', 'blan-sechage', ['Introduction linge dans calandre', 'Debourrage machine a plier', 'Essoreuse (vibrations, projection)', 'Courroie de transmission'], 4, 2, ['Arret d\'urgence'], ['Arret d\'urgence accessible a chaque poste', 'Carter sur parties tournantes', 'Barre sensible sur calandre', 'Interdiction intervention machine en marche', 'Formation specifique machines']),
      r('blan-tms', 'TMS (manutention, postures)', 'Douleurs par manipulation de linge mouille lourd et postures repetitives', 'blan-reception', ['Chargement machines (linge mouille)', 'Tri du linge sale (penche)', 'Repassage repetitif', 'Port de chariots de linge'], 3, 4, ['Chariot a linge'], ['Chariots a hauteur reglable', 'Chargement/dechargement automatise', 'Alternance des postes', 'Pauses regulieres', 'Formation gestes et postures']),
      r('blan-biologique', 'Risque biologique (linge sale)', 'Contamination par linge sale contamine (hopital, EHPAD)', 'blan-reception', ['Linge hospitalier (sang, dejections)', 'Linge d\'EHPAD', 'Aiguille ou objet piquant dans le linge', 'Poussieres de linge'], 3, 3, ['Gants', 'Masque'], ['Gants de tri (anti-piqure)', 'Masque FFP2 au tri', 'Sac hydrosoluble pour linge contamine', 'Vaccination hepatite B', 'Procedure AES']),
      r('blan-bruit', 'Bruit (machines)', 'Exposition au bruit des machines de lavage, essorage et sechage', 'blan-lavage', ['Essoreuse en fonctionnement (> 85 dB)', 'Calandre', 'Ensemble des machines simultanees'], 2, 4, ['Bouchons d\'oreille'], ['Bouchons moules ou casque EN 352', 'Insonorisation des machines', 'Suivi audiometrique annuel']),
      r('blan-chaleur', 'Chaleur (ambiance thermique)', 'Exposition a la chaleur ambiante de la zone sechage/repassage', 'blan-sechage', ['Zone repassage (chaleur radiante)', 'Sechoirs industriels', 'Ventilation insuffisante en ete'], 2, 3, ['Ventilation'], ['Ventilation et aeration suffisantes', 'Eau fraiche a disposition', 'Pauses plus frequentes en ete', 'Temperature ambiante surveillee']),
    ],
  },

  // ── Pressing ──────────────────────────────────────────────────
  {
    metierSlug: 'pressing', label: 'Pressing / Nettoyage a sec', category: 'proprete_environnement',
    nafCodes: ['96.01B'], idcc: '2002',
    legalReferences: ['Tableau RG 12 (tetrachloroethylene)', 'Arrete du 5/12/2012 (installations classees)', 'Art. R4412-1 (CMR)'],
    workUnits: [
      wu('pres-accueil', 'Accueil / caisse', 'Reception vetements, conseil, restitution', '1'),
      wu('pres-machine', 'Zone machines', 'Machines de nettoyage a sec, aquanettoyage', '1'),
      wu('pres-repassage', 'Repassage / finition', 'Repassage, defroissage, detachage', '1-2'),
      wu('pres-stockage', 'Stockage vetements', 'Portants, stockage vetements en attente', '1'),
    ],
    risks: [
      r('pres-chimique', 'Risque chimique (perchloro CMR)', 'Exposition au perchloroethylene (cancerogene), solvants de detachage', 'pres-machine', ['Ouverture de la machine apres cycle', 'Fuite de solvant', 'Detachage manuel (solvants)', 'Maintenance de la machine', 'Stockage perchloro'], 3, 3, ['Ventilation', 'Gants'], ['Substitution perchloro par aquanettoyage ou silicone', 'Machine en circuit ferme si perchloro', 'Ventilation conforme (captage a la source)', 'Gants nitrile pour detachage', 'Suivi medical renforce (CMR)', 'CME (Controle Metier Entretien) regulier']),
      r('pres-brulure', 'Brulure (fer, vapeur)', 'Brulure par fer a repasser, presse ou vapeur', 'pres-repassage', ['Contact fer chaud', 'Jet de vapeur', 'Presse a repasser', 'Tuyau vapeur defectueux'], 2, 3, ['Gants anti-chaleur'], ['Gants anti-chaleur pour manipulation', 'Fer avec arret automatique', 'Verification tuyaux vapeur', 'Tapis isolant au poste de repassage']),
      r('pres-tms', 'TMS (repassage repetitif)', 'Douleurs epaules et poignets par repassage repetitif', 'pres-repassage', ['Repassage debout prolonge', 'Gestes repetitifs du fer', 'Manipulation vetements sur cintres', 'Chargement machine (vetements lourds)'], 3, 3, ['Table reglable'], ['Table de repassage a hauteur reglable', 'Fer leger ergonomique', 'Alternance taches (accueil/repassage)', 'Pauses regulieres']),
      r('pres-incendie', 'Incendie (solvants, textiles)', 'Incendie par accumulation de solvants et textiles inflammables', 'pres-machine', ['Stockage de perchloro', 'Textiles inflammables', 'Installation electrique surchargee', 'Defaut machine'], 4, 1, ['Extincteur', 'Detection'], ['Detection incendie automatique', 'Stockage solvant dans armoire ventilee', 'Extincteur adapte (CO2 pour solvants)', 'Consignes evacuation', 'Verification electrique annuelle']),
      r('pres-chute', 'Chute (sol mouille)', 'Glissade sur sol mouille par eau ou condensation', 'pres-machine', ['Sol mouille pres des machines', 'Condensation', 'Produit renverse'], 2, 2, ['Chaussures fermees'], ['Chaussures antiderapantes', 'Sol antiderapant', 'Nettoyage immediat des flaques']),
      r('pres-psychosocial', 'Risques psychosociaux', 'Stress par reclamations clients, isolement en boutique', 'pres-accueil', ['Client mecontent (vetement abime)', 'Travail seul en boutique', 'Objectifs de rentabilite'], 2, 2, ['Communication gerant'], ['Procedure reclamation ecrite', 'Pause effective', 'Formation gestion de conflit']),
    ],
  },

  // ── Assainissement ────────────────────────────────────────────
  {
    metierSlug: 'assainissement', label: 'Assainissement / Travaux en egouts', category: 'proprete_environnement',
    nafCodes: ['37.00Z'], idcc: '2147',
    legalReferences: ['Art. R4222-1 (espace confine)', 'Tableau RG 19A (leptospirose)', 'Art. R4512-1 (entreprises exterieures)'],
    workUnits: [
      wu('assai-reseau', 'Reseau d\'assainissement', 'Intervention dans les egouts, collecteurs, regards', '2-4'),
      wu('assai-pompage', 'Pompage / hydrocurage', 'Pompage de fosses, hydrocurage de canalisations', '2'),
      wu('assai-station', 'Station d\'epuration', 'Entretien et maintenance de STEP', '1-3'),
      wu('assai-vehicule', 'Vehicule hydrocureur', 'Conduite et utilisation du camion hydrocureur', '1-2'),
    ],
    risks: [
      r('assai-biologique', 'Risque biologique (leptospirose, hepatite)', 'Contamination par agents biologiques dans les eaux usees', 'assai-reseau', ['Contact eaux usees (leptospirose)', 'Rat dans les egouts', 'Aerosolisation lors du pompage', 'Manipulation de boues', 'Piqure d\'insecte'], 4, 4, ['Gants etanches', 'Vaccination'], ['Vaccination leptospirose obligatoire', 'Vaccination hepatite A et B', 'Combinaison etanche', 'Gants longs etanches', 'Bottes cuissardes', 'Visiere anti-projection', 'Douche apres chaque intervention en egout', 'Desinfection immediate des plaies']),
      r('assai-confine', 'Espace confine (egout, fosse)', 'Asphyxie ou intoxication par gaz en espace confine (egout, fosse septique)', 'assai-reseau', ['Descente dans un regard', 'Entree en egout (H2S, CH4, CO2)', 'Fosse septique', 'Canalisation non ventilee'], 4, 3, ['Detecteur gaz', 'Procedure confine'], ['Permis de penetrer obligatoire', 'Detecteur multi-gaz 4 voies (O2, CO, H2S, LIE)', 'Ventilation forcee avant descente', 'Binome obligatoire (surveillant en surface)', 'Harnais + treuil de sauvetage', 'Formation espace confine recyclage annuel', 'Arret immediat si alarme detecteur']),
      r('assai-noyade', 'Noyade (egout, bassin)', 'Noyade par montee subite des eaux en egout ou chute dans bassin', 'assai-reseau', ['Orage soudain (montee des eaux en egout)', 'Chute dans bassin STEP', 'Courant dans le collecteur'], 4, 2, ['Suivi meteo'], ['Arret travaux si risque orage', 'Bouee de sauvetage aux bassins', 'Gilet de sauvetage en egout', 'Issue de secours tous les 200m en collecteur', 'Communication radio permanente']),
      r('assai-chimique', 'Risque chimique (H2S, rejets industriels)', 'Intoxication par H2S (inodore a forte concentration) ou rejets industriels', 'assai-reseau', ['H2S en egout (mortel > 500 ppm)', 'Rejets industriels non conformes', 'Mercaptans', 'Ammoniac'], 4, 3, ['Detecteur H2S'], ['Detecteur H2S individuel obligatoire', 'ARI (Appareil Respiratoire Isolant) disponible', 'Ventilation forcee', 'Identification des rejets industriels en amont', 'Procedure d\'urgence H2S']),
      r('assai-tms', 'TMS (postures, manutention)', 'Douleurs par manipulation de plaques de regards, flexibles, postures', 'assai-pompage', ['Ouverture de plaque de regard (30-50 kg)', 'Traction de flexible haute pression', 'Position accroupie dans le regard', 'Vibrations du camion hydrocureur'], 3, 3, ['Outil leve-plaque'], ['Leve-plaque mecanique', 'Chariot porte-flexible', 'Equipage de 2 pour les plaques lourdes', 'Formation gestes et postures']),
      r('assai-routier', 'Risque routier (intervention voie publique)', 'Heurt par vehicule lors d\'intervention sur voirie', 'assai-vehicule', ['Ouverture regard en chaussee', 'Camion stationne sur route', 'Circulation autour du chantier'], 3, 3, ['Gilet HV', 'Cones'], ['Balisage conforme du chantier (signalisation temporaire)', 'Gyrophare et FMA (fleche lumineuse)', 'Gilet HV classe 3 obligatoire', 'Eclairage si intervention de nuit']),
    ],
  },

  // ── Deratisation / 3D ─────────────────────────────────────────
  {
    metierSlug: 'deratisation-3d', label: 'Deratisation / Desinsectisation / Desinfection (3D)', category: 'proprete_environnement',
    nafCodes: ['81.29A'], idcc: '3043',
    legalReferences: ['Reglement CE 528/2012 (biocides)', 'Arrete du 9/10/2013 (Certibiocide)', 'Art. R4412-1 (chimique)'],
    workUnits: [
      wu('dera-intervention', 'Site d\'intervention', 'Application de traitements chez le client', '1-2'),
      wu('dera-diagnostic', 'Diagnostic / inspection', 'Inspection des locaux, diagnostic infestation', '1'),
      wu('dera-stockage', 'Depot / stockage produits', 'Stockage des biocides et materiel', '1'),
      wu('dera-vehicule', 'Vehicule / deplacements', 'Deplacements entre sites clients', '1'),
    ],
    risks: [
      r('dera-chimique', 'Risque chimique (biocides)', 'Intoxication par biocides (rodenticides, insecticides) lors de l\'application', 'dera-intervention', ['Pulverisation insecticide en interieur', 'Manipulation appats empoisonnes', 'Fumigation', 'Preparation de solutions'], 3, 4, ['Gants nitrile', 'Masque'], ['Certibiocide obligatoire', 'EPI adaptes au produit (masque A2P3 pour fumigation)', 'Gants nitrile longs', 'Lunettes de protection', 'FDS de chaque produit dans le vehicule', 'Substitution par produits moins dangereux (gel vs spray)', 'Lavage des mains systematique']),
      r('dera-biologique', 'Risque biologique (rongeurs, insectes)', 'Contamination par contact avec rongeurs ou insectes (leptospirose, allergie)', 'dera-diagnostic', ['Manipulation de cadavre de rat', 'Morsure de rat', 'Piqure d\'insecte (guepe, punaise)', 'Contact dejections (leptospirose)'], 3, 3, ['Gants epais'], ['Gants de protection pour manipulation cadavres', 'Desinfection des mains apres chaque intervention', 'Vaccination leptospirose recommandee', 'Trousse de secours (antihistaminique)', 'Ne jamais manipuler un animal vivant a mains nues']),
      r('dera-chute', 'Chute (combles, caves)', 'Chute lors de l\'inspection de combles, caves, gaines techniques', 'dera-diagnostic', ['Combles avec plancher fragile', 'Cave sombre', 'Gaine technique etroite', 'Echelle d\'acces'], 3, 2, ['Lampe frontale'], ['Lampe frontale puissante', 'Verification de la solidite du support avant progression', 'Chaussures de securite', 'Ne jamais y aller seul en espace confine']),
      r('dera-tms', 'TMS (postures, pulverisateur)', 'Douleurs par port de pulverisateur dorsal et postures contraignantes', 'dera-intervention', ['Pulverisateur dorsal (10-15 kg)', 'Position accroupie derriere des meubles', 'Pompage manuel du pulverisateur', 'Repetition des gestes de pulverisation'], 2, 3, ['Pulverisateur leger'], ['Pulverisateur a pression prealable (pas de pompage)', 'Alternance bras pour pulverisation', 'Pauses regulieres']),
      r('dera-routier', 'Risque routier', 'Accident lors des deplacements entre clients', 'dera-vehicule', ['Nombreux deplacements quotidiens', 'Conduite en ville', 'Fatigue en fin de journee'], 3, 2, ['Vehicule entretenu'], ['Planning avec temps de trajet', 'Vehicule entretenu et equipe GPS', 'Respect du code de la route']),
      r('dera-morsure', 'Morsure animale', 'Morsure de rongeur ou animal domestique sur le site d\'intervention', 'dera-intervention', ['Rat vivant dans un piege', 'Chat ou chien du client', 'Animal piege panique'], 2, 2, ['Gants epais'], ['Gants de protection renforcés', 'Ne jamais toucher un animal vivant piege', 'Desinfection et consultation si morsure', 'Vaccination tetanos a jour']),
    ],
  },

  // ── Entretien espaces verts ───────────────────────────────────
  {
    metierSlug: 'entretien-espaces-verts', label: 'Entretien espaces verts / Jardinier', category: 'proprete_environnement',
    nafCodes: ['81.30Z'], idcc: '7018',
    legalReferences: ['Loi Labbe (zero phyto espaces publics)', 'Certiphyto obligatoire', 'Tableau RG 69 (vibrations)'],
    workUnits: [
      wu('jardin-tonte', 'Tonte / entretien pelouse', 'Tonte, scarification, engazonnement', '1-2'),
      wu('jardin-taille', 'Taille / elagage bas', 'Taille de haies, arbustes, rosiers', '1-2'),
      wu('jardin-plantation', 'Plantation / creation', 'Plantation, engazonnement, amenagement', '1-3'),
      wu('jardin-arrosage', 'Arrosage / entretien', 'Arrosage, fertilisation, desherbage', '1'),
    ],
    risks: [
      r('jardin-machines', 'Machines (tondeuse, taille-haie)', 'Coupure par lame de tondeuse, taille-haie ou debroussailleuse', 'jardin-tonte', ['Projection de caillou par tondeuse', 'Coupure taille-haie', 'Kickback debroussailleuse', 'Intervention sur lame (moteur allume)'], 3, 3, ['Lunettes', 'Gants'], ['Lunettes de protection EN 166 obligatoires', 'Gants anti-coupure pour taille', 'Arret moteur avant toute intervention', 'Carter de protection sur tondeuse', 'Formation utilisation machines']),
      r('jardin-chimique', 'Risque chimique (engrais, phyto)', 'Irritation par engrais, desherbants ou produits phytosanitaires', 'jardin-arrosage', ['Epandage d\'engrais (poussiere)', 'Desherbage chimique (si espace prive)', 'Anti-mousse pour pelouse', 'Manipulation de terreau traite'], 2, 2, ['Gants'], ['Zero phyto dans espaces publics (loi Labbe)', 'Desherbage mecanique ou thermique', 'Gants pour manipulation engrais', 'Certiphyto si produits utilises']),
      r('jardin-tms', 'TMS (postures, vibrations)', 'Douleurs par postures basses, port de charges et vibrations des machines', 'jardin-plantation', ['Plantation (position a genoux)', 'Port de sacs de terreau (25-50 kg)', 'Debroussaillage prolonge (vibrations)', 'Ratissage repetitif'], 3, 3, ['Genouilleres'], ['Genouilleres de jardinage', 'Brouette pour transport', 'Machine a faibles vibrations', 'Alternance des taches']),
      r('jardin-bruit', 'Bruit (tondeuse, souffleur)', 'Exposition au bruit des machines d\'entretien', 'jardin-tonte', ['Tondeuse (85 dB)', 'Souffleur a feuilles (100+ dB)', 'Taille-haie thermique', 'Tronconneuse (105 dB)'], 3, 3, ['Bouchons d\'oreille'], ['Casque antibruit EN 352', 'Machines electriques (moins bruyantes)', 'Limitation temps d\'exposition au souffleur']),
      r('jardin-uv', 'Rayonnement UV / intemperies', 'Exposition aux UV, chaleur ou froid en exterieur', 'jardin-tonte', ['Travail en plein soleil', 'Chaleur estivale', 'Pluie et froid hivernal'], 2, 3, ['Chapeau'], ['Chapeau et creme solaire en ete', 'Eau fraiche a disposition', 'Amenagement horaires ete', 'Vetements adaptes a la saison']),
      r('jardin-piqure', 'Piqure (insectes, plantes)', 'Piqure de guepe, tique ou contact avec plantes urticantes', 'jardin-taille', ['Nid de guepes dans une haie', 'Tique en zone boisee', 'Ortie, rosier (epines)', 'Araignee'], 2, 3, ['Gants de taille'], ['Inspection visuelle avant taille de haie', 'Vetements couvrants (manches longues)', 'Trousse de secours avec antihistaminique', 'Verification tiques en fin de journee']),
    ],
  },
];
