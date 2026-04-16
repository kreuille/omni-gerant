// BUSINESS RULE [CDC-2.4]: E3 — 19 metiers Commerce & Services
// Commerce general et Garage auto existent deja dans risk-database-v2.ts

import type { MetierRiskProfile } from './risk-database-v2.js';

function r(id: string, name: string, desc: string, wuId: string, sits: string[], g: 1|2|3|4, f: 1|2|3|4, exist: string[], proposed: string[], cat: string): MetierRiskProfile['risks'][number] {
  return { id, name, description: desc, workUnitId: wuId, situations: sits, defaultGravity: g, defaultFrequency: f, existingMeasures: exist, proposedActions: proposed, category: cat as MetierRiskProfile['risks'][number]['category'] };
}

function wu(id: string, name: string, desc: string, hc: string): MetierRiskProfile['workUnits'][number] {
  return { id, name, description: desc, typicalHeadcount: hc };
}

export const COMMERCE_TRADES: MetierRiskProfile[] = [
  // ── Carrosserie ────────────────────────────────────────────────
  {
    metierSlug: 'carrosserie', label: 'Carrosserie-Peinture automobile', category: 'commerce_services',
    nafCodes: ['45.20B'], idcc: '1090',
    legalReferences: ['Tableau RG 84 (solvants)', 'Tableau RG 62 (isocyanates)', 'Art. R4412-1 (chimique)', 'Directive ATEX'],
    workUnits: [
      wu('carr-tole', 'Atelier tolerie / redressage', 'Debosselage, redressage, soudure, remplacement elements', '1-3'),
      wu('carr-peinture', 'Cabine de peinture', 'Application peinture, vernis, preparation, ponçage', '1-2'),
      wu('carr-prep', 'Preparation / masticage', 'Masticage, ponçage, appretage, marouflage', '1-2'),
      wu('carr-demontage', 'Demontage / remontage', 'Demontage et remontage des elements de carrosserie', '1-2'),
    ],
    risks: [
      r('carr-chimique', 'Risque chimique (peintures, solvants) — RG 84', 'Inhalation de vapeurs de solvants, peintures, durcisseurs isocyanates — Tableaux RG 84, RG 62', 'carr-peinture', ['Application peinture au pistolet', 'Nettoyage pistolet au solvant', 'Preparation durcisseur (isocyanates)', 'Ponçage apprêt sec'], 3, 4, ['Cabine ventilee', 'Masque A2P3'], ['Masque A2P3 obligatoire en cabine', 'Combinaison jetable', 'Gants nitrile', 'Substitution par peintures aqueuses si possible', 'Controle annuel exposition chimique', 'Suivi medical renforce']),
      r('carr-bruit', 'Bruit (ponçage, redressage)', 'Exposition au bruit du martelage, meulage, ponçage (> 90 dB)', 'carr-tole', ['Martelage de redressage', 'Meulage cordons de soudure', 'Ponçage carrosserie', 'Compresseur'], 3, 4, ['Bouchons oreilles'], ['Casque antibruit EN 352 obligatoire', 'Outils basse vibration', 'Alternance taches bruyantes/calmes', 'Audiogramme annuel']),
      r('carr-poussieres', 'Poussieres (ponçage)', 'Inhalation poussieres de mastic, apprêt, peinture lors du ponçage', 'carr-prep', ['Ponçage mastic a sec', 'Ponçage apprêt', 'Depoussieriage cabine', 'Decapage peinture ancienne'], 3, 3, ['Aspirateur', 'Masque FFP2'], ['Ponceuse avec aspiration obligatoire', 'Masque FFP2 systematique au ponçage', 'Cabine de ponçage ventilee', 'Nettoyage par aspiration (pas soufflette)']),
      r('carr-incendie', 'Incendie / ATEX (solvants)', 'Depart de feu par solvants, peintures, poussieres dans la cabine', 'carr-peinture', ['Solvants inflammables', 'Electricite statique (pistolet)', 'Poussieres de ponçage', 'Chiffons solvantes'], 4, 1, ['Cabine conforme ATEX', 'Extincteurs'], ['Cabine ATEX avec detection', 'Stockage solvants dans armoire ventilee', 'Poubelle metallique fermee pour chiffons', 'Exercice evacuation annuel']),
      r('carr-soudure', 'Brulure / fumees soudure', 'Brulure et inhalation de fumees lors de la soudure de carrosserie', 'carr-tole', ['Soudure MIG de tole auto', 'Meulage de soudure', 'Decoupage au plasma'], 3, 3, ['Cagoule soudeur', 'Gants'], ['Aspiration fumees au poste', 'Gants soudeur EN 12477', 'Ecran de protection inter-postes', 'Kit brulure']),
      r('carr-tms', 'TMS (postures, bras leves)', 'Douleurs par postures contraignantes sous le vehicule et bras leves pour ponçage', 'carr-prep', ['Ponçage toit (bras leves)', 'Travail sous vehicule', 'Masticage en position contrainte', 'Marouflage repetitif'], 2, 4, ['Pont elevateur'], ['Pont elevateur pour travail sous vehicule', 'Perche de ponçage pour toit', 'Rotation des taches', 'Pauses actives']),
      r('carr-coupure', 'Coupures (tole, meulage)', 'Coupure par tole decoupee, bavures metalliques, meule', 'carr-tole', ['Manipulation tole decoupee', 'Bavures de soudure', 'Remplacement element de carrosserie'], 2, 3, ['Gants anti-coupure'], ['Gants EN 388 obligatoires', 'Lunettes EN 166 au meulage', 'Ebavurage des coupes']),
      r('carr-electrique', 'Risque electrique', 'Electrisation par poste a souder ou installation defectueuse', 'carr-tole', ['Poste a souder defectueux', 'Installation electrique ancienne', 'Cable endommage'], 3, 1, ['Verification cables'], ['Verification electrique annuelle', 'Poste a souder entretenu', 'Remplacement cables endommages']),
    ],
  },

  // ── Fleuriste ──────────────────────────────────────────────────
  {
    metierSlug: 'fleuriste', label: 'Fleuriste', category: 'commerce_services',
    nafCodes: ['47.76Z'], idcc: '1978',
    legalReferences: ['Art. R4412-1 (chimique)', 'Art. R4541-1 (manutention)'],
    workUnits: [
      wu('fleur-boutique', 'Boutique / atelier', 'Composition florale, accueil clients, vente', '1-3'),
      wu('fleur-reserve', 'Reserve / chambre froide fleurs', 'Stockage fleurs coupees en chambre froide (4-8°C)', '1'),
      wu('fleur-livraison', 'Vehicule / livraison', 'Livraisons de compositions florales', '1'),
      wu('fleur-exterieur', 'Espace exterieur / marche', 'Presentation plantes et fleurs en exterieur', '1-2'),
    ],
    risks: [
      r('fleur-chimique', 'Risque chimique (pesticides, conservateurs)', 'Contact avec residus de pesticides sur les fleurs, conservateurs', 'fleur-boutique', ['Manipulation fleurs traitees', 'Produits de conservation (thiabendazole)', 'Engrais liquides', 'Insecticides pour plantes'], 2, 3, ['Gants de manipulation'], ['Gants nitrile pour composition', 'Lavage mains apres manipulation', 'Ventilation du local', 'Fournisseurs certifies (moins de pesticides)']),
      r('fleur-allergie', 'Allergie (pollens, latex)', 'Rhinite, asthme, dermatite par contact avec pollens, seve, latex', 'fleur-boutique', ['Pollens de lys, mimosa', 'Seve de plantes (euphorbes)', 'Allergie au latex des gants', 'Contact mousse florale'], 2, 3, ['Gants nitrile (pas latex)'], ['Gants nitrile (pas latex)', 'Ventilation renforcee en periode de pollens', 'Suivi allergo si symptomes', 'Eviter plantes tres allergisantes si sensibilise']),
      r('fleur-tms', 'TMS (composition, station debout)', 'Douleurs par station debout prolongee et gestes repetitifs de composition', 'fleur-boutique', ['Station debout 8h', 'Composition florale (mains)', 'Port de seaux d\'eau (15 kg)', 'Posture penchee sur plan de travail'], 2, 3, ['Tapis anti-fatigue'], ['Plan de travail a hauteur reglable', 'Tapis anti-fatigue', 'Tabouret assis-debout', 'Pauses regulieres']),
      r('fleur-coupure', 'Coupures (secateur, epines)', 'Coupure par secateur, couteau, ou piqure par epines (rosier)', 'fleur-boutique', ['Decoupe au secateur', 'Manipulation roses (epines)', 'Couteau de fleuriste', 'Fil de fer pour montage'], 2, 3, ['Gants de jardinage'], ['Secateur avec securite', 'Gants anti-piqure pour rosiers', 'Trousse premiers secours (desinfectant)', 'Tetanos a jour']),
      r('fleur-froid', 'Froid (chambre froide)', 'Exposition au froid lors du stockage des fleurs en chambre froide', 'fleur-reserve', ['Entrees/sorties chambre froide (4-8°C)', 'Rangement prolonge', 'Manipulation seaux d\'eau froide'], 2, 2, ['Vetements chauds'], ['Limitation du temps en chambre froide', 'Vetements thermiques disponibles']),
      r('fleur-manutention', 'Manutention (plantes, seaux)', 'Port de plantes lourdes, seaux d\'eau, compositions volumineuses', 'fleur-reserve', ['Plantes en pot (10-30 kg)', 'Seaux d\'eau (15 kg)', 'Compositions de mariage', 'Arbustes en conteneur'], 2, 3, ['Chariot'], ['Chariot a plantes', 'Diable pour pots lourds', 'Aide pour livraisons lourdes', 'Formation gestes et postures']),
      r('fleur-routier', 'Risque routier (livraisons)', 'Accident lors des livraisons avec vehicule charge de compositions fragiles', 'fleur-livraison', ['Livraison en ville', 'Vehicule charge de compositions fragiles', 'Stationnement difficile'], 3, 2, ['Vehicule entretenu'], ['Calage des compositions dans le vehicule', 'Planning livraisons avec marge', 'Formation eco-conduite']),
      r('fleur-glissade', 'Glissade (sol mouille)', 'Chute sur sol mouille par l\'eau des fleurs', 'fleur-boutique', ['Sol mouille par seaux', 'Feuilles au sol', 'Eclaboussures'], 2, 2, ['Chaussures fermees'], ['Sol antiderapant', 'Nettoyage regulier', 'Eclairage suffisant']),
    ],
  },

  // ── Grande distribution ────────────────────────────────────────
  {
    metierSlug: 'grande-distribution', label: 'Grande distribution (supermarche)', category: 'commerce_services',
    nafCodes: ['47.11D', '47.11E'], idcc: '2216',
    legalReferences: ['Art. R4541-1 (manutention)', 'CACES R489 (chariots)', 'Code construction ERP Type M'],
    workUnits: [
      wu('gd-rayon', 'Rayons / mise en rayon', 'Mise en rayon, facing, rotation des produits', '3-15'),
      wu('gd-caisse', 'Caisses', 'Encaissement, scanner, accueil clients', '3-10'),
      wu('gd-reserve', 'Reserve / quai', 'Reception marchandises, stockage, preparation', '2-6'),
      wu('gd-frais', 'Rayons frais / rayon coupe', 'Boucherie, poissonnerie, fromage, traiteur', '2-6'),
      wu('gd-bureau', 'Bureau / accueil', 'Administration, accueil SAV, direction', '1-3'),
    ],
    risks: [
      r('gd-chariot', 'Ecrasement (chariot elevateur, transpalette)', 'Heurt par chariot elevateur ou transpalette electrique en reserve', 'gd-reserve', ['Chariot en reserve', 'Transpalette en rayon (remplissage)', 'Croisement pieton/chariot', 'Recul sans visibilite'], 4, 3, ['CACES obligatoire', 'Gilet haute visibilite'], ['Separation zones pietons/engins', 'Vitesse limitee 6 km/h en magasin', 'Formation CACES R489 recyclage 5 ans', 'Miroirs aux intersections']),
      r('gd-manutention', 'Manutention (palettes, cartons)', 'Port repetitif de cartons (5-20 kg), mise en rayon intensive', 'gd-rayon', ['Mise en rayon (cartons repetitifs)', 'Depalettisation', 'Remplissage rayons hauts/bas', 'Port de packs (eau, lait)'], 3, 4, ['Transpalette', 'Diable'], ['Transpalette electrique', 'Cutter securite (lame retractable)', 'Rotation des rayons', 'Limite 15 kg par colis', 'Formation gestes et postures']),
      r('gd-agression', 'Agression (vol, clients)', 'Agression lors de vol a l\'etalage, client mecontent, hold-up', 'gd-caisse', ['Vol a l\'etalage (confrontation)', 'Client agressif en caisse', 'Hold-up', 'Fermeture tardive'], 3, 2, ['Camera', 'Vigile'], ['Formation gestion de conflits', 'Bouton d\'alerte en caisse', 'Procedure en cas de vol (ne pas intervenir)', 'Limitation encaisse']),
      r('gd-tms-caisse', 'TMS (caisse, repetitions)', 'TMS par gestes repetitifs en caisse (scanner, sacs)', 'gd-caisse', ['Scanner repetitif (1000+ articles/jour)', 'Manipulation sacs', 'Posture assise prolongee', 'Torsion buste repetitive'], 2, 4, ['Siege caissier reglable'], ['Siege ergonomique avec dossier', 'Scanner bi-optique (moins de gestes)', 'Rotation caisse/rayon', 'Tapis anti-fatigue si debout', 'Pauses micro-pauses toutes les 2h']),
      r('gd-coupure', 'Coupures (cutter, rayon coupe)', 'Laceration par cutter d\'ouverture cartons, trancheuse rayon coupe', 'gd-frais', ['Ouverture cartons au cutter', 'Trancheuse rayon charcuterie', 'Scie a os rayon boucherie', 'Manipulation verre (rayon boissons)'], 3, 3, ['Gants anti-coupure rayon coupe', 'Cutter securite'], ['Cutter a lame retractable automatique obligatoire', 'Gant mailles inox rayon coupe', 'Formation utilisation trancheuse', 'Collecteur de lames']),
      r('gd-chute', 'Chute (reserve, rayons)', 'Chute depuis escabeau, glissade en reserve, trebuchement cartons', 'gd-reserve', ['Escabeau pour rayons hauts', 'Cartons au sol en reserve', 'Sol mouille (rayon frais)', 'Palette mal calee'], 2, 3, ['Chaussures securite S2 en reserve'], ['Escabeau conforme avec garde-corps', 'Rangement continu reserve', 'Eclairage suffisant', 'Signalisation sol mouille']),
      r('gd-froid', 'Froid (chambre froide, rayon surgeles)', 'Exposition au froid en chambre froide et rayon surgeles', 'gd-frais', ['Chambre froide positive (2-4°C)', 'Chambre froide negative (-25°C)', 'Rayon surgeles', 'Entrees/sorties repetees'], 2, 3, ['Vetements thermiques'], ['Gants grand froid pour chambre negative', 'Limitation temps en chambre froide negative', 'Vetements thermiques fournis', 'Alarme securite chambre froide']),
      r('gd-rps', 'Risques psychosociaux', 'Stress lie a la cadence, clients difficiles, horaires atypiques', 'gd-caisse', ['Rush week-end/vacances', 'Clients agressifs', 'Horaires coupes', 'Polyvalence imposee'], 2, 3, ['Planning anticipe'], ['Effectif adapte aux pics', 'Formation gestion de conflits', 'Planning publie 2 semaines a l\'avance', 'Procedure escalade client difficile']),
    ],
  },

  // ── Commerce de gros ───────────────────────────────────────────
  {
    metierSlug: 'commerce-gros', label: 'Commerce de gros (non alimentaire)', category: 'commerce_services',
    nafCodes: ['46.41Z', '46.42Z', '46.43Z', '46.44Z', '46.45Z', '46.46Z', '46.47Z', '46.48Z', '46.49Z'], idcc: '573',
    legalReferences: ['Art. R4541-1 (manutention)', 'CACES R489 (chariots)', 'Art. R4323-58 (hauteur)'],
    workUnits: [
      wu('cg-entrepot', 'Entrepot / stockage', 'Stockage palettes, preparation commandes', '3-15'),
      wu('cg-quai', 'Quai reception / expedition', 'Chargement, dechargement, controle', '2-4'),
      wu('cg-bureau', 'Bureau / showroom', 'Commercial, administration, showroom', '1-5'),
      wu('cg-vehicule', 'Livraison', 'Livraison clients professionnels', '1-3'),
    ],
    risks: [
      r('cg-chariot', 'Ecrasement (chariot elevateur)', 'Heurt ou ecrasement par chariot elevateur dans l\'entrepot', 'cg-entrepot', ['Croisement chariot/pieton', 'Recul sans visibilite', 'Chute palette des fourches', 'Collision entre chariots'], 4, 3, ['CACES R489', 'Gilet EN 20471'], ['Separation zones pietons/chariots', 'Miroirs aux angles', 'Vitesse limitee 10 km/h', 'Camera de recul', 'Briefing securite quotidien']),
      r('cg-chute-rack', 'Chute de marchandises (rack)', 'Chute de palette ou cartons depuis les racks en hauteur', 'cg-entrepot', ['Palette mal calee', 'Rack heurte par chariot', 'Surcharge d\'un niveau', 'Film palette dechire'], 4, 2, ['Racks verifies', 'Protection pieds rack'], ['Verification annuelle racks (organisme agree)', 'Protections pieds de rack', 'Signalisation charge max par niveau', 'Filmage correct obligatoire']),
      r('cg-manutention', 'Manutention lourde', 'Port de colis lourds et encombrants, preparation de commandes', 'cg-entrepot', ['Picking repetitif', 'Colis 10-30 kg', 'Articles encombrants', 'Reconditionnement palettes'], 3, 4, ['Transpalette', 'Diable'], ['Transpalette electrique', 'Table de picking a hauteur reglable', 'Limite 25 kg', 'Rotation des preparateurs']),
      r('cg-chute', 'Chute de plain-pied', 'Glissade sur sol d\'entrepot, film palette au sol, cartons', 'cg-quai', ['Film etirable au sol', 'Sol mouille sur quai', 'Cartons au sol', 'Eclairage insuffisant'], 2, 3, ['Chaussures securite S3'], ['Nettoyage continu allees', 'Eclairage 200 lux minimum', 'Marquage zones circulation']),
      r('cg-routier', 'Risque routier (livraisons)', 'Accident lors des livraisons avec poids lourd ou utilitaire', 'cg-vehicule', ['Livraison en ville', 'Manoeuvre de recul', 'Chargement desequilibre', 'Fatigue (horaires matinaux)'], 3, 2, ['Cales de roue', 'GPS'], ['Procedure mise a quai', 'Controle repartition charge', 'Formation livraison urbaine']),
      r('cg-bruit', 'Bruit (entrepot)', 'Bruit des chariots, convoyeurs, ventilation', 'cg-entrepot', ['Chariots en marche', 'Convoyeurs', 'Ventilation'], 2, 3, ['Bouchons disponibles'], ['Chariots electriques (plus silencieux)', 'Maintenance preventive', 'Protection auditive en zone frigorifique']),
      r('cg-electrique', 'Risque electrique', 'Contact avec installations electriques d\'entrepot', 'cg-entrepot', ['Prises endommagees', 'Chariot electrique en charge', 'Eclairage defectueux'], 3, 1, ['Differentiel 30mA'], ['Verification electrique annuelle', 'Zone de charge chariots conforme', 'Remplacement immediat prises defectueuses']),
      r('cg-rps', 'Risques psychosociaux', 'Stress lie aux objectifs de preparation, cadence, erreurs', 'cg-bureau', ['Pression delais livraison', 'Erreurs de preparation', 'Conflits equipes'], 2, 2, ['Communication'], ['Objectifs realistes', 'Procedure traitement erreurs (non punitive)', 'Briefing equipe']),
    ],
  },

  // ── Reparation automobile ──────────────────────────────────────
  {
    metierSlug: 'reparation-auto', label: 'Reparation automobile', category: 'commerce_services',
    nafCodes: ['45.20A'], idcc: '1090',
    legalReferences: ['NF C 18-510 (habilitation electrique vehicules HT)', 'Art. R4412-1 (chimique)', 'Directive Machines'],
    workUnits: [
      wu('rep-atelier', 'Atelier mecanique', 'Reparation, entretien vehicules thermiques', '2-6'),
      wu('rep-ht', 'Zone vehicules electriques/hybrides', 'Intervention sur vehicules haute tension', '1-2'),
      wu('rep-pneumatique', 'Poste pneumatiques', 'Montage, equilibrage, geometrie', '1-2'),
      wu('rep-accueil', 'Accueil / magasin', 'Reception clients, vente pieces', '1-2'),
    ],
    risks: [
      r('rep-ecrasement', 'Ecrasement (vehicule)', 'Ecrasement par chute de vehicule du pont elevateur ou du cric', 'rep-atelier', ['Vehicule mal cale sur pont', 'Cric hydraulique defaillant', 'Chandelle absente', 'Mouvement inattendu du vehicule'], 4, 2, ['Pont elevateur entretenu', 'Chandelles'], ['Verification annuelle ponts (organisme agree)', 'Chandelles obligatoires en complement du cric', 'Cales de roue', 'Interdiction de passer sous vehicule sur cric seul']),
      r('rep-chimique', 'Risque chimique (huiles, liquides)', 'Contact ou inhalation de fluides (huile moteur, liquide de frein, antigel, GPL)', 'rep-atelier', ['Vidange huile moteur', 'Liquide de refroidissement', 'Liquide de frein (hygroscopique)', 'GPL/GNV'], 3, 3, ['Gants nitrile', 'Bac de recuperation'], ['Bac de recuperation sous vidange', 'Gants nitrile longs obligatoires', 'Collecte huiles usagees conforme', 'FDS affichees', 'Ventilation atelier']),
      r('rep-electrique-ht', 'Electrocution (vehicules HT)', 'Electrocution par batterie haute tension (400-800V) sur vehicules electriques/hybrides', 'rep-ht', ['Intervention sur batterie HT', 'Cable HT endommage', 'Vehicule accidente (risque HT)', 'Absence de consignation'], 4, 2, ['Habilitation B2VL minimum'], ['Habilitation B2VL ou B2TL obligatoire', 'EPI isolants (gants, tapis)', 'Zone HT delimitee et signalee', 'Procedure de consignation HT ecrite', 'Formation vehicule electrique specifique']),
      r('rep-bruit', 'Bruit (outils pneumatiques)', 'Bruit des cles a chocs pneumatiques, compresseur (> 95 dB)', 'rep-atelier', ['Cle a chocs pneumatique', 'Compresseur', 'Meulage', 'Ponçage'], 3, 3, ['Bouchons oreilles'], ['Casque antibruit EN 352 obligatoire', 'Cles a chocs electriques (moins bruyantes)', 'Compresseur encoffre', 'Audiogramme annuel']),
      r('rep-tms', 'TMS (postures contraignantes)', 'Douleurs dos et epaules par travail sous vehicule, bras leves, force', 'rep-atelier', ['Travail sous vehicule (bras leves)', 'Serrage pneumatiques (force)', 'Posture tordue dans compartiment moteur', 'Station debout sur beton'], 2, 4, ['Pont elevateur'], ['Pont reglable en hauteur', 'Siege de mecanicien (sous vehicule)', 'Tapis anti-fatigue', 'Rotation des taches']),
      r('rep-incendie', 'Incendie (carburant, huiles)', 'Depart de feu par carburant, huile, batterie lithium', 'rep-atelier', ['Fuite de carburant', 'Huile sur echappement chaud', 'Court-circuit batterie', 'Batterie lithium (emballement thermique)'], 4, 1, ['Extincteurs', 'Interdiction fumer'], ['Extincteur adapte batteries lithium', 'Couverture anti-feu', 'Bac de retention sous vehicule', 'Procedure vehicule electrique en feu']),
      r('rep-chute', 'Chute de plain-pied', 'Glissade sur sol gras, outils au sol, tuyaux compresseur', 'rep-atelier', ['Huile au sol', 'Tuyaux compresseur', 'Outils au sol', 'Sol mouille'], 2, 3, ['Chaussures securite S3'], ['Nettoyage immediat fuites', 'Enrouleur tuyaux compresseur', 'Rangement continu outils', 'Absorbant industriel a disposition']),
      r('rep-manutention', 'Manutention (pneumatiques, pieces)', 'Port de pneumatiques (15-30 kg), moteurs, pots d\'echappement', 'rep-pneumatique', ['Pneumatiques PL (50 kg)', 'Moteur en echange standard', 'Boite de vitesse', 'Pare-chocs'], 3, 3, ['Grue d\'atelier'], ['Grue d\'atelier pour pieces lourdes', 'Chariot a pneumatiques', 'Limite 25 kg port manuel', 'Formation gestes et postures']),
    ],
  },

  // ── Concession automobile ──────────────────────────────────────
  {
    metierSlug: 'concession-auto', label: 'Concession automobile', category: 'commerce_services',
    nafCodes: ['45.11Z'], idcc: '1090',
    legalReferences: ['Code de la route (essais)', 'Art. R4541-1 (manutention)'],
    workUnits: [
      wu('conc-showroom', 'Showroom / exposition', 'Exposition vehicules, accueil clients', '2-5'),
      wu('conc-essai', 'Essais vehicules', 'Essais routiers avec clients', '1-3'),
      wu('conc-livraison', 'Preparation / livraison', 'Preparation vehicules neufs, livraison clients', '1-3'),
      wu('conc-bureau', 'Bureau / administratif', 'Vente, financement, administration', '2-5'),
    ],
    risks: [
      r('conc-routier', 'Risque routier (essais)', 'Accident lors des essais routiers avec des clients ou des vehicules neufs', 'conc-essai', ['Essai avec client non habitue au vehicule', 'Convoyage vehicules neufs', 'Essai vehicule puissant', 'Conditions meteo degradees'], 3, 3, ['Assurance essai', 'Parcours defini'], ['Parcours d\'essai securise defini', 'Briefing client avant essai', 'Accompagnement obligatoire du vendeur', 'Verification permis client']),
      r('conc-tms', 'TMS (bureautique)', 'Douleurs par posture prolongee devant ecran (vente, financement)', 'conc-bureau', ['Posture assise prolongee', 'Ecran non regle', 'Bureau encombre'], 2, 3, ['Siege reglable'], ['Evaluation ergonomique du poste', 'Ecran a hauteur des yeux', 'Pauses regulieres', 'Souris ergonomique']),
      r('conc-chimique', 'Risque chimique (preparation)', 'Contact avec produits de lustrage, nettoyants de vehicules', 'conc-livraison', ['Lustrage vehicule (polish)', 'Nettoyage interieur (solvants)', 'Lavage exterieur (detergent)'], 2, 2, ['Gants'], ['Gants nitrile pour produits de preparation', 'Ventilation si travail en interieur', 'Produits a faible emission COV']),
      r('conc-agression', 'Agression (clients)', 'Violence verbale de clients mecontents (livraison, SAV)', 'conc-showroom', ['Client mecontent du SAV', 'Litige sur le prix', 'Reclamation vehicule defectueux'], 2, 2, ['Communication client'], ['Formation gestion de conflits', 'Procedure escalade', 'Zone d\'accueil securisee']),
      r('conc-manutention', 'Manutention (pieces, accessoires)', 'Port d\'accessoires et pieces lors de la preparation des vehicules', 'conc-livraison', ['Installation d\'accessoires', 'Port de tapis de sol, galeries', 'Dechargement camion porte-vehicules'], 2, 2, ['Chariot'], ['Aide mecanique pour pieces lourdes', 'Formation gestes et postures']),
      r('conc-chute', 'Chute de plain-pied', 'Glissade sur sol de showroom (sol lisse), parking mouille', 'conc-showroom', ['Sol showroom lisse', 'Parking mouille', 'Cables au sol (evenement)'], 2, 2, ['Chaussures fermees'], ['Sol antiderapant en entree', 'Signalisation sol mouille', 'Eclairage parking']),
      r('conc-electrique', 'Risque electrique', 'Contact avec installations electriques ou bornes de recharge', 'conc-showroom', ['Borne de recharge electrique', 'Installation showroom', 'Eclairage evenementiel'], 3, 1, ['Differentiel 30mA'], ['Formation borne de recharge', 'Verification electrique annuelle']),
      r('conc-rps', 'Risques psychosociaux', 'Pression des objectifs de vente, clients exigeants', 'conc-bureau', ['Objectifs de vente mensuels', 'Client difficile', 'Horaires etendus (samedi)'], 2, 3, ['Objectifs communiques'], ['Objectifs realistes et transparents', 'Equilibre vie pro/perso', 'Soutien managérial']),
    ],
  },

  // ── Casse auto / Recyclage ─────────────────────────────────────
  {
    metierSlug: 'casse-auto', label: 'Casse automobile / Recyclage VHU', category: 'commerce_services',
    nafCodes: ['46.77Z', '38.31Z'], idcc: '1090',
    legalReferences: ['Directive VHU 2000/53/CE', 'Art. R543-153 (VHU)', 'ICPE rubrique 2712'],
    workUnits: [
      wu('cas-demantelement', 'Zone de demantelement', 'Depollution, demantelement des vehicules', '2-4'),
      wu('cas-presse', 'Presse / broyage', 'Mise en presse des carcasses, broyage', '1-2'),
      wu('cas-stockage', 'Parc de stockage', 'Stockage vehicules, pieces de reemploi', '1-2'),
      wu('cas-magasin', 'Magasin pieces', 'Vente de pieces de reemploi, expedition', '1-2'),
    ],
    risks: [
      r('cas-ecrasement', 'Ecrasement (presse, vehicules)', 'Ecrasement par presse hydraulique ou chute de vehicule empile', 'cas-presse', ['Presse hydraulique en fonctionnement', 'Vehicule empile instable', 'Grue de levage', 'Chute de moteur sur le demonteur'], 4, 2, ['Zone d\'exclusion presse', 'Casque'], ['Consignation presse avant toute intervention', 'Interdiction d\'empiler > 3 vehicules', 'Grue avec dispositif anti-chute', 'Casque EN 397 obligatoire dans la zone']),
      r('cas-chimique', 'Risque chimique (fluides)', 'Contact avec fluides divers : huile moteur, liquide de frein, antigel, plomb batterie', 'cas-demantelement', ['Vidange huile moteur usagee', 'Purge liquide de frein', 'Manipulation batterie (acide)', 'Recuperation fluide climatisation'], 3, 3, ['Gants nitrile', 'Bac de recuperation'], ['Kit de depollution standardise', 'Collecte conforme de chaque fluide', 'Gants chimiques pour batterie', 'Douche de securite', 'FDS pour chaque fluide']),
      r('cas-coupure', 'Coupures (tole, verre)', 'Coupure par toles dechiquetees, bris de verre, aretes metalliques', 'cas-demantelement', ['Toles dechirees', 'Pare-brise casse', 'Demontage avec aretes vives', 'Manipulation pieces rouillees'], 3, 3, ['Gants anti-coupure EN 388'], ['Gants EN 388 niveau 5 obligatoires', 'Lunettes EN 166', 'Manches longues coton', 'Collecte verre securisee']),
      r('cas-bruit', 'Bruit (demantelement, presse)', 'Bruit des outils de demantelement, presse, broyeur (> 95 dB)', 'cas-demantelement', ['Outils pneumatiques', 'Presse en fonctionnement', 'Broyeur', 'Meulage'], 3, 3, ['Bouchons oreilles'], ['Casque antibruit EN 352', 'Audiogramme annuel', 'Limitation duree exposition']),
      r('cas-incendie', 'Incendie (carburant, batterie lithium)', 'Depart de feu par carburant residuel ou emballement batterie lithium (VE)', 'cas-stockage', ['Carburant residuel dans reservoir', 'Batterie lithium endommagee', 'Court-circuit electrique', 'Soudure pres de carburant'], 4, 2, ['Extincteurs', 'Bac de retention'], ['Procedure depollution avant stockage', 'Stockage batteries lithium en zone dediee', 'Extincteur adapte batteries lithium', 'Permis de feu obligatoire', 'Formation risque VE/VH']),
      r('cas-chute', 'Chute (terrain, vehicules)', 'Chute sur terrain irregulier, depuis un vehicule empile', 'cas-stockage', ['Terrain irregulier du parc', 'Montee sur vehicule empile', 'Sol boueux/verglace', 'Eclairage insuffisant'], 2, 3, ['Chaussures securite S3'], ['Entretien du terrain', 'Interdiction de monter sur vehicules empiles', 'Eclairage du parc', 'Escabeau pour acces moteur']),
      r('cas-manutention', 'Manutention (moteurs, pieces)', 'Port de pieces lourdes : moteurs (80-200 kg), boites de vitesse, ponts', 'cas-demantelement', ['Depose moteur', 'Boite de vitesse (40 kg)', 'Demi-trains', 'Pare-chocs'], 3, 3, ['Grue d\'atelier', 'Palan'], ['Grue ou palan pour depose moteur', 'Chariot a pieces', 'Limite 25 kg port manuel', 'Formation gestes et postures']),
      r('cas-tetanos', 'Risque biologique (tetanos, piqure)', 'Piqure par metal rouille, tetanos, infection', 'cas-demantelement', ['Piqure metal rouille', 'Coupure avec piece sale', 'Contact terre contaminee'], 3, 2, ['Vaccination tetanos a jour'], ['Tetanos obligatoire (rappel 10 ans)', 'Trousse premiers secours', 'Desinfection immediate des plaies']),
    ],
  },

  // ── Controle technique automobile ──────────────────────────────
  {
    metierSlug: 'controle-technique', label: 'Controle technique automobile', category: 'commerce_services',
    nafCodes: ['71.20A'], idcc: '1090',
    legalReferences: ['Arrete du 18/06/1991 (controle technique)', 'Art. R4412-1 (chimique)'],
    workUnits: [
      wu('ct-ligne', 'Ligne de controle', 'Inspection visuelle, tests freinometre, gaz echappement', '1-2'),
      wu('ct-fosse', 'Fosse d\'inspection', 'Verification dessous de caisse, suspensions, direction', '1'),
      wu('ct-bureau', 'Bureau / accueil', 'Saisie PV, accueil clients, administration', '1-2'),
      wu('ct-parking', 'Parking / manoeuvres', 'Manoeuvres vehicules, parking', '1'),
    ],
    risks: [
      r('ct-chimique', 'Gaz d\'echappement', 'Inhalation de gaz d\'echappement (CO, NOx, particules diesel) pendant les tests', 'ct-ligne', ['Test gaz echappement moteur tournant', 'Vehicule diesel (particules)', 'Ventilation insuffisante', 'Vehicule ancien (catalyseur use)'], 3, 4, ['Extraction gaz d\'echappement'], ['Extraction gaz raccordee a chaque vehicule', 'Detecteur CO avec alarme', 'Ventilation generale renforcee', 'Suivi medical renforce (exposition diesel)']),
      r('ct-bruit', 'Bruit (vehicules, freinometre)', 'Bruit des vehicules en test, freinometre, klaxon', 'ct-ligne', ['Moteur en acceleration', 'Freinometre', 'Klaxon teste', 'Vehicule ancien bruyant'], 2, 4, ['Bouchons oreilles disponibles'], ['Bouchons moules obligatoires sur ligne', 'Encoffrement partiel de la ligne', 'Audiogramme annuel']),
      r('ct-chute-fosse', 'Chute dans la fosse', 'Chute dans la fosse d\'inspection non protegee', 'ct-fosse', ['Fosse ouverte sans vehicule', 'Acces lateral de la fosse', 'Sol mouille autour de la fosse', 'Eclairage insuffisant'], 3, 2, ['Garde-corps amovibles', 'Eclairage fosse'], ['Garde-corps automatiques quand fosse vide', 'Eclairage fosse conforme', 'Sol antiderapant autour', 'Signalisation fosse ouverte']),
      r('ct-ecrasement', 'Ecrasement (vehicule sur pont/fosse)', 'Ecrasement par chute de vehicule du pont ou mouvement inattendu sur fosse', 'ct-fosse', ['Pont elevateur defaillant', 'Vehicule en mouvement sur fosse', 'Frein a main non serre'], 4, 1, ['Pont entretenu'], ['Verification annuelle pont (organisme agree)', 'Cales de roue obligatoires', 'Arret moteur en fosse', 'Consignation pont avant passage dessous']),
      r('ct-tms', 'TMS (postures, ecran)', 'Douleurs par postures de controle (penche, bras leves) et travail sur ecran', 'ct-ligne', ['Penche pour verifier eclairage', 'Bras leves pour controle dessous', 'Saisie repetitive au bureau', 'Station debout prolongee sur ligne'], 2, 3, ['Siege bureau ergonomique'], ['Alternance controle/bureau', 'Siege assis-debout sur ligne si possible', 'Perche pour controles en hauteur', 'Pauses actives']),
      r('ct-routier', 'Risque routier (manoeuvres)', 'Accident lors des manoeuvres de vehicules clients sur le parking', 'ct-parking', ['Manoeuvre vehicule inconnu', 'Vehicule avec defaut de freinage', 'Parking etroit'], 3, 2, ['Prudence en manoeuvre'], ['Procedure de manoeuvre definie', 'Vitesse 5 km/h max', 'Verification frein avant depart']),
      r('ct-agression', 'Agression (clients mecontents)', 'Violence verbale ou physique de clients mecontents du resultat du controle', 'ct-bureau', ['Contre-visite imposee', 'Client qui conteste le resultat', 'Pression pour valider le controle'], 2, 2, ['Procedure de refus'], ['Formation gestion de conflits', 'Procedure d\'escalade', 'Camera de surveillance']),
      r('ct-electrique', 'Risque electrique', 'Contact avec installations electriques ou vehicules electriques sur pont', 'ct-ligne', ['Pont elevateur electrique', 'Vehicule electrique/hybride', 'Installation eclairage'], 3, 1, ['Differentiel 30mA'], ['Formation vehicules electriques', 'Verification electrique annuelle']),
    ],
  },

  // ── Pret-a-porter ──────────────────────────────────────────────
  {
    metierSlug: 'pret-a-porter', label: 'Pret-a-porter / Mode', category: 'commerce_services',
    nafCodes: ['47.71Z'], idcc: '675',
    legalReferences: ['Code construction ERP Type M', 'Art. R4541-1 (manutention)'],
    workUnits: [
      wu('pap-magasin', 'Surface de vente', 'Vente, conseil, cabines d\'essayage', '2-6'),
      wu('pap-reserve', 'Reserve / stock', 'Stockage vetements, reception, demarquage', '1-2'),
      wu('pap-vitrine', 'Vitrine / etalage', 'Amenagement vitrine, mise en scene', '0-1'),
      wu('pap-caisse', 'Caisse / accueil', 'Encaissement, emballage cadeau', '1-2'),
    ],
    risks: [
      r('pap-tms', 'TMS (station debout, manutention)', 'Douleurs par station debout prolongee et port de cartons', 'pap-magasin', ['Station debout 8h', 'Port de cartons de vetements', 'Rangement rayons (bras leves/bas)', 'Pliage repetitif'], 2, 4, ['Tapis anti-fatigue'], ['Chaussures confort obligatoires', 'Tapis anti-fatigue en caisse', 'Escabeau pour rayons hauts', 'Rotation des taches']),
      r('pap-agression', 'Agression (vol, clients)', 'Confrontation lors de vol a l\'etalage ou client agressif', 'pap-caisse', ['Vol a l\'etalage', 'Client agressif (retour/echange)', 'Travail seul en soiree', 'Hold-up'], 3, 2, ['Camera', 'Antivol'], ['Formation reaction en cas de vol (ne pas intervenir)', 'Bouton d\'alerte', 'Camera de surveillance', 'Limitation encaisse']),
      r('pap-chute', 'Chute (escabeau, reserve)', 'Chute depuis escabeau ou glissade dans la reserve', 'pap-reserve', ['Escabeau pour rayons hauts', 'Reserve encombree', 'Sol reserve inegal', 'Cartons au sol'], 2, 2, ['Escabeau conforme'], ['Escabeau avec marche-pied', 'Rangement reserve organise', 'Eclairage suffisant']),
      r('pap-manutention', 'Manutention (cartons, portants)', 'Port de cartons de livraison, deplacement de portants charges', 'pap-reserve', ['Cartons de livraison (5-15 kg)', 'Portants charges (50+ vetements)', 'Mannequins d\'exposition', 'Amenagement vitrine'], 2, 3, ['Diable'], ['Diable pliable', 'Chariot a portants', 'Livraison a niveau si possible']),
      r('pap-rps', 'Risques psychosociaux', 'Stress lie aux objectifs de vente, soldes, horaires etendus', 'pap-magasin', ['Pression objectifs de vente', 'Periodes de soldes (cadence)', 'Horaires etendus (samedi, soiree)', 'Clients difficiles'], 2, 3, ['Planning anticipe'], ['Objectifs realistes', 'Renfort pendant les soldes', 'Equilibre vie pro/perso']),
      r('pap-incendie', 'Incendie (textile)', 'Depart de feu dans le stock de textiles (materiau inflammable)', 'pap-reserve', ['Stock de vetements (inflammable)', 'Installation electrique ancienne', 'Eclairage vitrine surchauffe'], 3, 1, ['Extincteurs', 'Detection incendie'], ['Detection incendie en reserve', 'Interdiction sources de chaleur', 'Exercice evacuation annuel']),
      r('pap-electrique', 'Risque electrique', 'Contact avec eclairage vitrine, caisses, installations', 'pap-vitrine', ['Eclairage vitrine surchauffe', 'Multiprises en cascade', 'Decorations electriques'], 3, 1, ['Differentiel 30mA'], ['Eclairage LED (moins de chaleur)', 'Verification electrique annuelle', 'Interdiction multiprises en cascade']),
      r('pap-chimique', 'Risque chimique (nettoyage)', 'Irritation par produits de nettoyage de la boutique', 'pap-magasin', ['Nettoyage sol et cabines', 'Vitres'], 1, 2, ['Gants menage'], ['Produits eco-labellises', 'Gants nitrile']),
    ],
  },

  // ── Opticien ───────────────────────────────────────────────────
  {
    metierSlug: 'opticien', label: 'Opticien-Lunetier', category: 'commerce_services',
    nafCodes: ['47.78A'], idcc: '1431',
    legalReferences: ['Art. R4412-1 (chimique)', 'Directive Equipements Medicaux'],
    workUnits: [
      wu('opt-magasin', 'Magasin / vente', 'Accueil, conseil, vente de lunettes', '1-3'),
      wu('opt-atelier', 'Atelier montage / retouche', 'Taillage, montage, ajustage des verres', '1-2'),
      wu('opt-examen', 'Salle d\'examen', 'Examens de vue, adaptations lentilles', '1'),
      wu('opt-bureau', 'Bureau / administratif', 'Gestion, mutuelles, devis', '1'),
    ],
    risks: [
      r('opt-chimique', 'Risque chimique (colles UV, solvants)', 'Exposition aux colles UV, solvants de nettoyage, resines de montage', 'opt-atelier', ['Collage de verres a la colle UV', 'Solvant de nettoyage verres', 'Resine de montage nylor', 'Manipulation de traitement anti-reflet'], 2, 3, ['Ventilation atelier'], ['Gants nitrile pour manipulation', 'Ventilation locale au poste de montage', 'Lunettes de protection UV lors du collage', 'FDS affichees']),
      r('opt-tms', 'TMS (postures precision)', 'Douleurs poignets et nuque par gestes de precision prolonges', 'opt-atelier', ['Montage lunettes (precision)', 'Ajustage montures (force + precision)', 'Taillage verres', 'Posture penchee sur l\'etabli'], 2, 4, ['Loupe eclairante'], ['Etabli a hauteur reglable', 'Loupe binoculaire eclairante', 'Pauses toutes les 45 min', 'Etirements des mains et cou']),
      r('opt-eclairage', 'Fatigue visuelle (eclairage)', 'Fatigue visuelle liee au travail de precision et aux ecrans', 'opt-examen', ['Travail de precision sous eclairage fort', 'Examens de vue (salle sombre)', 'Ecran de gestion (devis, mutuelles)', 'Lumiere artificielle prolongee'], 2, 3, ['Eclairage reglable'], ['Eclairage directionnel au poste de montage', 'Pauses visuelles (regle 20-20-20)', 'Filtres ecran anti-lumiere bleue']),
      r('opt-agression', 'Agression (clients)', 'Violence verbale de clients mecontents (garantie, delai, prix)', 'opt-magasin', ['Client mecontent du delai', 'Litige sur la garantie', 'Contestation du prix', 'Lunettes mal adaptees'], 2, 2, ['Communication'], ['Formation gestion de conflits', 'Procedure de reclamation claire']),
      r('opt-projection', 'Projections (taillage verres)', 'Projection d\'eclats de verre lors du taillage ou du meulage', 'opt-atelier', ['Taillage automatique', 'Meulage manuel de retouche', 'Percage verres (montage invisible)', 'Eclatement de verre'], 2, 2, ['Meuleuse avec carter'], ['Lunettes de protection au meulage/percage', 'Carter de protection meuleuse', 'Aspiration poussieres de verre']),
      r('opt-electrique', 'Risque electrique', 'Contact avec equipements electriques de l\'atelier et du magasin', 'opt-atelier', ['Meuleuse automatique', 'Perceuse a verre', 'Installations eclairage'], 3, 1, ['Differentiel 30mA'], ['Verification electrique annuelle', 'Remplacement immediat cables endommages']),
      r('opt-chute', 'Chute de plain-pied', 'Glissade sur sol de magasin lisse ou en reserve', 'opt-magasin', ['Sol lisse du magasin', 'Reserve encombree', 'Cables au sol'], 2, 2, ['Chaussures fermees'], ['Sol antiderapant en entree', 'Rangement reserve']),
      r('opt-manutention', 'Manutention (cartons)', 'Port de cartons de montures, livraisons de verres', 'opt-magasin', ['Cartons de montures', 'Livraisons de verres', 'Vitrines a deplacer'], 1, 2, ['Rangement a portee de main'], ['Stockage a hauteur de travail', 'Aide pour vitrines lourdes']),
    ],
  },

  // ── Bijouterie-Horlogerie ──────────────────────────────────────
  {
    metierSlug: 'bijouterie', label: 'Bijouterie-Horlogerie', category: 'commerce_services',
    nafCodes: ['47.77Z', '32.12Z'], idcc: '567',
    legalReferences: ['Art. R4412-1 (chimique)', 'Art. R4541-1 (manutention)'],
    workUnits: [
      wu('bij-boutique', 'Boutique / vente', 'Vente, conseil, presentation bijoux', '1-3'),
      wu('bij-atelier', 'Atelier reparation', 'Reparation, soudure, sertissage, polissage', '1-2'),
      wu('bij-coffre', 'Coffre / reserve', 'Stockage bijoux de valeur', '1'),
      wu('bij-bureau', 'Bureau / expertise', 'Expertise, devis, administration', '1'),
    ],
    risks: [
      r('bij-agression', 'Agression / braquage', 'Risque eleve de braquage lie aux objets de valeur en vitrine', 'bij-boutique', ['Braquage a main armee', 'Vol a l\'arrache', 'Cambriolage', 'Smash and grab (vitrine)'], 4, 2, ['Camera', 'Vitrine blindee', 'Coffre-fort'], ['Vitrines anti-effraction', 'Sas d\'entree avec controle', 'Coffre-fort temporise', 'Camera reliee telesurveillance', 'Bouton d\'alerte silencieux', 'Formation reaction braquage']),
      r('bij-chimique', 'Risque chimique (solvants, acides)', 'Exposition a des solvants de nettoyage, acides de test or, bain de decapage', 'bij-atelier', ['Bain ultrason (solvant)', 'Acide nitrique (test or)', 'Bain de decapage (acide)', 'Flux de soudure (borax)'], 3, 3, ['Gants nitrile', 'Ventilation'], ['Sorbonne ou aspiration locale pour acides', 'Gants chimiques pour manipulation acides', 'Lunettes de protection', 'FDS affichees', 'Ventilation atelier renforcee']),
      r('bij-tms', 'TMS (travail de precision)', 'Douleurs poignets, nuque, yeux par travail de precision prolonge', 'bij-atelier', ['Sertissage sous loupe binoculaire', 'Gravure', 'Reparation horlogerie (pincettes)', 'Polissage repetitif'], 2, 4, ['Loupe eclairante'], ['Loupe binoculaire avec eclairage LED', 'Etabli a hauteur reglable', 'Appui-bras', 'Pauses toutes les 30 min', 'Etirements mains et cou']),
      r('bij-brulure', 'Brulure (soudure, polissage)', 'Brulure par chalumeau de soudure ou friction du polissage', 'bij-atelier', ['Soudure bijou au chalumeau', 'Polissage rotatif (friction)', 'Fonte de metal', 'Recuit piece'], 2, 3, ['Gants en cuir fins'], ['Zone de soudure dediee', 'Extincteur CO2 au poste', 'Protection oculaire pour soudure', 'Marquage pieces chaudes']),
      r('bij-projection', 'Projections (polissage)', 'Projection de bijou par la brosse de polissage', 'bij-atelier', ['Polissage au touret (piece arrachee)', 'Meulage', 'Eclats de pierre precieuse'], 2, 2, ['Lunettes de protection'], ['Ecran de protection au touret', 'Lunettes EN 166', 'Formation polissage securise']),
      r('bij-rps', 'Risques psychosociaux', 'Stress lie au risque de braquage, manipulation objets de valeur', 'bij-boutique', ['Stress lie au risque de braquage permanent', 'Responsabilite des objets de valeur', 'Travail seul', 'Clients exigeants'], 3, 2, ['Procedure securite'], ['Soutien psychologique post-incident', 'Procedure travailleur isole', 'Formation gestion du stress']),
      r('bij-incendie', 'Incendie (soudure, solvants)', 'Depart de feu par chalumeau, solvants, bain ultrason', 'bij-atelier', ['Chalumeau de soudure', 'Solvants inflammables', 'Court-circuit'], 3, 1, ['Extincteur CO2'], ['Permis de feu', 'Extincteur CO2 au poste', 'Ventilation anti-deflagrante']),
      r('bij-electrique', 'Risque electrique', 'Contact avec equipements electriques d\'atelier', 'bij-atelier', ['Bain ultrason electrique', 'Polisseuse', 'Eclairage atelier'], 3, 1, ['Differentiel 30mA'], ['Verification electrique annuelle', 'Remplacement immediat equipements defectueux']),
    ],
  },

  // ── Parfumerie ─────────────────────────────────────────────────
  {
    metierSlug: 'parfumerie', label: 'Parfumerie', category: 'commerce_services',
    nafCodes: ['47.75Z'], idcc: '2098',
    legalReferences: ['Art. R4412-1 (chimique)', 'Reglement CE 1223/2009 (cosmetiques)'],
    workUnits: [
      wu('parf-magasin', 'Espace de vente', 'Vente, conseil, demonstration produits', '2-6'),
      wu('parf-reserve', 'Reserve / stockage', 'Stockage parfums, cosmetiques', '1'),
      wu('parf-caisse', 'Caisse / emballage', 'Encaissement, emballage cadeau', '1-2'),
      wu('parf-soin', 'Cabine de soin (si existante)', 'Soins esthetiques, maquillage', '0-1'),
    ],
    risks: [
      r('parf-chimique', 'Risque chimique (parfums, alcool)', 'Irritation par inhalation d\'alcool de parfum, formaldehyde dans certains produits', 'parf-magasin', ['Testeurs parfum (pulverisation repetee)', 'Alcool de parfum (irritant)', 'Deballage cartons de parfum', 'Nettoyage testeurs'], 2, 3, ['Ventilation du magasin'], ['Ventilation renforcee en zone testeurs', 'Limitation nombre de pulverisations/jour', 'Pauses en zone non parfumee', 'Suivi medical si symptomes respiratoires']),
      r('parf-allergie', 'Allergie (produits cosmetiques)', 'Dermatite de contact, allergie respiratoire aux produits cosmetiques', 'parf-soin', ['Demonstration produits sur la peau', 'Maquillage clients', 'Contact repete avec cosmetiques', 'Parfums fortement concentres'], 2, 3, ['Gants latex-free'], ['Gants nitrile pour les demonstrations', 'Creme protectrice mains', 'Suivi dermatologique si symptomes', 'Produits hypoallergeniques pour le personnel']),
      r('parf-agression', 'Agression / vol', 'Agression lors de vol a l\'etalage (parfums de valeur), braquage', 'parf-magasin', ['Vol de parfum (produits chers)', 'Client agressif', 'Braquage', 'Tentative de vol organise'], 3, 2, ['Camera', 'Antivol'], ['Antivol sur tous les produits', 'Camera de surveillance', 'Bouton d\'alerte', 'Formation reaction vol/braquage']),
      r('parf-tms', 'TMS (station debout)', 'Douleurs par station debout prolongee sur sol dur', 'parf-magasin', ['Station debout 8h', 'Talons (code vestimentaire)', 'Port de produits en rayon', 'Posture de demonstration'], 2, 3, ['Tapis anti-fatigue en caisse'], ['Chaussures confort autorisees', 'Tapis anti-fatigue', 'Pauses assises regulieres', 'Tabouret assis-debout']),
      r('parf-incendie', 'Incendie (alcool, aerosols)', 'Depart de feu par stock d\'alcool de parfum et aerosols', 'parf-reserve', ['Stock de parfums (alcool)', 'Aerosols (propulseur inflammable)', 'Deodorants', 'Installation electrique ancienne'], 3, 1, ['Extincteurs', 'Detection incendie'], ['Stockage aerosols en armoire ventilee', 'Detection incendie en reserve', 'Interdiction sources de chaleur', 'Exercice evacuation annuel']),
      r('parf-manutention', 'Manutention (cartons)', 'Port de cartons de produits lors des livraisons et mise en rayon', 'parf-reserve', ['Cartons de livraison', 'Coffrets cadeaux (periodes de fetes)', 'Vitrines de presentation a deplacer'], 2, 2, ['Diable'], ['Livraison a niveau si possible', 'Rangement a hauteur de travail']),
      r('parf-chute', 'Chute de plain-pied', 'Glissade sur sol du magasin, casse de produits (verre)', 'parf-magasin', ['Sol lisse', 'Parfum renverse (glissant)', 'Verre casse au sol'], 2, 2, ['Chaussures fermees'], ['Nettoyage immediat si casse', 'Pelle a verre derriere la caisse', 'Sol antiderapant en entree']),
      r('parf-rps', 'Risques psychosociaux', 'Pression des objectifs de vente, clients exigeants', 'parf-magasin', ['Objectifs de CA', 'Clients exigeants', 'Periodes de fetes (rush)'], 2, 2, ['Communication'], ['Objectifs realistes', 'Renfort en periodes de pointe']),
    ],
  },

  // ── Station-service ────────────────────────────────────────────
  {
    metierSlug: 'station-service', label: 'Station-service', category: 'commerce_services',
    nafCodes: ['47.30Z'], idcc: '1672',
    legalReferences: ['ICPE rubrique 1432 (carburants)', 'Directive ATEX 1999/92/CE', 'Arrete du 22/06/1998'],
    workUnits: [
      wu('ss-piste', 'Piste de distribution', 'Distribution de carburant, nettoyage piste', '1-2'),
      wu('ss-boutique', 'Boutique / caisse', 'Vente, encaissement, restauration rapide', '1-3'),
      wu('ss-technique', 'Local technique / cuves', 'Maintenance cuves, reception livraison carburant', '0-1'),
      wu('ss-lavage', 'Station de lavage', 'Entretien station de lavage automatique', '0-1'),
    ],
    risks: [
      r('ss-atex', 'Incendie / ATEX (carburants)', 'Risque d\'incendie ou d\'explosion par vapeurs de carburant', 'ss-piste', ['Vapeurs d\'essence (zone ATEX)', 'Debordement lors du remplissage', 'Fuite de cuve', 'Client fumant sur la piste', 'Electricite statique'], 4, 2, ['Zonage ATEX conforme', 'Extincteurs', 'Interdiction fumer'], ['Zonage ATEX a jour', 'Detection vapeurs HC avec alarme', 'Bouton d\'arret d\'urgence accessible', 'Extincteurs poudre ABC a chaque ilot', 'Formation incendie annuelle', 'Signalisation interdiction portable/fumer']),
      r('ss-chimique', 'Vapeurs carburant', 'Inhalation de vapeurs de carburant (benzene, HAP) lors de la distribution', 'ss-piste', ['Distribution de carburant', 'Nettoyage deversement', 'Reception livraison citerne', 'Travail prolonge sur piste'], 3, 3, ['Ventilation naturelle (piste exterieure)'], ['Pistolets avec retour vapeur', 'Limitation du temps sur piste', 'Pas de distribution manuelle si possible', 'Suivi medical renforce (exposition benzene)']),
      r('ss-agression', 'Agression / hold-up (nuit)', 'Risque eleve d\'agression et de braquage, surtout en horaires nocturnes', 'ss-boutique', ['Hold-up (caisse)', 'Agression nocturne', 'Client ne payant pas', 'Depart sans payer (drive-off)'], 3, 3, ['Camera', 'Eclairage'], ['Caisse blindee si horaires de nuit', 'Guichet de nuit si possible', 'Camera reliee telesurveillance', 'Bouton d\'alerte silencieux', 'Limitation encaisse', 'Formation reaction braquage']),
      r('ss-glissade', 'Glissade (carburant, eau)', 'Chute sur sol rendu glissant par carburant renverse, eau, huile', 'ss-piste', ['Carburant renverse', 'Sol mouille (pluie sur piste)', 'Huile vehicule au sol', 'Eau de lavage'], 2, 3, ['Chaussures antiderapantes'], ['Absorbant a disposition sur piste', 'Nettoyage immediat deversement', 'Sol antiderapant piste']),
      r('ss-routier', 'Risque routier (piste)', 'Heurt par vehicule en manoeuvre sur la piste de distribution', 'ss-piste', ['Vehicule en manoeuvre', 'Client recule sans regarder', 'PL en manoeuvre', 'Sortie de piste rapide'], 3, 2, ['Balisage ilots'], ['Sens de circulation defini', 'Vitesse limitee 20 km/h', 'Eclairage suffisant de la piste', 'Gilet EN 20471 pour travail sur piste']),
      r('ss-tms', 'TMS (station debout)', 'Douleurs par station debout prolongee en boutique', 'ss-boutique', ['Station debout 8h', 'Mise en rayon boutique', 'Caisse repetitive'], 2, 3, ['Tabouret en caisse'], ['Tapis anti-fatigue', 'Rotation caisse/rayon', 'Pauses regulieres']),
      r('ss-environnement', 'Pollution environnementale (deversement)', 'Deversement de carburant contaminant sol et eaux', 'ss-technique', ['Fuite de cuve enterree', 'Debordement livraison', 'Deversement client'], 3, 1, ['Bac de retention', 'Kit anti-pollution'], ['Controle etancheite cuves annuel', 'Kit anti-pollution a disposition', 'Procedure en cas de deversement', 'Separateur hydrocarbures']),
      r('ss-electrique', 'Risque electrique', 'Contact avec installations electriques, bornes de recharge', 'ss-technique', ['Borne de recharge VE', 'Installation electrique piste', 'Eclairage'], 3, 1, ['Differentiel 30mA'], ['Verification electrique annuelle', 'Formation bornes de recharge']),
    ],
  },

  // ── Vente de mobilier ──────────────────────────────────────────
  {
    metierSlug: 'vente-mobilier', label: 'Vente de mobilier', category: 'commerce_services',
    nafCodes: ['47.59A', '47.59B'], idcc: '1880',
    legalReferences: ['Art. R4541-1 (manutention)', 'Code construction ERP Type M'],
    workUnits: [
      wu('mob-showroom', 'Showroom / exposition', 'Exposition meubles, accueil clients, vente', '2-6'),
      wu('mob-entrepot', 'Entrepot / stockage', 'Stockage meubles, preparation livraison', '1-3'),
      wu('mob-livraison', 'Vehicule / livraison', 'Livraison et montage chez le client', '1-3'),
      wu('mob-bureau', 'Bureau / devis', 'Administration, devis, SAV', '1-2'),
    ],
    risks: [
      r('mob-manutention', 'Manutention lourde (meubles)', 'Port de meubles lourds et encombrants (armoire 80 kg, canape 50 kg)', 'mob-entrepot', ['Chargement camion', 'Dechargement chez le client', 'Deplacement meubles en showroom', 'Montage meubles'], 3, 4, ['Chariot', 'Diable'], ['Diable porte-meuble (chenilles escalier)', 'Sangles de portage', 'Manutention a 2 obligatoire > 30 kg', 'Monte-meuble pour les etages', 'Formation gestes et postures']),
      r('mob-routier', 'Risque routier (livraisons)', 'Accident lors des livraisons avec vehicule charge de meubles', 'mob-livraison', ['Vehicule surcharge', 'Arrimage insuffisant', 'Livraison en ville (gabarit)', 'Stationnement difficile'], 3, 3, ['Vehicule entretenu', 'Sangles'], ['Arrimage conforme obligatoire', 'Respect charge utile', 'Planning avec temps de trajet', 'Formation eco-conduite']),
      r('mob-chute-objet', 'Chute d\'objets (meubles)', 'Chute de meuble lors du dechargement ou du montage', 'mob-livraison', ['Basculement de meuble', 'Meuble glissant des mains', 'Chute dans l\'escalier', 'Colis tombe du camion'], 3, 3, ['Chaussures securite S3'], ['Sangles de portage avec poignees', 'Communication entre porteurs', 'Balisage zone de dechargement', 'Gants anti-glissement']),
      r('mob-tms', 'TMS (station debout, montage)', 'Douleurs par station debout en showroom et postures de montage chez le client', 'mob-showroom', ['Station debout 8h en showroom', 'Montage meuble au sol (genoux)', 'Serrage repetitif (visseuse)', 'Port de coussins/matelas'], 2, 3, ['Genouilleres pour montage'], ['Tapis anti-fatigue au bureau/accueil', 'Genouilleres pour montage au sol', 'Visseuse ergonomique', 'Rotation vente/livraison']),
      r('mob-coupure', 'Coupures (cutter, verre)', 'Coupure lors du deballage (cutter), manipulation de vitrines en verre', 'mob-entrepot', ['Deballage cartons au cutter', 'Manipulation vitrine en verre', 'Miroirs', 'Eclats de bois (panneaux MDF)'], 2, 3, ['Gants pour verre'], ['Cutter a lame retractable', 'Gants anti-coupure pour manipulation verre', 'Evacuation emballages immediate']),
      r('mob-chute', 'Chute de plain-pied', 'Glissade dans l\'entrepot ou chez le client', 'mob-entrepot', ['Emballages au sol', 'Sol mouille entrepot', 'Obstacles chez le client (tapis, cables)'], 2, 2, ['Chaussures securite'], ['Rangement emballages continu', 'Eclairage suffisant', 'Reperage obstacles chez le client']),
      r('mob-agression', 'Agression (clients)', 'Violence verbale de clients mecontents (livraison, SAV)', 'mob-showroom', ['Litige livraison', 'Meuble endommage', 'Retard de livraison'], 2, 2, ['Communication client'], ['Formation gestion de conflits', 'Procedure reclamation']),
      r('mob-incendie', 'Incendie (entrepot)', 'Depart de feu dans l\'entrepot de meubles et textiles', 'mob-entrepot', ['Stock de meubles (bois, tissu)', 'Emballages carton/polystyrene', 'Installation electrique'], 3, 1, ['Extincteurs', 'Detection'], ['Detection incendie en entrepot', 'Desenfumage', 'Exercice evacuation', 'Interdiction sources de chaleur']),
    ],
  },

  // ── Commerce d'occasion ────────────────────────────────────────
  {
    metierSlug: 'commerce-occasion', label: 'Commerce d\'occasion / Brocante', category: 'commerce_services',
    nafCodes: ['47.79Z'], idcc: '3015',
    legalReferences: ['Art. R4541-1 (manutention)', 'Decret 2009-898 (obligations brocanteurs)'],
    workUnits: [
      wu('occ-boutique', 'Boutique / depot-vente', 'Vente, estimation, accueil clients', '1-3'),
      wu('occ-reserve', 'Reserve / stockage', 'Stockage objets divers, meubles', '1-2'),
      wu('occ-livraison', 'Vehicule / brocante', 'Deplacements, brocantes, livraisons', '1'),
      wu('occ-atelier', 'Atelier restauration', 'Nettoyage, petite restauration d\'objets', '0-1'),
    ],
    risks: [
      r('occ-manutention', 'Manutention (objets divers)', 'Port d\'objets varies et souvent lourds (meubles, electromenager)', 'occ-reserve', ['Meubles anciens (lourds)', 'Electromenager', 'Cartons de livres', 'Objets encombrants'], 3, 3, ['Diable', 'Chariot'], ['Diable pliant', 'Aide pour objets > 25 kg', 'Gants manutention']),
      r('occ-chimique', 'Risque chimique (objets divers)', 'Contact avec produits inconnus, peinture au plomb, moisissures sur anciens objets', 'occ-atelier', ['Meubles avec peinture au plomb', 'Objets moisis', 'Produits de restauration (solvants)', 'Poussiere d\'objets anciens'], 2, 2, ['Gants', 'Ventilation'], ['Gants nitrile pour objets suspects', 'Masque FFP2 si objet moisi', 'Ventilation atelier restauration']),
      r('occ-agression', 'Agression (vol, litiges)', 'Confrontation lors de vol ou litige sur la valeur d\'un objet', 'occ-boutique', ['Vol d\'objet', 'Client contestant un prix', 'Travail seul', 'Brocante en exterieur'], 2, 2, ['Camera'], ['Procedure en cas de vol', 'Camera de surveillance', 'Travail a deux si possible']),
      r('occ-chute', 'Chute (reserve encombree)', 'Chute dans une reserve souvent encombree d\'objets divers', 'occ-reserve', ['Reserve encombree', 'Objets au sol', 'Eclairage insuffisant', 'Escalier de cave'], 2, 3, ['Chaussures fermees'], ['Rangement regulier', 'Eclairage suffisant', 'Allees degagees']),
      r('occ-routier', 'Risque routier', 'Accident lors des deplacements (brocantes, livraisons, achats)', 'occ-livraison', ['Deplacements frequents', 'Vehicule charge', 'Brocante tot le matin'], 3, 2, ['Vehicule entretenu'], ['Arrimage du chargement', 'Respect charge utile']),
      r('occ-tetanos', 'Risque biologique (tetanos)', 'Piqure par objet rouille, tetanos', 'occ-reserve', ['Objet rouille', 'Clou dans un meuble', 'Coupure par objet ancien'], 3, 1, ['Vaccination tetanos'], ['Tetanos a jour (rappel 10 ans)', 'Trousse premiers secours', 'Desinfection immediate']),
      r('occ-incendie', 'Incendie (stock divers)', 'Depart de feu dans un stock heterogene (textiles, bois, papier)', 'occ-reserve', ['Stock divers inflammable', 'Installation electrique ancienne', 'Chauffage d\'appoint'], 3, 1, ['Extincteurs'], ['Detection incendie', 'Interdiction chauffage d\'appoint', 'Verification electrique']),
      r('occ-poussieres', 'Poussieres (objets anciens)', 'Inhalation de poussieres lors de la manipulation d\'objets anciens', 'occ-reserve', ['Deballage d\'objets stockes longtemps', 'Nettoyage meubles anciens', 'Manipulation textiles anciens'], 2, 2, ['Masque FFP2 si necessaire'], ['Nettoyage en zone ventilee', 'Masque FFP2 pour objets tres poussiereux']),
    ],
  },

  // ── Maroquinerie ───────────────────────────────────────────────
  {
    metierSlug: 'maroquinerie', label: 'Maroquinerie / Sellerie', category: 'commerce_services',
    nafCodes: ['15.12Z', '47.72B'], idcc: '2528',
    legalReferences: ['Art. R4412-1 (chimique)', 'Directive Machines 2006/42/CE'],
    workUnits: [
      wu('maro-atelier', 'Atelier de fabrication', 'Coupe, couture, collage, finition du cuir', '1-4'),
      wu('maro-decoupe', 'Poste de decoupe', 'Decoupe du cuir a l\'emporte-piece ou au cutter', '1-2'),
      wu('maro-boutique', 'Boutique / vente', 'Vente, conseil, reparation', '1-2'),
      wu('maro-stockage', 'Stockage peaux', 'Stockage peaux, accessoires, fils', '1'),
    ],
    risks: [
      r('maro-chimique', 'Risque chimique (colles, teintures)', 'Inhalation de vapeurs de colles neoprene, teintures, solvants de finition', 'maro-atelier', ['Collage neoprene (solvant)', 'Application teinture', 'Finition (vernis, cire)', 'Nettoyage outils au solvant'], 3, 3, ['Ventilation', 'Gants nitrile'], ['Substitution colles aqueuses si possible', 'Aspiration locale au poste de collage', 'Masque A2 si collage neoprene', 'Gants nitrile obligatoires', 'FDS affichees']),
      r('maro-tms', 'TMS (couture, precision)', 'Douleurs poignets, epaules par gestes repetitifs de couture et manipulation', 'maro-atelier', ['Couture machine (posture)', 'Couture main (effort poignet)', 'Parage au couteau', 'Pose de rivets (force)'], 2, 4, ['Etabli reglable'], ['Machine a coudre avec entrainement adapte', 'Outils ergonomiques (emporte-piece hydraulique)', 'Pauses toutes les 45 min', 'Etirements poignets']),
      r('maro-coupure', 'Coupures (couteau, emporte-piece)', 'Laceration par couteau a parer, tranchet, emporte-piece', 'maro-decoupe', ['Decoupe au tranchet', 'Parage au couteau', 'Emporte-piece (main sous la presse)', 'Ouverture peaux au cutter'], 3, 3, ['Gants anti-coupure fins'], ['Couteau a parer avec garde', 'Emporte-piece avec securite (2 mains)', 'Regle de coupe metallique', 'Tapis de coupe auto-cicatrisant']),
      r('maro-allergie', 'Allergie (cuir, chrome)', 'Dermatite de contact par les agents de tannage du cuir (chrome III)', 'maro-atelier', ['Manipulation cuir tanne au chrome', 'Contact prolonge avec peaux neuves', 'Poussiere de ponçage cuir'], 2, 2, ['Gants nitrile'], ['Gants nitrile pour manipulation cuir neuf', 'Lavage mains apres manipulation', 'Creme protectrice', 'Suivi dermatologique si symptomes']),
      r('maro-bruit', 'Bruit (machines)', 'Bruit de la machine a coudre industrielle, emporte-piece, riveteuse', 'maro-atelier', ['Machine a coudre industrielle', 'Emporte-piece pneumatique', 'Riveteuse', 'Presse'], 2, 3, ['Bouchons disponibles'], ['Tapis anti-vibration sous machines', 'Maintenance machines (reduction bruit)', 'Protection auditive si > 80 dB']),
      r('maro-incendie', 'Incendie (colles, cuir)', 'Depart de feu par colles solvantees ou stock de cuir', 'maro-stockage', ['Colles inflammables', 'Stock de cuir', 'Fils et garnitures'], 3, 1, ['Extincteurs'], ['Stockage colles dans armoire ventilee', 'Detection incendie', 'Interdiction flamme nue en atelier']),
      r('maro-eclairage', 'Fatigue visuelle', 'Fatigue visuelle par travail de precision sous eclairage inadapte', 'maro-atelier', ['Couture fine', 'Finition (peinture tranche)', 'Controle qualite'], 2, 3, ['Eclairage de poste'], ['Eclairage LED directionnel au poste', 'Pauses visuelles regulieres', 'Regle 20-20-20']),
      r('maro-manutention', 'Manutention (rouleaux de cuir)', 'Port de peaux et rouleaux de cuir (10-30 kg)', 'maro-stockage', ['Rouleaux de cuir', 'Caisses d\'accessoires', 'Machines a deplacer'], 2, 2, ['Chariot'], ['Stockage peaux a portee', 'Chariot pour rouleaux']),
    ],
  },

  // ── Cycles / Velos ─────────────────────────────────────────────
  {
    metierSlug: 'cycles-velos', label: 'Cycles et Velos', category: 'commerce_services',
    nafCodes: ['47.64Z', '95.29Z'], idcc: '1557',
    legalReferences: ['NF C 18-510 (habilitation electrique VAE)', 'Directive Batteries 2006/66/CE'],
    workUnits: [
      wu('velo-atelier', 'Atelier reparation', 'Reparation, montage, entretien velos et VAE', '1-3'),
      wu('velo-magasin', 'Magasin / vente', 'Vente de velos et accessoires', '1-3'),
      wu('velo-reserve', 'Reserve / stockage', 'Stockage velos, pieces, batteries', '1'),
      wu('velo-essai', 'Zone d\'essai', 'Essais clients, reglages', '0-1'),
    ],
    risks: [
      r('velo-chimique', 'Risque chimique (solvants, huiles)', 'Contact avec degraissants, lubrifiants, colles de rustine', 'velo-atelier', ['Degraissage chaine au solvant', 'Lubrification composants', 'Colle de rustine', 'Nettoyant frein a disque'], 2, 3, ['Gants nitrile'], ['Gants nitrile au poste de travail', 'Ventilation atelier', 'Degraissant biodegradable si possible', 'FDS affichees']),
      r('velo-electrique', 'Electrisation (batteries lithium VAE)', 'Risque electrique lors de la manipulation de batteries lithium haute tension', 'velo-atelier', ['Demontage batterie VAE', 'Diagnostic electrique', 'Batterie endommagee', 'Court-circuit lors de la manipulation'], 3, 2, ['Formation VAE'], ['Formation specifique VAE/batteries lithium', 'Gants isolants pour manipulation batterie', 'Multimetre adapte', 'Stockage batteries dans armoire ignifugee', 'Procedure batterie endommagee (ne pas recharger)']),
      r('velo-tms', 'TMS (postures, repetitions)', 'Douleurs par postures de reparation et gestes repetitifs', 'velo-atelier', ['Penche sur le velo (reglages)', 'Serrage repetitif (roues, pedalier)', 'Station debout au pied d\'atelier', 'Montage en serie'], 2, 3, ['Pied d\'atelier reglable'], ['Pied d\'atelier a hauteur reglable', 'Tabouret d\'atelier', 'Rotation taches atelier/vente', 'Pauses actives']),
      r('velo-coupure', 'Coupures (cables, disques)', 'Coupure par cables metalliques, disques de frein, plateaux', 'velo-atelier', ['Coupe de cable metallique', 'Manipulation disque de frein', 'Dents de plateau', 'Rayons casses'], 2, 3, ['Gants de mecanicien'], ['Pince coupe-cable de qualite', 'Gants fins de mecanicien', 'Trousse premiers secours']),
      r('velo-incendie', 'Incendie (batterie lithium)', 'Emballement thermique de batterie lithium en charge ou endommagee', 'velo-reserve', ['Batterie en charge non surveillee', 'Batterie endommagee (choc, eau)', 'Surcharge electrique (multiprises)', 'Stockage batteries defectueuses'], 4, 1, ['Extincteur'], ['Zone de charge dediee et surveillee', 'Extincteur adapte batteries lithium', 'Stockage batteries defectueuses en bac sable', 'Interdiction de charger la nuit sans surveillance', 'Detection incendie dans la zone de charge']),
      r('velo-manutention', 'Manutention (velos, cartons)', 'Port de velos (10-25 kg), cartons de pieces, velos cargo (40 kg)', 'velo-reserve', ['Velos en carton (15-25 kg)', 'Velos cargo ou longtail (30-40 kg)', 'Caisses de pieces', 'Accrochage velos en hauteur'], 2, 3, ['Chariot'], ['Chariot a velos', 'Support mural a hauteur accessible', 'Aide pour velos cargo', 'Limite 25 kg port manuel']),
      r('velo-chute', 'Chute de plain-pied', 'Trebuchement sur velos, pieces au sol dans l\'atelier', 'velo-atelier', ['Velos au sol', 'Roues et pieces au sol', 'Huile au sol', 'Cables au sol'], 2, 3, ['Chaussures fermees'], ['Rangement continu atelier', 'Crochets muraux pour velos en attente', 'Nettoyage huile immediat']),
      r('velo-agression', 'Agression (vol)', 'Vol de velos de valeur (electriques), confrontation', 'velo-magasin', ['Vol de VAE (1000-5000 EUR)', 'Vol a l\'arrache', 'Client agressif'], 3, 1, ['Antivol exposition', 'Camera'], ['Antivol sur tous les velos exposes', 'Camera surveillance', 'Formation reaction vol']),
    ],
  },

  // ── Location materiel ski ──────────────────────────────────────
  {
    metierSlug: 'location-ski', label: 'Location de materiel de ski', category: 'commerce_services',
    nafCodes: ['77.21Z'], idcc: '1557',
    legalReferences: ['NF S 52-410 (reglage fixations)', 'Art. R4541-1 (manutention)'],
    workUnits: [
      wu('ski-magasin', 'Magasin / accueil', 'Accueil clients, essayage chaussures, remise materiel', '2-6'),
      wu('ski-atelier', 'Atelier reglage / affutage', 'Reglage fixations, affutage, fartage, reparation', '1-3'),
      wu('ski-stockage', 'Stockage materiel', 'Rangement skis, chaussures, casques', '1-2'),
      wu('ski-exterieur', 'Espace exterieur / ski', 'Remise materiel sur la piste, recuperation', '0-1'),
    ],
    risks: [
      r('ski-tms', 'TMS (manutention, repetitions)', 'Douleurs par port repetitif de skis, chaussures, et reglage de fixations', 'ski-magasin', ['Port de paires de skis (5-10 kg x50/jour)', 'Chaussage client (position accroupie)', 'Reglage fixation (force)', 'Station debout 10h en saison'], 3, 4, ['Tapis anti-fatigue'], ['Table de reglage a hauteur reglable', 'Banc de chaussage ergonomique', 'Rotation des postes', 'Renfort saisonnier suffisant', 'Echauffement avant ouverture']),
      r('ski-coupure', 'Coupures (carres, affuteuse)', 'Laceration par les carres affutees des skis ou par la machine d\'affutage', 'ski-atelier', ['Manipulation skis aux carres affutees', 'Machine d\'affutage', 'Racloir de fartage', 'Outils de reglage'], 3, 3, ['Gants anti-coupure'], ['Gants anti-coupure EN 388 obligatoires en atelier', 'Carter de protection affuteuse', 'Rangement skis carres vers le mur']),
      r('ski-bruit', 'Bruit (machines d\'affutage)', 'Bruit des machines d\'affutage, de fartage, de ponçage (> 85 dB)', 'ski-atelier', ['Machine d\'affutage (bande)', 'Ponceuse de semelle', 'Machine de fartage'], 2, 3, ['Bouchons oreilles'], ['Casque antibruit EN 352 en atelier', 'Machine encoffree si possible', 'Audiogramme si exposition reguliere']),
      r('ski-chimique', 'Risque chimique (fart, solvants)', 'Inhalation de vapeurs de fart (fluore), solvants de nettoyage', 'ski-atelier', ['Application fart (fumees)', 'Defartage au solvant', 'Nettoyage de semelle', 'Fart fluore (PFAS)'], 2, 3, ['Ventilation atelier'], ['Fart sans fluor (legislation PFAS)', 'Aspiration a la source au poste de fartage', 'Masque FFP2 lors du fartage', 'Ventilation atelier renforcee']),
      r('ski-froid', 'Froid (travail en station)', 'Exposition au froid lors de la remise du materiel en exterieur', 'ski-exterieur', ['Remise de materiel sur la piste', 'Attente clients en exterieur', 'Ouverture frequente des portes'], 2, 3, ['Vetements chauds'], ['Vetements thermiques fournis', 'Rotation interieur/exterieur', 'Boissons chaudes a disposition']),
      r('ski-manutention', 'Manutention (skis, cartons)', 'Port repetitif de paires de skis, cartons de chaussures, casques', 'ski-stockage', ['Rangement skis en rack (5-10 kg x100)', 'Cartons de chaussures', 'Preparation materiel de location', 'Inventaire de fin de saison'], 2, 4, ['Rack de stockage accessible'], ['Rack a hauteur de travail', 'Chariot de transport skis', 'Aide saisonniere pour inventaires', 'Formation gestes et postures']),
      r('ski-glissade', 'Glissade (sol mouille, neige)', 'Chute sur sol mouille par la neige fondue des skis et chaussures', 'ski-magasin', ['Sol mouille neige fondue', 'Clients avec chaussures de ski (mouillees)', 'Seuil de porte glissant', 'Reserve avec sol froid'], 2, 3, ['Chaussures antiderapantes'], ['Tapis absorbant en entree', 'Raclette sol disponible', 'Sol antiderapant', 'Nettoyage continu en saison']),
      r('ski-rps', 'Risques psychosociaux (saisonnalite)', 'Stress intense lie a la saisonnalite (rush de 4 mois, amplitude horaire)', 'ski-magasin', ['Rush ouverture saison', 'Amplitude horaire (8h-20h)', 'Week-ends et vacances scolaires', 'Fin de saison (remise en etat tout le stock)'], 2, 3, ['Planning anticipe'], ['Effectif saisonnier suffisant', 'Planning publie a l\'avance', 'Repos compensateur', 'Debriefing de fin de saison']),
    ],
  },
];
