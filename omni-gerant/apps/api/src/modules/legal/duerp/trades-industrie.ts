// BUSINESS RULE [CDC-2.4]: E6 — 14 metiers Industrie & Production

import type { MetierRiskProfile } from './risk-database-v2.js';

function r(id: string, name: string, desc: string, wuId: string, sits: string[], g: 1|2|3|4, f: 1|2|3|4, exist: string[], proposed: string[], cat: string): MetierRiskProfile['risks'][number] {
  return { id, name, description: desc, workUnitId: wuId, situations: sits, defaultGravity: g, defaultFrequency: f, existingMeasures: exist, proposedActions: proposed, category: cat as MetierRiskProfile['risks'][number]['category'] };
}
function wu(id: string, name: string, desc: string, hc: string): MetierRiskProfile['workUnits'][number] {
  return { id, name, description: desc, typicalHeadcount: hc };
}

export const INDUSTRIE_TRADES: MetierRiskProfile[] = [
  // ── Imprimerie ─────────────────────────────────────────────────
  {
    metierSlug: 'imprimerie', label: 'Imprimerie', category: 'industrie_production',
    nafCodes: ['18.12Z', '18.11Z', '18.13Z'], idcc: '184',
    legalReferences: ['Tableau RG 84 (solvants)', 'Directive Machines', 'Directive ATEX (poussieres papier)'],
    workUnits: [
      wu('imp-impression', 'Atelier impression', 'Presses offset, numeriques, rotatives', '2-8'),
      wu('imp-finition', 'Finition / faconnage', 'Massicot, plieuse, agrafeuse, reliure', '2-4'),
      wu('imp-prepa', 'Prepresse / PAO', 'Conception, mise en page, CTP', '1-3'),
      wu('imp-stockage', 'Stockage papier / encres', 'Stockage bobines, palettes papier, encres, solvants', '1-2'),
    ],
    risks: [
      r('imp-chimique', 'Risque chimique (encres, solvants) — RG 84', 'Inhalation de vapeurs de solvants, contact avec encres et produits de nettoyage', 'imp-impression', ['Nettoyage blanchets au solvant', 'Manipulation encres UV', 'Mouillage offset (alcool isopropylique)', 'Nettoyage des rouleaux'], 3, 4, ['Ventilation atelier', 'Gants nitrile'], ['Substitution solvants par vegetaux', 'Aspiration locale aux postes de nettoyage', 'Gants nitrile obligatoires', 'FDS affichees', 'Suivi medical renforce']),
      r('imp-bruit', 'Bruit (presses, massicot)', 'Exposition au bruit des presses en fonctionnement (80-95 dB)', 'imp-impression', ['Presse offset en production', 'Massicot', 'Plieuse', 'Compresseur'], 3, 3, ['Bouchons oreilles'], ['Casque antibruit EN 352 en zone impression', 'Encoffrement partiel des presses', 'Maintenance preventive (reduction bruit)', 'Audiogramme annuel']),
      r('imp-happement', 'Happement machines (presses)', 'Happement par organes en mouvement des presses, massicot, plieuse', 'imp-impression', ['Intervention presse en marche', 'Nettoyage blanchet machine en marche', 'Massicot sans carter', 'Plieuse (doigts entraines)'], 4, 2, ['Carters de protection', 'Arret d\'urgence'], ['Procedure consignation (LOTO)', 'Interdiction intervention machine en marche', 'Massicot avec double commande bimanuelle', 'Formation securite machines annuelle']),
      r('imp-atex', 'ATEX (poussieres papier)', 'Risque d\'explosion par poussieres de papier en suspension', 'imp-stockage', ['Decoupe papier (poussiere)', 'Nettoyage a sec', 'Stockage bobines (accumulation poussiere)'], 4, 1, ['Interdiction flamme nue'], ['Nettoyage par aspiration', 'Installations electriques ATEX en zone poussiere', 'Interdiction soufflette']),
      r('imp-manutention', 'Manutention (bobines, palettes papier)', 'Port de bobines de papier (50-200 kg), palettes, cartons finis', 'imp-stockage', ['Bobines de papier (100-200 kg)', 'Palettes de papier fini', 'Cartons de commande', 'Chargement camion'], 3, 3, ['Transpalette', 'Chariot'], ['Chariot a bobines', 'Transpalette electrique', 'Limite 25 kg port manuel', 'Formation gestes et postures']),
      r('imp-tms', 'TMS (repetitions, postures)', 'Douleurs par gestes repetitifs d\'alimentation machine et postures de controle', 'imp-finition', ['Alimentation massicot (gestes repetitifs)', 'Controle qualite (posture penchee)', 'Faconnage manuel', 'Station debout prolongee'], 2, 3, ['Table reglable'], ['Rotation des postes', 'Table a hauteur reglable', 'Pauses actives']),
      r('imp-incendie', 'Incendie (solvants, papier)', 'Depart de feu par solvants et stock de papier', 'imp-stockage', ['Stock de papier (combustible)', 'Solvants de nettoyage', 'Encres UV (photoinitateurs)', 'Court-circuit'], 4, 1, ['Extincteurs', 'Detection incendie'], ['Stockage solvants en armoire ventilee', 'Poubelle metallique fermee pour chiffons', 'Detection incendie', 'Sprinklers en zone stockage']),
      r('imp-electrique', 'Risque electrique', 'Electrisation par presses et equipements electriques', 'imp-impression', ['Presses haute puissance', 'Secheurs UV', 'Armoires electriques'], 3, 1, ['Differentiel', 'Signalisation'], ['Verification electrique annuelle', 'Consignation avant intervention', 'Habilitation electrique pour maintenance']),
    ],
  },

  // ── Industrie generale ─────────────────────────────────────────
  {
    metierSlug: 'industrie-generale', label: 'Industrie generale / Usine', category: 'industrie_production',
    nafCodes: ['25.99A', '25.99B', '28.99A', '28.99B'], idcc: '54',
    legalReferences: ['Directive Machines 2006/42/CE', 'Art. R4541-1 (manutention)', 'Art. R4412-1 (chimique)'],
    workUnits: [
      wu('ind-production', 'Atelier de production', 'Usinage, assemblage, montage', '5-30'),
      wu('ind-stockage', 'Stockage / reception', 'Stockage matieres premieres, expedition', '2-5'),
      wu('ind-maintenance', 'Maintenance', 'Maintenance machines, depannage', '1-3'),
      wu('ind-bureau', 'Bureau / qualite', 'Administration, controle qualite, methodes', '1-5'),
    ],
    risks: [
      r('ind-machines', 'Happement machines (coupure, ecrasement)', 'Happement, coupure ou ecrasement par machines-outils en production', 'ind-production', ['Intervention machine en marche', 'Nettoyage sans consignation', 'Presse en descente', 'Convoyeur en mouvement'], 4, 3, ['Carters', 'Arret urgence'], ['Procedure LOTO obligatoire', 'Carters avec interlock', 'Formation securite machines', 'Maintenance preventive mensuelle', 'Affichage consignes par machine']),
      r('ind-bruit', 'Bruit (atelier)', 'Exposition au bruit des machines de production (85-100 dB)', 'ind-production', ['Presses', 'Compresseurs', 'Machines d\'usinage', 'Convoyeurs'], 3, 4, ['Bouchons oreilles'], ['Casque antibruit EN 352 obligatoire en atelier', 'Encoffrement machines bruyantes', 'Audiogramme annuel', 'Signalisation zones > 85 dB']),
      r('ind-chimique', 'Risque chimique (huiles, solvants)', 'Exposition aux huiles de coupe, solvants de degraissage, peintures', 'ind-production', ['Huiles de coupe (usinage)', 'Degraissage pieces', 'Peinture industrielle', 'Nettoyage solvants'], 3, 3, ['Ventilation', 'Gants'], ['Aspiration locale aux postes emetteurs', 'Substitution solvants chlores', 'Gants adaptes au produit', 'FDS affichees', 'Suivi medical renforce']),
      r('ind-manutention', 'Manutention (pieces, palettes)', 'Port de pieces et materiaux lourds en production', 'ind-stockage', ['Approvisionnement machines', 'Evacuation pieces finies', 'Palettisation', 'Changement d\'outil (lourd)'], 3, 3, ['Pont roulant', 'Transpalette'], ['Aide mecanique pour pieces > 15 kg', 'Chariot elevateur avec CACES', 'Formation gestes et postures', 'Limitation port manuel']),
      r('ind-vibrations', 'Vibrations (machines, outils)', 'Vibrations main-bras et corps entier par machines et outils', 'ind-production', ['Meuleuse portative', 'Perceuse a colonne', 'Conduite chariot', 'Presse vibrante'], 2, 3, ['Gants anti-vibrations'], ['Outils basse vibration', 'Rotation operateurs', 'Limitation duree exposition', 'Suivi medical vibrations']),
      r('ind-tms', 'TMS (repetitions, postures)', 'TMS par gestes repetitifs d\'assemblage et postures de travail', 'ind-production', ['Assemblage repetitif', 'Poste de controle (posture penchee)', 'Serrage repetitif', 'Station debout'], 2, 4, ['Rotation postes'], ['Etude ergonomique des postes', 'Rotation obligatoire', 'Pauses actives', 'Outillage ergonomique']),
      r('ind-chute', 'Chute (sol atelier, rack)', 'Chute sur sol d\'atelier (huile, copeaux, cables)', 'ind-production', ['Huile au sol', 'Copeaux metalliques', 'Cables au sol', 'Sol mouille'], 2, 3, ['Chaussures S3', 'Nettoyage'], ['Nettoyage continu', 'Absorbant industriel disponible', 'Eclairage 300 lux minimum', 'Marquage zones circulation']),
      r('ind-incendie', 'Incendie (huiles, solvants)', 'Depart de feu par huiles de coupe, solvants, poussieres metalliques', 'ind-stockage', ['Huiles de coupe inflammables', 'Solvants de degraissage', 'Copeaux metalliques chauds', 'Court-circuit'], 4, 1, ['Extincteurs', 'Detection'], ['Stockage conforme produits inflammables', 'Detection incendie', 'Bac de retention', 'Exercice evacuation annuel']),
    ],
  },

  // ── Metallerie ─────────────────────────────────────────────────
  {
    metierSlug: 'metallerie', label: 'Metallerie / Mecanique generale', category: 'industrie_production',
    nafCodes: ['25.62A', '25.62B'], idcc: '54',
    legalReferences: ['Directive Machines', 'Art. R4412-1 (chimique)', 'Tableau RG 44 (fumees soudage)'],
    workUnits: [
      wu('met-usinage', 'Atelier usinage', 'Tour, fraiseuse, rectifieuse, CNC', '2-8'),
      wu('met-soudure', 'Poste de soudure', 'Soudure MIG, TIG, arc', '1-3'),
      wu('met-controle', 'Controle qualite', 'Mesures, controle pieces', '1-2'),
      wu('met-stockage', 'Stockage matieres', 'Stockage barres, toles, pieces finies', '1-2'),
    ],
    risks: [
      r('met-machines', 'Happement machines (tour, fraiseuse)', 'Happement par pièce en rotation sur tour, fraise, mandrin', 'met-usinage', ['Piece en rotation au tour', 'Copeau long (enroulement)', 'Fraisage sans protection', 'Changement d\'outil mandrin en marche'], 4, 3, ['Carters', 'Arret urgence', 'Interdiction gants au tour'], ['Carters avec interlock', 'Interdiction formelle des gants au tour', 'Procedure LOTO', 'Formation securite machines', 'Pas de vetements flottants au tour']),
      r('met-bruit', 'Bruit (usinage, meulage)', 'Exposition au bruit des machines d\'usinage et meulage (85-100 dB)', 'met-usinage', ['Tour en usinage', 'Fraiseuse', 'Meulage', 'Sciage'], 3, 4, ['Bouchons oreilles'], ['Casque antibruit EN 352', 'Outils affutes (reduction bruit)', 'Encoffrement machines', 'Audiogramme annuel']),
      r('met-chimique', 'Risque chimique (huiles de coupe, fumees)', 'Contact avec huiles de coupe, inhalation de brouillards d\'huile et fumees de soudure', 'met-usinage', ['Brouillard d\'huile (usinage grande vitesse)', 'Fumees de soudure', 'Degraissage pieces', 'Huile de coupe usagee'], 3, 3, ['Aspiration', 'Gants nitrile'], ['Brumisateur avec captage sur machine CNC', 'Aspiration fumees de soudure', 'Huiles de coupe a faible emission', 'Suivi medical (exposition huiles)']),
      r('met-vibrations', 'Vibrations (outils portatifs)', 'Vibrations main-bras par meuleuse, perceuse, cle a chocs', 'met-usinage', ['Meuleuse portative', 'Perceuse colonne (vibrations)', 'Cle a chocs', 'Taraudeuse'], 2, 3, ['Gants anti-vibrations'], ['Outils basse vibration', 'Rotation operateurs', 'Limitation 2h continues']),
      r('met-coupure', 'Coupures (copeaux, bavures)', 'Coupure par copeaux metalliques, bavures, aretes de pieces', 'met-usinage', ['Copeaux longs en sortie tour', 'Bavures de fraisage', 'Manipulation pieces brutes', 'Nettoyage copeaux'], 3, 3, ['Gants anti-coupure (sauf au tour)'], ['Brise-copeaux adapte', 'Crochet pour retirer les copeaux (pas la main)', 'Gants EN 388 pour ebavurage', 'Lunettes EN 166 obligatoires en usinage']),
      r('met-manutention', 'Manutention (pieces, barres)', 'Port de pieces metalliques lourdes, barres, toles', 'met-stockage', ['Barres metalliques', 'Pieces lourdes en cours d\'usinage', 'Chargement/dechargement machine', 'Evacuation copeaux'], 3, 3, ['Pont roulant', 'Palan'], ['Aide mecanique pour pieces > 15 kg', 'Pont roulant ou palan', 'Chariot porte-pieces']),
      r('met-projection', 'Projections (copeaux, eclats)', 'Projection de copeaux, eclats metalliques dans les yeux', 'met-usinage', ['Usinage au tour (copeaux)', 'Meulage (eclats)', 'Percage (copeaux)', 'Eclatement d\'outil'], 3, 3, ['Lunettes EN 166'], ['Lunettes EN 166 obligatoires en usinage', 'Ecran sur machine CNC', 'Ecran facial pour meulage']),
      r('met-incendie', 'Incendie (huiles, copeaux)', 'Depart de feu par huiles de coupe, copeaux chauds', 'met-stockage', ['Copeaux chauds dans bac a huile', 'Huile de coupe surchauffee', 'Fuite d\'huile sur echappement'], 3, 1, ['Extincteurs'], ['Bac a copeaux metallique ferme', 'Nettoyage quotidien copeaux', 'Detection incendie']),
    ],
  },

  // ── Traitement des metaux ──────────────────────────────────────
  {
    metierSlug: 'traitement-metaux', label: 'Traitement de surface / Galvanoplastie', category: 'industrie_production',
    nafCodes: ['25.61Z'], idcc: '54',
    legalReferences: ['Tableau RG 10ter (chrome)', 'Art. R4412-1 (CMR)', 'ICPE rubriques 2565/2567'],
    workUnits: [
      wu('tm-bain', 'Bains de traitement', 'Bains de chrome, nickel, zinc, anodisation', '2-6'),
      wu('tm-preparation', 'Preparation / degraissage', 'Degraissage, decapage, rinçage avant traitement', '1-3'),
      wu('tm-sechage', 'Sechage / finition', 'Sechage, controle aspect, emballage', '1-2'),
      wu('tm-stockage', 'Stockage produits chimiques', 'Stockage acides, bases, sels metalliques', '1'),
    ],
    risks: [
      r('tm-chimique', 'Risque chimique CMR (chrome hexavalent)', 'Exposition au chrome hexavalent (cancerogene), acides, cyanures', 'tm-bain', ['Chromage dur (Cr6+ cancerogene)', 'Bains cyanures (dorure, argenture)', 'Acides concentres (sulfurique, nitrique)', 'Vapeurs de bain en ebullition'], 4, 4, ['Aspiration sur bains', 'Gants chimiques', 'EPI complets'], ['Substitution chrome hexavalent par trivalent quand possible', 'Aspiration en bordure de bain (fentes laterales)', 'Masque vapeurs inorganiques', 'Gants longs chimiques adaptes', 'Dosimetre individuel chrome', 'Suivi medical renforce CMR (semestriel)', 'Douche de securite + rince-oeil']),
      r('tm-bruit', 'Bruit (installation)', 'Bruit des compresseurs, pompes, systemes de ventilation', 'tm-bain', ['Compresseurs d\'air', 'Pompes de filtration', 'Systeme d\'aspiration', 'Ultrasons de degraissage'], 2, 3, ['Bouchons oreilles'], ['Casque antibruit en zone bruyante', 'Encoffrement compresseurs', 'Maintenance preventive pompes']),
      r('tm-brulure-chimique', 'Brulure chimique (acides, bases)', 'Brulure chimique par eclaboussure d\'acide ou de soude', 'tm-preparation', ['Eclaboussure lors du remplissage bain', 'Contact acide concentre', 'Soude caustique (decapage)', 'Acide fluorhydrique (HF — danger mortel)'], 4, 3, ['Lunettes etanches', 'Gants chimiques', 'Tablier'], ['Douche de securite et rince-oeil a moins de 10 secondes', 'Tablier chimique complet', 'Ecran facial pour remplissage', 'Formation manipulation acides et premiers secours HF', 'Gel de gluconate de calcium si HF utilise']),
      r('tm-electrique', 'Risque electrique (cuves)', 'Electrisation par courant de traitement electrolytique ou installations', 'tm-bain', ['Redresseurs haute intensite', 'Contact electrode', 'Sol mouille + installations electriques'], 3, 2, ['Isolation des cuves'], ['Sol isolant autour des cuves', 'Coupure courant avant intervention dans bain', 'Verification electrique annuelle']),
      r('tm-incendie', 'Incendie (solvants, hydrogene)', 'Depart de feu par solvants de degraissage ou degagement d\'hydrogene', 'tm-stockage', ['Solvants chlores ou petroliers', 'Degagement d\'hydrogene (electrolyse)', 'Stockage produits inflammables'], 4, 1, ['Detection gaz H2', 'Extincteurs'], ['Ventilation anti-deflagrante', 'Detection H2 avec alarme', 'Stockage conforme ICPE', 'Armoire ventilee solvants']),
      r('tm-chute', 'Chute (sol mouille)', 'Glissade sur sol mouille par rinçage, eclaboussures, condensation', 'tm-bain', ['Sol constamment humide', 'Eclaboussure de bain', 'Rinçage (eau au sol)', 'Condensation'], 2, 4, ['Bottes antiderapantes'], ['Sol antiderapant certifie R13', 'Drainage efficace', 'Caillebotis autour des cuves', 'Raclette sol disponible']),
      r('tm-manutention', 'Manutention (pieces, paniers)', 'Port de paniers de pieces, barres, cadres de galvanoplastie', 'tm-bain', ['Paniers de pieces (10-30 kg)', 'Cadres de traitement', 'Futs de produits chimiques', 'Barres de contact'], 2, 3, ['Palan au-dessus des cuves'], ['Palan electrique pour immersion', 'Chariot pour futs', 'Limite 25 kg port manuel']),
      r('tm-environnement', 'Pollution (rejets, ICPE)', 'Rejet de metaux lourds dans les eaux usees, stockage non conforme', 'tm-stockage', ['Bains uses (metaux lourds)', 'Rinçages non traites', 'Boues de traitement (dechets dangereux)'], 3, 1, ['Station d\'epuration interne'], ['Station de traitement des eaux conforme', 'Controle rejets periodique', 'Bilan annuel ICPE']),
    ],
  },

  // ── Plasturgie ─────────────────────────────────────────────────
  {
    metierSlug: 'plasturgie', label: 'Plasturgie / Injection plastique', category: 'industrie_production',
    nafCodes: ['22.21Z', '22.22Z', '22.23Z', '22.29A', '22.29B'], idcc: '292',
    legalReferences: ['Art. R4412-1 (chimique)', 'Directive Machines', 'Directive ATEX'],
    workUnits: [
      wu('pla-injection', 'Atelier injection / extrusion', 'Presses a injecter, extrudeuses, souffleuses', '3-15'),
      wu('pla-assemblage', 'Assemblage / finition', 'Ebavurage, assemblage, controle', '2-6'),
      wu('pla-matiere', 'Stockage matiere premiere', 'Stockage granules, colorants, additifs', '1-2'),
      wu('pla-maintenance', 'Maintenance / moules', 'Maintenance presses, changement moules', '1-3'),
    ],
    risks: [
      r('pla-chimique', 'Risque chimique (monomeres, fumees)', 'Inhalation de fumees de plastique chaud, monomeres residuels, additifs', 'pla-injection', ['Fumees d\'injection (styrene, PVC)', 'Manipulation colorants (poudre)', 'Purge machine (fumees)', 'Nettoyage moule au solvant'], 3, 3, ['Ventilation', 'Extraction fumees'], ['Aspiration a la source sur chaque presse', 'Mesure annuelle exposition', 'Masque FFP2 si ventilation insuffisante', 'Substitution PVC souple par alternatives', 'FDS affichees']),
      r('pla-machines', 'Ecrasement (presse a injecter)', 'Ecrasement par fermeture du moule ou ejection de presse a injecter', 'pla-injection', ['Intervention moule ferme (main coincee)', 'Ejection de piece (projection)', 'Zone de fermeture presse', 'Changement de moule'], 4, 2, ['Carter avec interlock', 'Arret urgence'], ['Double securite fermeture moule', 'Procedure LOTO pour changement moule', 'Formation securite presses', 'Zone d\'exclusion signalee']),
      r('pla-brulure', 'Brulure (moule, plastique fondu)', 'Brulure par contact moule chaud (200-300°C) ou plastique fondu', 'pla-injection', ['Contact moule chaud', 'Projection plastique fondu', 'Purge machine', 'Changement de matiere'], 3, 3, ['Gants anti-chaleur'], ['Gants EN 407 obligatoires pour toute intervention moule', 'Signalisation moule chaud', 'Ecran facial pour purge', 'Kit brulure au poste']),
      r('pla-bruit', 'Bruit (presses, broyeur)', 'Bruit des presses a injecter, broyeur de dechets, compresseur', 'pla-injection', ['Fermeture moule (claquement)', 'Broyeur a côte de la presse', 'Compresseur', 'Robot de prehension'], 3, 3, ['Bouchons oreilles'], ['Casque antibruit EN 352', 'Encoffrement broyeur', 'Maintenance presses (reduction bruit)', 'Audiogramme annuel']),
      r('pla-manutention', 'Manutention (moules, matieres)', 'Port de moules lourds (50-500 kg), sacs de granules (25 kg)', 'pla-matiere', ['Sacs de granules 25 kg', 'Octobins de matiere (500 kg)', 'Changement de moule (50-500 kg)', 'Bacs de pieces finies'], 3, 3, ['Pont roulant', 'Transpalette'], ['Pont roulant pour changement de moule', 'Alimentation centralisee matieres', 'Transpalette electrique', 'Sacs 25 kg max']),
      r('pla-incendie', 'Incendie (matieres plastiques)', 'Depart de feu par matieres plastiques, solvants, surchauffe machine', 'pla-matiere', ['Stock de granules (combustible)', 'Solvant de nettoyage', 'Surchauffe fourreau (resistance)', 'Court-circuit'], 4, 1, ['Extincteurs', 'Detection'], ['Detection incendie renforcee', 'Sprinklers en zone stockage', 'Entretien resistances chauffantes', 'Armoire ventilee solvants']),
      r('pla-tms', 'TMS (repetitions, ebavurage)', 'TMS par gestes repetitifs d\'ebavurage, de controle et de conditionnement', 'pla-assemblage', ['Ebavurage repetitif', 'Controle visuel (posture)', 'Conditionnement en serie', 'Station debout'], 2, 4, ['Rotation postes'], ['Etude ergonomique des postes', 'Outils d\'ebavurage ergonomiques', 'Rotation obligatoire', 'Pauses actives']),
      r('pla-electrique', 'Risque electrique', 'Electrisation par armoires de commande des presses, resistances', 'pla-injection', ['Armoire de commande presse', 'Resistances chauffantes', 'Robot de prehension'], 3, 1, ['Habilitation si intervention'], ['Consignation avant intervention', 'Verification electrique annuelle']),
    ],
  },

  // ── Industrie du bois ──────────────────────────────────────────
  {
    metierSlug: 'industrie-bois', label: 'Industrie du bois / Scierie-Menuiserie industrielle', category: 'industrie_production',
    nafCodes: ['16.10A', '16.10B', '16.21Z', '16.22Z', '16.24Z'], idcc: '158',
    legalReferences: ['Tableau RG 47 (poussieres bois)', 'Tableau RG 79 (cancer sino-nasal)', 'Directive ATEX', 'Directive Machines'],
    workUnits: [
      wu('ib-sciage', 'Sciage / debit', 'Scies a ruban, deligneuses, tronconneuses', '2-6'),
      wu('ib-usinage', 'Usinage / faconnage', 'Raboteuse, toupie, mortaiseuse, CNC', '2-6'),
      wu('ib-sechage', 'Sechoir / traitement', 'Sechage du bois, traitement autoclave', '1-2'),
      wu('ib-stockage', 'Parc a bois / stockage', 'Stockage grumes, bois debite, panneaux', '1-3'),
    ],
    risks: [
      r('ib-machines', 'Happement machines (scie, toupie)', 'Amputation ou coupure grave par scie a ruban, defonceuse, toupie', 'ib-sciage', ['Scie a ruban (lame en rotation)', 'Toupie (rejet piece)', 'Raboteuse (happement)', 'Defonceuse CNC'], 4, 3, ['Carters', 'Arret urgence', 'Poussoir'], ['Carters avec interlock', 'Poussoir obligatoire', 'Formation securite machines', 'Maintenance preventive mensuelle', 'Dispositif anti-rejet sur toupie']),
      r('ib-poussieres', 'Poussieres de bois (RG 47, RG 79)', 'Inhalation de poussieres de bois — cancer sino-nasal (Tableau RG 47/79)', 'ib-usinage', ['Sciage (grande quantite)', 'Ponçage', 'Rabotage', 'Nettoyage a sec'], 3, 4, ['Aspiration centralisee', 'Masque FFP2'], ['Aspiration verifiee annuellement (VLEP 1 mg/m3)', 'Masque FFP3 pour bois exotiques', 'Nettoyage par aspiration uniquement', 'Spirometrie annuelle', 'Suivi medical renforce (ORL)']),
      r('ib-bruit', 'Bruit (sciage, usinage)', 'Exposition au bruit des machines de sciage et usinage (90-105 dB)', 'ib-sciage', ['Scie a ruban', 'Raboteuse', 'Toupie', 'Defonceuse', 'Tronconneuse de delignage'], 3, 4, ['Bouchons'], ['Casque antibruit EN 352 obligatoire', 'Lames et outils affutes', 'Encoffrement partiel machines', 'Audiogramme annuel']),
      r('ib-atex', 'ATEX (poussieres, sciures)', 'Explosion par mise en suspension de poussieres de bois dans le silo ou gaines', 'ib-stockage', ['Silo a copeaux', 'Gaines d\'aspiration', 'Accumulation poussieres', 'Nettoyage a sec (soufflette)'], 4, 1, ['Silo conforme ATEX'], ['Event de surpression sur silo', 'Detection etincelle dans gaines', 'Installations electriques ATEX', 'Interdiction soufflette', 'Nettoyage par aspiration']),
      r('ib-incendie', 'Incendie (bois, sciures)', 'Depart de feu par sciures, bois sec, stockage', 'ib-sechage', ['Sciures accumulees', 'Sechoir (haute temperature)', 'Court-circuit dans poussieres', 'Copeaux chauds (usinage rapide)'], 4, 1, ['Detection incendie', 'Extincteurs'], ['Detection incendie renforcee', 'Sprinklers', 'Nettoyage quotidien sciures', 'Entretien sechoir']),
      r('ib-manutention', 'Manutention (grumes, panneaux)', 'Port de bois lourds : grumes, panneaux, bois debite', 'ib-stockage', ['Grumes (troncs)', 'Panneaux grand format', 'Paquets de bois debite', 'Chargement camion'], 3, 3, ['Grue', 'Chariot elevateur'], ['Grue ou pince a bois pour grumes', 'Chariot elevateur CACES R489', 'Limite 25 kg port manuel']),
      r('ib-chimique', 'Risque chimique (traitement, colles)', 'Exposition aux produits de traitement du bois, colles, vernis industriels', 'ib-sechage', ['Traitement autoclave (CCA, creosote)', 'Colles formaldehyde (panneaux)', 'Vernis industriels', 'Huile de chaine tronconneuse'], 3, 2, ['Gants', 'Ventilation'], ['EPI adaptes au produit', 'Substitution CCA par traitement sans chrome', 'FDS affichees', 'Suivi medical CMR']),
      r('ib-ecrasement', 'Ecrasement (grumes, piles de bois)', 'Ecrasement par chute de grumes ou effondrement de pile de bois', 'ib-stockage', ['Pile de bois instable', 'Grume qui roule', 'Dechargement camion', 'Vent sur pile haute'], 4, 2, ['Calage des piles'], ['Stockage a plat avec calage', 'Interdiction de passer sous la charge', 'Elingage conforme pour grumes', 'Zone d\'exclusion au dechargement']),
    ],
  },

  // ── Emballage bois ─────────────────────────────────────────────
  {
    metierSlug: 'emballage-bois', label: 'Emballage bois / Caisserie', category: 'industrie_production',
    nafCodes: ['16.24Z'], idcc: '158',
    legalReferences: ['Directive Machines', 'Art. R4541-1 (manutention)'],
    workUnits: [
      wu('eb-atelier', 'Atelier fabrication', 'Decoupe, clouage, assemblage de caisses et palettes', '2-8'),
      wu('eb-clouage', 'Poste de clouage', 'Cloueuses pneumatiques, agrafeuses', '1-4'),
      wu('eb-decoupe', 'Decoupe / debit', 'Scies, debiteur, tronconneuse', '1-3'),
      wu('eb-stockage', 'Stockage / expedition', 'Stockage bois, palettes, expedition', '1-2'),
    ],
    risks: [
      r('eb-cloueuse', 'Projections cloueuse pneumatique', 'Blessure par clou projete par la cloueuse pneumatique (traverse le bois, ricochet)', 'eb-clouage', ['Clou qui traverse le bois', 'Ricochet sur noeud', 'Double dechargement', 'Cloueuse mal reglee'], 3, 3, ['Lunettes EN 166', 'Chaussures securite'], ['Cloueuse avec securite de contact', 'Lunettes EN 166 obligatoires', 'Formation utilisation cloueuse', 'Maintenance cloueuse quotidienne', 'Gants anti-coupure']),
      r('eb-bruit', 'Bruit (cloueuse, scie)', 'Exposition au bruit des cloueuses pneumatiques et scies (> 95 dB)', 'eb-atelier', ['Cloueuse pneumatique', 'Scie circulaire', 'Compresseur', 'Agrafeuse industrielle'], 3, 4, ['Bouchons oreilles'], ['Casque antibruit EN 352 obligatoire', 'Compresseur encoffre', 'Audiogramme annuel']),
      r('eb-poussieres', 'Poussieres de bois', 'Inhalation de poussieres de bois lors du sciage', 'eb-decoupe', ['Sciage bois brut', 'Ponçage', 'Balayage a sec'], 3, 3, ['Aspiration', 'Masque FFP2'], ['Aspiration a la source', 'Masque FFP2 au sciage', 'Nettoyage par aspiration']),
      r('eb-machines', 'Coupure (scie, tronconneuse)', 'Coupure par scie circulaire, tronconneuse de debit', 'eb-decoupe', ['Scie circulaire (decoupe)', 'Tronconneuse de debit', 'Fendeuse'], 4, 2, ['Carters', 'Arret urgence'], ['Carters avec interlock', 'Poussoir pour petites pieces', 'Formation securite machines']),
      r('eb-manutention', 'Manutention (palettes, caisses)', 'Port de palettes, caisses en bois, lots de planches', 'eb-stockage', ['Palettes finies (15-25 kg)', 'Lots de planches', 'Caisses grand format', 'Dechargement bois brut'], 3, 4, ['Chariot elevateur', 'Transpalette'], ['Transpalette electrique', 'Chariot elevateur CACES', 'Limite 25 kg port manuel', 'Formation gestes et postures']),
      r('eb-tms', 'TMS (repetitions, cadence)', 'TMS par gestes repetitifs de clouage et assemblage en cadence', 'eb-clouage', ['Clouage repetitif (cadence)', 'Assemblage en serie', 'Station debout sur beton', 'Vibrations cloueuse'], 2, 4, ['Rotation postes'], ['Rotation des postes obligatoire', 'Outils avec amortisseur de vibrations', 'Tapis anti-fatigue', 'Pauses actives']),
      r('eb-chute', 'Chute (chutes de bois au sol)', 'Trebuchement sur chutes de bois, palettes au sol', 'eb-atelier', ['Chutes de bois au sol', 'Palettes empilees', 'Sol sciure', 'Eclairage insuffisant'], 2, 3, ['Chaussures securite S3'], ['Nettoyage continu du poste', 'Rangement des chutes', 'Eclairage suffisant']),
      r('eb-incendie', 'Incendie (sciures, bois)', 'Depart de feu par sciures et stock de bois sec', 'eb-stockage', ['Sciures accumulees', 'Stock de bois sec', 'Court-circuit'], 4, 1, ['Extincteurs'], ['Detection incendie', 'Nettoyage quotidien sciures', 'Installation electrique conforme']),
    ],
  },

  // ── Scierie ────────────────────────────────────────────────────
  {
    metierSlug: 'scierie', label: 'Scierie', category: 'industrie_production',
    nafCodes: ['16.10A'], idcc: '158',
    legalReferences: ['Tableau RG 47 (poussieres bois)', 'Directive Machines', 'Directive ATEX'],
    workUnits: [
      wu('sc-sciage', 'Scie de tete / debit', 'Scie a ruban de tete, debiteur, delignage', '2-4'),
      wu('sc-classement', 'Classement / tri', 'Tri des planches, classement par qualite', '1-3'),
      wu('sc-parc', 'Parc a grumes', 'Reception, stockage et manipulation des grumes', '1-3'),
      wu('sc-sechoir', 'Sechoir', 'Sechage du bois debite, empilage avec lattes', '1-2'),
    ],
    risks: [
      r('sc-machines', 'Coupure/amputation (scie a ruban)', 'Amputation par scie a ruban de tete, debiteur, delignage — risque mortel', 'sc-sciage', ['Scie a ruban (lame large)', 'Deligneuse multilame', 'Debiteur de grumes', 'Ecorceuse'], 4, 3, ['Carters', 'Arret urgence', 'Poussoir'], ['Carters avec interlock complets', 'Detection de presence au poste', 'Formation securite scierie specifique', 'Procedure LOTO', 'Maintenance preventive lames']),
      r('sc-ecrasement', 'Ecrasement (grumes)', 'Ecrasement par grume lors du dechargement, du stockage ou du sciage', 'sc-parc', ['Grume qui roule dans le parc', 'Dechargement grumier', 'Chariot cavalier en manoeuvre', 'Pile de bois instable'], 4, 3, ['Grue', 'Zone exclusion'], ['Zone d\'exclusion au dechargement', 'Calage systematique des grumes', 'Communication radio avec grutier', 'Interdiction de passer sous la charge', 'Grue/chariot cavalier avec operateur forme']),
      r('sc-bruit', 'Bruit (scie, ecorceuse)', 'Exposition au bruit tres eleve des scies de scierie (95-110 dB)', 'sc-sciage', ['Scie a ruban', 'Deligneuse', 'Ecorceuse', 'Convoyeurs'], 3, 4, ['Casque antibruit'], ['Casque antibruit EN 352 obligatoire en zone sciage', 'Lames de qualite (reduction bruit)', 'Cabine de commande insonorisee si possible', 'Audiogramme annuel', 'Signalisation zones > 85 dB']),
      r('sc-poussieres', 'Poussieres de bois (RG 47)', 'Inhalation de poussieres de bois lors du sciage — cancer sino-nasal', 'sc-sciage', ['Sciage de grumes', 'Ecorçage', 'Balayage a sec', 'Tri bois sec'], 3, 4, ['Aspiration', 'Masque FFP2'], ['Aspiration a la source sur chaque machine', 'Masque FFP3 pour bois exotiques', 'Nettoyage par aspiration uniquement', 'Spirometrie annuelle']),
      r('sc-manutention', 'Manutention (planches, paquets)', 'Port de planches, paquets de bois debite, lattes de sechage', 'sc-classement', ['Tri de planches (repetitif)', 'Empilage avec lattes', 'Paquets de bois debite (lourd)', 'Dechargement camion'], 3, 3, ['Chariot elevateur'], ['Chariot elevateur pour paquets', 'Limite 25 kg port manuel', 'Table de tri a hauteur', 'Formation gestes et postures']),
      r('sc-atex', 'ATEX (sciures)', 'Explosion par sciures en suspension dans le silo ou les gaines', 'sc-sechoir', ['Silo a sciures/copeaux', 'Gaines d\'aspiration', 'Sechoir (haute temperature + poussiere)'], 4, 1, ['Silo conforme ATEX'], ['Event de surpression silo', 'Detection etincelle dans gaines', 'Installations electriques ATEX']),
      r('sc-chute', 'Chute (terrain, sciures)', 'Chute sur terrain du parc a grumes, sol couvert de sciures ou boue', 'sc-parc', ['Terrain boueux du parc', 'Sciures glissantes au sol', 'Grumes au sol (obstacles)', 'Verglas en hiver'], 2, 3, ['Bottes securite S5'], ['Entretien des pistes du parc', 'Bottes securite S5 obligatoires', 'Eclairage du parc']),
      r('sc-incendie', 'Incendie (sciures, sechoir)', 'Depart de feu par sciures accumulees, surchauffe du sechoir', 'sc-sechoir', ['Sechoir (temperature elevee)', 'Sciures accumulees', 'Court-circuit', 'Auto-echauffement du bois humide'], 4, 1, ['Detection', 'Extincteurs'], ['Detection incendie renforcee', 'Surveillance temperature sechoir', 'Nettoyage quotidien sciures', 'Sprinklers']),
    ],
  },

  // ── Usinage de precision ───────────────────────────────────────
  {
    metierSlug: 'usinage-precision', label: 'Usinage de precision / Decolletage', category: 'industrie_production',
    nafCodes: ['25.62A'], idcc: '54',
    legalReferences: ['Tableau RG 36 (huiles)', 'Directive Machines', 'Art. R4412-1 (chimique)'],
    workUnits: [
      wu('up-cnc', 'Atelier CNC / decolletage', 'Centres d\'usinage CNC, tours automatiques, decolletage', '3-15'),
      wu('up-controle', 'Controle dimensionnel', 'MMT, projecteur profil, micrometre', '1-2'),
      wu('up-finition', 'Finition / ebavurage', 'Ebavurage, polissage, tribofinition', '1-3'),
      wu('up-stockage', 'Stockage barres / pieces', 'Stockage matieres premieres, pieces finies', '1-2'),
    ],
    risks: [
      r('up-huiles', 'Risque chimique (huiles de coupe) — RG 36', 'Contact et inhalation de brouillards d\'huiles de coupe — dermatoses, asthme', 'up-cnc', ['Brouillard d\'huile en usinage grande vitesse', 'Contact peau avec huile de coupe', 'Huile surchauffee (fumees)', 'Nettoyage pieces au solvant'], 3, 4, ['Aspiration sur machine', 'Gants nitrile'], ['Brumisateur avec captage sur chaque CNC', 'Huiles de coupe a faible emission', 'Gants nitrile sans poudre', 'Creme protectrice mains', 'Suivi medical cutane et respiratoire', 'Mesure d\'exposition brouillards d\'huile']),
      r('up-machines', 'Happement (tour, mandrin)', 'Happement par mandrin en rotation ou piece qui se deserre', 'up-cnc', ['Mandrin en rotation (copeaux)', 'Piece mal serree qui se deserre', 'Intervention porte ouverte', 'Copeau long qui s\'enroule'], 4, 2, ['Carter de protection CNC', 'Interlock porte'], ['Carters avec interlock (machine n\'avance pas porte ouverte)', 'Interdiction gants au tour', 'Brise-copeaux adapte', 'Formation securite machines']),
      r('up-bruit', 'Bruit (usinage)', 'Bruit des machines d\'usinage et compresseur (80-95 dB)', 'up-cnc', ['Usinage grande vitesse', 'Tour automatique', 'Compresseur', 'Pompe haute pression'], 2, 4, ['Bouchons moules'], ['Bouchons moules obligatoires en atelier', 'Maintenance outils (reduction bruit)', 'Encoffrement compresseur', 'Audiogramme annuel']),
      r('up-tms', 'TMS (controle, ebavurage)', 'TMS par gestes repetitifs de controle dimensionnel et ebavurage', 'up-controle', ['Controle piece par piece (repetitif)', 'Ebavurage manuel', 'Chargement/dechargement machine', 'Position statique prolongee'], 2, 4, ['Rotation postes'], ['Outils d\'ebavurage ergonomiques', 'Systeme de mesure automatise si possible', 'Rotation des postes', 'Pauses actives']),
      r('up-coupure', 'Coupures (copeaux, pieces)', 'Coupure par copeaux aceres, pieces ebavurees, outils de coupe', 'up-cnc', ['Copeaux aciers (lames)', 'Pieces avec bavures', 'Changement d\'outil (plaquette)', 'Nettoyage copeaux a la main'], 3, 3, ['Gants EN 388 (sauf au tour)'], ['Crochet pour retirer copeaux', 'Gants EN 388 pour ebavurage uniquement', 'Lunettes EN 166 obligatoires', 'Collecteur de copeaux adapte']),
      r('up-glissade', 'Glissade (huile au sol)', 'Chute sur sol rendu glissant par projections d\'huile de coupe', 'up-cnc', ['Fuite d\'huile machine', 'Projection d\'huile au sol', 'Sol humide (nettoyage)', 'Copeaux au sol'], 2, 3, ['Chaussures securite S2'], ['Absorbant industriel disponible', 'Nettoyage immediat des fuites', 'Bac de retention sous machine', 'Caillebotis devant machines']),
      r('up-manutention', 'Manutention (barres, pieces)', 'Port de barres metalliques, pieces lourdes, bidons d\'huile', 'up-stockage', ['Barres de decolletage (3-6m)', 'Pieces lourdes', 'Bidons d\'huile 20L', 'Bacs de pieces'], 2, 3, ['Palan', 'Chariot'], ['Embout de barre pour tour (alimentation auto)', 'Palan au poste', 'Chariot a barres']),
      r('up-incendie', 'Incendie (huile, copeaux)', 'Depart de feu par huile de coupe surchauffee, copeaux de magnésium', 'up-cnc', ['Huile surchauffee', 'Copeaux de magnesium', 'Court-circuit', 'Fuite d\'huile sur moteur chaud'], 3, 1, ['Extincteurs', 'Detection'], ['Extincteur adapte au metal (classe D si Mg)', 'Detection incendie', 'Maintenance niveaux huile', 'Nettoyage copeaux quotidien']),
    ],
  },

  // ── Soudage industriel ─────────────────────────────────────────
  {
    metierSlug: 'soudage-industriel', label: 'Soudage industriel', category: 'industrie_production',
    nafCodes: ['25.11Z', '33.11Z'], idcc: '54',
    legalReferences: ['Tableau RG 44 (fumees soudage)', 'Art. R4412-1 (chimique)', 'NF EN ISO 15614'],
    workUnits: [
      wu('si-poste', 'Poste de soudure', 'Soudure MIG/MAG, TIG, arc, plasma', '2-8'),
      wu('si-prep', 'Preparation / meulage', 'Preparation joints, meulage, chanfreinage', '1-3'),
      wu('si-controle', 'Controle CND', 'Controle non destructif (ressuage, magnétoscopie, radio)', '1-2'),
      wu('si-stockage', 'Stockage gaz / consommables', 'Stockage bouteilles gaz, fils, electrodes', '1'),
    ],
    risks: [
      r('si-fumees', 'Fumees de soudage (RG 44)', 'Inhalation de fumees metalliques (Cr, Ni, Mn) — Tableau RG 44', 'si-poste', ['Soudure inox (chrome hexavalent)', 'Soudure galvanise (zinc)', 'Soudure en espace confine', 'Gougeage a l\'arc air (fumee intense)'], 3, 4, ['Aspiration torche', 'Masque FFP2'], ['Torche aspirante MIG/MAG obligatoire', 'Masque FFP3 si inox/galva', 'Hotte d\'aspiration au poste', 'Mesure annuelle exposition', 'Suivi medical renforce (pneumologue)']),
      r('si-brulure', 'Brulure (arc, projection metal)', 'Brulure par metal en fusion, arc electrique, piece chaude', 'si-poste', ['Projection de metal en fusion', 'Contact piece soudee', 'Retour de flamme (chalumeau)', 'Arc electrique (UV)'], 3, 4, ['Tablier cuir', 'Gants soudeur EN 12477'], ['EPI soudeur complets (tablier, gants, guetres)', 'Ecrans inter-postes', 'Kit brulure au poste', 'Marquage pieces chaudes']),
      r('si-rayonnement', 'Rayonnement UV/IR (arc)', 'Lesions oculaires (coup d\'arc) et cutanees par rayonnement de l\'arc', 'si-poste', ['Arc de soudure sans protection', 'Reflexion sur metal poli', 'Coup d\'arc par poste voisin'], 3, 3, ['Cagoule soudeur'], ['Cagoule electronique teinte variable obligatoire', 'Ecrans de protection entre postes', 'Vetements couvrants (pas de peau exposee)', 'Collyre pour coup d\'arc']),
      r('si-bruit', 'Bruit (meulage, gougeage)', 'Bruit du meulage des cordons, gougeage a l\'arc air (> 100 dB)', 'si-prep', ['Meulage cordons', 'Gougeage arc air', 'Tronconnage', 'Martelage'], 3, 4, ['Bouchons oreilles'], ['Casque antibruit EN 352 obligatoire', 'Limitation duree gougeage', 'Rotation des operateurs', 'Audiogramme annuel']),
      r('si-incendie', 'Incendie / explosion (gaz, etincelles)', 'Depart de feu par etincelles de soudure pres de materiaux inflammables', 'si-stockage', ['Soudure pres de produits inflammables', 'Fuite bouteille gaz (acetylene)', 'Stockage chiffons solvantes'], 4, 2, ['Permis de feu', 'Extincteurs'], ['Permis de feu obligatoire hors atelier', 'Stockage gaz conforme (chaines, ventile)', 'Couverture anti-feu au poste', 'Controle fuites gaz hebdomadaire']),
      r('si-electrique', 'Risque electrique (poste a souder)', 'Electrisation par poste a souder, cable endommage', 'si-poste', ['Cable masse mal connecte', 'Poste defectueux', 'Sol mouille'], 3, 2, ['Verification cables'], ['Verification electrique annuelle postes', 'Remplacement immediat cables endommages', 'Sol isole au poste de soudure']),
      r('si-manutention', 'Manutention (pieces, bouteilles gaz)', 'Port de pieces metalliques lourdes, bouteilles de gaz (80 kg)', 'si-stockage', ['Pieces a souder (lourdes)', 'Bouteilles de gaz (80 kg)', 'Vireur de soudage', 'Positionnement pieces'], 3, 3, ['Palan', 'Chariot bouteilles'], ['Chariot a bouteilles de gaz', 'Vireur de soudage pour pieces lourdes', 'Palan au poste', 'Chaines de fixation bouteilles']),
      r('si-espace-confine', 'Espace confine (cuves, reservoirs)', 'Asphyxie ou intoxication lors de la soudure en espace confine', 'si-poste', ['Soudure a l\'interieur d\'une cuve', 'Reservoir ferme', 'Gaz de protection (argon) chasse l\'O2'], 4, 1, ['Procedure espace confine'], ['Detection atmosphere (O2, CO, explosimetrie)', 'Ventilation forcee', 'Surveillance exterieure obligatoire', 'Harnais de sauvetage', 'Formation espace confine']),
    ],
  },

  // ── Textile ────────────────────────────────────────────────────
  {
    metierSlug: 'textile', label: 'Industrie textile', category: 'industrie_production',
    nafCodes: ['13.10Z', '13.20Z', '13.30Z', '13.91Z', '13.92Z', '13.93Z', '13.96Z', '13.99Z'], idcc: '18',
    legalReferences: ['Tableau RG 90 (byssinose)', 'Directive Machines', 'Art. R4541-1 (manutention)'],
    workUnits: [
      wu('tex-filature', 'Filature / tissage', 'Machines de filature, metiers a tisser', '3-15'),
      wu('tex-teinture', 'Teinture / ennoblissement', 'Teinture, impression, appret', '2-6'),
      wu('tex-confection', 'Confection / couture', 'Machines a coudre, decoupe, assemblage', '3-15'),
      wu('tex-stockage', 'Stockage matieres / produits', 'Stockage fils, tissus, produits chimiques', '1-3'),
    ],
    risks: [
      r('tex-bruit', 'Bruit (metiers, machines)', 'Exposition au bruit des metiers a tisser et machines de filature (85-100 dB)', 'tex-filature', ['Metiers a tisser', 'Machines de filature', 'Cardes', 'Bobinoirs'], 3, 4, ['Bouchons oreilles'], ['Casque antibruit EN 352 obligatoire en tissage', 'Maintenance machines (reduction bruit)', 'Encoffrement partiel', 'Audiogramme annuel']),
      r('tex-poussieres', 'Poussieres fibres textiles (RG 90)', 'Inhalation de poussieres de coton, lin — byssinose (Tableau RG 90)', 'tex-filature', ['Cardage coton', 'Filature', 'Decoupe tissu', 'Nettoyage machines'], 3, 3, ['Aspiration', 'Masque FFP2'], ['Aspiration a la source sur machines', 'Masque FFP2 en cardage', 'Nettoyage par aspiration', 'Spirometrie annuelle']),
      r('tex-happement', 'Happement machines (metier, cardage)', 'Happement par organes rotatifs des metiers a tisser, cardes, bobinoirs', 'tex-filature', ['Metier a tisser (navette)', 'Carde (cylindre garni)', 'Bobinoir (enroulement)', 'Devidoir'], 4, 2, ['Carters', 'Arret urgence'], ['Carters avec interlock', 'Formation securite machines', 'Pas de vetements flottants', 'Procedure LOTO']),
      r('tex-chimique', 'Risque chimique (teinture, apprets)', 'Exposition aux colorants, fixateurs, apprets chimiques', 'tex-teinture', ['Preparation bains de teinture', 'Apprets (formaldehyde)', 'Solvants de nettoyage', 'Agents de blanchiment (chlore, peroxyde)'], 3, 3, ['Gants chimiques', 'Ventilation'], ['Gants adaptes au produit', 'Ventilation renforcee en teinture', 'Substitution formaldehyde par alternatives', 'FDS affichees', 'Suivi medical']),
      r('tex-tms', 'TMS (couture repetitive)', 'TMS par gestes repetitifs de couture et confection', 'tex-confection', ['Couture machine (cadence elevee)', 'Repassage industriel', 'Coupe tissu repetitive', 'Station assise prolongee'], 2, 4, ['Siege reglable'], ['Machine a coudre ergonomique', 'Alternance des taches', 'Pauses toutes les 45 min', 'Formation gestes et postures']),
      r('tex-incendie', 'Incendie (fibres, solvants)', 'Depart de feu par fibres textiles, poussieres, solvants', 'tex-stockage', ['Stock de tissus (tres combustible)', 'Poussieres de fibres', 'Solvants de nettoyage', 'Court-circuit'], 4, 1, ['Detection', 'Extincteurs', 'Sprinklers'], ['Detection incendie renforcee', 'Sprinklers obligatoires', 'Stockage solvants en armoire ventilee', 'Nettoyage poussieres quotidien']),
      r('tex-brulure', 'Brulure (repassage, teinture)', 'Brulure par fer industriel, vapeur, bain de teinture chaud', 'tex-confection', ['Presse a repasser (vapeur)', 'Fer industriel', 'Bain de teinture chaud'], 2, 3, ['Gants anti-chaleur'], ['Presse avec securite bimanuelle', 'Gants EN 407 pour teinture', 'Kit brulure']),
      r('tex-manutention', 'Manutention (rouleaux, cartons)', 'Port de rouleaux de tissu (10-30 kg), cartons de confection', 'tex-stockage', ['Rouleaux de tissu', 'Cartons de fil', 'Palettes de tissus finis'], 2, 3, ['Chariot'], ['Chariot a rouleaux', 'Transpalette', 'Limite 25 kg']),
    ],
  },

  // ── Recyclage metaux ───────────────────────────────────────────
  {
    metierSlug: 'recyclage-metaux', label: 'Recyclage de metaux / Ferrailleur', category: 'industrie_production',
    nafCodes: ['38.32Z'], idcc: '637',
    legalReferences: ['ICPE rubrique 2712/2713', 'Art. R4541-1 (manutention)'],
    workUnits: [
      wu('rm-tri', 'Zone de tri', 'Tri manuel et mecanique des metaux', '2-6'),
      wu('rm-presse', 'Presse / cisaille', 'Cisaille alligator, presse a paquets', '1-2'),
      wu('rm-parc', 'Parc de stockage', 'Stockage ferraille, non-ferreux', '1-3'),
      wu('rm-bureau', 'Bureau / pesee', 'Pesee, achat, vente, administration', '1-2'),
    ],
    risks: [
      r('rm-coupure', 'Coupures (toles, ferraille)', 'Laceration par aretes vives de ferraille, toles dechiquetees', 'rm-tri', ['Tri ferraille a la main', 'Toles rouillees', 'Cables metalliques effiloches', 'Canettes ecrasees'], 3, 4, ['Gants anti-coupure EN 388', 'Manches longues'], ['Gants EN 388 niveau 5 obligatoires', 'Manches longues coton epais', 'Lunettes EN 166', 'Tetanos a jour']),
      r('rm-ecrasement', 'Ecrasement (presse, grappin)', 'Ecrasement par presse a paquets, cisaille, grappin de manutention', 'rm-presse', ['Cisaille alligator en fonctionnement', 'Presse a paquets', 'Grappin de chargement', 'Broyeur'], 4, 2, ['Zone exclusion', 'Arret urgence'], ['Zone d\'exclusion balisee autour machines', 'Arret urgence accessible', 'Consignation avant intervention', 'Formation operateur presse/cisaille']),
      r('rm-bruit', 'Bruit (cisaille, broyeur)', 'Exposition au bruit de la cisaille, du broyeur et du tri (> 95 dB)', 'rm-presse', ['Cisaille alligator', 'Broyeur de ferraille', 'Presse a paquets', 'Chute de ferraille'], 3, 4, ['Casque antibruit'], ['Casque antibruit EN 352 obligatoire', 'Cabine de commande insonorisee', 'Audiogramme annuel']),
      r('rm-chimique', 'Risque chimique (metaux lourds, huiles)', 'Contact avec metaux lourds, huiles usagees, batteries au plomb', 'rm-tri', ['Batterie au plomb (acide)', 'Peintures au plomb', 'Huiles usagees', 'Fluides frigorigenes'], 3, 2, ['Gants chimiques'], ['Tri selectif des dechets dangereux', 'Gants chimiques pour batteries', 'Collecte conforme huiles usagees', 'Formation identification dechets dangereux']),
      r('rm-incendie', 'Incendie (batterie, huile)', 'Depart de feu par batterie lithium, huile residuelle, solvants', 'rm-parc', ['Batterie lithium dans le flux', 'Huile residuelle sur ferraille', 'Etincelle lors du broyage', 'Soleil sur metal en ete'], 4, 2, ['Extincteurs', 'Bac retention'], ['Detection ferraille "chaude" en entree', 'Stockage batteries separe', 'Extincteur adapte lithium', 'Surveillance video thermique']),
      r('rm-manutention', 'Manutention (ferraille)', 'Port de ferraille lourde, chargement/dechargement', 'rm-parc', ['Tri ferraille a la main', 'Chargement camion', 'Manipulation pieces lourdes', 'Dechargement bennes'], 3, 3, ['Grappin', 'Chariot'], ['Grappin magnetique pour chargement', 'Chariot elevateur CACES', 'Limite 25 kg port manuel']),
      r('rm-chute', 'Chute (terrain, ferraille)', 'Chute sur terrain irregulier, trebuchement sur ferraille', 'rm-parc', ['Terrain irregulier', 'Ferraille au sol', 'Sol boueux', 'Verglas'], 2, 3, ['Bottes securite S5'], ['Entretien du terrain', 'Eclairage du parc', 'Bottes securite obligatoires']),
      r('rm-projection', 'Projections (broyage)', 'Projection d\'eclats metalliques lors du broyage ou du cisaillage', 'rm-presse', ['Broyage de ferraille', 'Cisaillage (eclats)', 'Decoupage au chalumeau'], 3, 2, ['Lunettes EN 166'], ['Ecran de protection sur machines', 'Lunettes EN 166 obligatoires en zone', 'Distance de securite au broyeur']),
    ],
  },

  // ── Traitement de surface ──────────────────────────────────────
  {
    metierSlug: 'traitement-surface', label: 'Traitement de surface / Peinture industrielle', category: 'industrie_production',
    nafCodes: ['25.61Z'], idcc: '54',
    legalReferences: ['Tableau RG 10ter (chrome)', 'Art. R4412-1 (CMR)', 'Directive ATEX'],
    workUnits: [
      wu('ts-cabine', 'Cabine de peinture / poudre', 'Application peinture liquide ou poudre', '1-4'),
      wu('ts-preparation', 'Preparation de surface', 'Sablage, grenaillage, degraissage', '1-3'),
      wu('ts-four', 'Four de cuisson / sechage', 'Polymerisation peinture poudre, sechage', '1'),
      wu('ts-accrochage', 'Accrochage / decrochage', 'Mise sur convoyeur, controle, emballage', '2-4'),
    ],
    risks: [
      r('ts-chimique', 'Risque chimique (peintures, solvants, chrome)', 'Inhalation de solvants de peinture, poussieres de peinture poudre, chrome', 'ts-cabine', ['Application peinture liquide au pistolet', 'Peinture poudre (inhalation)', 'Nettoyage pistolet au solvant', 'Chromate de zinc (anticorrosion)'], 3, 4, ['Cabine ventilee', 'Masque'], ['Masque A2P3 obligatoire', 'Cabine conforme (flux laminaire)', 'Substitution chromate par alternatives', 'Combinaison jetable', 'Suivi medical renforce CMR', 'FDS affichees']),
      r('ts-atex', 'ATEX (peinture poudre, solvants)', 'Explosion par nuage de peinture poudre ou vapeurs de solvants', 'ts-cabine', ['Peinture poudre en suspension', 'Solvants en cabine', 'Nettoyage cabine (poussiere en suspension)', 'Electricite statique'], 4, 1, ['Cabine ATEX conforme'], ['Cabine ATEX avec detection', 'Mise a la terre des pieces et pistolet', 'Aspiration et filtration conforme', 'Interdiction flamme nue en zone']),
      r('ts-sablage', 'Poussieres (sablage, grenaillage)', 'Inhalation de poussieres de silice ou corindon lors du sablage', 'ts-preparation', ['Sablage manuel (silice!)', 'Grenaillage (poussiere metal)', 'Nettoyage cabine de grenaillage'], 3, 3, ['Combinaison ventilee si sablage silice'], ['Substitution silice par corindon ou billes verre', 'Cabine de sablage fermee', 'Combinaison ventilee obligatoire', 'Masque FFP3 minimum', 'Spirometrie annuelle']),
      r('ts-brulure', 'Brulure (four, pieces chaudes)', 'Brulure par pieces sortant du four de polymerisation (180-220°C)', 'ts-four', ['Pieces sortant du four', 'Contact parois du four', 'Dechargement convoyeur'], 3, 3, ['Gants anti-chaleur'], ['Gants EN 407 obligatoires', 'Signalisation "pieces chaudes"', 'Zone de refroidissement balisee']),
      r('ts-bruit', 'Bruit (sablage, ventilation)', 'Bruit du sablage, grenaillage, systemes de ventilation', 'ts-preparation', ['Sablage (> 100 dB)', 'Grenaillage automatique', 'Ventilation cabines', 'Compresseur'], 3, 3, ['Casque antibruit'], ['Casque antibruit EN 352 obligatoire en sablage', 'Cabine de sablage insonorisee', 'Audiogramme annuel']),
      r('ts-incendie', 'Incendie (solvants, peinture)', 'Depart de feu par solvants, peinture, poudre', 'ts-cabine', ['Solvants inflammables', 'Peinture poudre (combustible)', 'Four (surchauffe)', 'Chiffons solvantes'], 4, 1, ['Detection', 'Extincteurs'], ['Detection incendie renforcee', 'Armoire ventilee solvants', 'Poubelle metallique fermee', 'Sprinklers si necessaire']),
      r('ts-manutention', 'Manutention (pieces, cadres)', 'Port de pieces et cadres de peinture', 'ts-accrochage', ['Accrochage pieces sur convoyeur', 'Decrochage apres cuisson', 'Pieces lourdes', 'Cadres de sablage'], 2, 3, ['Palan si necessaire'], ['Palan pour pieces lourdes', 'Hauteur d\'accrochage ergonomique', 'Rotation des postes']),
      r('ts-electrique', 'Risque electrique (cabine, four)', 'Electrisation par installations electriques de cabine et four', 'ts-four', ['Four de cuisson (haute puissance)', 'Pistolet poudre electrostatique', 'Installations cabine'], 3, 1, ['Mise a la terre'], ['Verification electrique annuelle', 'Mise a la terre complete de la chaine', 'Consignation avant intervention four']),
    ],
  },

  // ── Papeterie ──────────────────────────────────────────────────
  {
    metierSlug: 'papeterie', label: 'Papeterie / Industrie du papier', category: 'industrie_production',
    nafCodes: ['17.11Z', '17.12Z', '17.21A', '17.21B', '17.22Z', '17.23Z', '17.24Z', '17.29Z'], idcc: '700',
    legalReferences: ['Art. R4412-1 (chimique)', 'Directive Machines', 'Art. R4541-1 (manutention)'],
    workUnits: [
      wu('pap-machine', 'Machine a papier', 'Fabrication de papier/carton (machine a papier)', '3-10'),
      wu('pap-preparation', 'Preparation pate', 'Preparation de la pate a papier, blanchiment', '2-4'),
      wu('pap-bobinage', 'Bobinage / coupe', 'Bobineuse, coupeuse, mise en format', '2-4'),
      wu('pap-stockage', 'Stockage / expedition', 'Stockage bobines, expedition', '1-3'),
    ],
    risks: [
      r('pap-chimique', 'Risque chimique (chlore, soude)', 'Exposition au chlore de blanchiment, soude caustique, acides', 'pap-preparation', ['Blanchiment au chlore', 'Soude caustique (cuisson pate)', 'Acide sulfurique (pH)', 'Additifs chimiques'], 3, 3, ['Gants chimiques', 'Ventilation'], ['Douche de securite et rince-oeil', 'Gants chimiques longs', 'Lunettes etanches', 'FDS affichees', 'Substitution chlore par peroxyde si possible', 'Suivi medical']),
      r('pap-machines', 'Happement (machine a papier, bobineuse)', 'Happement par cylindres de la machine a papier, bobineuse, calandre', 'pap-machine', ['Cylindres de la machine a papier', 'Nettoyage machine en marche', 'Bobineuse en fonctionnement', 'Calandre'], 4, 2, ['Carters', 'Arret urgence'], ['Carters avec interlock', 'Procedure LOTO obligatoire', 'Formation securite machine a papier', 'Detection de presence']),
      r('pap-bruit', 'Bruit (machine, pompes)', 'Exposition au bruit de la machine a papier et des equipements (85-100 dB)', 'pap-machine', ['Machine a papier en fonctionnement', 'Pompes a vide', 'Refineuses', 'Compresseurs'], 3, 4, ['Casque antibruit'], ['Casque antibruit EN 352 obligatoire', 'Cabine de conduite insonorisee', 'Encoffrement pompes', 'Audiogramme annuel']),
      r('pap-chaleur', 'Chaleur / vapeur (secherie)', 'Chaleur et vapeur dans la zone de secherie de la machine a papier', 'pap-machine', ['Zone de secherie (> 40°C)', 'Vapeur haute pression', 'Intervention sur cylindres chauds'], 3, 3, ['EPI anti-chaleur'], ['Vetements anti-chaleur en secherie', 'Pauses en zone temperee', 'Surveillance temperature', 'Gants EN 407 pour intervention']),
      r('pap-glissade', 'Glissade (sol mouille)', 'Chute sur sol rendu mouille par la fabrication du papier', 'pap-machine', ['Sol constamment humide', 'Eclaboussures de pate', 'Condensation secherie', 'Mousse de pate au sol'], 2, 4, ['Bottes antiderapantes'], ['Sol antiderapant certifie R13', 'Drainage efficace', 'Caillebotis aux postes', 'Bottes securite antiderapantes obligatoires']),
      r('pap-manutention', 'Manutention (bobines, palettes)', 'Port de bobines de papier (100-2000 kg), palettes de produits finis', 'pap-stockage', ['Bobines de papier (100-2000 kg)', 'Palettes de produits finis', 'Rames de papier', 'Chargement camion'], 3, 3, ['Chariot elevateur', 'Pince a bobines'], ['Pince a bobines sur chariot elevateur', 'CACES R489 obligatoire', 'Zone d\'exclusion au levage', 'Calage des bobines']),
      r('pap-incendie', 'Incendie (papier, poussieres)', 'Depart de feu par stock de papier, poussieres, produits chimiques', 'pap-stockage', ['Stock de papier (tres combustible)', 'Poussieres de cellulose', 'Produits chimiques', 'Surchauffe secherie'], 4, 1, ['Detection', 'Sprinklers'], ['Detection incendie renforcee', 'Sprinklers dans toute l\'usine', 'Nettoyage poussieres quotidien', 'Brigade incendie interne']),
      r('pap-electrique', 'Risque electrique', 'Electrisation par installations haute puissance de la machine a papier', 'pap-machine', ['Moteurs haute puissance', 'Armoires electriques', 'Variateurs de vitesse', 'Sol mouille + electricite'], 3, 2, ['Habilitation electrique'], ['Habilitation obligatoire pour intervention', 'Sol isolant autour armoires', 'Consignation avant intervention', 'Verification annuelle']),
    ],
  },
];
