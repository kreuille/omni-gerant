// BUSINESS RULE [CDC-2.4]: E1 — 15 metiers BTP specialises
// Peintre, Menuisier, Carreleur, Macon, Couvreur, Platrier, Chaudronnier,
// Serrurier, Terrassement, Construction routes, Solier, Poseur menuiseries, Ascensoriste, Vitrier, Charpentier

import type { MetierRiskProfile } from './risk-database-v2.js';

// Helper
function r(id: string, name: string, desc: string, wuId: string, sits: string[], g: 1|2|3|4, f: 1|2|3|4, exist: string[], proposed: string[], cat: string): MetierRiskProfile['risks'][number] {
  return { id, name, description: desc, workUnitId: wuId, situations: sits, defaultGravity: g, defaultFrequency: f, existingMeasures: exist, proposedActions: proposed, category: cat as MetierRiskProfile['risks'][number]['category'] };
}

function wu(id: string, name: string, desc: string, hc: string): MetierRiskProfile['workUnits'][number] {
  return { id, name, description: desc, typicalHeadcount: hc };
}

export const BTP_TRADES: MetierRiskProfile[] = [
  // ── Peintre batiment ────────────────────────────────────────────
  {
    metierSlug: 'peintre-batiment', label: 'Peintre en batiment', category: 'btp_construction',
    nafCodes: ['43.34Z'], idcc: '1597',
    legalReferences: ['Tableau RG 36 (solvants)', 'Art. R4412-1 (agents chimiques)', 'Art. R4323-58 (hauteur)'],
    workUnits: [
      wu('pb-chantier', 'Chantier interieur', 'Peinture murs, plafonds, boiseries en interieur', '2-4'),
      wu('pb-facade', 'Chantier facade/exterieur', 'Ravalement, peinture facade sur echafaudage', '2-4'),
      wu('pb-prep', 'Preparation / ponçage', 'Ponçage, decapage, enduit, rebouchage', '1-3'),
      wu('pb-atelier', 'Atelier / stockage', 'Preparation peintures, stockage produits', '1'),
      wu('pb-vehicule', 'Vehicule / deplacements', 'Deplacements inter-chantiers', '1-2'),
    ],
    risks: [
      r('pb-chimique', 'Risque chimique (solvants, peintures)', 'Inhalation de solvants organiques, contact cutane avec peintures et diluants — Tableau RG 36', 'pb-chantier', ['Application peinture solvantee en espace confine', 'Melange de peintures', 'Nettoyage rouleaux au white-spirit', 'Decapage chimique'], 3, 4, ['Ventilation des locaux', 'Gants nitrile'], ['Substitution par peintures aqueuses', 'Masque A2 obligatoire si solvante', 'Aspiration locale', 'FDS affichees sur chaque chantier']),
      r('pb-chute-hauteur', 'Chute de hauteur (echafaudage, echelle)', 'Chute depuis echafaudage de facade, escabeau ou echelle', 'pb-facade', ['Travail sur echafaudage roulant', 'Echelle appuyee sur facade', 'Nacelle pour ravalement'], 4, 3, ['Echafaudage conforme avec garde-corps', 'Formation travail en hauteur'], ['Verification echafaudage avant chaque poste', 'Nacelle plutot qu\'echelle', 'Harnais si pas de protection collective', 'Interdiction travail seul en hauteur']),
      r('pb-poussieres', 'Poussieres (ponçage, decapage)', 'Inhalation de poussieres de platre, enduit, peinture ancienne (plomb)', 'pb-prep', ['Ponçage enduit', 'Decapage peinture ancienne', 'Rebouchage a sec'], 3, 3, ['Masque FFP2', 'Ponceuse avec aspiration'], ['Masque FFP3 si peinture plomb suspecte', 'Ponceuse avec aspiration integree obligatoire', 'Diagnostic plomb avant travaux bati ancien', 'Nettoyage humide en fin de journee']),
      r('pb-tms', 'TMS (bras leves, postures)', 'Douleurs epaules/nuque par travail bras en elevation (plafonds)', 'pb-chantier', ['Peinture plafond bras leves', 'Enduit en hauteur', 'Ponçage en position contrainte', 'Posture penchee (plinthes)'], 2, 4, ['Perche telescopique', 'Escabeau reglable'], ['Perche de peinture pour plafonds', 'Rotation des taches (plafond/murs)', 'Pauses actives toutes les 2h', 'Genouilleres pour travaux bas']),
      r('pb-electrique', 'Risque electrique', 'Contact avec fils electriques lors de travaux pres de prises et interrupteurs', 'pb-chantier', ['Peinture autour de prises non consignees', 'Perçage mur avec cables encastres'], 3, 2, ['Detecteur de cables'], ['Consignation electrique avant peinture autour des prises', 'Detecteur de cables obligatoire avant perçage', 'Coordination avec electricien']),
      r('pb-glissade', 'Chute de plain-pied', 'Glissade sur baches de protection, sol mouille, pots de peinture au sol', 'pb-chantier', ['Baches glissantes au sol', 'Eclaboussures de peinture', 'Escabeau sur sol inegal'], 2, 3, ['Chaussures antiderapantes'], ['Baches antiderapantes', 'Rangement continu du chantier', 'Eclairage suffisant', 'Nettoyage immediat des eclaboussures']),
      r('pb-routier', 'Risque routier', 'Accidents lors des deplacements inter-chantiers avec vehicule charge', 'pb-vehicule', ['Trajet quotidien inter-chantiers', 'Vehicule charge (echelle sur galerie)', 'Fatigue fin de journee'], 3, 2, ['Vehicule entretenu'], ['Arrimage echelle et materiel', 'Planning avec temps de trajet', 'Formation eco-conduite']),
      r('pb-rps', 'Risques psychosociaux', 'Stress lie aux delais, travail isole, pression du client', 'pb-chantier', ['Delais serres de chantier', 'Travail seul sur chantier', 'Client mecontent du resultat'], 2, 3, ['Communication avec le client'], ['Procedure travailleur isole', 'Objectifs realistes', 'Debrief de fin de chantier']),
    ],
  },

  // ── Menuisier ───────────────────────────────────────────────────
  {
    metierSlug: 'menuisier', label: 'Menuisier bois', category: 'btp_construction',
    nafCodes: ['43.32A', '16.23Z'], idcc: '1597',
    legalReferences: ['Tableau RG 47 (poussieres bois)', 'Tableau RG 79 (nez/sinus)', 'Directive Machines 2006/42/CE'],
    workUnits: [
      wu('men-atelier', 'Atelier machines', 'Debit, usinage, assemblage sur machines fixes (scie, raboteuse, toupie)', '2-5'),
      wu('men-etabli', 'Poste etabli / montage', 'Assemblage, finition, collage a l\'etabli', '1-3'),
      wu('men-pose', 'Chantier pose', 'Pose de menuiseries sur chantier (portes, escaliers, agencements)', '1-3'),
      wu('men-finition', 'Zone finition / vernissage', 'Application vernis, lasure, teinte, ponçage fin', '1-2'),
      wu('men-stockage', 'Stockage bois / materiel', 'Stockage panneaux, bois massif, quincaillerie', '1'),
    ],
    risks: [
      r('men-machines', 'Coupure / happement machines (scie, toupie)', 'Amputation ou coupure grave par scie circulaire, toupie, degauchisseuse', 'men-atelier', ['Contact avec lame de scie en rotation', 'Rejet de piece par toupie', 'Doigt happe par raboteuse'], 4, 3, ['Carters et protecteurs en place', 'Arret d\'urgence'], ['Poussoir obligatoire pour petites pieces', 'Maintenance preventive mensuelle machines', 'Formation securite machines initiale + recyclage', 'Affichage consignes securite par machine']),
      r('men-poussieres', 'Poussieres de bois (RG 47, RG 79)', 'Inhalation de poussieres de bois — cancer sino-nasal (Tableau RG 47/79)', 'men-atelier', ['Sciage bois massif et panneaux', 'Ponçage sans aspiration', 'Balayage atelier a sec', 'Usinage MDF (formaldehyde)'], 3, 4, ['Aspiration centralisee sur machines', 'Masque FFP2'], ['Aspiration verifiee annuellement (debit)', 'Masque FFP3 pour bois exotiques et MDF', 'Nettoyage par aspiration (jamais soufflette)', 'Spirometrie annuelle si exposition quotidienne', 'Suivi medical renforce (ORL)']),
      r('men-bruit', 'Bruit machines (> 85 dB)', 'Exposition au bruit des machines d\'atelier (scie 95 dB, toupie 100 dB)', 'men-atelier', ['Scie circulaire en fonctionnement', 'Defonceuse portative', 'Raboteuse', 'Ponceuse a bande'], 3, 4, ['Bouchons d\'oreilles fournis'], ['Casque antibruit EN 352 obligatoire en atelier', 'Lames et outils affutes (reduction bruit)', 'Encoffrement machines fixes', 'Audiogramme annuel']),
      r('men-chimique', 'Risque chimique (colles, vernis, solvants)', 'Inhalation de vapeurs de vernis, colle neoprene, teintes solvantees', 'men-finition', ['Application vernis au pistolet', 'Collage neoprene', 'Decapage chimique', 'Teinte a base solvant'], 3, 3, ['Ventilation zone finition', 'Gants nitrile'], ['Cabine d\'application ventilee', 'Substitution colles et vernis aqueuses', 'Masque A2 si solvants', 'FDS affichees au poste']),
      r('men-tms', 'TMS manutention panneaux', 'Port de panneaux lourds (MDF, contreplaque), postures contraignantes a l\'etabli', 'men-etabli', ['Manipulation panneaux grand format', 'Posture penchee a l\'etabli', 'Serrage prolonge'], 2, 4, ['Etabli reglable en hauteur'], ['Chariot a ventouses pour panneaux', 'Table elevatrice', 'Alternance des taches', 'Etirements quotidiens']),
      r('men-incendie', 'Incendie / explosion (poussieres)', 'Risque d\'incendie par poussieres de bois, solvants, et sciures', 'men-atelier', ['Accumulation sciures sous machines', 'Stockage solvants', 'Court-circuit electrique dans poussieres'], 4, 1, ['Extincteurs', 'Interdiction de fumer'], ['Nettoyage quotidien sciures', 'Silo a copeaux conforme ATEX', 'Installations electriques ATEX en zone poussiere', 'Exercice evacuation annuel']),
      r('men-chute-pose', 'Chute de hauteur (pose)', 'Chute depuis echelle ou escabeau lors de la pose sur chantier', 'men-pose', ['Pose de portes en hauteur', 'Agencement murs hauts', 'Escalier sans garde-corps'], 3, 2, ['Escabeau conforme'], ['PIRL ou nacelle si possible', 'Echafaudage roulant pour poses repetees', 'Formation travail en hauteur']),
      r('men-projection', 'Projections (eclats, sciures)', 'Projection d\'eclats de bois, de clous ou de vis dans les yeux', 'men-atelier', ['Sciage bois avec noeuds', 'Clouage pneumatique', 'Defonçage'], 2, 3, ['Lunettes de protection disponibles'], ['Lunettes EN 166 obligatoires aux machines', 'Ecran facial pour defonceuse', 'Affichage EPI obligatoire']),
    ],
  },

  // ── Carreleur ───────────────────────────────────────────────────
  {
    metierSlug: 'carreleur', label: 'Carreleur', category: 'btp_construction',
    nafCodes: ['43.33Z'], idcc: '1597',
    legalReferences: ['Tableau RG 25 (silice cristalline)', 'Art. R4541-1 (manutention)', 'Art. R4412-1 (chimique)'],
    workUnits: [
      wu('car-pose', 'Zone de pose carrelage', 'Pose de carreaux au sol et mur, joints', '1-3'),
      wu('car-decoupe', 'Poste de decoupe', 'Decoupe carreaux avec carrelette, disqueuse, scie eau', '1'),
      wu('car-prep', 'Preparation support', 'Ragréage, chape, primaire, etancheite', '1-2'),
      wu('car-stockage', 'Stockage materiaux', 'Stockage carreaux, mortier, colles', '1'),
      wu('car-vehicule', 'Vehicule / deplacements', 'Transport materiel et carreaux', '1'),
    ],
    risks: [
      r('car-silice', 'Poussieres de silice cristalline (RG 25)', 'Inhalation de poussieres de silice lors de la decoupe de carreaux — silicose, cancer poumon', 'car-decoupe', ['Decoupe a sec avec disqueuse', 'Ponçage des joints', 'Percage dans carreaux ceramique'], 4, 3, ['Decoupe a l\'eau quand possible', 'Masque FFP2'], ['Decoupe a l\'eau obligatoire (scie a eau)', 'Masque FFP3 si decoupe seche', 'Aspiration a la source sur disqueuse', 'Spirometrie annuelle', 'Suivi medical renforce (pneumologue)']),
      r('car-tms-genoux', 'TMS genoux (position agenouille)', 'Atteinte des genoux (hygroma, gonarthrose) par position agenouille prolongee', 'car-pose', ['Pose carrelage au sol (8h a genoux)', 'Joints au sol', 'Decoupe au sol'], 3, 4, ['Genouilleres disponibles'], ['Genouilleres ergonomiques EN 14404 obligatoires', 'Tapis de protection genoux', 'Alternance pose sol/mur', 'Pauses toutes les 45 min', 'Suivi medical genoux']),
      r('car-coupure', 'Coupures (carreaux, disqueuse)', 'Coupure par aretes de carreaux casses ou par disqueuse', 'car-decoupe', ['Manipulation carreaux casses', 'Decoupe a la disqueuse', 'Retouche carreaux au sol'], 3, 3, ['Gants anti-coupure'], ['Gants EN 388 niveau 4 minimum', 'Carter sur disqueuse', 'Lunettes EN 166 a la decoupe', 'Evacuation immediate des chutes']),
      r('car-manutention', 'Manutention (carreaux lourds)', 'Port de cartons de carreaux (25-30kg), sacs de colle et ciment', 'car-stockage', ['Reception palettes de carreaux', 'Approvisionnement chantier en etage', 'Manipulation dalles grand format (60x60)'], 3, 3, ['Diable', 'Monte-materiaux si etages'], ['Ventouses pour dalles grand format', 'Chariot a etages', 'Limite 25kg par personne', 'Formation gestes et postures']),
      r('car-chimique', 'Risque chimique (colles, joints epoxy)', 'Contact cutane ou inhalation de colles, joints epoxy, primaires', 'car-prep', ['Application colle au peigne', 'Joints epoxy (resine)', 'Primaire d\'accrochage', 'Ragreage'], 2, 3, ['Gants'], ['Gants nitrile pour joints epoxy', 'Ventilation si interieur confine', 'Substitution joints ciment plutot qu\'epoxy si possible', 'FDS sur chantier']),
      r('car-bruit', 'Bruit (disqueuse, percage)', 'Bruit de la disqueuse de decoupe (> 100 dB)', 'car-decoupe', ['Decoupe a la disqueuse', 'Percage pour fixations', 'Rainureuse'], 2, 3, ['Bouchons d\'oreilles'], ['Casque antibruit EN 352 a la decoupe', 'Scie a eau (moins bruyante)', 'Limitation duree exposition']),
      r('car-chute', 'Chute de plain-pied', 'Glissade sur colle, eau, morceaux de carreaux au sol', 'car-pose', ['Sol en cours de pose (instable)', 'Eau de decoupe au sol', 'Chutes de carreaux'], 2, 3, ['Chaussures antiderapantes'], ['Nettoyage continu de la zone', 'Balisage zone de pose', 'Eclairage suffisant']),
      r('car-vibrations', 'Vibrations (disqueuse, perforateur)', 'Vibrations transmises aux mains et bras par outils portatifs', 'car-decoupe', ['Disqueuse', 'Perforateur pour fixations', 'Rainureuse'], 2, 3, ['Gants anti-vibrations'], ['Limitation temps d\'exposition', 'Outils a faibles vibrations', 'Rotation des operateurs']),
    ],
  },

  // ── Macon ───────────────────────────────────────────────────────
  {
    metierSlug: 'macon', label: 'Macon', category: 'btp_construction',
    nafCodes: ['43.99C', '43.99D'], idcc: '1597',
    legalReferences: ['Tableau RG 8 (dermatite ciment)', 'Art. R4323-58 (hauteur)', 'Art. R4534-1 (BTP)'],
    workUnits: [
      wu('mac-murs', 'Elevation murs / maconnerie', 'Construction murs parpaings, briques, pierre', '2-6'),
      wu('mac-coffrage', 'Coffrage / ferraillage / coulage', 'Coffrage, pose armatures, coulage beton', '2-4'),
      wu('mac-fondation', 'Fondations / terrassement', 'Fouilles, semelles, dallages', '2-4'),
      wu('mac-echafaudage', 'Echafaudage / travaux hauteur', 'Montage echafaudage, travaux en elevation', '2-4'),
      wu('mac-stockage', 'Zone stockage / approvisionnement', 'Stockage materiaux, approvisionnement chantier', '1-2'),
    ],
    risks: [
      r('mac-chute', 'Chute de hauteur (murs, echafaudage)', 'Chute depuis echafaudage, mur en elevation, bordure de dalle', 'mac-echafaudage', ['Montage/demontage echafaudage', 'Travail en bordure de dalle sans garde-corps', 'Acces par echelle instable'], 4, 3, ['Garde-corps', 'Harnais antichute EN 361'], ['Filets de securite', 'Platelage complet echafaudage', 'Verification par personne competente', 'Interdiction travail seul en hauteur']),
      r('mac-ensevelissement', 'Ensevelissement (fouilles)', 'Eboulement de tranchee ou de fouille non blindee', 'mac-fondation', ['Fouille > 1.30m sans blindage', 'Terrain instable apres pluie', 'Surcharge en bord de fouille'], 4, 2, ['Blindage tranchees', 'Etude de sol'], ['Blindage systematique > 1.30m', 'Interdiction stockage en bord de fouille', 'Evacuation en cas de pluie forte', 'Verification quotidienne blindages']),
      r('mac-ecrasement', 'Ecrasement coffrage/beton', 'Ecrasement par coffrage, elements prefabriques ou effondrement de banchage', 'mac-coffrage', ['Decoffrage premature', 'Basculement de banche', 'Chute d\'element prefabrique a la grue'], 4, 2, ['Etais de securite', 'Procedure de decoffrage'], ['Formation coffreur', 'Verification etais avant coulage', 'Zone d\'exclusion sous levage grue', 'Attente durcissement beton (respect des delais)']),
      r('mac-dermatite', 'Dermatite ciment (RG 8)', 'Irritation cutanee et allergie au ciment (chromate) — Tableau RG 8', 'mac-murs', ['Contact ciment humide (mortier)', 'Projection beton frais', 'Lavage mains au ciment'], 2, 4, ['Gants de maçon'], ['Gants etanches longs pour beton', 'Creme protectrice avant le travail', 'Lavage mains a l\'eau (jamais au ciment)', 'Substitution : ciment faible teneur chromate (< 2 ppm)']),
      r('mac-manutention', 'Manutention lourde (parpaings, sacs)', 'Port de parpaings (20kg), sacs de ciment (25-35kg)', 'mac-murs', ['Approvisionnement parpaings en etage', 'Sacs de ciment', 'Ferraillage (barres)', 'Brouette de beton'], 3, 4, ['Monte-materiaux', 'Brouette'], ['Aide mecanique > 25kg', 'Formation gestes et postures', 'Organisation stockage a hauteur de travail', 'Rotation taches lourdes/legeres']),
      r('mac-bruit', 'Bruit (marteau-piqueur, disqueuse)', 'Exposition au bruit des outils de demolition et de decoupe', 'mac-murs', ['Marteau-piqueur', 'Disqueuse beton', 'Vibreur a beton', 'Banchage'], 3, 3, ['Bouchons d\'oreilles'], ['Casque antibruit EN 352', 'Alternance taches bruyantes', 'Audiogramme annuel']),
      r('mac-vibrations', 'Vibrations (marteau-piqueur)', 'Vibrations corps entier et main-bras par outils vibrants', 'mac-murs', ['Marteau-piqueur', 'Aiguille vibrante beton', 'Perforateur'], 3, 3, ['Limitation de duree'], ['Outils anti-vibrations', 'Rotation des operateurs', 'Suivi medical renforce', 'Limitation 2h continues']),
      r('mac-intemperies', 'Intemperies', 'Travail en exterieur par chaleur, froid, pluie, vent', 'mac-murs', ['Canicule > 33°C', 'Gel hivernal', 'Vent fort en hauteur', 'Pluie (sol glissant)'], 2, 3, ['Eau a disposition', 'Pauses'], ['Plan canicule', 'Report travaux hauteur si vent > 60 km/h', 'Vetements thermiques fournis en hiver', 'Amenagement horaires ete']),
    ],
  },

  // ── Couvreur-Zingueur ───────────────────────────────────────────
  {
    metierSlug: 'couvreur', label: 'Couvreur-Zingueur', category: 'btp_construction',
    nafCodes: ['43.91B'], idcc: '1597',
    legalReferences: ['Art. R4323-58 a R4323-90 (hauteur)', 'Decret 2004-924 (travaux en hauteur)', 'Art. R4534-1 (BTP)'],
    workUnits: [
      wu('couv-toiture', 'Toiture / couverture', 'Travail sur toiture : depose, pose tuiles/ardoises, zinguerie', '2-4'),
      wu('couv-charpente', 'Charpente / structure', 'Acces et travail sur charpente bois ou metallique', '1-3'),
      wu('couv-echafaudage', 'Echafaudage / acces', 'Echafaudage de pied, nacelle, echelle de toit', '1-2'),
      wu('couv-sol', 'Zone sol / approvisionnement', 'Preparation materiaux, stockage, monte-charge', '1-2'),
      wu('couv-vehicule', 'Vehicule / deplacements', 'Deplacements avec echelle sur galerie', '1'),
    ],
    risks: [
      r('couv-chute-toiture', 'Chute de toiture (risque mortel)', 'Chute depuis toiture en pente — premiere cause de mortalite BTP couverture', 'couv-toiture', ['Depose tuiles sur pente > 30°', 'Travail en rive sans protection', 'Toiture mouillee/verglacee', 'Passage sur lucarne non protegee'], 4, 4, ['Harnais antichute', 'Ligne de vie'], ['Garde-corps en rive obligatoire', 'Filet en sous-face', 'Echelle de toit crochets', 'Interdiction absolue de travailler seul en toiture', 'Formation travail en hauteur recyclage 3 ans', 'Report si toiture verglacee/mouillee']),
      r('couv-chute-echafaudage', 'Chute depuis echafaudage', 'Chute lors du montage/demontage ou utilisation d\'echafaudage', 'couv-echafaudage', ['Montage/demontage echafaudage de pied', 'Platelage incomplet', 'Acces par echelle interne'], 4, 3, ['Echafaudage conforme', 'Formation montage'], ['Verification par personne competente', 'Platelage complet + plinthes + garde-corps', 'Acces securise interne', 'Registre de verification']),
      r('couv-manutention', 'Manutention (tuiles, panneaux)', 'Port de tuiles (3-5 kg x 100), panneaux zinc, panneaux sandwichs', 'couv-toiture', ['Monte de tuiles par palettes', 'Manipulation panneaux zinc en toiture', 'Transport bottes d\'ardoises'], 3, 4, ['Monte-materiaux'], ['Monte-tuiles electrique obligatoire', 'Limitation poids a la montee', 'Organisation par paquets legers', 'Rotation des porteurs']),
      r('couv-brulure', 'Brulure (bitume, soudure zinc)', 'Brulure par bitume chaud (200°C), soudure zinc au chalumeau', 'couv-toiture', ['Application bitume a chaud', 'Soudure zinc au chalumeau', 'Fondeur de bitume', 'Etancheite membrane'], 3, 3, ['Gants cuir soudeur', 'Manches longues'], ['Thermometre sur fondeur bitume', 'Extincteur a proximite', 'Kit brulure sur le toit', 'Permis de feu pour chalumeau']),
      r('couv-intemperies', 'Intemperies / foudre', 'Travail expose au vent, pluie, froid, chaleur, risque de foudre sur toiture', 'couv-toiture', ['Vent > 60 km/h en toiture', 'Orage (risque foudre)', 'Canicule sur toiture metal', 'Verglas toiture nord'], 3, 3, ['Arret travaux par mauvais temps'], ['Aneometre obligatoire en toiture', 'Arret si vent > 45 km/h ou orage', 'Plan canicule (debut 6h en ete)', 'Suivi meteo quotidien']),
      r('couv-chute-objets', 'Chute d\'objets sur les passants', 'Chute de tuiles, outils ou materiaux depuis la toiture', 'couv-sol', ['Glissement de tuiles', 'Outil lache depuis le toit', 'Debris de depose'], 3, 2, ['Balisage au sol', 'Filet en pied echafaudage'], ['Zone d\'exclusion balisee au sol', 'Filet de protection en sous-face', 'Pochettes outils accrochees', 'Signalisation "Chute d\'objets"']),
      r('couv-amiante', 'Amiante (couverture ancienne)', 'Exposition a l\'amiante-ciment lors de depose de toitures anciennes', 'couv-toiture', ['Depose fibro-ciment', 'Percage plaques ancienne toiture', 'Stockage plaques amiantees'], 4, 2, ['Diagnostic amiante avant travaux'], ['Formation SS4 obligatoire', 'Masque FFP3 + combinaison', 'Sac a dechets amiante', 'Decontamination en fin de poste', 'Suivi medical amiante 40 ans']),
      r('couv-poussieres', 'Poussieres (decoupe, depose)', 'Poussieres de beton, tuiles, bois de charpente', 'couv-toiture', ['Decoupe tuiles beton', 'Ponçage', 'Depose charpente ancienne'], 2, 3, ['Masque FFP2'], ['Decoupe a l\'eau si possible', 'Aspiration portable', 'Nettoyage quotidien']),
    ],
  },

  // ── Platrier-Plaquiste ──────────────────────────────────────────
  {
    metierSlug: 'platrier', label: 'Platrier-Plaquiste', category: 'btp_construction',
    nafCodes: ['43.31Z'], idcc: '1597',
    legalReferences: ['Art. R4412-1 (chimique)', 'Art. R4323-58 (hauteur)', 'Art. R4541-1 (manutention)'],
    workUnits: [
      wu('pla-pose', 'Pose plaques / cloisons', 'Montage cloisons seches, doublages, faux-plafonds', '2-4'),
      wu('pla-enduit', 'Enduit / bandes / finition', 'Application enduit, bandes a joints, ponçage', '1-3'),
      wu('pla-decoupe', 'Decoupe / perçage', 'Decoupe plaques de platre, perçage fixations', '1-2'),
      wu('pla-echafaudage', 'Travail en hauteur', 'Echafaudage roulant, nacelle pour faux-plafonds', '1-2'),
      wu('pla-stockage', 'Stockage / manutention', 'Stockage plaques (28kg chaque), rails, visserie', '1'),
    ],
    risks: [
      r('pla-poussieres', 'Poussieres de platre', 'Inhalation de poussieres fines de platre lors du ponçage des joints et enduits', 'pla-enduit', ['Ponçage bandes a joints', 'Decoupage plaques', 'Balayage a sec', 'Depose de vieux platre'], 3, 4, ['Masque FFP2', 'Aspirateur'], ['Ponceuse girafe avec aspiration integree', 'Masque FFP2 systematique au ponçage', 'Nettoyage par aspiration (pas soufflette)', 'Aeration du local pendant et apres ponçage']),
      r('pla-tms', 'TMS (plaques, bras leves)', 'Douleurs epaules et dos par port de plaques (28kg) et travail bras leves au plafond', 'pla-pose', ['Port de plaques BA13 (28kg, 2.50m)', 'Vissage au plafond bras leves', 'Montage ossature en hauteur'], 3, 4, ['Travail a deux pour les plaques'], ['Leve-plaque mecanique', 'Visseuse sur perche', 'Plaques allegees si disponible', 'Rotation pose sol/plafond', 'Pauses actives']),
      r('pla-chute-hauteur', 'Chute de hauteur (echafaudage roulant)', 'Chute depuis echafaudage roulant ou PIRL lors de la pose de plafonds', 'pla-echafaudage', ['Echafaudage roulant deplace sans descendre', 'PIRL instable', 'Marche pied improvise'], 3, 3, ['Echafaudage roulant conforme'], ['Interdiction de deplacer echafaudage sans descendre', 'PIRL avec garde-corps', 'Formation utilisation echafaudage roulant']),
      r('pla-coupure', 'Coupure (cutter, scie)', 'Coupure par cutter, scie a platre, aretes metalliques des rails', 'pla-decoupe', ['Decoupe plaque au cutter', 'Manipulation rails metalliques', 'Scie a platre electrique'], 2, 3, ['Gants anti-coupure'], ['Cutter a lame retractable', 'Gants EN 388 pour manipulation rails', 'Rangement cutters dans etui apres usage']),
      r('pla-electrique', 'Risque electrique', 'Contact avec cables encastres lors du perçage des cloisons', 'pla-decoupe', ['Perçage traversee cables', 'Vissage dans cables caches', 'Pose prise sans consignation'], 3, 2, ['Detecteur de cables'], ['Detecteur de cables obligatoire', 'Coordination avec electricien', 'Plan de passage cables consulte']),
      r('pla-manutention', 'Manutention plaques et rails', 'Port de plaques de platre (28kg, format encombrant) et paquets de rails', 'pla-stockage', ['Dechargement camion', 'Monte en etage', 'Stockage debout (risque basculement)'], 3, 3, ['Monte-materiaux'], ['Chariot a plaques', 'Monte-charge si etages', 'Stockage a plat (pas debout)', 'Limite 2 plaques par porteur']),
      r('pla-chimique', 'Risque chimique (enduits, primaires)', 'Contact ou inhalation d\'enduits prets a l\'emploi, primaires, produits de ragréage', 'pla-enduit', ['Application primaire d\'accrochage', 'Enduit projet', 'Ragréage'], 2, 3, ['Gants'], ['Ventilation si interieur confine', 'Gants nitrile pour primaires', 'FDS sur chantier']),
      r('pla-rps', 'Risques psychosociaux', 'Pression des delais second oeuvre, travail en coactivite', 'pla-pose', ['Delais serres', 'Coactivite (autres corps de metier)', 'Bruit ambiant chantier'], 2, 2, ['Planning communique'], ['Coordination planning entre corps de metier', 'Objectifs realistes', 'Briefing quotidien']),
    ],
  },

  // ── Charpentier ─────────────────────────────────────────────────
  {
    metierSlug: 'charpentier', label: 'Charpentier', category: 'btp_construction',
    nafCodes: ['43.91A'], idcc: '1597',
    legalReferences: ['Tableau RG 47 (poussieres bois)', 'Art. R4323-58 (hauteur)', 'Directive Machines 2006/42/CE'],
    workUnits: [
      wu('cha-atelier', 'Atelier taille/assemblage', 'Taille, debit, assemblage de la charpente en atelier', '2-4'),
      wu('cha-levage', 'Levage / pose chantier', 'Levage et pose de la charpente sur le chantier', '3-6'),
      wu('cha-couverture', 'Structure en hauteur', 'Travail sur la structure de charpente en elevation', '2-4'),
      wu('cha-stockage', 'Stockage bois', 'Stockage des bois de charpente, panneaux', '1'),
      wu('cha-vehicule', 'Transport / livraison', 'Transport de bois par camion, livraison chantier', '1-2'),
    ],
    risks: [
      r('cha-chute', 'Chute de hauteur depuis la structure', 'Chute depuis la charpente en cours de montage — risque mortel', 'cha-levage', ['Montage fermettes sans filet', 'Deplacement sur pannes sans securisation', 'Absence de garde-corps temporaires'], 4, 4, ['Harnais antichute', 'Ligne de vie'], ['Filet de securite sous zone de montage', 'Garde-corps temporaires sur charpente', 'Passerelle de circulation', 'Interdiction de travailler seul', 'Formation travail en hauteur annuelle']),
      r('cha-machines', 'Coupure / happement machines atelier', 'Coupure ou amputation par scie a ruban, tronconneuse a onglet, raboteuse', 'cha-atelier', ['Scie a ruban (debit bois massif)', 'Tronconneuse a onglet', 'Mortaiseuse', 'Tenonneuse'], 4, 3, ['Carters de protection', 'Arret d\'urgence'], ['Poussoir obligatoire', 'Maintenance preventive mensuelle', 'Formation securite machines', 'Affichage consignes par machine']),
      r('cha-poussieres', 'Poussieres de bois (RG 47)', 'Inhalation de poussieres de bois — cancer sino-nasal (Tableau RG 47)', 'cha-atelier', ['Sciage bois massif', 'Ponçage', 'Balayage atelier', 'Decoupe panneaux'], 3, 4, ['Aspiration centralisee'], ['Aspiration verifiee annuellement', 'Masque FFP3 pour bois exotiques', 'Nettoyage par aspiration (pas soufflette)', 'Spirometrie annuelle']),
      r('cha-bruit', 'Bruit machines (> 90 dB)', 'Bruit des machines d\'atelier et outils de chantier', 'cha-atelier', ['Scie a ruban', 'Cloueuse pneumatique', 'Tronconneuse a chaine', 'Raboteuse'], 3, 3, ['Bouchons d\'oreilles'], ['Casque antibruit EN 352', 'Lames affutees', 'Encoffrement', 'Audiogramme annuel']),
      r('cha-ecrasement', 'Ecrasement lors du levage', 'Ecrasement par piece de charpente lors du levage a la grue ou a bras', 'cha-levage', ['Levage fermettes a la grue', 'Basculement de piece en cours de montage', 'Chute de panne lors du calage'], 4, 2, ['Elingues conformes', 'Chef de manoeuvre'], ['Plan de levage obligatoire', 'Zone d\'exclusion sous charge', 'Communication par radio', 'Formation elingage']),
      r('cha-manutention', 'Manutention bois lourds', 'Port de madriers, pannes et bois de charpente (> 50 kg parfois)', 'cha-stockage', ['Dechargement camion', 'Transport bois a bras en atelier', 'Monte sur chantier'], 3, 3, ['Chariot, palonnier'], ['Grue ou palan pour pieces lourdes', 'Limit portage a 2 personnes', 'Chariot a roues tout-terrain']),
      r('cha-intemperies', 'Intemperies / foudre en charpente', 'Travail en exterieur expose au vent, pluie, foudre sur structure haute', 'cha-couverture', ['Vent fort sur structure', 'Orage en cours de levage', 'Bois mouille glissant', 'Froid hivernal'], 3, 3, ['Arret par mauvais temps'], ['Aneometre sur chantier', 'Arret levage si vent > 60 km/h', 'Suivi meteo', 'Vetements thermiques']),
      r('cha-chimique', 'Produits de traitement bois', 'Contact ou inhalation de produits de traitement du bois (insecticide, fongicide)', 'cha-atelier', ['Trempage bois en cuve', 'Application traitement au pistolet', 'Manipulation bois fraichement traite'], 2, 3, ['Gants', 'Ventilation'], ['Masque A2 si pulverisation', 'Gants nitrile longs', 'FDS affichees', 'Lavage mains apres manipulation']),
    ],
  },
];
