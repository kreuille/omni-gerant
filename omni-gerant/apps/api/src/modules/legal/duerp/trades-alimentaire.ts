// BUSINESS RULE [CDC-2.4]: E2 — 15 metiers Alimentaire & Restauration
// Restaurant et Boulangerie existent deja dans risk-database-v2.ts

import type { MetierRiskProfile } from './risk-database-v2.js';

// Helpers
function r(id: string, name: string, desc: string, wuId: string, sits: string[], g: 1|2|3|4, f: 1|2|3|4, exist: string[], proposed: string[], cat: string): MetierRiskProfile['risks'][number] {
  return { id, name, description: desc, workUnitId: wuId, situations: sits, defaultGravity: g, defaultFrequency: f, existingMeasures: exist, proposedActions: proposed, category: cat as MetierRiskProfile['risks'][number]['category'] };
}

function wu(id: string, name: string, desc: string, hc: string): MetierRiskProfile['workUnits'][number] {
  return { id, name, description: desc, typicalHeadcount: hc };
}

export const ALIMENTAIRE_TRADES: MetierRiskProfile[] = [
  // ── Restauration rapide ────────────────────────────────────────
  {
    metierSlug: 'restauration-rapide', label: 'Restauration rapide (fast-food)', category: 'alimentaire_restauration',
    nafCodes: ['56.10C'], idcc: '1501',
    legalReferences: ['Reglement CE 852/2004 (HACCP)', 'Code construction ERP Type N', 'Art. R4228-20'],
    workUnits: [
      wu('rr-cuisine', 'Cuisine / friteuses / grill', 'Zone de cuisson rapide, friteuses, grills, micro-ondes', '2-6'),
      wu('rr-comptoir', 'Comptoir / caisse', 'Prise de commande, service, encaissement', '2-4'),
      wu('rr-drive', 'Drive / livraison', 'Service au drive, preparation livraison', '1-3'),
      wu('rr-reserve', 'Reserve / chambre froide', 'Stockage denrees, congelateur, chambre froide', '1'),
      wu('rr-plonge', 'Plonge / nettoyage', 'Nettoyage equipements et salle', '1-2'),
    ],
    risks: [
      r('rr-brulure', 'Brulure (friteuse, grill)', 'Brulure par huile de friteuse, plaques de grill, vapeur', 'rr-cuisine', ['Projection huile friteuse', 'Contact plaque grill 200°C', 'Vidange huile chaude', 'Vapeur micro-ondes'], 3, 4, ['Gants anti-chaleur', 'Couvercle friteuse'], ['Friteuse avec vidange securisee', 'Gants EN 407 obligatoires', 'Kit brulure accessible', 'Formation premiers secours brulure']),
      r('rr-tms-cadence', 'TMS (cadence repetitive)', 'Gestes repetitifs a haute cadence (assemblage, service)', 'rr-comptoir', ['Assemblage sandwichs en serie', 'Service en rush (50+ commandes/h)', 'Station debout prolongee', 'Mouvements repetitifs caisse'], 3, 4, ['Tapis anti-fatigue'], ['Rotation des postes toutes les 2h', 'Pause obligatoire toutes les 3h', 'Repose-pieds au comptoir', 'Organisation du rush avec renfort']),
      r('rr-glissade', 'Glissade sol gras', 'Chute sur sol rendu gras par projections d\'huile et boissons', 'rr-cuisine', ['Sol gras autour des friteuses', 'Boisson renversee en salle', 'Nettoyage en cours de service'], 2, 3, ['Chaussures antiderapantes', 'Nettoyage regulier'], ['Sol certifie R12 en cuisine', 'Raclette sol disponible a chaque poste', 'Nettoyage continu pendant le service', 'Panneau sol mouille']),
      r('rr-bruit', 'Bruit (equipements, musique)', 'Exposition au bruit des equipements de cuisine et musique d\'ambiance', 'rr-cuisine', ['Hottes d\'extraction', 'Alertes sonores commandes', 'Musique d\'ambiance forte', 'Rush avec brouhaha'], 2, 3, ['Reglage volume musique'], ['Maintenance hottes (reduction bruit)', 'Volume musique limite (70 dB max)', 'Alertes visuelles en complement sonores']),
      r('rr-chimique', 'Risque chimique (nettoyage)', 'Irritation par produits de nettoyage concentres', 'rr-plonge', ['Nettoyage friteuse (degraissant puissant)', 'Desinfection surfaces (eau de javel)', 'Melange accidentel de produits'], 2, 3, ['Gants de menage', 'Aeration'], ['Interdiction de melanger les produits (affichee)', 'Doseurs automatiques', 'FDS affichees', 'Gants nitrile obligatoires']),
      r('rr-agression', 'Agression (clients)', 'Violence verbale ou physique de clients mecontents, surtout en horaires nocturnes', 'rr-comptoir', ['Client mecontent de l\'attente', 'Horaires tardifs/nuit', 'Contestation de commande', 'Hold-up (caisse)'], 3, 2, ['Eclairage exterieur', 'Camera'], ['Procedure en cas d\'agression affichee', 'Bouton d\'alerte sous comptoir', 'Limitation encaisse en caisse', 'Formation gestion de conflits']),
      r('rr-incendie', 'Incendie (friteuse, grill)', 'Depart de feu par friteuse ou accumulation de graisse', 'rr-cuisine', ['Surchauffe friteuse', 'Graisse accumulee sur hotte', 'Court-circuit electrique'], 4, 1, ['Extincteurs', 'Couverture anti-feu'], ['Thermostat de securite sur friteuses', 'Nettoyage hotte trimestriel', 'Exercice evacuation annuel', 'Formation equipier premiere intervention']),
      r('rr-froid', 'Froid (chambre froide)', 'Exposition au froid lors des entrees repetees en chambre froide', 'rr-reserve', ['Entrees/sorties chambre froide repetees', 'Rangement congelateur (-18°C)', 'Manipulation produits congeles'], 2, 3, ['Vetements thermiques disponibles'], ['Limitation du temps en chambre froide', 'Gants thermiques grand froid', 'Alarme de securite porte chambre froide']),
    ],
  },

  // ── Restauration collective ────────────────────────────────────
  {
    metierSlug: 'restauration-collective', label: 'Restauration collective', category: 'alimentaire_restauration',
    nafCodes: ['56.29A', '56.29B'], idcc: '1266',
    legalReferences: ['Reglement CE 852/2004 (HACCP)', 'Arrete du 21/12/2009 (restauration collective)', 'Art. R4541-1 (manutention)'],
    workUnits: [
      wu('rc-cuisine', 'Cuisine centrale', 'Cuisson grands volumes (marmites 100L+), fours mixtes, sauteuses', '3-10'),
      wu('rc-legumerie', 'Legumerie / preparation', 'Epluchage, decoupe, preparation des legumes et viandes', '2-4'),
      wu('rc-plonge', 'Plonge batterie / vaisselle', 'Lavage gros materiel (marmites, plaques) et vaisselle de service', '1-3'),
      wu('rc-distribution', 'Distribution / self', 'Service en ligne, maintien en temperature, remplissage bacs', '2-4'),
      wu('rc-reserve', 'Stockage / reception', 'Reception marchandises, chambre froide, reserve seche', '1-2'),
    ],
    risks: [
      r('rc-brulure', 'Brulure (marmites, fours)', 'Brulure par marmite basculante, four mixte vapeur, bain-marie', 'rc-cuisine', ['Basculement marmite 100L', 'Ouverture four mixte (vapeur)', 'Transport bacs GN chauds', 'Eclaboussure huile grande friteuse'], 4, 3, ['Gants anti-chaleur EN 407', 'Manches longues'], ['Marmite basculante avec securite', 'Ouverture four par etapes (evacuation vapeur)', 'Chariot bain-marie pour transport', 'Kit brulure dans chaque zone']),
      r('rc-manutention', 'Manutention lourde (grands volumes)', 'Port de charges lourdes liees aux grands volumes (cagettes 20kg, marmites pleines)', 'rc-reserve', ['Reception cagettes legumes (20-30 kg)', 'Marmites pleines (50+ kg)', 'Dechargement palettes', 'Bacs GN pleins'], 3, 4, ['Chariot', 'Diable'], ['Transpalette electrique', 'Marmites sur support roulant', 'Limite 25 kg par personne', 'Formation gestes et postures (recyclage 2 ans)']),
      r('rc-coupure', 'Coupures (couteaux, machines)', 'Laceration par couteaux, coupe-legumes, trancheuse industrielle', 'rc-legumerie', ['Decoupe viande au couteau', 'Coupe-legumes industriel', 'Nettoyage trancheuse', 'Ouverture conserves grand format'], 3, 3, ['Gants anti-coupure EN 388', 'Carter machines'], ['Formation utilisation machines de coupe', 'Plan maintenance mensuel machines', 'Collecteur lames usagees', 'Tapis antiderapant plan de travail']),
      r('rc-glissade', 'Glissade sol humide', 'Chute sur sol mouille par eclaboussures, plonge, nettoyage', 'rc-plonge', ['Sol mouille en plonge', 'Eclaboussure en cuisine', 'Nettoyage sols pendant service', 'Condensation'], 2, 3, ['Chaussures antiderapantes EN 20345', 'Tapis antiderapants'], ['Sol certifie R12', 'Raclette sol a chaque poste', 'Drainage sol verifie', 'Nettoyage programme hors service']),
      r('rc-chaleur', 'Chaleur (cuisine grands volumes)', 'Temperature elevee en cuisine collective (35-45°C) liee aux equipements', 'rc-cuisine', ['Fours mixtes en fonctionnement continu', 'Marmites en ebullition', 'Ete sans climatisation', 'Hotte d\'extraction insuffisante'], 3, 3, ['Eau fraiche', 'Ventilation'], ['Plan canicule formalise', 'Extraction renforcee', 'Amenagement horaires ete', 'Pauses hydratation toutes les heures']),
      r('rc-biologique', 'Risque biologique (HACCP)', 'Contamination bacterienne des denrees, intoxication alimentaire collective', 'rc-legumerie', ['Non-respect chaine du froid', 'Contamination croisee', 'Denree perimee', 'Lavage mains insuffisant'], 3, 2, ['Protocole HACCP', 'Releve temperatures'], ['Plan de maitrise sanitaire (PMS) a jour', 'Formation HACCP obligatoire', 'Controle temperature 2x/jour', 'Lavabo commande non manuelle']),
      r('rc-bruit', 'Bruit (equipements industriels)', 'Exposition au bruit des equipements de cuisine collective (hottes, lave-vaisselle)', 'rc-plonge', ['Lave-vaisselle tunnel (> 85 dB)', 'Hotte d\'extraction', 'Batteur/petrin industriel', 'Coupe-legumes'], 2, 3, ['Bouchons d\'oreilles disponibles'], ['Maintenance preventive equipements (reduction bruit)', 'Encoffrement lave-vaisselle', 'Protection auditive en plonge']),
      r('rc-rps', 'Risques psychosociaux (cadence)', 'Stress lie a la cadence du service collectif (500-2000 repas/jour)', 'rc-distribution', ['Rush service midi (2h pour 500+ repas)', 'Effectif reduit (absences)', 'Plaintes des convives', 'Pression sur les delais'], 2, 3, ['Organisation du service', 'Planning anticipe'], ['Effectif suffisant pour le volume', 'Briefing pre-service', 'Debrief post-service hebdomadaire', 'Procedure gestion des plaintes']),
    ],
  },

  // ── Traiteur ───────────────────────────────────────────────────
  {
    metierSlug: 'traiteur', label: 'Traiteur / Organisateur de receptions', category: 'alimentaire_restauration',
    nafCodes: ['56.21Z', '10.85Z'], idcc: '1979',
    legalReferences: ['Reglement CE 852/2004 (HACCP)', 'Art. R4541-1 (manutention)', 'Art. R3312-1 (transport denrees)'],
    workUnits: [
      wu('tr-labo', 'Laboratoire de production', 'Preparation plats, patisseries, cuisson', '2-6'),
      wu('tr-conditionnement', 'Conditionnement / dressage', 'Mise en barquette, dressage plateaux, emballage', '1-3'),
      wu('tr-livraison', 'Vehicule / livraison', 'Transport des plats en vehicule refrigere', '1-3'),
      wu('tr-reception', 'Site de reception (client)', 'Installation et service sur le lieu de la reception', '2-6'),
      wu('tr-stockage', 'Stockage / chambre froide', 'Stockage matieres premieres et produits finis', '1'),
    ],
    risks: [
      r('tr-routier', 'Risque routier (livraisons)', 'Accident lors des livraisons avec vehicule refrigere charge', 'tr-livraison', ['Livraison matinale (pression horaire)', 'Vehicule charge de materiel lourd', 'Stationnement en double file', 'Fatigue (horaires etendus)'], 3, 3, ['Vehicule entretenu', 'GPS'], ['Planning livraisons avec marge de temps', 'Arrimage obligatoire du materiel', 'Formation eco-conduite', 'Interdiction telephone au volant']),
      r('tr-manutention', 'Manutention (materiel, denrees)', 'Port de materiel de reception (chafing dish, tables) et denrees en quantite', 'tr-reception', ['Dechargement materiel lourd', 'Installation buffet (tables, nappes)', 'Transport de gastro-bacs empiles', 'Monte-escaliers avec plateaux'], 3, 3, ['Chariot', 'Diable pliant'], ['Chariot pliable dans le vehicule', 'Aide manutention pour receptions > 50 couverts', 'Limite 25 kg par personne', 'Formation gestes et postures']),
      r('tr-chaine-froid', 'Rupture chaine du froid', 'Non-respect des temperatures lors du transport et de l\'attente sur site', 'tr-livraison', ['Transport > 30 min sans controle', 'Attente sur site non climatise', 'Vehicule refrigere en panne', 'Liaison chaude insuffisante'], 3, 2, ['Vehicule refrigere', 'Sonde de temperature'], ['Releve temperature depart et arrivee', 'Sonde connectee dans le vehicule', 'Bacs isothermes de secours', 'Procedure en cas de rupture (destruction)']),
      r('tr-brulure', 'Brulure (production, service)', 'Brulure lors de la production en laboratoire ou du service chaud sur site', 'tr-labo', ['Manipulation de fours', 'Service flambe', 'Rechaud chafing dish', 'Plats gratines'], 3, 3, ['Gants anti-chaleur', 'Manches longues'], ['Kit brulure en labo et dans le vehicule', 'Rechauds avec stabilisateur', 'Signalisation plats chauds']),
      r('tr-coupure', 'Coupures (couteaux, trancheuse)', 'Laceration lors de la decoupe en production ou du tranchage sur site', 'tr-labo', ['Decoupe viandes/legumes', 'Tranchage sur site de reception', 'Nettoyage couteaux'], 3, 3, ['Gants anti-coupure', 'Couteaux entretenus'], ['Trancheuse avec carter de securite', 'Rangement securise couteaux dans le vehicule', 'Formation decoupe securisee']),
      r('tr-glissade', 'Glissade (cuisine, site client)', 'Chute sur sol mouille en laboratoire ou site de reception (pelouse, parquet)', 'tr-reception', ['Sol cuisine mouille', 'Parquet cire en reception', 'Pelouse mouillee (reception exterieure)', 'Cables au sol'], 2, 3, ['Chaussures antiderapantes'], ['Tapis antiderapants dans le vehicule', 'Reperage des zones a risque sur site', 'Balisage cables alimentation']),
      r('tr-rps', 'Risques psychosociaux', 'Stress lie aux evenements (mariages, seminaires), horaires atypiques', 'tr-reception', ['Evenement unique (pas droit a l\'erreur)', 'Horaires soir et week-end', 'Client exigeant', 'Longues journees (12h+)'], 2, 3, ['Communication client en amont'], ['Fiche technique par evenement', 'Briefing equipe avant chaque prestation', 'Repos compensateur apres evenements longs']),
      r('tr-electrique', 'Risque electrique (site client)', 'Electrisation par branchement sur site client (rallonges, prises exterieures)', 'tr-reception', ['Branchement sur prises exterieures non protegees', 'Rallonges en exterieur (pluie)', 'Surcharge electrique (rechauds + eclairage)'], 3, 1, ['Rallonges conformes'], ['Rallonge avec differentiel 30mA', 'Verification prises avant branchement', 'Protection pluie pour installations exterieures']),
    ],
  },

  // ── Poissonnerie ───────────────────────────────────────────────
  {
    metierSlug: 'poissonnerie', label: 'Poissonnerie', category: 'alimentaire_restauration',
    nafCodes: ['47.23Z', '10.20Z'], idcc: '1979',
    legalReferences: ['Reglement CE 852/2004 (HACCP)', 'Reglement CE 853/2004 (produits animaux)', 'Art. R4541-1 (manutention)'],
    workUnits: [
      wu('pois-etal', 'Etal de vente', 'Presentation et vente des produits de la mer sur etal glace', '1-3'),
      wu('pois-preparation', 'Preparation / filetage', 'Filetage, ecaillage, vidage, decoupe des poissons', '1-3'),
      wu('pois-reserve', 'Reserve / chambre froide', 'Stockage poissons frais et congeles, glace', '1'),
      wu('pois-livraison', 'Reception / livraison', 'Reception marchandises (mareyage), livraison clients', '1'),
    ],
    risks: [
      r('pois-coupure', 'Coupures (couteaux, aretes)', 'Laceration par couteaux de filetage, aretes de poissons, ecailles', 'pois-preparation', ['Filetage au couteau', 'Ecaillage', 'Aretes vives de poissons', 'Ouverture huitres/coquillages'], 3, 4, ['Gants anti-coupure mailles', 'Couteaux affutes'], ['Gant mailles inox obligatoire (main de maintien)', 'Couteaux affutes regulierement', 'Formation filetage securise', 'Collecteur aretes et dechets']),
      r('pois-froid', 'Froid (etal glace, chambre froide)', 'Exposition prolongee au froid (etal a 0-2°C, chambre froide 0/-18°C)', 'pois-reserve', ['Travail sur etal glace toute la journee', 'Entrees/sorties chambre froide', 'Manipulation glace', 'Congelateur -18°C'], 3, 3, ['Vetements chauds'], ['Gants thermiques grand froid', 'Vetements thermiques fournis', 'Pauses regulieres en zone tempérée', 'Alarme securite chambre froide']),
      r('pois-glissade', 'Glissade (sol mouille, ecailles)', 'Chute sur sol rendu glissant par eau, glace fondante, ecailles, sang', 'pois-etal', ['Sol mouille autour etal', 'Ecailles au sol', 'Glace fondante', 'Sang de poisson'], 2, 4, ['Chaussures antiderapantes EN 20345', 'Tapis drainage'], ['Sol certifie R13 (tres antiderapant)', 'Drainage autour de l\'etal', 'Nettoyage continu pendant la vente', 'Raclette sol disponible']),
      r('pois-biologique', 'Risque biologique (bacterien)', 'Contamination bacterienne (listeria, salmonella) des produits de la mer', 'pois-preparation', ['Non-respect chaine du froid', 'Contamination croisee cru/cuit', 'Lavage mains insuffisant', 'Dechets non evacues'], 3, 2, ['Protocole HACCP', 'Releve temperatures'], ['PMS a jour', 'Formation HACCP', 'Lavage mains entre chaque poisson', 'Evacuation dechets toutes les 2h']),
      r('pois-tms', 'TMS (station debout, repetitions)', 'Douleurs dos et jambes par station debout prolongee et gestes repetitifs', 'pois-etal', ['Station debout 8h', 'Gestes repetitifs de decoupe', 'Penche sur l\'etal', 'Port de caisses de poisson'], 2, 4, ['Tapis anti-fatigue'], ['Tapis anti-fatigue au poste', 'Tabouret assis-debout si possible', 'Rotation taches etal/preparation', 'Pauses actives']),
      r('pois-manutention', 'Manutention (caisses, glace)', 'Port de caisses de poissons (15-25 kg), sacs de glace', 'pois-livraison', ['Reception caisses maree (20 kg)', 'Manipulation sacs de glace (25 kg)', 'Transport caisses dans chambre froide'], 3, 3, ['Diable'], ['Chariot inox roulant', 'Limite 15 kg par caisse', 'Diable inox pour chambre froide', 'Formation gestes et postures']),
      r('pois-chimique', 'Risque chimique (nettoyage)', 'Irritation par produits de desinfection concentres (eau de javel, detergents)', 'pois-etal', ['Desinfection quotidienne de l\'etal', 'Nettoyage chambre froide', 'Produits non dilues'], 2, 3, ['Gants de menage', 'Aeration'], ['Doseurs automatiques', 'FDS affichees', 'Gants nitrile obligatoires pour nettoyage', 'Interdiction melange produits']),
      r('pois-allergie', 'Allergie (contact poissons, crustaces)', 'Dermatite de contact, allergie aux proteines de poissons/crustaces', 'pois-preparation', ['Contact prolonge avec le poisson', 'Manipulation crustaces', 'Inhalation vapeurs de cuisson'], 2, 2, ['Gants latex ou nitrile'], ['Gants nitrile (pas latex, allergisant)', 'Creme protectrice mains', 'Lavage mains regulier', 'Suivi dermatologique si symptomes']),
    ],
  },

  // ── Chocolaterie-Confiserie ────────────────────────────────────
  {
    metierSlug: 'chocolaterie', label: 'Chocolaterie-Confiserie', category: 'alimentaire_restauration',
    nafCodes: ['10.82Z', '47.24Z'], idcc: '1286',
    legalReferences: ['Reglement CE 852/2004 (HACCP)', 'Decrets ATEX 2002-1553 (poussieres cacao)', 'Art. R4222-1 (ventilation)'],
    workUnits: [
      wu('choc-labo', 'Laboratoire chocolat / confiserie', 'Temperage, moulage, enrobage, confisage', '1-4'),
      wu('choc-cuisson', 'Cuisson sucre / caramel', 'Cuisson sucre a haute temperature (> 160°C), caramelisation', '1-2'),
      wu('choc-boutique', 'Boutique / vente', 'Vente au public, emballage, conseil', '1-3'),
      wu('choc-stockage', 'Stockage / reserve', 'Stockage cacao, sucre, produits finis, chambre tempérée', '1'),
    ],
    risks: [
      r('choc-brulure', 'Brulure (sucre cuit > 160°C)', 'Brulure grave par sucre en fusion, caramel, chocolat fondu, four', 'choc-cuisson', ['Coulage de sucre en fusion', 'Eclaboussure de caramel', 'Contact avec moule chaud', 'Soufflage de sucre'], 3, 3, ['Gants anti-chaleur EN 407', 'Manches longues'], ['Thermometre sur chaque poste de cuisson', 'Bac d\'eau froide a proximite', 'Kit brulure specialise (brulure sucre)', 'Zone de coulage degagee et stable']),
      r('choc-atex', 'ATEX (poussieres cacao, sucre)', 'Risque d\'explosion par poussieres de cacao, sucre glace, fecule en suspension', 'choc-stockage', ['Versement de cacao en poudre', 'Tamisage de sucre glace', 'Nettoyage a sec (nuage de poussieres)', 'Accumulation dans le silo'], 4, 1, ['Ventilation', 'Interdiction de fumer'], ['Aspiration a la source lors du versement', 'Nettoyage humide (pas de soufflette)', 'Installations electriques ATEX en zone stockage', 'Interdiction flamme nue en zone poussiereuse']),
      r('choc-tms', 'TMS (temperage, repetitions)', 'Douleurs poignets et epaules par gestes repetitifs de temperage et moulage', 'choc-labo', ['Temperage au marbre (geste repetitif)', 'Moulage en serie', 'Enrobage a la fourchette', 'Trempage bonbons'], 2, 4, ['Etabli a hauteur reglable'], ['Trempeuse mecanique si volumes importants', 'Alternance taches', 'Pauses actives toutes les 2h', 'Table de travail a bonne hauteur']),
      r('choc-chimique', 'Risque chimique (aromes, colorants)', 'Irritation par aromes concentres, colorants alimentaires, alcool de nettoyage', 'choc-labo', ['Manipulation d\'aromes concentres', 'Colorants alimentaires (contact peau)', 'Nettoyage a l\'alcool alimentaire'], 2, 2, ['Gants alimentaires'], ['Ventilation du laboratoire', 'Gants nitrile pour aromes concentres', 'FDS disponibles']),
      r('choc-glissade', 'Glissade (sol gras, sucre)', 'Chute sur sol rendu glissant par chocolat, sucre, eau', 'choc-labo', ['Eclaboussure de chocolat au sol', 'Sucre renverse', 'Sol mouille apres nettoyage'], 2, 3, ['Chaussures antiderapantes'], ['Nettoyage immediat des eclaboussures', 'Sol antiderapant certifie R11', 'Eclairage suffisant']),
      r('choc-manutention', 'Manutention (sacs, moules)', 'Port de sacs de sucre/cacao (25 kg), moules lourds, bacs de preparation', 'choc-stockage', ['Sacs de sucre 25 kg', 'Sacs de couverture chocolat 5-25 kg', 'Transport de moules empiles'], 2, 3, ['Diable'], ['Sacs 10 kg maximum si possible', 'Chariot a niveaux', 'Stockage a hauteur de travail']),
      r('choc-incendie', 'Incendie (cuisson sucre, gaz)', 'Depart de feu par cuisson de sucre ou equipements gaz', 'choc-cuisson', ['Surchauffe de sucre (flamme)', 'Fuite de gaz', 'Torche de cuisine'], 3, 1, ['Extincteurs', 'Couverture anti-feu'], ['Thermostat de securite sur chaque feu', 'Couverture anti-feu au poste cuisson', 'Detection gaz dans le laboratoire', 'Exercice evacuation annuel']),
      r('choc-allergie', 'Allergie (cacao, fruits a coque)', 'Allergie cutanee ou respiratoire au cacao, noisettes, amandes', 'choc-labo', ['Manipulation cacao en poudre', 'Concassage fruits a coque', 'Inhalation poussieres amande'], 2, 2, ['Masque FFP2 si sensibilise'], ['Suivi medical des allergies', 'Aspiration lors du versement de poudres', 'Gants nitrile']),
    ],
  },

  // ── Commerce alimentaire de proximite ──────────────────────────
  {
    metierSlug: 'commerce-alimentaire', label: 'Commerce alimentaire de proximite', category: 'alimentaire_restauration',
    nafCodes: ['47.11A', '47.11B', '47.11C'], idcc: '2216',
    legalReferences: ['Reglement CE 852/2004 (HACCP)', 'Art. R4541-1 (manutention)', 'Art. R4228-20'],
    workUnits: [
      wu('ca-vente', 'Surface de vente', 'Mise en rayon, conseil client, encaissement', '1-4'),
      wu('ca-reserve', 'Reserve / chambre froide', 'Stockage, reception marchandises, chambre froide', '1-2'),
      wu('ca-caisse', 'Caisse / accueil', 'Encaissement, gestion caisse, accueil client', '1-2'),
      wu('ca-traiteur', 'Rayon coupe / traiteur', 'Coupe charcuterie, fromage, preparation traiteur', '1-2'),
    ],
    risks: [
      r('ca-manutention', 'Manutention (caisses, palettes)', 'Port de caisses de marchandises, mise en rayon repetitive', 'ca-reserve', ['Reception livraisons (caisses 10-20 kg)', 'Mise en rayon (gestes repetitifs)', 'Rangement reserve', 'Manipulation caisses de boissons'], 3, 4, ['Diable', 'Transpalette'], ['Transpalette manuel', 'Limite 15 kg par colis', 'Formation gestes et postures', 'Rotation mise en rayon/caisse']),
      r('ca-agression', 'Agression (vol, hold-up)', 'Violence verbale ou physique lors de vol, braquage ou conflit client', 'ca-caisse', ['Vol a l\'etalage (confrontation)', 'Hold-up (caisse)', 'Client agressif', 'Horaires tardifs'], 3, 2, ['Camera de surveillance', 'Eclairage'], ['Bouton d\'alerte discret', 'Limitation encaisse', 'Formation gestion de conflits', 'Procedure en cas de braquage (ne pas resister)']),
      r('ca-froid', 'Froid (chambre froide)', 'Exposition au froid lors du rangement en chambre froide positive et negative', 'ca-reserve', ['Rangement chambre froide positive (2-4°C)', 'Chambre froide negative (-18°C)', 'Entrees/sorties repetees'], 2, 3, ['Vetements thermiques'], ['Gants thermiques grand froid', 'Limitation temps en chambre froide', 'Alarme securite porte', 'Degel regulier des sols']),
      r('ca-coupure', 'Coupures (rayon coupe)', 'Coupure par trancheuse, couteau lors de la coupe charcuterie/fromage', 'ca-traiteur', ['Trancheuse a jambon', 'Couteaux de coupe', 'Ouverture cartons au cutter'], 3, 3, ['Gants anti-coupure mailles', 'Carter trancheuse'], ['Gant mailles inox obligatoire', 'Trancheuse avec carter auto-fermeture', 'Formation utilisation trancheuse', 'Cutter a lame retractable pour cartons']),
      r('ca-tms', 'TMS (caisse, mise en rayon)', 'Douleurs poignets, dos et epaules par gestes repetitifs en caisse et mise en rayon', 'ca-caisse', ['Scanner repetitif en caisse', 'Mise en rayon (bras leves)', 'Station debout prolongee', 'Port de packs de boissons'], 2, 3, ['Repose-pieds en caisse', 'Siege caissier'], ['Siege assis-debout en caisse', 'Tapis anti-fatigue', 'Rotation caisse/rayon', 'Escabeau pour mise en rayon haute']),
      r('ca-glissade', 'Glissade / chute', 'Chute sur sol mouille, encombre, ou en reserve (sol inegal)', 'ca-vente', ['Sol mouille apres nettoyage', 'Cartons au sol en reserve', 'Escabeau pour rayons hauts', 'Eclairage insuffisant reserve'], 2, 3, ['Chaussures fermees'], ['Signalisation sol mouille', 'Rangement continu des cartons', 'Eclairage suffisant en reserve', 'Escabeau conforme avec marche-pied']),
      r('ca-biologique', 'Risque biologique (HACCP)', 'Contamination des denrees alimentaires, intoxication', 'ca-traiteur', ['Non-respect chaine du froid', 'Manipulation denrees perimeees', 'Contamination croisee rayon coupe'], 3, 1, ['Releve temperatures', 'HACCP'], ['PMS a jour', 'Formation HACCP personnel rayon coupe', 'Retrait produits perimes quotidien', 'Thermometre de controle']),
      r('ca-electrique', 'Risque electrique', 'Contact avec installations electriques defectueuses (meubles froids, eclairage)', 'ca-vente', ['Meuble refrigere defectueux', 'Prise endommagee en reserve', 'Eclairage defaillant'], 3, 1, ['Differentiel 30mA'], ['Verification electrique annuelle', 'Remplacement immediat prises defectueuses', 'Signalisation armoire electrique']),
    ],
  },

  // ── Commerce alimentaire de gros ───────────────────────────────
  {
    metierSlug: 'commerce-alimentaire-gros', label: 'Commerce alimentaire de gros', category: 'alimentaire_restauration',
    nafCodes: ['46.31Z', '46.32Z', '46.33Z', '46.34Z', '46.36Z', '46.37Z', '46.38Z', '46.39A'], idcc: '2216',
    legalReferences: ['Art. R4541-1 (manutention)', 'CACES R489 (chariots)', 'Reglement CE 852/2004 (HACCP)'],
    workUnits: [
      wu('cag-entrepot', 'Entrepot / stockage', 'Stockage palettes, preparation de commandes, inventaire', '3-10'),
      wu('cag-quai', 'Quai de chargement', 'Reception et expedition des marchandises, chargement camions', '2-4'),
      wu('cag-froid', 'Chambre froide / congelateur', 'Stockage produits frais et congeles en chambre froide', '1-3'),
      wu('cag-bureau', 'Bureau / commercial', 'Administration, prises de commandes, gestion', '1-3'),
    ],
    risks: [
      r('cag-chariot', 'Ecrasement (chariot elevateur)', 'Heurt ou ecrasement par chariot elevateur en circulation dans l\'entrepot', 'cag-entrepot', ['Chariot en manoeuvre entre les racks', 'Croisement chariot/pieton', 'Recul sans visibilite', 'Chute de palette depuis fourches'], 4, 3, ['CACES obligatoire', 'Gilet haute visibilite'], ['Separation zones pietons/chariots (marquage sol)', 'Miroirs aux intersections', 'Chariot avec avertisseur sonore et lumineux', 'Formation CACES R489 (recyclage 5 ans)', 'Vitesse limitee a 10 km/h']),
      r('cag-manutention', 'Manutention lourde (palettes)', 'Port de colis lourds, preparation de commandes, manipulation de palettes', 'cag-entrepot', ['Preparation de commandes (picking)', 'Depalettisation manuelle', 'Port de cartons (5-25 kg) repetitif', 'Reconditionnement de palettes'], 3, 4, ['Transpalette', 'Diable'], ['Transpalette electrique', 'Table de preparation a hauteur reglable', 'Limite 15 kg par colis', 'Rotation des preparateurs', 'Formation gestes et postures']),
      r('cag-chute-rack', 'Chute de marchandises (rack)', 'Chute de palette ou cartons depuis un rack de stockage en hauteur', 'cag-entrepot', ['Palette mal calée sur rack', 'Heurt de rack par chariot', 'Rack surcharge', 'Film palette deteriore'], 4, 2, ['Racks conformes et verifies', 'Casque si zone haute'], ['Verification annuelle des racks (organisme agree)', 'Protections de pieds de rack', 'Filmage correct des palettes', 'Signalisation charge max par niveau', 'Interdiction de passer sous une charge en levage']),
      r('cag-froid', 'Froid intense (chambre froide negative)', 'Exposition au froid intense en chambre froide negative (-18 a -25°C)', 'cag-froid', ['Travail prolonge en chambre froide negative', 'Entrees/sorties repetees', 'Sol verglace en chambre froide', 'Porte bloquee'], 3, 3, ['Vetements grand froid', 'Gants thermiques'], ['Limitation du temps en chambre froide negative (30 min max)', 'Alarme de securite interieure', 'Degel programme des sols', 'Vetements grand froid complets fournis', 'Pauses en zone temperee obligatoires']),
      r('cag-chute', 'Chute de plain-pied', 'Glissade ou trebuchement dans l\'entrepot (film palette au sol, sol mouille)', 'cag-quai', ['Film etirable au sol', 'Sol mouille sur quai (pluie)', 'Palettes au sol', 'Eclairage insuffisant'], 2, 3, ['Chaussures securite S3', 'Eclairage'], ['Nettoyage continu des allees', 'Eclairage suffisant (200 lux)', 'Marquage au sol des zones de circulation', 'Chaussures antiderapantes obligatoires']),
      r('cag-routier', 'Risque routier (livraisons)', 'Accident lors des livraisons avec poids lourd ou vehicule utilitaire', 'cag-quai', ['Manoeuvre camion sur quai', 'Livraison en ville (gabarit)', 'Fatigue (horaires matinaux)', 'Chargement desequilibre'], 3, 2, ['Cales de roue', 'Eclairage quai'], ['Procedure de mise a quai (calage, eclairage)', 'Controle repartition charge', 'Formation livraison en milieu urbain']),
      r('cag-bruit', 'Bruit (chariots, quai)', 'Exposition au bruit des chariots elevateurs, camions et installations frigorifiques', 'cag-entrepot', ['Chariots en fonctionnement', 'Camions en dechargement', 'Compresseurs chambre froide', 'Transpalettes electriques'], 2, 3, ['Bouchons disponibles'], ['Casque antibruit en zone frigorifique', 'Maintenance compresseurs (reduction bruit)', 'Chariots electriques (moins bruyants)']),
      r('cag-rps', 'Risques psychosociaux', 'Stress lie a la pression des delais de livraison, cadence de preparation', 'cag-bureau', ['Rush de preparation matin', 'Reclamations clients', 'Erreurs de preparation', 'Inventaire sous pression'], 2, 2, ['Organisation planifiee'], ['Effectif suffisant en pic', 'Objectifs de preparation realistes', 'Communication transparente sur les contraintes']),
    ],
  },

  // ── Cuisine collective ─────────────────────────────────────────
  {
    metierSlug: 'cuisine-collective', label: 'Cuisine collective (cantine, hopital)', category: 'alimentaire_restauration',
    nafCodes: ['56.29A'], idcc: '1266',
    legalReferences: ['Reglement CE 852/2004 (HACCP)', 'Arrete du 21/12/2009', 'Art. R4541-1 (manutention)'],
    workUnits: [
      wu('cc-cuisine', 'Cuisine de production', 'Cuisson en grands volumes, marmites, fours mixtes', '3-10'),
      wu('cc-preparation', 'Preparation froide', 'Preparation entrees, salades, desserts', '2-4'),
      wu('cc-plonge', 'Plonge batterie', 'Lavage gros materiel, bacs GN, marmites', '1-2'),
      wu('cc-service', 'Service / distribution', 'Service en ligne, allotissement, transport de repas', '2-4'),
      wu('cc-stockage', 'Reception / stockage', 'Reception marchandises, chambre froide', '1'),
    ],
    risks: [
      r('cc-brulure', 'Brulure (marmites, fours mixtes)', 'Brulure par marmite basculante, four mixte vapeur, bacs GN chauds', 'cc-cuisine', ['Basculement marmite 200L', 'Ouverture four mixte (jet vapeur)', 'Transport bacs GN brulants', 'Eclaboussure friteuse'], 4, 3, ['Gants anti-chaleur EN 407'], ['Marmite avec verrou de securite', 'Chariot bain-marie pour transport', 'Kit brulure au mur cuisine', 'Ouverture four par etapes']),
      r('cc-manutention', 'Manutention (volumes importants)', 'Port de charges liees aux grands volumes de production', 'cc-stockage', ['Reception palettes (cagettes 20-30 kg)', 'Deplacement marmites pleines', 'Empilage bacs GN', 'Sacs de legumes epluches'], 3, 4, ['Chariot', 'Transpalette'], ['Marmites sur support roulant', 'Transpalette electrique', 'Limite 25 kg', 'Table de travail a bonne hauteur']),
      r('cc-glissade', 'Glissade sol mouille', 'Chute sur sol mouille par eclaboussures de cuisson, plonge, condensation', 'cc-plonge', ['Sol plonge mouille en permanence', 'Eclaboussure cuisine', 'Condensation apres nettoyage', 'Graisse au sol'], 2, 4, ['Chaussures antiderapantes'], ['Sol certifie R12', 'Drainage efficace', 'Raclette sol a chaque poste', 'Nettoyage continu']),
      r('cc-coupure', 'Coupures (machines de coupe)', 'Laceration par coupe-legumes industriel, trancheuse, couteaux', 'cc-preparation', ['Coupe-legumes industriel', 'Trancheuse', 'Couteaux en serie', 'Nettoyage machines de coupe'], 3, 3, ['Gants mailles inox', 'Carter machines'], ['Formation specifique machines', 'Maintenance mensuelle', 'Gant mailles obligatoire', 'Carter auto-fermant']),
      r('cc-chaleur', 'Chaleur (cuisine industrielle)', 'Temperature elevee en cuisine de production (35-45°C)', 'cc-cuisine', ['Fours mixtes en continu', 'Marmites en ebullition', 'Extraction insuffisante', 'Ete sans climatisation'], 3, 3, ['Eau fraiche', 'Ventilation'], ['Extraction renforcee', 'Plan canicule', 'Pauses hydratation', 'Amenagement horaires ete']),
      r('cc-biologique', 'Risque biologique (TIAC)', 'Toxi-infection alimentaire collective (TIAC) par contamination bacterienne', 'cc-preparation', ['Non-respect temperatures', 'Contamination croisee', 'Delai entre production et service', 'Personnel malade en cuisine'], 4, 1, ['HACCP', 'Controles temperatures'], ['PMS a jour', 'Analyses microbiologiques mensuelles', 'Plats temoins conserves 5 jours', 'Formation HACCP recyclage 2 ans']),
      r('cc-bruit', 'Bruit (equipements)', 'Bruit des equipements industriels (lave-vaisselle tunnel, hottes, machines)', 'cc-plonge', ['Lave-vaisselle tunnel (> 85 dB)', 'Hottes extraction', 'Machines de coupe', 'Batteur industriel'], 2, 3, ['Bouchons disponibles'], ['Protection auditive en plonge', 'Encoffrement lave-vaisselle', 'Maintenance preventive']),
      r('cc-rps', 'Risques psychosociaux', 'Stress de la cadence service (500-2000 repas/jour), effectif reduit', 'cc-service', ['Rush midi', 'Absences non remplacees', 'Plaintes convives', 'Pression horaires'], 2, 3, ['Planning anticipe'], ['Effectif adapte au volume', 'Briefing pre-service', 'Communication bienveillante']),
    ],
  },

  // ── Bar-Cafe ───────────────────────────────────────────────────
  {
    metierSlug: 'bar-cafe', label: 'Bar / Cafe', category: 'alimentaire_restauration',
    nafCodes: ['56.30Z'], idcc: '1979',
    legalReferences: ['CCN HCR', 'Art. R4228-20 (boissons alcoolisees)', 'Code construction ERP Type N'],
    workUnits: [
      wu('bar-comptoir', 'Comptoir / bar', 'Service boissons, preparation cocktails, tireuse', '1-3'),
      wu('bar-salle', 'Salle / terrasse', 'Service en salle et terrasse, debarrassage', '1-3'),
      wu('bar-reserve', 'Reserve / cave', 'Stockage boissons, futs, bouteilles', '1'),
      wu('bar-cuisine', 'Snacking / cuisine simplifiee', 'Preparation snacking, plancha, micro-ondes', '0-1'),
    ],
    risks: [
      r('bar-agression', 'Agression (clients alcoolises)', 'Violence verbale ou physique de clients sous l\'emprise de l\'alcool', 'bar-salle', ['Client alcoolise agressif', 'Refus de service d\'alcool', 'Fermeture tardive', 'Altercation entre clients'], 3, 3, ['Droit de refus de servir', 'Eclairage'], ['Formation gestion de conflits', 'Procedure d\'appel forces de l\'ordre', 'Affichage "ivresse = refus de service"', 'Videur si horaires tardifs', 'Camera de surveillance']),
      r('bar-tms', 'TMS (station debout, port futs)', 'Douleurs dos et jambes par station debout prolongee et manipulation de futs', 'bar-comptoir', ['Station debout 8-12h', 'Port de futs (20-30 kg)', 'Gestes repetitifs (tireuse)', 'Posture penchee derriere le bar'], 3, 3, ['Tapis anti-fatigue'], ['Tapis anti-fatigue derriere le bar', 'Diable pour futs', 'Pauses assises regulieres', 'Chaussures confort']),
      r('bar-glissade', 'Glissade (sol mouille, verre casse)', 'Chute sur sol mouille par boissons renversees ou eclats de verre', 'bar-salle', ['Boisson renversee au sol', 'Verre casse en salle', 'Sol terrasse mouille (pluie)', 'Nettoyage en cours de service'], 2, 3, ['Chaussures antiderapantes'], ['Nettoyage immediat des liquides', 'Pelle et balayette derriere le bar', 'Sol antiderapant', 'Eclairage suffisant']),
      r('bar-bruit', 'Bruit (musique, ambiance)', 'Exposition au bruit de la musique d\'ambiance, clients, equipements', 'bar-salle', ['Musique d\'ambiance forte', 'Soiree musicale', 'Brouhaha clients', 'Tireuse a biere'], 2, 3, ['Reglage volume'], ['Limiteur de volume automatique', 'Bouchons moules pour le personnel', 'Insonorisation partielle', 'Audiogramme pour personnel expose']),
      r('bar-coupure', 'Coupures (verre casse, couteaux)', 'Coupure par verre casse, couteau de bar (citrons), tire-bouchon', 'bar-comptoir', ['Verre casse pendant le service', 'Decoupe citrons/garnishes', 'Ouvre-bouteille', 'Manipulation de verres empiles'], 2, 3, ['Pelle a verre', 'Gants si ramassage verre'], ['Bac a verre casse securise', 'Couteau de bar avec garde', 'Ramassage verre avec gants obligatoire', 'Trousse premiers secours']),
      r('bar-manutention', 'Manutention (futs, caisses)', 'Port de futs de biere (20-30 kg), caisses de bouteilles, glacieres', 'bar-reserve', ['Reception futs (20-30 kg)', 'Caisses de bouteilles', 'Approvisionnement cave en sous-sol', 'Glaciere pour terrasse'], 3, 3, ['Diable'], ['Diable a futs', 'Livraison au niveau du bar (pas d\'escalier)', 'Limite 25 kg par personne', 'Aide mecanique pour cave']),
      r('bar-electrique', 'Risque electrique (equipements bar)', 'Contact avec equipements electriques en milieu humide (tireuse, lave-verres)', 'bar-comptoir', ['Tireuse a biere (eau + electricite)', 'Lave-verres', 'Machine a cafe', 'Eclairage defectueux'], 3, 1, ['Differentiel 30mA'], ['Verification electrique annuelle', 'Raccordement conforme des equipements', 'Remplacement immediat prises defectueuses']),
      r('bar-incendie', 'Incendie', 'Depart de feu par installations electriques, flambage, stockage alcool', 'bar-reserve', ['Court-circuit (equipements humides)', 'Stockage alcool fort', 'Flambage cocktails'], 4, 1, ['Extincteurs', 'Issues de secours'], ['Exercice evacuation annuel', 'Extincteur adapte (CO2 pour electrique)', 'Limitation stock alcool fort', 'Detection incendie']),
    ],
  },

  // ── Bar-Tabac ──────────────────────────────────────────────────
  {
    metierSlug: 'bar-tabac', label: 'Bar-Tabac / Bureau de tabac', category: 'alimentaire_restauration',
    nafCodes: ['47.26Z', '56.30Z'], idcc: '1979',
    legalReferences: ['CCN HCR', 'Code des debits de boissons', 'Art. R3512-2 (interdiction de fumer)'],
    workUnits: [
      wu('bt-comptoir', 'Comptoir tabac / presse', 'Vente tabac, presse, jeux, encaissement', '1-2'),
      wu('bt-bar', 'Bar / service', 'Service boissons, snacking', '1-2'),
      wu('bt-reserve', 'Reserve / coffre', 'Stockage tabac, presse, tresorerie', '1'),
      wu('bt-terrasse', 'Terrasse fumeurs', 'Terrasse exterieure avec espace fumeurs', '0-1'),
    ],
    risks: [
      r('bt-agression', 'Agression / hold-up', 'Risque eleve de braquage (tresorerie importante, tabac, jeux)', 'bt-comptoir', ['Hold-up (caisse + stock tabac)', 'Vol a l\'etalage (cartouches)', 'Client agressif (refus de vente)', 'Horaires matinaux (ouverture seul)'], 3, 3, ['Camera de surveillance', 'Coffre-fort'], ['Bouton d\'alerte silencieux', 'Coffre temporise a ouverture differee', 'Limitation encaisse en caisse', 'Vitre de protection au comptoir tabac', 'Formation reaction en cas de braquage']),
      r('bt-tabagisme', 'Tabagisme passif (terrasse)', 'Exposition aux fumees de tabac sur la terrasse fumeurs', 'bt-terrasse', ['Service en terrasse fumeurs', 'Nettoyage terrasse (megots)', 'Courant d\'air ramenant la fumee a l\'interieur'], 2, 3, ['Terrasse ventilee'], ['Limitation du temps de service en terrasse fumeurs', 'Separation physique terrasse/interieur', 'Ventilation naturelle renforcee', 'Suivi medical renforce si exposition reguliere']),
      r('bt-tms', 'TMS (station debout, repetitions)', 'Douleurs par station debout prolongee et gestes repetitifs de vente', 'bt-comptoir', ['Station debout 10h+', 'Gestes repetitifs (caisse, tabac)', 'Posture penchee (rayonnage tabac bas)', 'Port de cartons presse'], 2, 3, ['Tapis anti-fatigue'], ['Tabouret assis-debout', 'Tapis anti-fatigue', 'Rayonnage a hauteur ergonomique', 'Pauses regulieres']),
      r('bt-manutention', 'Manutention (cartons presse, tabac)', 'Port de cartons de journaux et revues (lourds en debut de journee)', 'bt-reserve', ['Reception quotidienne presse (tot le matin)', 'Cartons de cartouches', 'Reapprovisionnement tabac', 'Boissons pour le bar'], 2, 3, ['Diable'], ['Diable pliable', 'Reception a hauteur de travail', 'Livraison a horaire raisonnable si possible']),
      r('bt-routier', 'Risque routier', 'Accidents lors des trajets matinaux (approvisionnement presse)', 'bt-reserve', ['Trajet matinal tres tot (5-6h)', 'Fatigue liee aux horaires', 'Conditions meteo hivernales'], 3, 2, ['Vehicule entretenu'], ['Horaires de livraison presse adaptes', 'Temps de trajet securise', 'Vigilance fatigue (horaires matinaux)']),
      r('bt-incendie', 'Incendie (stock papier, tabac)', 'Risque d\'incendie lie au stockage de papier (presse) et tabac', 'bt-reserve', ['Stock de journaux et magazines', 'Cartouches de tabac', 'Installations electriques anciennes'], 3, 1, ['Extincteurs', 'Detection incendie'], ['Stockage separe tabac/presse', 'Verification electrique annuelle', 'Detection incendie en reserve', 'Exercice evacuation']),
      r('bt-glissade', 'Glissade / chute', 'Chute sur sol mouille ou encombre (terrasse, reserve)', 'bt-bar', ['Sol terrasse mouille', 'Reserve encombree de cartons', 'Sol bar mouille'], 2, 2, ['Chaussures antiderapantes'], ['Nettoyage regulier terrasse', 'Rangement reserve quotidien', 'Eclairage suffisant']),
      r('bt-rps', 'Risques psychosociaux', 'Stress lie aux horaires etendus, isolement, risque de braquage', 'bt-comptoir', ['Ouverture seul tot le matin', 'Amplitude horaire importante (14h+)', 'Stress post-braquage', 'Pression objectifs jeux'], 3, 2, ['Communication', 'Support psy'], ['Procedure travailleur isole (matin)', 'Soutien psychologique apres incident', 'Horaires raisonnables', 'Renfort personnel aux heures de pointe']),
    ],
  },

  // ── Brasserie artisanale ───────────────────────────────────────
  {
    metierSlug: 'brasserie-artisanale', label: 'Brasserie artisanale', category: 'alimentaire_restauration',
    nafCodes: ['11.05Z'], idcc: '1513',
    legalReferences: ['Directive ATEX 1999/92/CE', 'Art. R4222-1 (ventilation)', 'Art. R4412-1 (chimique)'],
    workUnits: [
      wu('bra-brassage', 'Salle de brassage', 'Empâtage, filtration, ebullition dans les cuves', '1-3'),
      wu('bra-fermentation', 'Cave de fermentation / garde', 'Cuves de fermentation, maturation, controle', '1-2'),
      wu('bra-conditionnement', 'Conditionnement / embouteillage', 'Mise en bouteille, canette, fut', '1-3'),
      wu('bra-nettoyage', 'Nettoyage / CIP', 'Nettoyage des cuves, tuyaux, equipements (soude, acide)', '1-2'),
      wu('bra-stockage', 'Stockage / expedition', 'Stockage matieres premieres (malt, houblon) et produits finis', '1'),
    ],
    risks: [
      r('bra-chimique', 'Risque chimique (soude, acide)', 'Brulure chimique par soude caustique ou acide phosphorique lors du nettoyage CIP', 'bra-nettoyage', ['Manipulation soude caustique concentree', 'Acide phosphorique pour detartrage', 'Eclaboussure lors du raccordement', 'Melange accidentel soude/acide'], 4, 3, ['Gants chimiques', 'Lunettes'], ['Gants nitrile longs obligatoires', 'Lunettes etanches EN 166', 'Tablier chimique', 'Douche de securite et rince-oeil dans la salle', 'FDS affichees', 'Formation manipulation produits chimiques']),
      r('bra-co2', 'Asphyxie CO2 (fermentation)', 'Risque d\'asphyxie par CO2 degage par la fermentation dans la cave', 'bra-fermentation', ['Entree en cave de fermentation', 'Fermentation active (degagement CO2)', 'Cave mal ventilee', 'Travail seul en cave'], 4, 2, ['Ventilation cave', 'Detecteur CO2'], ['Detecteur CO2 fixe avec alarme sonore', 'Ventilation forcee de la cave', 'Interdiction de travailler seul en cave', 'Procedure d\'entree en espace confine', 'Affichage risque CO2']),
      r('bra-brulure', 'Brulure (mout, vapeur)', 'Brulure par mout en ebullition (100°C), vapeur, eau chaude de nettoyage', 'bra-brassage', ['Ebullition du mout', 'Vapeur lors de l\'ouverture des cuves', 'Raccord de tuyaux d\'eau chaude', 'Contact cuve chaude'], 3, 3, ['Gants anti-chaleur', 'Manches longues'], ['Signalisation cuves chaudes', 'Gants EN 407 a proximite', 'Tuyaux avec raccords securises', 'Kit brulure dans la salle de brassage']),
      r('bra-manutention', 'Manutention (futs, sacs de malt)', 'Port de futs pleins (20-50 kg), sacs de malt (25 kg), caisses de bouteilles', 'bra-stockage', ['Sacs de malt 25 kg', 'Futs inox pleins (50 kg)', 'Caisses de bouteilles pleines', 'Dechargement palette houblon'], 3, 3, ['Diable a futs', 'Transpalette'], ['Silo a malt avec vis sans fin', 'Leve-futs electrique', 'Limite 25 kg port manuel', 'Formation gestes et postures']),
      r('bra-glissade', 'Glissade (sol mouille)', 'Chute sur sol constamment mouille par les operations de brassage et nettoyage', 'bra-brassage', ['Sol mouille en permanence', 'Mousse de biere', 'Ecoulement nettoyage CIP', 'Condensation'], 2, 4, ['Chaussures antiderapantes', 'Tapis drainage'], ['Sol certifie R13 (tres antiderapant)', 'Drainage sol efficace', 'Bottes securite antiderapantes obligatoires', 'Raclette sol disponible']),
      r('bra-espace-confine', 'Espace confine (cuves)', 'Risque d\'asphyxie ou de chute lors de l\'entree dans les cuves pour nettoyage', 'bra-fermentation', ['Nettoyage interieur de cuve', 'Inspection visuelle', 'Remplacement de joint'], 4, 1, ['Ventilation avant entree'], ['Procedure d\'entree en espace confine ecrite', 'Detection atmosphere avant entree', 'Surveillance exterieure obligatoire', 'Harnais de sauvetage', 'Formation espace confine']),
      r('bra-bruit', 'Bruit (embouteillage, compresseur)', 'Bruit de la ligne d\'embouteillage, compresseur frigorifique, pompes', 'bra-conditionnement', ['Ligne d\'embouteillage', 'Compresseur frigorifique', 'Pompes de transfert', 'Encapsulatrice'], 2, 3, ['Bouchons d\'oreilles'], ['Casque antibruit lors de l\'embouteillage', 'Encoffrement compresseur', 'Maintenance preventive (reduction bruit)']),
      r('bra-pression', 'Pression (cuves, CO2)', 'Risque d\'eclatement ou de projection par pression dans les cuves ou bonbonnes CO2', 'bra-fermentation', ['Surpression cuve de fermentation', 'Bouteille CO2 sous pression', 'Tuyau sous pression qui lache'], 4, 1, ['Soupape de securite sur cuves'], ['Soupapes de securite verifiees annuellement', 'Formation manipulation bouteilles gaz', 'Detendeurs conformes', 'Chaines de fixation bouteilles CO2']),
    ],
  },

  // ── Salon de the ───────────────────────────────────────────────
  {
    metierSlug: 'salon-de-the', label: 'Salon de the / Patisserie de salon', category: 'alimentaire_restauration',
    nafCodes: ['56.10A', '56.30Z'], idcc: '1979',
    legalReferences: ['Reglement CE 852/2004 (HACCP)', 'Code construction ERP Type N'],
    workUnits: [
      wu('sdt-salle', 'Salle de service', 'Service en salle, accueil, encaissement', '1-3'),
      wu('sdt-cuisine', 'Cuisine / preparation', 'Preparation patisseries, boissons chaudes, snacking leger', '1-2'),
      wu('sdt-reserve', 'Reserve / stockage', 'Stockage matieres premieres, vaisselle', '1'),
      wu('sdt-plonge', 'Plonge / nettoyage', 'Lavage vaisselle, nettoyage de la salle et cuisine', '0-1'),
    ],
    risks: [
      r('sdt-brulure', 'Brulure (boissons chaudes, four)', 'Brulure par eau bouillante, vapeur de machine a cafe, four', 'sdt-cuisine', ['Machine a cafe (vapeur)', 'Theiere d\'eau bouillante', 'Four a patisserie', 'Service de boissons chaudes'], 3, 3, ['Gants anti-chaleur'], ['Theiere avec bec verseur securise', 'Formation utilisation machine a cafe', 'Kit brulure accessible', 'Signalisation surfaces chaudes']),
      r('sdt-tms', 'TMS (station debout, repetitions)', 'Douleurs par station debout prolongee et service de plateaux charges', 'sdt-salle', ['Station debout 8h', 'Port de plateaux charges', 'Service repetitif', 'Posture penchee pour servir'], 2, 3, ['Chaussures confort'], ['Tapis anti-fatigue derriere le comptoir', 'Plateau leger et ergonomique', 'Pauses assises regulieres', 'Rotation taches salle/cuisine']),
      r('sdt-glissade', 'Glissade / chute', 'Chute sur sol mouille par boissons renversees ou nettoyage', 'sdt-salle', ['The/cafe renverse au sol', 'Sol mouille apres nettoyage', 'Cuisine mouille'], 2, 3, ['Chaussures antiderapantes'], ['Nettoyage immediat des liquides', 'Panneau sol mouille', 'Sol antiderapant']),
      r('sdt-coupure', 'Coupures (couteaux, vaisselle)', 'Coupure par couteau de cuisine, vaisselle cassee', 'sdt-cuisine', ['Decoupe patisserie', 'Vaisselle cassee en plonge', 'Manipulation verrerie fragile'], 2, 2, ['Gants si vaisselle cassee'], ['Vaisselle resistante (pas de verre fin)', 'Pelle a verre casse', 'Trousse premiers secours']),
      r('sdt-electrique', 'Risque electrique', 'Contact avec equipements electriques (machine a cafe, four, percolateur)', 'sdt-cuisine', ['Machine a cafe professionnelle', 'Four electrique', 'Bouilloire', 'Percolateur en milieu humide'], 3, 1, ['Differentiel 30mA'], ['Verification electrique annuelle', 'Raccordement conforme', 'Interdiction multiprises en cascade']),
      r('sdt-chimique', 'Risque chimique (nettoyage)', 'Irritation par produits de nettoyage de la vaisselle et des surfaces', 'sdt-plonge', ['Produit lave-vaisselle', 'Detartrant machine a cafe', 'Desinfection surfaces'], 2, 2, ['Gants de menage'], ['Doseurs automatiques', 'FDS affichees', 'Gants nitrile']),
      r('sdt-incendie', 'Incendie', 'Depart de feu par equipement electrique ou four', 'sdt-cuisine', ['Court-circuit machine a cafe', 'Surchauffe four', 'Torchon sur plaque'], 3, 1, ['Extincteurs', 'Detection incendie'], ['Exercice evacuation annuel', 'Extincteur CO2 en cuisine', 'Detection incendie fonctionnelle']),
      r('sdt-rps', 'Risques psychosociaux', 'Stress lie au service client, horaires, saisonnalite', 'sdt-salle', ['Rush heure du gouter', 'Client insatisfait', 'Travail seul', 'Saisonnalite (charge variable)'], 2, 2, ['Communication client'], ['Renfort en periode de pointe', 'Procedure gestion de conflits']),
    ],
  },

  // ── Abattoir ───────────────────────────────────────────────────
  {
    metierSlug: 'abattoir', label: 'Abattoir', category: 'alimentaire_restauration',
    nafCodes: ['10.11Z', '10.12Z'], idcc: '1534',
    legalReferences: ['Reglement CE 853/2004', 'Reglement CE 1099/2009 (protection animaux)', 'Art. R4541-1 (manutention)', 'Tableau RG 57 (TMS)'],
    workUnits: [
      wu('aba-chaine', 'Chaine d\'abattage', 'Accrochage, saignee, evisceration, decoupe primaire', '5-20'),
      wu('aba-decoupe', 'Salle de decoupe', 'Decoupe secondaire, desossage, parage', '3-10'),
      wu('aba-frigo', 'Chambre froide / ressuage', 'Stockage carcasses, maturation, expedition', '1-3'),
      wu('aba-triperie', 'Triperie / abats', 'Traitement et conditionnement des abats', '2-4'),
      wu('aba-nettoyage', 'Nettoyage / assainissement', 'Nettoyage des equipements, sols, chaines', '2-4'),
    ],
    risks: [
      r('aba-coupure', 'Coupure (couteaux industriels)', 'Laceration grave par couteaux de desossage, scie a os, fendoir', 'aba-decoupe', ['Desossage au couteau', 'Scie a os electrique', 'Fendoir (eclatement os)', 'Nettoyage couteaux'], 4, 4, ['Gant mailles inox EN 1082', 'Tablier mailles', 'Protege-bras'], ['Gant mailles inox obligatoire (2 tailles de surete)', 'Tablier cotte de mailles', 'Affutage regulier (couteau affute = plus sur)', 'Formation decoupe securisee', 'Scie a os avec carter et arret d\'urgence']),
      r('aba-biologique', 'Risque biologique (zoonoses)', 'Contamination par bacteries, virus et parasites d\'origine animale', 'aba-chaine', ['Contact sang et fluides', 'Eclaboussure evisceration', 'Aerosols de nettoyage', 'Piqure par os ou aiguille'], 3, 3, ['Gants usage unique', 'Tablier impermeable'], ['Vaccination (leptospirose si bovins)', 'Procedure AES', 'Lavabo commande non manuelle a chaque poste', 'Desinfection des mains entre chaque animal']),
      r('aba-rps', 'Risques psychosociaux (charge emotionnelle)', 'Charge emotionnelle liee a l\'abattage, cadence, travail penible', 'aba-chaine', ['Confrontation quotidienne a la mort animale', 'Cadence imposee par la chaine', 'Travail repetitif et penible', 'Pression de production'], 3, 3, ['Groupes de parole'], ['Soutien psychologique accessible', 'Rotation des postes (chaine/decoupe)', 'Cadence adaptee a l\'effectif', 'Groupes de parole trimestriels', 'Formation bien-etre animal (reduire la charge)']),
      r('aba-bruit', 'Bruit (chaine, scies, nettoyage)', 'Exposition au bruit des equipements de chaine et nettoyage HP (> 90 dB)', 'aba-chaine', ['Chaine d\'abattage', 'Scie a os', 'Nettoyage haute pression', 'Convoyeurs metalliques'], 3, 4, ['Bouchons d\'oreilles moules'], ['Casque antibruit EN 352 obligatoire', 'Encoffrement equipements bruyants', 'Audiogramme annuel', 'Rotation zones bruyantes/calmes']),
      r('aba-froid', 'Froid (chaine, chambre froide)', 'Exposition au froid dans les salles de decoupe (4-10°C) et chambres froides', 'aba-frigo', ['Salle de decoupe refrigeree (4-8°C)', 'Chambre froide positive (0°C)', 'Chambre froide negative (-20°C)', 'Courants d\'air froid'], 3, 4, ['Vetements thermiques fournis'], ['Vetements thermiques complets (couches)', 'Gants thermiques pour chambre froide', 'Pauses en zone temperee', 'Boissons chaudes a disposition', 'Limitation temps en chambre froide negative']),
      r('aba-glissade', 'Glissade (sol mouille, gras, sang)', 'Chute sur sol rendu tres glissant par eau, graisse, sang', 'aba-nettoyage', ['Sol mouille en permanence (chaine)', 'Graisse animale au sol', 'Sang', 'Nettoyage haute pression'], 3, 4, ['Chaussures antiderapantes EN 20345', 'Bottes securite'], ['Sol certifie R13', 'Drainage efficace en continu', 'Raclette sol permanente', 'Bottes securite antiderapantes S5 obligatoires', 'Nettoyage programme (pas pendant le passage)']),
      r('aba-tms', 'TMS (cadence, gestes repetitifs)', 'Troubles musculosquelettiques par gestes repetitifs et cadence de chaine — RG 57', 'aba-decoupe', ['Gestes repetitifs de decoupe', 'Accrochage repetitif sur chaine', 'Station debout 8h en froid', 'Force de coupe importante'], 3, 4, ['Rotation des postes encouragee'], ['Rotation des postes obligatoire (toutes les 2h)', 'Couteaux ergonomiques (manche adapte)', 'Echauffement musculaire avant poste', 'Affutage frequent (effort reduit)', 'Suivi medical TMS']),
      r('aba-chimique', 'Risque chimique (nettoyage)', 'Irritation par produits de desinfection concentres (soude, acide, chlore)', 'aba-nettoyage', ['Soude caustique (nettoyage CIP)', 'Desinfectant chlore', 'Detartrant acide', 'Aerosols nettoyage HP'], 3, 3, ['Gants chimiques', 'Bottes'], ['Gants nitrile longs obligatoires', 'Lunettes etanches', 'Formation manipulation produits chimiques', 'Douche de securite accessible', 'FDS affichees']),
    ],
  },

  // ── Meunerie ───────────────────────────────────────────────────
  {
    metierSlug: 'meunerie', label: 'Meunerie / Minoterie', category: 'alimentaire_restauration',
    nafCodes: ['10.61A', '10.61B'], idcc: '1930',
    legalReferences: ['Directive ATEX 1999/92/CE', 'Directive Machines 2006/42/CE', 'Art. R4222-1 (ventilation)'],
    workUnits: [
      wu('meu-silo', 'Silo a grains / reception', 'Reception, stockage et transfert des grains en silo', '1-3'),
      wu('meu-mouture', 'Mouture / broyage', 'Broyeurs a cylindres, plansichters, sasseurs', '1-3'),
      wu('meu-conditionnement', 'Conditionnement / ensachage', 'Mise en sacs, palettisation, expedition', '1-3'),
      wu('meu-maintenance', 'Maintenance / nettoyage', 'Maintenance des machines, nettoyage des installations', '1-2'),
    ],
    risks: [
      r('meu-atex', 'ATEX farine (explosion)', 'Risque d\'explosion par mise en suspension de poussieres de farine ou cereales', 'meu-silo', ['Remplissage silo (nuage de poussiere)', 'Transfert pneumatique de farine', 'Accumulation poussieres dans gaines', 'Nettoyage a sec (mise en suspension)'], 4, 2, ['Installations ATEX conformes', 'Interdiction flamme nue'], ['Zonage ATEX formalise', 'Equipements electriques ATEX dans toutes les zones', 'Nettoyage par aspiration (jamais soufflette)', 'Detection etincelle sur convoyeurs', 'Evacuation automatique en cas de surpression silo', 'Event de surpression sur silo et equipements']),
      r('meu-poussieres', 'Poussieres cereales / farine', 'Inhalation de poussieres de cereales et farine — asthme du meunier', 'meu-mouture', ['Broyage des grains', 'Tamisage', 'Ensachage farine', 'Nettoyage installations'], 3, 4, ['Aspiration centralisee', 'Masque FFP2'], ['Confinement et aspiration a chaque point d\'emission', 'Masque FFP2 obligatoire en zone poussiere', 'Spirometrie annuelle', 'Suivi medical renforce (pneumologue)', 'Nettoyage humide ou par aspiration']),
      r('meu-machines', 'Happement machines (broyeurs)', 'Happement ou ecrasement par broyeurs a cylindres, vis sans fin, convoyeurs', 'meu-mouture', ['Intervention sur broyeur en marche', 'Vis sans fin non protegee', 'Convoyeur a bande', 'Nettoyage sans consignation'], 4, 2, ['Carters de protection', 'Arret d\'urgence'], ['Procedure de consignation obligatoire (LOTO)', 'Carters avec securite (interlock)', 'Formation securite machines', 'Affichage consigne par machine', 'Interdiction formelle d\'intervenir machine en marche']),
      r('meu-bruit', 'Bruit (broyeurs, convoyeurs)', 'Exposition au bruit des machines de mouture (broyeurs > 90 dB)', 'meu-mouture', ['Broyeurs a cylindres', 'Plansichters', 'Convoyeurs pneumatiques', 'Compresseurs'], 3, 3, ['Bouchons d\'oreilles'], ['Casque antibruit EN 352 obligatoire en salle de mouture', 'Encoffrement equipements', 'Audiogramme annuel', 'Signalisation zones > 85 dB']),
      r('meu-chute-hauteur', 'Chute de hauteur (silo, passerelles)', 'Chute depuis le haut du silo, passerelles de mouture, echelles d\'acces', 'meu-silo', ['Acces tete de silo', 'Passerelles entre niveaux', 'Echelles fixes', 'Inspection interieur silo'], 4, 2, ['Garde-corps', 'Harnais'], ['Garde-corps conformes sur toutes les passerelles', 'Harnais pour inspection silo', 'Echelles avec crinolines', 'Formation travail en hauteur']),
      r('meu-manutention', 'Manutention (sacs 25-50 kg)', 'Port de sacs de farine lourds lors de l\'ensachage et l\'expedition', 'meu-conditionnement', ['Sacs de farine 25-50 kg', 'Palettisation manuelle', 'Chargement camion'], 3, 3, ['Transpalette', 'Palettiseur'], ['Ensacheuse automatique', 'Sacs 25 kg max (plus de 50 kg)', 'Palettiseur mecanique', 'Formation gestes et postures']),
      r('meu-espace-confine', 'Espace confine (silo)', 'Risque d\'asphyxie ou d\'ensevelissement dans un silo a grains', 'meu-silo', ['Entree dans silo pour inspection', 'Debouchage de voute dans silo', 'Nettoyage interieur silo', 'Risque d\'ensevelissement par grain'], 4, 1, ['Procedure espace confine', 'Detecteur 4 gaz'], ['Interdiction formelle d\'entrer dans un silo en fonctionnement', 'Harnais de sauvetage obligatoire', 'Surveillance exterieure permanente', 'Detection atmosphere (O2, CO2) avant entree', 'Plan de sauvetage affiche']),
      r('meu-incendie', 'Incendie (poussieres)', 'Depart de feu par auto-echauffement des grains ou etincelle dans les poussieres', 'meu-silo', ['Auto-echauffement grain humide', 'Etincelle convoyeur metallique', 'Echauffement palier broyeur', 'Court-circuit electrique'], 4, 1, ['Detection incendie', 'Extincteurs'], ['Surveillance temperature silos', 'Detection etincelle sur convoyeurs', 'Maintenance preventive (paliers, roulements)', 'Exercice evacuation semestriel']),
    ],
  },

  // ── Boucherie ──────────────────────────────────────────────────
  {
    metierSlug: 'boucherie', label: 'Boucherie-Charcuterie', category: 'alimentaire_restauration',
    nafCodes: ['47.22Z', '10.13A', '10.13B'], idcc: '992',
    legalReferences: ['Reglement CE 852/2004 (HACCP)', 'Reglement CE 853/2004', 'Tableau RG 57 (TMS)'],
    workUnits: [
      wu('bouch-decoupe', 'Atelier de decoupe / desossage', 'Decoupe, desossage, parage des viandes', '1-4'),
      wu('bouch-preparation', 'Preparation charcuterie', 'Fabrication saucisses, pates, preparations', '1-2'),
      wu('bouch-vente', 'Etal de vente', 'Vente au detail, conseil, pesee, emballage', '1-3'),
      wu('bouch-frigo', 'Chambre froide / reserve', 'Stockage carcasses et morceaux, maturation', '1'),
      wu('bouch-nettoyage', 'Nettoyage / desinfection', 'Nettoyage des equipements, plans de travail, sols', '1'),
    ],
    risks: [
      r('bouch-coupure', 'Coupure (couteaux, scie a os)', 'Laceration par couteaux de boucherie, scie a os, trancheuse, hachoir', 'bouch-decoupe', ['Desossage au couteau', 'Scie a os (coupe de carcasse)', 'Hachoir (preparation)', 'Nettoyage couteaux et machines'], 4, 4, ['Gant mailles inox EN 1082', 'Tablier mailles', 'Carter scie a os'], ['Gant mailles inox obligatoire (main de maintien)', 'Tablier cotte de mailles', 'Protege-bras pour desossage', 'Scie a os avec carter et arret d\'urgence', 'Affutage regulier', 'Formation decoupe securisee initiale']),
      r('bouch-froid', 'Froid (chambre froide)', 'Exposition au froid lors du travail en chambre froide (0 a -20°C)', 'bouch-frigo', ['Decoupe en chambre froide (4°C)', 'Rangement congelateur (-18°C)', 'Maturation pieces suspendues', 'Entrees/sorties repetees'], 3, 3, ['Vetements thermiques'], ['Gants thermiques grand froid', 'Vetements thermiques complets', 'Pauses en zone temperee', 'Alarme securite chambre froide', 'Limitation temps en congelateur']),
      r('bouch-tms', 'TMS (decoupe, manutention)', 'Douleurs poignets, epaules et dos par gestes de decoupe repetitifs et port de carcasses', 'bouch-decoupe', ['Desossage repetitif', 'Port de quartiers de viande (20-40 kg)', 'Station debout 8h en froid', 'Effort de coupe important'], 3, 4, ['Couteaux ergonomiques'], ['Couteaux ergonomiques (manche adapte a la main)', 'Rotation des taches (decoupe/vente)', 'Echauffement musculaire', 'Affutage frequent (effort reduit)', 'Table de decoupe a hauteur reglable']),
      r('bouch-biologique', 'Risque biologique', 'Contamination par bacteries (E. coli, salmonella) lors de la manipulation de viandes', 'bouch-decoupe', ['Manipulation viandes crues', 'Contamination croisee (cru/cuit)', 'Piqure par os', 'Dechets animaux'], 3, 2, ['HACCP', 'Gants usage unique'], ['Lavage mains entre chaque type de viande', 'Plans de travail distincts cru/cuit', 'Formation HACCP obligatoire', 'Evacuation dechets toutes les 2h']),
      r('bouch-glissade', 'Glissade (sol gras, sang)', 'Chute sur sol gras, mouille ou souille par sang et graisse', 'bouch-nettoyage', ['Sol graisseux autour du billot', 'Sang au sol', 'Sol mouille apres nettoyage'], 2, 3, ['Chaussures antiderapantes EN 20345'], ['Sol certifie R12', 'Raclette sol disponible', 'Nettoyage continu', 'Bottes securite antiderapantes']),
      r('bouch-manutention', 'Manutention (carcasses, cartons)', 'Port de quartiers de viande (20-40 kg), carcasses suspendues', 'bouch-frigo', ['Reception demi-carcasses (50-100 kg)', 'Quartiers de boeuf (20-40 kg)', 'Cartons de preparation (15 kg)', 'Suspension au rail'], 3, 3, ['Rail de suspension', 'Crochets'], ['Rail electrique pour carcasses', 'Treuil de levage', 'Limite 25 kg port manuel', 'Aide mecanique pour demi-carcasses']),
      r('bouch-machines', 'Happement machines (hachoir, scie)', 'Happement ou coincement dans le hachoir, la scie a os, la poussoir', 'bouch-preparation', ['Introduction viande dans hachoir', 'Nettoyage hachoir en marche', 'Scie a os sans carter', 'Poussoir a saucisse'], 4, 2, ['Carter de protection', 'Arret d\'urgence'], ['Poussoir mecanique (pas la main) pour hachoir', 'Consignation avant nettoyage machine', 'Arret d\'urgence fonctionnel verifie', 'Formation securite machines']),
      r('bouch-chimique', 'Risque chimique (nettoyage)', 'Irritation par produits de desinfection (eau de javel, detergent)', 'bouch-nettoyage', ['Desinfection quotidienne des surfaces', 'Nettoyage chambre froide', 'Detergent concentre'], 2, 3, ['Gants de menage'], ['Doseurs automatiques', 'Gants nitrile obligatoires', 'FDS affichees', 'Interdiction melange produits']),
    ],
  },
];
