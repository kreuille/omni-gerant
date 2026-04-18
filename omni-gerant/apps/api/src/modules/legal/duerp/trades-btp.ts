// BUSINESS RULE [CDC-2.4]: E1 — 15 metiers BTP specialises
// Peintre, Menuisier, Carreleur, Macon, Couvreur, Platrier, Charpentier,
// Chaudronnier, Serrurier, Terrassement, Construction routes, Solier, Poseur menuiseries, Ascensoriste, Vitrier

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

  // ── Chaudronnier ───────────────────────────────────────────────
  {
    metierSlug: 'chaudronnier', label: 'Chaudronnier-Soudeur', category: 'btp_construction',
    nafCodes: ['25.11Z', '25.29Z'], idcc: '1597',
    legalReferences: ['Tableau RG 44 (fumees soudage)', 'Art. R4222-1 (ventilation)', 'Directive Machines 2006/42/CE'],
    workUnits: [
      wu('chau-soudure', 'Poste de soudure', 'Soudure MIG/MAG, TIG, arc, chalumeau sur pieces metalliques', '2-4'),
      wu('chau-decoupe', 'Decoupe / meulage', 'Decoupe plasma, oxycoupage, meulage, tronconnage', '1-3'),
      wu('chau-assemblage', 'Assemblage / montage', 'Assemblage de structures metalliques, cintrage, pliage', '2-4'),
      wu('chau-chantier', 'Chantier exterieur', 'Interventions de soudure et chaudronnerie sur site client', '2-4'),
      wu('chau-stockage', 'Stockage / approvisionnement', 'Stockage toles, tubes, gaz de soudage', '1'),
    ],
    risks: [
      r('chau-brulure', 'Brulures (soudure, meulage)', 'Brulure par projection de metal en fusion, contact piece chaude, arc electrique', 'chau-soudure', ['Projection d\'etincelles et de metal en fusion', 'Contact avec piece venant d\'etre soudee', 'Retour de flamme chalumeau', 'Brulure par rayonnement UV/IR'], 3, 4, ['Tablier cuir soudeur', 'Gants soudeur EN 12477'], ['Ecrans de protection entre postes', 'Rideau de soudure pour la zone', 'Kit brulure au poste', 'Marquage des pieces chaudes']),
      r('chau-fumees', 'Fumees de soudage (RG 44)', 'Inhalation de fumees metalliques (chrome, nickel, manganese) — Tableau RG 44', 'chau-soudure', ['Soudure inox (chrome hexavalent)', 'Soudure galvanise (zinc)', 'Soudure en espace confine', 'Meulage cordons de soudure'], 3, 4, ['Aspiration localisee sur torche', 'Masque FFP2'], ['Torche aspirante obligatoire', 'Masque FFP3 si inox ou galva', 'Controle annuel exposition', 'Suivi medical renforce (pneumologue)', 'Ventilation generale atelier']),
      r('chau-bruit', 'Bruit (meulage, martelage)', 'Exposition au bruit des meuleuses, marteaux et outils de decoupe (> 95 dB)', 'chau-decoupe', ['Meulage cordons', 'Tronconnage a disque', 'Martelage de redressage', 'Decoupe plasma'], 3, 4, ['Bouchons d\'oreilles'], ['Casque antibruit EN 352 obligatoire en atelier', 'Outils silencieux si disponibles', 'Encoffrement poste de meulage', 'Audiogramme annuel']),
      r('chau-rayonnement', 'Rayonnement UV/IR (soudure)', 'Lesions oculaires (photokeratite, coup d\'arc) et cutanees par rayonnement', 'chau-soudure', ['Arc de soudure sans protection', 'Reflexion sur piece metallique', 'Coup d\'arc par poste voisin'], 3, 3, ['Cagoule de soudeur teinte auto'], ['Cagoule electronique teinte variable obligatoire', 'Ecrans de protection inter-postes', 'Manches longues et col montant', 'Protection UV pour la peau exposee']),
      r('chau-manutention', 'Manutention (toles, tubes lourds)', 'Port de toles et tubes metalliques lourds (> 30 kg), postures contraignantes', 'chau-assemblage', ['Manipulation toles grand format', 'Port de tubes acier', 'Positionnement pieces sur marbre', 'Retournement pieces lourdes'], 3, 3, ['Palan, pont roulant'], ['Vireur de soudage pour pieces lourdes', 'Potence de levage au poste', 'Limitation port manuel a 25 kg', 'Formation gestes et postures']),
      r('chau-coupure', 'Coupures (toles, bavures)', 'Coupure par aretes vives de toles, bavures de soudure, meulage', 'chau-decoupe', ['Manipulation toles brutes', 'Ebavurage pieces', 'Nettoyage copeaux metalliques'], 2, 4, ['Gants anti-coupure EN 388'], ['Ebavurage systematique apres decoupe', 'Gants EN 388 niveau 5 obligatoires', 'Bac de recuperation copeaux', 'Lunettes EN 166 au meulage']),
      r('chau-incendie', 'Incendie / explosion (gaz, solvants)', 'Risque d\'incendie par etincelles de soudure pres de materiaux inflammables', 'chau-stockage', ['Soudure pres de produits inflammables', 'Fuite bouteille gaz (acetylene)', 'Stockage solvants de degraissage'], 4, 2, ['Extincteurs', 'Permis de feu'], ['Permis de feu obligatoire hors atelier', 'Stockage gaz conforme (local ventile, chaines)', 'Couverture anti-feu au poste', 'Controle fuites gaz hebdomadaire']),
      r('chau-electrique', 'Risque electrique (poste a souder)', 'Electrisation par poste a souder defectueux ou cable endommage', 'chau-soudure', ['Cable de masse mal connecte', 'Isolation du poste defectueuse', 'Travail en milieu humide'], 3, 2, ['Verification visuelle cables', 'Poste a souder conforme'], ['Verification electrique annuelle des postes', 'Gants isolants pour le raccordement', 'Remplacement immediat cables endommages', 'Interdiction soudure si sol mouille']),
    ],
  },

  // ── Serrurier-Metallier ────────────────────────────────────────
  {
    metierSlug: 'serrurier-metallier', label: 'Serrurier-Metallier', category: 'btp_construction',
    nafCodes: ['25.12Z', '43.32B'], idcc: '1597',
    legalReferences: ['Directive Machines 2006/42/CE', 'Art. R4323-58 (hauteur)', 'Art. R4412-1 (chimique)'],
    workUnits: [
      wu('ser-atelier', 'Atelier fabrication', 'Decoupe, soudure, assemblage de pieces metalliques (portails, garde-corps, escaliers)', '2-5'),
      wu('ser-meulage', 'Poste meulage / finition', 'Meulage, ponçage, ebavurage, peinture metallerie', '1-3'),
      wu('ser-pose', 'Chantier pose / depannage', 'Pose de menuiseries metalliques, serrures, garde-corps sur chantier', '1-3'),
      wu('ser-soudure', 'Poste de soudure', 'Soudure MIG, TIG, arc sur acier, inox, aluminium', '1-3'),
      wu('ser-vehicule', 'Vehicule / deplacements', 'Deplacements inter-chantiers et depannages', '1'),
    ],
    risks: [
      r('ser-coupure', 'Coupures (metal, meulage)', 'Coupure par toles, bavures metalliques, meule, scie a ruban', 'ser-atelier', ['Manipulation toles brutes', 'Scie a ruban metal', 'Ebavurage pieces', 'Manipulation barreaux, grilles'], 3, 4, ['Gants anti-coupure EN 388'], ['Gants EN 388 niveau 5 obligatoires', 'Lunettes EN 166 au meulage', 'Ebavurage systematique', 'Carter sur scie a ruban']),
      r('ser-bruit', 'Bruit (meulage, martelage, soudure)', 'Exposition au bruit des meuleuses (> 100 dB), marteaux, perceuses', 'ser-meulage', ['Disqueuse de meulage', 'Martelage de redressage', 'Perceuse a colonne metal', 'Poinconneuse'], 3, 4, ['Bouchons d\'oreilles'], ['Casque antibruit EN 352', 'Meules de qualite (moins bruyantes)', 'Encoffrement machines fixes', 'Audiogramme annuel']),
      r('ser-fumees', 'Fumees de soudure', 'Inhalation fumees metalliques lors de la soudure acier, inox, aluminium', 'ser-soudure', ['Soudure MIG en atelier', 'Soudure TIG inox', 'Soudure en chantier confine'], 3, 3, ['Aspiration localisee', 'Masque FFP2'], ['Torche aspirante en atelier', 'Masque FFP3 si inox/galva', 'Ventilation renforcee si chantier confine', 'Suivi medical renforce']),
      r('ser-chute-hauteur', 'Chute de hauteur (pose)', 'Chute depuis echelle, echafaudage lors de la pose de garde-corps, escaliers', 'ser-pose', ['Pose garde-corps en hauteur', 'Intervention sur toiture (verriere)', 'Echelle appuyee en facade', 'Pose fenetre metallique'], 4, 2, ['Echafaudage roulant', 'Harnais'], ['PIRL ou nacelle plutot qu\'echelle', 'Harnais si pas de protection collective', 'Formation travail en hauteur', 'Verification echafaudage avant chaque poste']),
      r('ser-manutention', 'Manutention (portails, escaliers)', 'Port de pieces lourdes et encombrantes (portails, garde-corps, escaliers metalliques)', 'ser-atelier', ['Deplacement portail en atelier', 'Chargement camion', 'Montee escalier metallique en etage'], 3, 3, ['Palan, chariot'], ['Potence de levage', 'Ventouses pour panneaux', 'Manutention a 2 personnes obligatoire > 25 kg', 'Chariot de transport adapte']),
      r('ser-projection', 'Projections (meulage, soudure)', 'Projection d\'etincelles, particules metalliques dans les yeux', 'ser-meulage', ['Meulage sans ecran', 'Soudure sans ecran lateral', 'Percage metal'], 2, 4, ['Lunettes de protection'], ['Lunettes EN 166 obligatoires en atelier', 'Ecran facial pour meulage prolonge', 'Ecrans inter-postes', 'Affichage EPI par zone']),
      r('ser-chimique', 'Risque chimique (peintures, solvants)', 'Inhalation vapeurs de peinture metallerie, degraissant, antirouille', 'ser-meulage', ['Application peinture epoxy', 'Degraissage pieces au solvant', 'Application antirouille'], 2, 3, ['Ventilation atelier', 'Gants nitrile'], ['Cabine de peinture ventilee', 'Substitution solvants par aqueux', 'Masque A2 si pulverisation', 'FDS affichees']),
      r('ser-routier', 'Risque routier', 'Accidents lors des deplacements pour pose et depannages', 'ser-vehicule', ['Trajet inter-chantiers', 'Vehicule charge (portails)', 'Urgence depannage serrurerie'], 3, 2, ['Vehicule entretenu'], ['Arrimage materiel et pieces', 'Planning avec temps de trajet', 'Formation eco-conduite']),
    ],
  },

  // ── Terrassement-Demolition ────────────────────────────────────
  {
    metierSlug: 'terrassement-demolition', label: 'Terrassement et Demolition', category: 'btp_construction',
    nafCodes: ['43.12A', '43.12B', '43.11Z'], idcc: '1597',
    legalReferences: ['Art. R4534-1 (BTP)', 'Decret 2012-639 (amiante)', 'Art. R4541-1 (manutention)', 'Tableau RG 69 (vibrations)'],
    workUnits: [
      wu('terr-fouilles', 'Fouilles / terrassement', 'Creusement de tranchees, fouilles, terrassements en pleine masse', '2-6'),
      wu('terr-demolition', 'Demolition structures', 'Demolition de batiments, murs, dalles avec engins ou manuellement', '2-6'),
      wu('terr-engins', 'Conduite engins', 'Pelle mecanique, mini-pelle, chargeuse, camion benne', '1-3'),
      wu('terr-amiante', 'Zone amiante / desamiantage', 'Intervention sur materiaux amiantiferes, confinement, retrait', '2-4'),
      wu('terr-stockage', 'Zone de stockage / tri', 'Tri et stockage des materiaux de demolition, bennes', '1-2'),
    ],
    risks: [
      r('terr-ensevelissement', 'Ensevelissement (fouilles)', 'Eboulement de parois de tranchee ou de fouille non blindee — risque mortel', 'terr-fouilles', ['Fouille > 1.30m sans blindage', 'Terrain meuble apres pluie', 'Vibrations d\'engins a proximite', 'Surcharge en bord de fouille'], 4, 3, ['Blindage tranchees', 'Etude de sol prealable'], ['Blindage systematique > 1.30m', 'Interdiction stockage en bord de fouille (1m min)', 'Evacuation si fortes pluies', 'Inspection quotidienne parois', 'Echelle d\'evacuation tous les 25m']),
      r('terr-ecrasement-engin', 'Ecrasement par engin', 'Heurt ou ecrasement par pelle mecanique, chargeuse ou camion benne', 'terr-engins', ['Recul d\'engin sans visibilite', 'Pelle en rotation', 'Camion benne en manoeuvre', 'Travail dans la zone d\'evolution'], 4, 3, ['Gilet haute visibilite', 'Bip de recul sur engins'], ['Zone d\'exclusion autour des engins (rayon giration)', 'Radio entre machiniste et sol', 'Camera de recul sur engins', 'Formation CACES conducteur et signaleur au sol']),
      r('terr-amiante', 'Amiante (demolition)', 'Exposition aux fibres d\'amiante lors de demolition de batiments anciens', 'terr-amiante', ['Depose materiaux amiantiferes', 'Cassage beton avec amiante', 'Transport dechets amiante', 'Poussiere lors de la demolition'], 4, 3, ['Diagnostic amiante avant travaux'], ['Formation SS3 obligatoire', 'Confinement zone de retrait', 'Masque TM3P APR', 'Combinaison jetable + sur-chaussures', 'Sas de decontamination', 'Suivi medical amiante 40 ans']),
      r('terr-vibrations', 'Vibrations corps entier (engins) — RG 69', 'Vibrations transmises au corps entier par la conduite d\'engins', 'terr-engins', ['Conduite pelle sur terrain accidente', 'Utilisation BRH (brise-roche)', 'Chargeuse sur sols irreguliers', 'Mini-pelle sur chantier'], 3, 4, ['Siege suspendu sur engins'], ['Limiteur de vibrations sur engins', 'Rotation des conducteurs (max 4h continues)', 'Entretien pistes de chantier', 'Suivi medical renforce', 'Outils basse vibration (BRH)']),
      r('terr-chute-objets', 'Chute d\'objets / projections', 'Chute de materiaux de demolition, projection de gravats, eclats de beton', 'terr-demolition', ['Demolition de murs (chute gravats)', 'Projection lors de cassage beton', 'Chute d\'elements de structure', 'Benne de tri dechets'], 4, 3, ['Casque EN 397', 'Lunettes EN 166'], ['Zone d\'exclusion sous demolition', 'Filets de protection', 'Arrosage anti-poussiere', 'Protection collective avant individuelle']),
      r('terr-poussieres', 'Poussieres (demolition, terrassement)', 'Inhalation de poussieres de beton, platre, silice lors de la demolition', 'terr-demolition', ['Cassage beton a la pelle', 'BRH sur dalle', 'Balayage gravats', 'Chargement benne dechets'], 3, 3, ['Masque FFP2', 'Arrosage sommaire'], ['Arrosage systematique anti-poussiere', 'Masque FFP3 si silice ou amiante possible', 'Confinement si interieur', 'Aspiration a la source si possible']),
      r('terr-bruit', 'Bruit (BRH, engins)', 'Exposition au bruit des engins de demolition, BRH (> 100 dB)', 'terr-demolition', ['BRH en fonctionnement', 'Pelle mecanique', 'Compresseur', 'Marteau-piqueur'], 3, 3, ['Bouchons d\'oreilles'], ['Casque antibruit EN 352 obligatoire', 'Limitation duree exposition', 'Rotation des operateurs', 'Audiogramme annuel']),
      r('terr-routier', 'Risque routier (engins sur voie)', 'Collision entre engins de chantier et vehicules de circulation', 'terr-engins', ['Engin traversant une voie publique', 'Camion benne en circulation', 'Entree/sortie de chantier'], 4, 2, ['Balisage chantier', 'Gilets haute visibilite'], ['Signalisation temporaire conforme', 'Plan de circulation chantier', 'Guide de manoeuvre a la sortie', 'Gyrophare sur tous les engins']),
    ],
  },

  // ── Construction de routes ─────────────────────────────────────
  {
    metierSlug: 'construction-routes', label: 'Construction de routes et voiries', category: 'btp_construction',
    nafCodes: ['42.11Z', '42.12Z'], idcc: '1597',
    legalReferences: ['Art. R4534-1 (BTP)', 'Arrete du 15/09/1999 (signalisation temporaire)', 'Tableau RG 16 bis (goudrons)'],
    workUnits: [
      wu('route-chaussee', 'Chaussee / voirie', 'Mise en oeuvre enrobes, compactage, revetements de chaussee', '4-10'),
      wu('route-signalisation', 'Signalisation / balisage', 'Pose de signalisation temporaire et definitive, marquage au sol', '1-3'),
      wu('route-terrassement', 'Terrassement routier', 'Preparation de la plateforme, decaissement, remblai', '3-8'),
      wu('route-engins', 'Engins / materiels', 'Conduite finisseur, compacteur, repandeur de liant', '2-4'),
      wu('route-vehicule', 'Vehicules / base de vie', 'Deplacements, base de vie, vestiaires', '1-3'),
    ],
    risks: [
      r('route-circulation', 'Heurt par vehicules en circulation', 'Collision avec un vehicule de circulation lors de travaux sur voie ouverte', 'route-chaussee', ['Travail sur voie ouverte a la circulation', 'Balisage insuffisant', 'Vehicule forçant la zone de chantier', 'Nuit ou faible visibilite'], 4, 4, ['Gilet haute visibilite EN 20471 classe 3', 'Signalisation temporaire'], ['Signalisation temporaire conforme a l\'arrete', 'Alternat avec feux tricolores', 'Fourgon fleche a l\'amont', 'Eclairage chantier de nuit', 'Formation signalisation temporaire']),
      r('route-bitume', 'Brulure (bitume chaud, enrobes)', 'Brulure par bitume chaud (160-180°C), enrobes, liant', 'route-chaussee', ['Application enrobe chaud', 'Eclaboussure de bitume', 'Contact finisseur', 'Point a temps (joints)'], 3, 3, ['Gants cuir longs', 'Vetements couvrants'], ['Gants resistants chaleur EN 407', 'Chaussures hautes cuir', 'Kit brulure sur le chantier', 'Formation premiers secours brulure']),
      r('route-chimique', 'Risque chimique (bitume, solvants)', 'Inhalation de fumees de bitume (HAP), solvants de nettoyage, emulsions', 'route-chaussee', ['Fumees de bitume chaud', 'Nettoyage au gasoil/solvant', 'Epandage emulsion de coupure', 'Application primaire'], 3, 3, ['Masque FFP2 si bitume chaud'], ['Masque FFP2 obligatoire lors de l\'application', 'Substitution nettoyage gasoil par bio-nettoyant', 'Enrobes tiedes plutot que chauds quand possible', 'Suivi medical renforce (HAP)']),
      r('route-ecrasement-engin', 'Ecrasement par engins', 'Heurt ou ecrasement par compacteur, finisseur, camion benne', 'route-engins', ['Recul compacteur', 'Zone d\'evolution du finisseur', 'Camion benne en dechargement', 'Repandeur de liant'], 4, 3, ['Gilet EN 20471', 'Bip de recul'], ['Zone d\'exclusion autour de chaque engin', 'Guide au sol pour les manoeuvres', 'Camera de recul sur tous les engins', 'Radio entre machiniste et sol']),
      r('route-uv', 'UV / intemperies', 'Exposition prolongee au soleil, chaleur, froid, pluie en exterieur', 'route-chaussee', ['Travail plein soleil en ete', 'Bitume + soleil (temperature au sol > 60°C)', 'Pluie prolongee', 'Vent froid hivernal'], 2, 4, ['Eau fraiche', 'Casquette'], ['Creme solaire SPF50 fournie', 'Amenagement horaires ete (debut 6h)', 'Abri sur chantier (base de vie)', 'Vetements anti-UV', 'Plan canicule chantier']),
      r('route-vibrations', 'Vibrations (compacteur, BRH)', 'Vibrations corps entier par conduite de compacteur et engins', 'route-engins', ['Compacteur vibrant', 'Plaque vibrante manuelle', 'Conduite prolongee sur terrain irregulier'], 3, 3, ['Siege suspendu'], ['Rotation conducteurs (max 4h)', 'Plaque vibrante avec amortisseur', 'Entretien piste chantier', 'Suivi medical vibrations']),
      r('route-bruit', 'Bruit (engins, BRH)', 'Bruit des engins de terrassement, raboteuse, BRH (> 90 dB)', 'route-terrassement', ['Raboteuse', 'BRH', 'Concasseur mobile', 'Compacteur vibrant'], 3, 3, ['Bouchons d\'oreilles'], ['Casque antibruit EN 352', 'Rotation des operateurs', 'Limitation duree exposition', 'Audiogramme annuel']),
      r('route-manutention', 'Manutention (bordures, regards)', 'Port de bordures beton (30-50 kg), plaques de regard, paves', 'route-terrassement', ['Pose de bordures beton', 'Manipulation plaques fonte', 'Paves et dalles', 'Grilles d\'avaloir'], 3, 3, ['Pince a bordures'], ['Pince mecanique a bordures obligatoire', 'Limite 25 kg port manuel', 'Mini-grue pour plaques lourdes', 'Formation gestes et postures']),
    ],
  },

  // ── Solier-Moquettiste ─────────────────────────────────────────
  {
    metierSlug: 'solier-moquettiste', label: 'Solier-Moquettiste', category: 'btp_construction',
    nafCodes: ['43.33Z'], idcc: '1597',
    legalReferences: ['Tableau RG 84 (solvants)', 'Art. R4412-1 (chimique)', 'Art. R4541-1 (manutention)'],
    workUnits: [
      wu('sol-pose', 'Zone de pose', 'Pose de revetements souples (moquette, PVC, lino, parquet colle)', '1-4'),
      wu('sol-prep', 'Preparation support', 'Ragréage, primaire, decoupe, soudure de les', '1-3'),
      wu('sol-decoupe', 'Poste de decoupe', 'Decoupe de revetements au cutter, outils speciaux', '1-2'),
      wu('sol-stockage', 'Stockage rouleaux', 'Stockage rouleaux (30-50 kg), colles, ragréages', '1'),
      wu('sol-vehicule', 'Vehicule / deplacements', 'Transport rouleaux et materiel sur chantier', '1'),
    ],
    risks: [
      r('sol-chimique', 'Risque chimique (colles, solvants) — RG 84', 'Inhalation de vapeurs de colles neoprene, solvants de nettoyage, primaires', 'sol-pose', ['Application colle neoprene', 'Nettoyage au solvant', 'Application primaire epoxy', 'Soudure chimique des les PVC'], 3, 4, ['Ventilation du local', 'Gants nitrile'], ['Colles aqueuses en substitution quand possible', 'Masque A2 obligatoire si colle solvantee', 'Ventilation forcee si local confine', 'FDS affichees sur chantier', 'Suivi medical renforce']),
      r('sol-tms-genoux', 'TMS genoux (position agenouille)', 'Atteinte des genoux (hygroma, gonarthrose) par position agenouille prolongee', 'sol-pose', ['Pose revetement au sol (8h a genoux)', 'Ragréage a genoux', 'Soudure de les au sol', 'Maroufle en position basse'], 3, 4, ['Genouilleres disponibles'], ['Genouilleres ergonomiques EN 14404 obligatoires', 'Tapis de protection genoux mousse', 'Alternance taches (decoupe debout / pose)', 'Pauses toutes les 45 min', 'Suivi medical genoux']),
      r('sol-coupure', 'Coupures (cutter, grattoir)', 'Laceration par cutter, grattoir, couteau a enduire ou araseur', 'sol-decoupe', ['Decoupe moquette au cutter', 'Arasement PVC', 'Grattoir pour retrait ancien revetement', 'Couteau a enduire'], 3, 3, ['Gants anti-coupure fins'], ['Cutter a lame retractable automatique', 'Gants EN 388 fins (dexterite)', 'Collecteur de lames usagees', 'Position de decoupe stable (regle de guidage)']),
      r('sol-manutention', 'Manutention (rouleaux lourds)', 'Port de rouleaux de moquette/PVC (30-80 kg), sacs de ragréage (25 kg)', 'sol-stockage', ['Dechargement rouleaux du camion', 'Monte en etage sans ascenseur', 'Deplacement de rouleaux dans les couloirs', 'Sacs de ragréage'], 3, 3, ['Diable a rouleaux'], ['Chariot porte-rouleaux', 'Monte-materiaux si etages', 'Limite port manuel 25 kg', 'Manutention a 2 pour grands rouleaux']),
      r('sol-poussieres', 'Poussieres (ponçage, ragréage)', 'Inhalation de poussieres lors du ponçage de ragréage ou retrait ancien revetement', 'sol-prep', ['Ponçage ragréage sec', 'Retrait ancien carrelage', 'Grattage ancienne colle', 'Balayage a sec'], 2, 3, ['Masque FFP2'], ['Ponceuse avec aspiration integree', 'Masque FFP2 systematique', 'Nettoyage par aspiration (pas soufflette)', 'Aeration du local']),
      r('sol-glissade', 'Chute de plain-pied', 'Glissade sur revetement non fixe, colle au sol, chutes de rouleaux', 'sol-pose', ['Revetement en cours de pose (non fixe)', 'Colle au sol', 'Encombrement du local par les rouleaux'], 2, 3, ['Chaussures antiderapantes'], ['Balisage zone de pose', 'Nettoyage continu de la colle au sol', 'Eclairage suffisant', 'Rangement des chutes au fur et a mesure']),
      r('sol-electrique', 'Risque electrique', 'Contact avec cables lors de la pose pres de prises ou passage au sol', 'sol-pose', ['Decoupe pres de prises', 'Passage de cables sous revetement', 'Branchement outils electriques'], 3, 1, ['Detecteur de cables'], ['Consignation electrique si intervention pres de prises', 'Detecteur de cables avant decoupe', 'Rallonge electrique avec differentiel']),
      r('sol-routier', 'Risque routier', 'Accidents lors des deplacements avec vehicule charge de rouleaux', 'sol-vehicule', ['Trajet inter-chantiers', 'Vehicule surcharge de rouleaux', 'Fatigue fin de journee'], 3, 2, ['Vehicule entretenu'], ['Arrimage des rouleaux obligatoire', 'Respect charge utile vehicule', 'Planning avec temps de trajet']),
    ],
  },

  // ── Poseur de menuiseries exterieures ──────────────────────────
  {
    metierSlug: 'poseur-menuiseries-ext', label: 'Poseur de menuiseries exterieures', category: 'btp_construction',
    nafCodes: ['43.32A'], idcc: '1597',
    legalReferences: ['Art. R4323-58 (hauteur)', 'Art. R4541-1 (manutention)', 'Art. R4412-1 (chimique)'],
    workUnits: [
      wu('pmx-pose', 'Pose fenetres / portes', 'Depose et pose de fenetres, portes, baies vitrees, volets', '2-4'),
      wu('pmx-hauteur', 'Travail en hauteur', 'Intervention en facade avec echafaudage, nacelle', '1-3'),
      wu('pmx-atelier', 'Atelier preparation', 'Preparation des menuiseries, debit accessoires, pre-montage', '1-2'),
      wu('pmx-stockage', 'Stockage / manutention', 'Stockage fenetres, portes, vitrages', '1'),
      wu('pmx-vehicule', 'Vehicule / livraison', 'Transport des menuiseries sur chantier', '1-2'),
    ],
    risks: [
      r('pmx-chute-hauteur', 'Chute de hauteur (pose en facade)', 'Chute depuis echafaudage ou nacelle lors de la pose de fenetres en etage', 'pmx-hauteur', ['Pose fenetre en etage sans protection', 'Penchement par la baie pour reglage', 'Echafaudage instable', 'Nacelle mal positionnee'], 4, 3, ['Echafaudage conforme', 'Harnais si nacelle'], ['Garde-corps temporaires a la baie', 'Nacelle plutot qu\'echelle pour les etages', 'Harnais si pas de protection collective', 'Formation travail en hauteur (recyclage 3 ans)', 'Interdiction de se pencher hors de la baie']),
      r('pmx-coupure-verre', 'Coupure (verre, aluminium)', 'Coupure par vitrage casse, aretes d\'aluminium, tole pliee', 'pmx-pose', ['Manipulation de vitrage', 'Depose ancienne fenetre (verre casse)', 'Decoupe profiles aluminium', 'Manipulation bavures de tole'], 3, 3, ['Gants anti-coupure'], ['Gants EN 388 niveau 5 pour manipulation vitrages', 'Ventouses pour vitrages lourds', 'Lunettes EN 166 a la decoupe', 'Evacuation immediate des vitrages casses']),
      r('pmx-manutention', 'Manutention (fenetres, baies vitrees)', 'Port de menuiseries lourdes et encombrantes (baies vitrees 50-100 kg)', 'pmx-stockage', ['Dechargement camion', 'Monte en etage', 'Positionnement dans la baie', 'Manipulation portes d\'entree blindees'], 3, 3, ['Ventouses, chariot'], ['Ventouses professionnelles pour vitrages', 'Leve-vitre mecanique', 'Manutention a 2 obligatoire > 30 kg', 'Chariot de transport adapte', 'Monte-materiaux si etages']),
      r('pmx-chute-objet', 'Chute d\'objets (vitrage, menuiserie)', 'Chute d\'une fenetre ou d\'un vitrage depuis la zone de pose sur les personnes en bas', 'pmx-hauteur', ['Basculement fenetre avant fixation', 'Vitrage lache lors de la pose', 'Outil tombe de l\'echafaudage'], 4, 2, ['Zone d\'exclusion au sol'], ['Balisage zone inferieure obligatoire', 'Calage systematique avant lachage', 'Pochettes outils accrochees', 'Filet de protection si necessaire']),
      r('pmx-poussieres', 'Poussieres (percage, decoupe)', 'Inhalation de poussieres de beton, bois, PVC lors du percage de fixation', 'pmx-pose', ['Percage murs beton', 'Decoupe profiles PVC', 'Ajustement au rabot', 'Meulage pierre'], 2, 3, ['Masque FFP2'], ['Perforateur avec aspiration', 'Masque FFP2 au percage interieur', 'Decoupe a l\'exterieur si possible']),
      r('pmx-chimique', 'Risque chimique (mousse PU, silicone)', 'Contact ou inhalation de mousse polyurethane, mastic silicone, primaires', 'pmx-pose', ['Application mousse PU expansive', 'Joint silicone', 'Primaire d\'accrochage', 'Nettoyage au solvant'], 2, 3, ['Gants', 'Ventilation naturelle'], ['Gants nitrile pour mousse PU (irreversible sur la peau)', 'Masque A2 si utilisation importante', 'Produits a faible emission de COV', 'FDS sur chantier']),
      r('pmx-electrique', 'Risque electrique', 'Contact avec cables electriques lors du percage ou depose d\'anciennes fenetres', 'pmx-pose', ['Percage pres de prises', 'Cables dans l\'embrasure', 'Volet roulant electrique'], 3, 2, ['Detecteur de cables'], ['Consignation volet roulant electrique', 'Detecteur de cables avant percage', 'Coordination avec electricien']),
      r('pmx-routier', 'Risque routier', 'Accidents lors du transport de menuiseries avec vehicule surcharge', 'pmx-vehicule', ['Transport de baies vitrees', 'Vehicule surcharge', 'Arrimage insuffisant'], 3, 2, ['Vehicule entretenu', 'Arrimage'], ['Rack de transport pour menuiseries', 'Respect charge utile', 'Calage et arrimage avant depart', 'Formation eco-conduite']),
    ],
  },

  // ── Ascensoriste ───────────────────────────────────────────────
  {
    metierSlug: 'ascensoriste', label: 'Ascensoriste', category: 'btp_construction',
    nafCodes: ['43.29A', '33.12Z'], idcc: '1597',
    legalReferences: ['NF C 18-510 (habilitation electrique)', 'NF EN 81-20/50 (ascenseurs)', 'Art. R4323-58 (hauteur)', 'Directive ATEX'],
    workUnits: [
      wu('asc-gaine', 'Gaine d\'ascenseur', 'Intervention dans la gaine : montage guides, contrepoids, cables', '1-3'),
      wu('asc-machinerie', 'Machinerie / local technique', 'Intervention sur moteur, armoire de commande, treuil', '1-2'),
      wu('asc-cabine', 'Cabine / portes palieres', 'Montage, reglage et maintenance de la cabine et des portes', '1-3'),
      wu('asc-fosse', 'Fosse d\'ascenseur', 'Intervention en fosse de cuvette (espace confine)', '1-2'),
      wu('asc-vehicule', 'Vehicule / deplacements', 'Deplacements entre sites de maintenance', '1'),
    ],
    risks: [
      r('asc-chute-gaine', 'Chute dans la gaine (risque mortel)', 'Chute dans la gaine d\'ascenseur ouverte lors du montage ou de la maintenance', 'asc-gaine', ['Ouverture porte paliere sans cabine', 'Travail en toit de cabine sans garde-corps', 'Passage d\'un etage a l\'autre par la gaine', 'Chute d\'outils dans la gaine'], 4, 3, ['Harnais antichute', 'Point d\'ancrage en gaine'], ['Double verification presence cabine avant ouverture', 'Garde-corps perimetriques en gaine', 'Ligne de vie verticale dans la gaine', 'Formation specifique ascensoriste (recyclage 2 ans)', 'Procedure d\'ouverture paliere formalisee']),
      r('asc-electrocution', 'Electrocution (armoire, moteur)', 'Electrisation ou electrocution lors d\'intervention sur armoire de commande ou moteur', 'asc-machinerie', ['Intervention armoire sous tension', 'Defaut d\'isolation moteur', 'Remise sous tension intempestive', 'Cable endommage dans la gaine'], 4, 3, ['Habilitation electrique BR/B2V', 'VAT', 'Consignation'], ['Procedure de consignation ecrite et cadenas individuel', 'Outillage isole 1000V', 'EPI arc flash adaptes', 'Formation habilitation electrique (recyclage 3 ans)', 'Verification annuelle installations']),
      r('asc-espace-confine', 'Espace confine (fosse, machinerie)', 'Travail en espace confine dans la fosse de cuvette ou local technique exigu', 'asc-fosse', ['Intervention en fosse (profondeur 1.5-3m)', 'Local machinerie non ventile', 'Accumulation de gaz/CO2', 'Travail seul en fosse'], 4, 2, ['Ventilation portable', 'Detecteur 4 gaz'], ['Detecteur 4 gaz obligatoire avant entree', 'Ventilation forcee de la fosse', 'Procedure travailleur isole (PTI)', 'Surveillance exterieure permanente', 'Plan de sauvetage affiche']),
      r('asc-ecrasement', 'Ecrasement (cabine, contrepoids)', 'Ecrasement par mouvement inattendu de la cabine ou du contrepoids', 'asc-gaine', ['Cabine en mouvement pendant l\'intervention', 'Contrepoids en descente', 'Pied coince entre cabine et gaine', 'Travail sous le contrepoids'], 4, 2, ['Arret et condamnation de la cabine'], ['Verification double de l\'arret cabine', 'Consignation electrique avant intervention', 'Interdiction de passer sous le contrepoids', 'Procedure de mise en securite ecrite']),
      r('asc-manutention', 'Manutention (moteur, cables, portes)', 'Port de composants lourds dans des espaces exigus (local technique, gaine)', 'asc-machinerie', ['Remplacement moteur de treuil (100-200 kg)', 'Manipulation cables acier', 'Transport portes palieres en etages', 'Acces difficile (escaliers etroits)'], 3, 3, ['Palan portatif', 'Chariot pliant'], ['Palan ou treuil pour pieces lourdes', 'Acces ascenseur de service si existant', 'Manipulation a 2 personnes obligatoire', 'Gants anti-coupure pour cables acier']),
      r('asc-bruit', 'Bruit (machinerie, percage)', 'Bruit du moteur d\'ascenseur, percage en gaine, travaux de fixation', 'asc-machinerie', ['Fonctionnement moteur ancien (> 80 dB)', 'Percage en gaine (reverberation)', 'Meulage guides'], 2, 3, ['Bouchons d\'oreilles'], ['Casque antibruit EN 352 en gaine', 'Limitation duree percage continu', 'Protection auditive systematique en gaine (reverberation)']),
      r('asc-chute-plain-pied', 'Chute de plain-pied', 'Glissade sur sol de local technique, cables au sol, huile de treuil', 'asc-machinerie', ['Huile de treuil au sol', 'Cables au sol en gaine', 'Local technique encombre', 'Acces etroit fosse'], 2, 3, ['Chaussures de securite antiderapantes'], ['Nettoyage huile immediate', 'Eclairage suffisant local technique', 'Rangement cables', 'Bac de retention sous treuil']),
      r('asc-routier', 'Risque routier', 'Accidents lors des deplacements entre sites de maintenance', 'asc-vehicule', ['Tournee de maintenance (5-8 sites/jour)', 'Vehicule charge d\'outillage', 'Urgence depannage personnes bloquees'], 3, 3, ['Vehicule entretenu'], ['Planning avec temps de trajet', 'Arrimage outillage dans vehicule', 'Procedure d\'urgence (depannage personne bloquee)', 'Formation eco-conduite']),
    ],
  },

  // ── Vitrier ────────────────────────────────────────────────────
  {
    metierSlug: 'vitrier', label: 'Vitrier-Miroitier', category: 'btp_construction',
    nafCodes: ['23.12Z', '43.34Z'], idcc: '1597',
    legalReferences: ['Art. R4323-58 (hauteur)', 'Art. R4541-1 (manutention)', 'NF EN 12150 (verre trempe)'],
    workUnits: [
      wu('vit-atelier', 'Atelier decoupe / faconnage', 'Decoupe, meulage, perçage de vitrages en atelier', '1-3'),
      wu('vit-pose', 'Chantier pose', 'Pose de vitrages, miroirs, verrières sur chantier', '1-3'),
      wu('vit-hauteur', 'Travail en hauteur', 'Pose de vitrages en facade, verrieres de toiture', '1-2'),
      wu('vit-stockage', 'Stockage vitrages', 'Stockage des vitrages sur chevalets, rack', '1'),
      wu('vit-vehicule', 'Vehicule / transport', 'Transport de vitrages fragiles et lourds', '1'),
    ],
    risks: [
      r('vit-coupure', 'Coupure par verre (risque grave)', 'Laceration profonde par aretes de verre lors de la manipulation, decoupe ou casse accidentelle', 'vit-atelier', ['Decoupe de verre a la molette', 'Manipulation de vitrages bruts (aretes vives)', 'Vitrage casse accidentellement', 'Nettoyage des eclats de verre'], 3, 4, ['Gants anti-coupure EN 388 niveau 5', 'Manchettes de protection'], ['Gants EN 388 niveau F (lame) obligatoires', 'Manchettes anti-coupure bras', 'Ventouses pour manipulation (eviter contact aretes)', 'Bac de recuperation des chutes de verre', 'Kit premiers secours avec pansements compressifs']),
      r('vit-chute-hauteur', 'Chute de hauteur (pose facade)', 'Chute depuis echafaudage, nacelle ou echelle lors de la pose de vitrages en facade', 'vit-hauteur', ['Pose vitrage en etage', 'Verriere de toiture', 'Miroir en hauteur', 'Porte d\'entree vitree'], 4, 3, ['Echafaudage conforme', 'Harnais'], ['Nacelle ou echafaudage obligatoire (pas d\'echelle avec vitrage)', 'Harnais si pas de protection collective', 'Formation travail en hauteur', 'Interdiction de porter un vitrage en montant echelle']),
      r('vit-manutention', 'Manutention (vitrages lourds)', 'Port de vitrages lourds et encombrants (double vitrage 30-80 kg), miroirs grand format', 'vit-stockage', ['Dechargement camion (vitrages sur chevalet)', 'Transport interieur', 'Mise en place dans chassis', 'Basculement chevalet de stockage'], 3, 3, ['Ventouses professionnelles', 'Chariot a vitrages'], ['Ventouses a pompe pour chaque vitrage', 'Chariot specifique vitrages', 'Manutention a 2 pour double vitrage > 30 kg', 'Chevalets anti-basculement', 'Leve-vitre electrique si vitrages lourds']),
      r('vit-projection', 'Projection d\'eclats de verre', 'Projection d\'eclats de verre lors de la decoupe, du percage ou d\'une casse', 'vit-atelier', ['Decoupe de verre trempe', 'Percage de miroir', 'Eclatement de vitrage pendant la manipulation', 'Meulage des aretes'], 3, 3, ['Lunettes de protection EN 166'], ['Lunettes EN 166 obligatoires en atelier', 'Ecran facial pour meulage', 'Protection des yeux + visage si verre trempe', 'Table de decoupe avec rebords']),
      r('vit-chute-vitrage', 'Chute de vitrage sur les personnes', 'Chute d\'un vitrage manipule en hauteur sur les personnes en contrebas', 'vit-hauteur', ['Vitrage lache depuis l\'echafaudage', 'Basculement lors de la pose', 'Ventouse qui lache'], 4, 2, ['Zone d\'exclusion au sol'], ['Balisage perimetre obligatoire', 'Ventouses de qualite professionnelle verifiees', 'Elingue de securite sur vitrage pendant la pose', 'Communication radio entre equipe sol et hauteur']),
      r('vit-tms', 'TMS (postures, port charges)', 'Douleurs dos et epaules par le port de vitrages lourds et les postures de pose', 'vit-pose', ['Port de vitrage a bout de bras', 'Posture penchee pour le calage', 'Serrage prolonge des fixations'], 2, 4, ['Leve-vitre si disponible'], ['Leve-vitre electrique pour vitrages lourds', 'Ventouses ergonomiques (2 mains)', 'Rotation des postes', 'Pauses actives toutes les 2h']),
      r('vit-chimique', 'Risque chimique (mastics, nettoyants)', 'Contact cutane ou inhalation de mastic silicone, nettoyants speciaux, acides', 'vit-pose', ['Application mastic silicone', 'Nettoyage au solvant', 'Detachant acide pour pierre'], 2, 3, ['Gants nitrile', 'Ventilation naturelle'], ['Mastics et nettoyants a faible emission COV', 'Gants nitrile systématiques', 'FDS sur chantier']),
      r('vit-routier', 'Risque routier', 'Accidents lors du transport de vitrages fragiles avec vehicule equipe', 'vit-vehicule', ['Transport vitrages sur chevalet vehicule', 'Freinage brusque (vitrages glissent)', 'Chargement/dechargement bord de route'], 3, 2, ['Chevalet dans vehicule', 'Arrimage'], ['Chevalet conforme avec calage et sangles', 'Vitesse adaptee en charge', 'Stationnement securise pour dechargement', 'Formation chargement vitrages']),
    ],
  },
];
