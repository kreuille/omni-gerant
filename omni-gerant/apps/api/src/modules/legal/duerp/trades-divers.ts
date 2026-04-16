// BUSINESS RULE [CDC-2.4]: E7e — 14 metiers Divers (Audiovisuel, Collectivites, Autres)
// Audiovisuel (2), Collectivites (3), Commerces specialises (9)

import type { MetierRiskProfile } from './risk-database-v2.js';

function r(id: string, name: string, desc: string, wuId: string, sits: string[], g: 1|2|3|4, f: 1|2|3|4, exist: string[], proposed: string[], cat: string): MetierRiskProfile['risks'][number] {
  return { id, name, description: desc, workUnitId: wuId, situations: sits, defaultGravity: g, defaultFrequency: f, existingMeasures: exist, proposedActions: proposed, category: cat as MetierRiskProfile['risks'][number]['category'] };
}

function wu(id: string, name: string, desc: string, hc: string): MetierRiskProfile['workUnits'][number] {
  return { id, name, description: desc, typicalHeadcount: hc };
}

export const DIVERS_TRADES: MetierRiskProfile[] = [
  // ═══ AUDIOVISUEL ══════════════════════════════════════════════

  // ── Studio photo/video ────────────────────────────────────────
  {
    metierSlug: 'studio-photo-video', label: 'Studio photo / video / Photographe', category: 'services_divers',
    nafCodes: ['74.20Z'], idcc: '2412',
    legalReferences: ['Art. R4323-1 (equipements)', 'NF EN 60598 (eclairage)', 'Art. R4226-1 (electrique)'],
    workUnits: [
      wu('stud-plateau', 'Plateau de prise de vue', 'Prises de vue photo/video en studio', '1-4'),
      wu('stud-postprod', 'Post-production', 'Retouche, montage video, livraison', '1-2'),
      wu('stud-exterieur', 'Reportage exterieur', 'Prises de vue en exterieur, evenements', '1-2'),
      wu('stud-stockage', 'Stockage materiel', 'Rangement equipements, eclairages', '1'),
    ],
    risks: [
      r('stud-electrique', 'Risque electrique (eclairages)', 'Electrisation par eclairages studio puissants et branchements multiples', 'stud-plateau', ['Flash studio (haute tension)', 'Branchements multiples (multiprises)', 'Cables au sol', 'Eclairage continu (chaleur)'], 3, 2, ['Disjoncteur differentiel'], ['Verification electrique du studio', 'Pas de multiprises en cascade', 'Goulotte pour les cables', 'Remplacement LED (moins de chaleur/consommation)']),
      r('stud-chute', 'Chute (cables, equipements)', 'Chute par trebuchement sur cables ou chute d\'equipement instable', 'stud-plateau', ['Cables au sol partout', 'Pied d\'eclairage instable', 'Fond de studio (perche)', 'Materiel en hauteur (projecteur)'], 2, 3, ['Contrepoids pieds'], ['Gaffer tape sur les cables au sol', 'Contrepoids sur chaque pied d\'eclairage', 'Fixation securisee des projecteurs en hauteur', 'Rangement apres chaque prise de vue']),
      r('stud-tms', 'TMS (postures, port materiel)', 'Douleurs par port de materiel lourd et postures de prise de vue', 'stud-exterieur', ['Port du sac photo (10-15 kg)', 'Position accroupie/genoux pour cadrage', 'Trepied lourd en exterieur', 'Station debout prolongee au studio'], 2, 3, ['Sac ergonomique'], ['Sac photo avec bretelles rembourees et ceinture', 'Chariot pour le materiel studio', 'Trepied carbone (leger)', 'Tabouret pliable pour les longues seances']),
      r('stud-uv-flash', 'Flash / eclairage (yeux)', 'Fatigue oculaire et eblouissement par flashs repetes et ecrans', 'stud-postprod', ['Flash studio repete', 'Ecran de retouche (heures)', 'Eclairage continu puissant'], 2, 3, ['Modeleur sur flash'], ['Modeleur/softbox sur chaque flash', 'Ecran calibre avec filtre lumiere bleue', 'Pauses ecran regulieres', 'Lunettes anti-lumiere bleue pour la postprod']),
      r('stud-chimique', 'Risque chimique (fumigenes)', 'Irritation respiratoire par machine a fumee ou fumigenes', 'stud-plateau', ['Machine a fumee (glycol)', 'Fumigenes colores', 'Aerosols pour effets speciaux'], 2, 2, ['Aeration'], ['Aeration entre les prises', 'Liquide machine a fumee non toxique', 'Masque si utilisation prolongee', 'Pas de fumigene en espace confine']),
      r('stud-routier', 'Risque routier (reportages)', 'Accident lors des deplacements pour reportages', 'stud-exterieur', ['Deplacements frequents', 'Materiel lourd dans le vehicule', 'Pression des delais'], 3, 2, ['Vehicule entretenu'], ['Materiel arrime dans le vehicule', 'Planning avec temps de trajet', 'Assurance materiel professionnel']),
    ],
  },

  // ── Evenementiel / Spectacle ──────────────────────────────────
  {
    metierSlug: 'evenementiel-spectacle', label: 'Evenementiel / Spectacle vivant', category: 'services_divers',
    nafCodes: ['90.02Z', '90.04Z'], idcc: '3090',
    legalReferences: ['Arrete du 25/06/1980 (ERP)', 'Art. R4323-58 (travaux en hauteur)', 'Arrete du 19/03/1993 (echafaudages)'],
    workUnits: [
      wu('event-montage', 'Montage / demontage', 'Installation des structures, scenes, eclairages', '4-20'),
      wu('event-regie', 'Regie son / lumiere', 'Exploitation technique pendant l\'evenement', '1-4'),
      wu('event-scene', 'Scene / plateau', 'Espace de representation', '2-10'),
      wu('event-public', 'Accueil public', 'Gestion du public, securite, accueil', '2-20'),
    ],
    risks: [
      r('event-chute-hauteur', 'Chute de hauteur (montage, grill)', 'Chute lors du montage des structures, eclairages et decors en hauteur', 'event-montage', ['Montage de scene (4-12m)', 'Accroche de projecteurs au grill', 'Pose de banderoles/decoration', 'Echafaudage de scene', 'Toiture de chapiteau'], 4, 3, ['Harnais'], ['Harnais EN 361 + longe a absorbeur', 'CACES R486 pour nacelle', 'Point d\'ancrage sur les structures', 'Filet de securite sous le grill', 'Formation travail en hauteur', 'Balisage zone de montage']),
      r('event-electrique', 'Risque electrique (installations temporaires)', 'Electrisation par installations electriques temporaires et humidite', 'event-regie', ['Branchements provisoires (exterieur)', 'Puissance electrique importante (> 100kW)', 'Cables au sol (pluie)', 'Eclairage de scene (HMI, LED puissants)'], 4, 2, ['Electricien habilite'], ['Electricien habilite pour les branchements', 'Armoire electrique avec differentiel', 'Cables en goulotte ou aerien (pas au sol dans les passages)', 'IP44 minimum en exterieur', 'Verification avant chaque evenement']),
      r('event-bruit', 'Bruit (son amplifie)', 'Perte auditive par exposition au son amplifie (concert, DJ)', 'event-regie', ['Concert (> 100 dB)', 'Balances son (repetitions)', 'DJ en discothèque', 'Proximite des enceintes'], 4, 4, ['Bouchons d\'oreille'], ['Bouchons moules attenues (filtre -15 dB)', 'Limiteur sonore conforme (105 dB)', 'Rotation des postes pres des enceintes', 'Distance minimale des HP', 'Suivi audiometrique annuel obligatoire']),
      r('event-ecrasement', 'Ecrasement (structures, decors)', 'Ecrasement par chute de structure, de decor ou d\'equipement lourd', 'event-montage', ['Structure metallique en cours de montage', 'Decor suspendu (defaillance accroche)', 'Empilement de flight-cases', 'Pont lumiere charge'], 4, 2, ['Calcul de charge'], ['Note de calcul de charge pour chaque structure', 'Elingues et manilles certifiees', 'Casque EN 397 obligatoire en zone de montage', 'Balisage zone sous charge suspendue', 'Controle annuel des structures (bureau de controle)']),
      r('event-foule', 'Risque foule (bousculade)', 'Bousculade, mouvement de panique dans le public', 'event-public', ['Concert debout (fosse)', 'Evacuation d\'urgence (incendie, intemperie)', 'File d\'attente interminable', 'Survente de places'], 4, 2, ['Jauge', 'Service securite'], ['Jauge respectee strictement', 'Plan de foule et POSS', 'Barriere anti-bousculade en fosse', 'Issues de secours en nombre suffisant', 'Personnel secours (CRS/pompiers) si necessaire']),
      r('event-tms', 'TMS (manutention, montage)', 'Douleurs par manipulation de materiel lourd et postures de montage', 'event-montage', ['Flight-cases (20-80 kg)', 'Praticables de scene', 'Elements de decor lourds', 'Montage repetitif (tournee)'], 3, 3, ['Diable', 'Chariot'], ['Moyens de levage adaptes (palan, chariot elevateur)', 'Flight-cases a roulettes', 'Equipe de montage en nombre suffisant', 'Formation gestes et postures', 'Pauses pendant le montage']),
    ],
  },

  // ═══ COLLECTIVITES ════════════════════════════════════════════

  // ── Mairie / Administration ───────────────────────────────────
  {
    metierSlug: 'mairie-administration', label: 'Mairie / Administration publique', category: 'services_divers',
    nafCodes: ['84.11Z'], idcc: '0',
    legalReferences: ['Decret 85-603 (fonction publique territoriale)', 'Art. 108-1 loi 84-53 (hygiene securite)', 'Vigipirate'],
    workUnits: [
      wu('mair-accueil', 'Accueil du public', 'Accueil des usagers, etat civil, urbanisme', '1-4'),
      wu('mair-bureau', 'Bureaux administratifs', 'Services administratifs, comptabilite, RH', '2-10'),
      wu('mair-technique', 'Services techniques', 'Entretien voirie, espaces verts, batiments', '2-10'),
      wu('mair-archives', 'Archives / sous-sol', 'Stockage et consultation des archives', '1'),
    ],
    risks: [
      r('mair-psychosocial', 'Risques psychosociaux (accueil public)', 'Stress par accueil de public en difficulte, incivilites, charge administrative', 'mair-accueil', ['Usager en colere (refus administratif)', 'Charge de travail (elections, demandes)', 'Reorganisation des services', 'Violence verbale ou menace', 'Manque de personnel'], 3, 3, ['Accueil securise'], ['Hygiaphone ou vitre de protection', 'Formation gestion de conflit', 'Bouton d\'alerte silencieux', 'Soutien psychologique', 'Procedure signalement agression']),
      r('mair-agression', 'Agression (usagers)', 'Violence physique ou verbale d\'usagers mecontents', 'mair-accueil', ['Refus de dossier', 'Delai de traitement long', 'Usager sous l\'emprise d\'alcool/drogue', 'Service sensible (social, urbanisme)'], 3, 2, ['Camera', 'Vigile si necessaire'], ['Amenagement du guichet (distance, issue de secours)', 'Camera dans les espaces d\'accueil', 'Vigile aux heures d\'affluence si necesaire', 'Formation desescalade', 'Procedure de retrait']),
      r('mair-tms', 'TMS (ecran, postures)', 'Douleurs par travail sur ecran prolonge et postures au bureau', 'mair-bureau', ['Position assise prolongee', 'Ecran mal positionne', 'Archivage (port de cartons)', 'Guichet (posture debout/assise alternee)'], 2, 3, ['Siege bureau'], ['Poste informatique ergonomique conforme', 'Siege reglable avec accoudoirs', 'Double ecran si necessaire', 'Pauses actives recommandees']),
      r('mair-chute', 'Chute (escalier, archives)', 'Chute dans les escaliers anciens ou en sous-sol d\'archives', 'mair-archives', ['Escalier de mairie ancien', 'Sous-sol humide', 'Archives empilees (instabilite)', 'Echelle pour etagere haute'], 2, 2, ['Main courante', 'Eclairage'], ['Main courante conforme', 'Eclairage automatique dans les sous-sols', 'Escabeau securise pour les archives', 'Desencombrement des passages']),
      r('mair-technique', 'Risques services techniques', 'Risques polyvalents pour les agents des services techniques', 'mair-technique', ['Entretien voirie (circulation)', 'Espaces verts (machines, chimique)', 'Electricite batiments', 'Manutention (mobilier, materiel)'], 3, 3, ['EPI par tache'], ['EPI adaptes a chaque intervention', 'Habilitations a jour (electrique, CACES)', 'Formation securite par type d\'intervention', 'Procedure pour travaux en voirie (balisage)']),
      r('mair-incendie', 'Incendie (ERP)', 'Incendie dans un batiment recevant du public', 'mair-bureau', ['Batiment ancien', 'Archives papier', 'Installation electrique vieillissante'], 3, 1, ['SSI', 'Extincteurs'], ['Registre de securite a jour', 'Exercice evacuation annuel', 'Commission de securite ERP', 'Detection incendie dans chaque local']),
    ],
  },

  // ── Police municipale ─────────────────────────────────────────
  {
    metierSlug: 'police-municipale', label: 'Police municipale', category: 'services_divers',
    nafCodes: ['84.24Z'], idcc: '0',
    legalReferences: ['Art. L511-1 (CSI, police municipale)', 'Decret 2000-276 (armement)', 'Art. 21 CPP (agents de police judiciaire)'],
    workUnits: [
      wu('polm-patrouille', 'Patrouille / terrain', 'Patrouille a pied, en vehicule, surveillance', '2-4'),
      wu('polm-intervention', 'Intervention', 'Intervention sur appel, flagrant delit, verbalisation', '2-4'),
      wu('polm-bureau', 'Bureau / administratif', 'Redaction de rapports, plaintes, administratif', '1-2'),
      wu('polm-video', 'Centre de videoprotection', 'Surveillance video urbaine', '1-2'),
    ],
    risks: [
      r('polm-agression', 'Agression physique', 'Violence lors d\'interventions (interpellation, controle)', 'polm-intervention', ['Interpellation d\'un individu', 'Rixe / bagarre', 'Controle d\'identite tense', 'Manifestation violente', 'Individu arme'], 4, 3, ['Gilet pare-balles', 'Radio'], ['Gilet pare-balles porte en patrouille', 'Radio avec bouton alerte', 'Formation technique d\'intervention', 'Travail en binome obligatoire', 'Procedure d\'appel renfort police nationale', 'Camera-pieton']),
      r('polm-routier', 'Risque routier', 'Accident de la route en patrouille ou lors d\'une intervention urgente', 'polm-patrouille', ['Conduite d\'urgence (gyrophare)', 'Patrouille nocturne', 'Intervention sur voie publique', 'Poursuite'], 4, 3, ['Formation conduite'], ['Formation conduite d\'urgence', 'Vehicule equipe (rampe lumineuse, sirene)', 'Gilet HV pour intervention sur voie publique', 'Ceinture obligatoire meme en intervention']),
      r('polm-psychosocial', 'Risques psychosociaux', 'Stress post-traumatique, charge emotionnelle, horaires decales', 'polm-patrouille', ['Intervention sur accident grave', 'Confrontation a la violence quotidienne', 'Horaires decales (nuit, week-end)', 'Pression hierarchique', 'Manque de reconnaissance'], 3, 3, ['Psychologue municipal'], ['Debriefing apres intervention traumatisante', 'Acces psychologue du travail', 'Groupes de parole', 'Rotation equitable des nuits', 'Soutien hierarchique']),
      r('polm-tms', 'TMS (equipement, patrouille)', 'Douleurs par port d\'equipement lourd et station debout/assise', 'polm-patrouille', ['Port du ceinturon equipe (3-5 kg)', 'Gilet pare-balles (2-3 kg)', 'Station debout prolongee', 'Position assise vehicule (equipement)'], 2, 4, ['Ceinturon ergonomique'], ['Ceinturon rembouree et repartition du poids', 'Gilet pare-balles ajuste', 'Alternance patrouille/bureau', 'Vehicule avec siege ergonomique']),
      r('polm-chimique', 'Risque chimique (gaz lacrymogene)', 'Exposition aux gaz lacrymogenes ou spray poivre', 'polm-intervention', ['Utilisation de spray poivre', 'Exposition passive (vent)', 'Manifestation avec gaz lacrymo'], 2, 2, ['Formation utilisation'], ['Formation a l\'utilisation des gaz', 'Masque a gaz disponible en vehicule', 'Decontamination immediate (eau)', 'Vent dans le dos lors de l\'utilisation']),
      r('polm-biologique', 'Risque biologique (contact public)', 'Contamination lors du contact avec le public ou dechets', 'polm-intervention', ['Interpellation (contact physique)', 'Blessure par aiguille (fouille)', 'Contact sang (rixe)', 'Personne en detresse sanitaire'], 3, 2, ['Gants'], ['Gants de fouille anti-piqure', 'Kit AES dans chaque vehicule', 'Vaccination hepatite B', 'Gel hydroalcoolique']),
    ],
  },

  // ── Sapeurs-pompiers ──────────────────────────────────────────
  {
    metierSlug: 'sapeurs-pompiers', label: 'Sapeurs-pompiers (SPP/SPV)', category: 'services_divers',
    nafCodes: ['84.25Z'], idcc: '0',
    legalReferences: ['Art. L1424-1 (SDIS)', 'CGCT (sapeurs-pompiers)', 'Guide national de reference GNR'],
    workUnits: [
      wu('pomp-intervention', 'Intervention operationnelle', 'Incendie, secours a personne, accident', '4-12'),
      wu('pomp-caserne', 'Caserne / vie courante', 'Garde, entrainement, maintenance materiel', '4-20'),
      wu('pomp-formation', 'Entrainement / formation', 'Manoeuvres, formation continue, sport', '4-12'),
      wu('pomp-conduite', 'Conduite engins', 'Conduite des engins de secours', '1-2'),
    ],
    risks: [
      r('pomp-incendie', 'Incendie (intervention)', 'Brulure, intoxication, effondrement lors de la lutte contre l\'incendie', 'pomp-intervention', ['Engagement dans un batiment en feu', 'Embrasement generalise eclaire (EGE/backdraft)', 'Effondrement de structure', 'Fumees toxiques (HCN, CO, HCl)'], 4, 3, ['ARI', 'Tenue feu'], ['Tenue de feu conforme NF EN 469', 'ARI (Appareil Respiratoire Isolant) en parfait etat', 'Cagoule sous le casque', 'Binome d\'attaque obligatoire', 'Ligne de survie', 'Formation recyclage incendie annuelle', 'Camera thermique']),
      r('pomp-psychosocial', 'Risques psychosociaux (PTSD)', 'Stress post-traumatique par confrontation repetee a la mort et la souffrance', 'pomp-intervention', ['Deces d\'une victime (en particulier enfant)', 'Accident grave multi-victimes', 'Suicide', 'Intervention inefficace (impuissance)', 'Gardes de nuit repetees'], 4, 3, ['Soutien equipe'], ['Cellule de soutien psychologique post-incident', 'Debriefing systematique apres intervention grave', 'Groupes de parole', 'Acces psychologue/psychiatre', 'Formation gestion du stress', 'Visite medicale renforcee']),
      r('pomp-routier', 'Risque routier (conduite urgence)', 'Accident de la route lors de la conduite d\'urgence des engins', 'pomp-conduite', ['Conduite d\'urgence (feux, sirene)', 'Poids de l\'engin (15-30 tonnes)', 'Intersection forcee', 'Fatigue (garde de nuit)', 'Circulation dense'], 4, 3, ['Formation conduite engins'], ['Formation conducteur engin de secours (FIA COD)', 'Ceinture obligatoire a l\'avant', 'Respect du code de la route malgre l\'urgence', 'Remplacement conducteur si fatigue']),
      r('pomp-chimique', 'Risque chimique (NRBC)', 'Exposition a des substances chimiques, radiologiques ou biologiques', 'pomp-intervention', ['Intervention sur accident chimique (TMD)', 'Incendie de local chimique', 'Decontamination de victimes', 'Substance inconnue'], 4, 2, ['Tenue chimique', 'ARI'], ['Reconnaissance NRBC avant engagement', 'Tenue chimique adaptee au risque', 'Detecteurs multi-gaz', 'Zone d\'exclusion perimetree', 'Decontamination du personnel', 'Formation NRBC recyclage']),
      r('pomp-chute', 'Chute de hauteur', 'Chute depuis echelle, toiture ou structure effondree', 'pomp-intervention', ['Echelle aerienne (30m)', 'Toiture instable (incendie)', 'Escalier effondre', 'Intervention en falaise (GRIMP)'], 4, 2, ['Harnais', 'Casque F1'], ['Casque F1 obligatoire', 'Harnais pour interventions en hauteur', 'Formation LOT SUAP/GRIMP', 'Reconnaissance de la structure avant engagement', 'Echelle verifiee avant chaque utilisation']),
      r('pomp-tms', 'TMS (manutention, port equipement)', 'Douleurs par port d\'equipement lourd (30 kg) et brancardage', 'pomp-intervention', ['Port ARI + tenue feu (30 kg)', 'Brancardage dans les escaliers', 'Deroulement de tuyaux', 'Manipulation de materiel lourd (echelle, lance)'], 3, 4, ['Entrainement physique'], ['Condition physique entretenue (sport quotidien)', 'Brancardage a 4 si poids important', 'Materiel de brancardage ergonomique', 'Formation gestes et postures', 'Test physique annuel (ICP, Luc Leger)']),
    ],
  },

  // ═══ COMMERCES SPECIALISES (complement pour atteindre 161) ═══

  // ── Fromagerie ────────────────────────────────────────────────
  {
    metierSlug: 'fromagerie', label: 'Fromagerie / Cremerie', category: 'alimentaire_restauration',
    nafCodes: ['47.29Z'], idcc: '2216',
    legalReferences: ['Reglement CE 852/2004 (hygiene)', 'Paquet hygiene', 'Tableau RG 65 (dermatoses)'],
    workUnits: [
      wu('from-boutique', 'Boutique / vente', 'Vente, decoupe, conseil client', '1-3'),
      wu('from-cave', 'Cave d\'affinage', 'Affinage, retournement, lavage des fromages', '1'),
      wu('from-atelier', 'Atelier fabrication', 'Fabrication fromagere (si artisan)', '1-2'),
      wu('from-stockage', 'Stockage / chambre froide', 'Conservation des produits', '1'),
    ],
    risks: [
      r('from-coupure', 'Coupure (couteaux, fil)', 'Coupure par couteau a fromage, fil de decoupe ou trancheuse', 'from-boutique', ['Decoupe de fromage a pate dure', 'Trancheuse electrique', 'Fil de coupe', 'Couteau qui glisse'], 3, 3, ['Couteaux entretenus'], ['Couteaux a manche antiderapant', 'Gant anti-coupure main libre EN 388', 'Trancheuse avec protege-lame', 'Formation techniques de decoupe']),
      r('from-tms', 'TMS (manipulation, postures)', 'Douleurs par manipulation de meules lourdes et station debout', 'from-cave', ['Retournement de meules (10-40 kg)', 'Lavage des fromages (penche)', 'Station debout au comptoir (8h)', 'Port de caisses de fromage'], 3, 3, ['Chariot'], ['Chariot a roulettes pour les meules', 'Table d\'affinage a hauteur reglable', 'Tapis anti-fatigue au comptoir', 'Alternance des taches']),
      r('from-froid', 'Froid (chambre froide, cave)', 'Exposition au froid en cave d\'affinage et chambre froide', 'from-cave', ['Cave d\'affinage (10-14°C, humide)', 'Chambre froide (2-4°C)', 'Alternance froid/boutique'], 2, 3, ['Vetements chauds'], ['Vetements thermiques pour cave', 'Temps limite en chambre froide', 'Chauffage de la boutique adequat']),
      r('from-biologique', 'Risque biologique (moisissures)', 'Allergie respiratoire aux moisissures d\'affinage', 'from-cave', ['Cave d\'affinage (moisissures)', 'Manipulation croutes fleuries', 'Humidite permanente'], 2, 3, ['Aeration cave'], ['Ventilation de la cave conforme', 'Masque FFP2 si sensibilite', 'Suivi medical si symptomes allergiques']),
      r('from-chimique', 'Risque chimique (nettoyage)', 'Irritation par produits de nettoyage en milieu alimentaire', 'from-atelier', ['Desinfection des plans de travail', 'Nettoyage de la cave', 'Produits acides (vinaigre, acide lactique)'], 2, 2, ['Gants'], ['Gants nitrile pour nettoyage', 'Doseurs automatiques', 'Produits agrees contact alimentaire']),
      r('from-glissade', 'Glissade (sol humide)', 'Chute sur sol humide dans la cave d\'affinage ou la boutique', 'from-cave', ['Sol de cave humide', 'Eau de nettoyage', 'Sol de boutique mouille'], 2, 2, ['Chaussures antiderapantes'], ['Chaussures antiderapantes', 'Sol antiderapant dans la cave', 'Nettoyage regulier']),
    ],
  },

  // ── Animalerie ────────────────────────────────────────────────
  {
    metierSlug: 'animalerie', label: 'Animalerie', category: 'commerce_services',
    nafCodes: ['47.76Z'], idcc: '2098',
    legalReferences: ['Art. L214-6 (code rural, vente animaux)', 'Certificat de capacite', 'Arrete du 11/08/2006'],
    workUnits: [
      wu('anim-vente', 'Espace de vente animaux', 'Presentation, vente, conseil', '1-3'),
      wu('anim-soins', 'Soins / entretien animaux', 'Alimentation, nettoyage cages, soins basiques', '1-2'),
      wu('anim-aquariophilie', 'Rayon aquariophilie', 'Entretien aquariums, vente de poissons', '1'),
      wu('anim-stockage', 'Reserve / stockage', 'Stockage aliments, accessoires', '1'),
    ],
    risks: [
      r('anim-biologique', 'Risque biologique (zoonoses, allergie)', 'Contamination par agents pathogenes animaux ou allergie aux poils/plumes', 'anim-soins', ['Morsure de rongeur', 'Griffure de chat/oiseau', 'Contact dejections (salmonelle)', 'Poils et plumes (allergie)', 'Eau d\'aquarium (mycobacteries)'], 2, 3, ['Gants usage unique'], ['Gants pour manipulation d\'animaux', 'Lavage des mains apres chaque contact', 'Vaccination tetanos a jour', 'Desinfection des morsures', 'Nettoyage desinfection quotidien des cages']),
      r('anim-chimique', 'Risque chimique (produits entretien, traitements)', 'Irritation par produits de desinfection et traitements antiparasitaires', 'anim-soins', ['Desinfection des cages', 'Traitement antiparasitaire', 'Produits aquariophilie (chlore, conditionneur)'], 2, 2, ['Gants', 'Aeration'], ['Gants nitrile', 'Aeration du local', 'Produits les moins toxiques possibles']),
      r('anim-tms', 'TMS (manutention, postures)', 'Douleurs par port de sacs d\'aliment et nettoyage des cages', 'anim-stockage', ['Sacs d\'aliment (15-25 kg)', 'Nettoyage cages (position basse)', 'Aquariums (lourds, eau)', 'Station debout'], 2, 3, ['Chariot'], ['Chariot pour les sacs', 'Cages a hauteur de travail', 'Sacs < 20 kg si possible', 'Tabouret pour les taches basses']),
      r('anim-morsure', 'Morsure / griffure', 'Blessure par morsure de rongeur, oiseau ou reptile', 'anim-vente', ['Manipulation de hamster (morsure)', 'Perroquet (bec puissant)', 'Reptile (morsure, queue)', 'Chat apeure (griffure)'], 2, 3, ['Gants de manipulation'], ['Gants de manipulation adaptes a l\'espece', 'Formation manipulation des animaux', 'Desinfection immediate', 'Signalisation des animaux mordeurs']),
      r('anim-allergie', 'Allergie (poils, plumes, poussieres)', 'Affections allergiques respiratoires ou cutanees', 'anim-vente', ['Poils de rongeurs', 'Plumes d\'oiseaux', 'Poussieres de litiere', 'Foin'], 2, 3, ['Aeration'], ['Aeration renforcee du magasin', 'Masque FFP2 pour nettoyage des cages', 'Suivi medical si symptomes', 'Aspirateur avec filtre HEPA']),
      r('anim-chute', 'Chute (sol mouille, reserve)', 'Glissade sur sol mouille par le nettoyage ou l\'eau des aquariums', 'anim-aquariophilie', ['Sol mouille (aquariums)', 'Reserve encombrée', 'Escabeau pour rayon haut'], 2, 2, ['Chaussures fermees'], ['Chaussures antiderapantes', 'Nettoyage immediat des flaques', 'Escabeau securise']),
    ],
  },

  // ── Jardinerie ────────────────────────────────────────────────
  {
    metierSlug: 'jardinerie', label: 'Jardinerie / Graineterie', category: 'commerce_services',
    nafCodes: ['47.76Z'], idcc: '2098',
    legalReferences: ['Certiphyto (si vente de phyto)', 'Art. R4541-1 (manutention)', 'Tableau RG 65 (dermatoses)'],
    workUnits: [
      wu('jard-vente-int', 'Espace de vente interieur', 'Vente de produits, outils, decoration', '2-6'),
      wu('jard-pepiniere', 'Pepiniere / exterieur', 'Presentation et vente de vegetaux en exterieur', '1-4'),
      wu('jard-reserve', 'Reserve / reception', 'Reception marchandises, stockage', '1-2'),
      wu('jard-serre', 'Serre chaude', 'Plantes tropicales, fleurs, rempotage', '1-2'),
    ],
    risks: [
      r('jard-tms', 'TMS (manutention vegetaux)', 'Douleurs par manipulation de pots lourds, sacs de terreau et palettes', 'jard-pepiniere', ['Port de pots (5-50 kg)', 'Sacs de terreau (25-50 kg)', 'Palettes de produits', 'Arrosage avec tuyau lourd'], 3, 3, ['Transpalette'], ['Transpalette et chariot elevateur (CACES)', 'Sacs < 25 kg si possible', 'Chariot client mis a disposition', 'Formation gestes et postures']),
      r('jard-chimique', 'Risque chimique (engrais, phyto)', 'Exposition aux engrais, terreau traite et produits phytosanitaires', 'jard-vente-int', ['Sac d\'engrais perce (poussiere)', 'Produits phytosanitaires en rayon', 'Terreaux traites', 'Conseil client sur les traitements'], 2, 2, ['Certiphyto si vente phyto'], ['Certiphyto pour la vente de produits', 'Gants pour manipulation engrais', 'Aeration du rayon produits', 'Stockage phyto dans armoire fermee']),
      r('jard-allergie', 'Allergie (pollens, terreaux)', 'Reactions allergiques aux pollens, terreaux et moisissures de serre', 'jard-serre', ['Plantes en floraison (pollen)', 'Manipulation terreau (moisissures)', 'Serre chaude (humidite)', 'Poussieres de graines'], 2, 3, ['Aeration'], ['Masque FFP2 pour manipulation terreau', 'Gants pour plantes irritantes', 'Aeration des serres', 'Suivi medical si symptomes']),
      r('jard-chute', 'Chute (sol mouille, exterieur)', 'Chute sur sol mouille en exterieur ou en serre', 'jard-pepiniere', ['Sol exterieur mouille (pluie)', 'Serre (arrosage au sol)', 'Reserve encombrée', 'Escabeau pour rayons hauts'], 2, 3, ['Chaussures fermees'], ['Chaussures antiderapantes', 'Sol drainant en pepiniere', 'Escabeau securise en reserve']),
      r('jard-coupure', 'Coupure (plantes, outils)', 'Coupure par plantes epineuses ou outils tranchants', 'jard-pepiniere', ['Rosiers, cactus (epines)', 'Secateur de demontration', 'Palette cerclée (fil metal)', 'Deballage cartons (cutter)'], 2, 2, ['Gants de jardin'], ['Gants de jardin epais pour manipulation plantes', 'Gants anti-coupure pour deballage', 'Cutter de securite a lame retractable']),
      r('jard-intemperies', 'Intemperies (travail exterieur)', 'Exposition aux intemperies sur la pepiniere exterieure', 'jard-pepiniere', ['Pluie (arrosage, vente)', 'Chaleur en ete', 'Froid en hiver', 'UV prolonges'], 2, 3, ['Vetements adaptes'], ['Vetements de pluie et de froid fournis', 'Chapeau et creme solaire en ete', 'Eau fraiche a disposition', 'Rotation interieur/exterieur']),
    ],
  },

  // ── Librairie ─────────────────────────────────────────────────
  {
    metierSlug: 'librairie', label: 'Librairie / Papeterie', category: 'commerce_services',
    nafCodes: ['47.61Z', '47.62Z'], idcc: '3013',
    legalReferences: ['Art. R4541-1 (manutention)', 'Tableau RG 57 (TMS)', 'Arrete du 25/06/1980 (ERP)'],
    workUnits: [
      wu('lib-vente', 'Espace de vente', 'Vente, conseil, encaissement', '1-4'),
      wu('lib-reserve', 'Reserve / stockage', 'Reception, stockage, mise en rayon', '1-2'),
      wu('lib-bureau', 'Bureau / commande', 'Commandes, comptabilite, site internet', '1'),
      wu('lib-vitrine', 'Vitrine / evenements', 'Amenagement vitrine, evenements (dedicaces)', '1'),
    ],
    risks: [
      r('lib-tms', 'TMS (manutention cartons, station debout)', 'Douleurs par manipulation de cartons de livres et station debout', 'lib-reserve', ['Reception de cartons (15-25 kg)', 'Mise en rayon (penche, bras leves)', 'Station debout au comptoir', 'Empilage/depilage de livres'], 2, 3, ['Diable'], ['Diable pour les cartons', 'Escabeau pour rayon haut', 'Tapis anti-fatigue a la caisse', 'Alternance caisse/mise en rayon']),
      r('lib-chute', 'Chute (escabeau, cartons)', 'Chute depuis escabeau ou trebuchement sur cartons', 'lib-reserve', ['Escabeau pour etagere haute', 'Cartons au sol en reserve', 'Sol mouille (entree magasin)'], 2, 2, ['Escabeau securise'], ['Escabeau conforme avec plateforme', 'Reserve rangee (pas de cartons au sol)', 'Eclairage suffisant']),
      r('lib-psychosocial', 'Risques psychosociaux', 'Stress par pression economique et charge de travail', 'lib-bureau', ['Concurrence en ligne (pression)', 'Charge de travail (commandes, evenements)', 'Client exigeant', 'Travail seul en boutique'], 2, 2, ['Pause'], ['Organisation du travail equilibree', 'Fermeture un jour/semaine', 'Communication avec les collegues']),
      r('lib-agression', 'Agression / vol', 'Vol a l\'etalage ou agression lors d\'une confrontation', 'lib-vente', ['Vol a l\'etalage', 'Client agressif', 'Fermeture du magasin (seul)'], 2, 1, ['Camera'], ['Camera de surveillance', 'Antivol sur les produits de valeur', 'Ne pas confronter un voleur seul', 'Procedure pour la fermeture']),
      r('lib-incendie', 'Incendie (papier)', 'Incendie dans un local avec forte charge combustible (livres, papier)', 'lib-reserve', ['Papier et carton (charge combustible elevee)', 'Installation electrique', 'Reserve saturee'], 3, 1, ['Extincteurs'], ['Detection incendie dans le magasin et la reserve', 'Extincteur accessible', 'Desencombrement des issues de secours', 'Verification electrique']),
      r('lib-poussieres', 'Poussieres (livres anciens)', 'Allergie aux poussieres et moisissures de livres anciens', 'lib-reserve', ['Manipulation de livres anciens', 'Reserve humide (moisissures)', 'Poussiere de papier'], 1, 2, ['Aeration'], ['Aeration de la reserve', 'Gants pour livres anciens moisis', 'Aspirateur regulier de la reserve']),
    ],
  },

  // ── Cordonnerie ───────────────────────────────────────────────
  {
    metierSlug: 'cordonnerie', label: 'Cordonnerie / Reparation chaussures', category: 'services_divers',
    nafCodes: ['95.23Z'], idcc: '1561',
    legalReferences: ['Tableau RG 84 (solvants)', 'Tableau RG 65 (dermatoses)', 'Art. R4412-1 (chimique)'],
    workUnits: [
      wu('cord-atelier', 'Atelier reparation', 'Reparation, ressemelage, collage', '1-2'),
      wu('cord-machines', 'Machines (presse, ponceuse)', 'Presse, ponceuse, machine a coudre', '1'),
      wu('cord-accueil', 'Accueil / comptoir', 'Accueil, conseil, restitution', '1'),
      wu('cord-cles', 'Reproduction de cles', 'Taillage de cles, telecommandes', '1'),
    ],
    risks: [
      r('cord-chimique', 'Risque chimique (colles, solvants)', 'Intoxication par colles et solvants de cordonnerie (neoprene, acetone)', 'cord-atelier', ['Collage neoprene (vapeurs)', 'Solvant pour decoller', 'Teinture cuir', 'Espace de travail mal ventile'], 3, 4, ['Aeration basique'], ['Aspiration a la source au poste de collage', 'Gants nitrile pour manipulation', 'Colles moins toxiques (aqueuses) quand possible', 'Aeration permanente de l\'atelier', 'FDS des produits']),
      r('cord-machines', 'Machines (ponceuse, presse)', 'Blessure par ponceuse, presse ou machine a coudre industrielle', 'cord-machines', ['Doigt dans la ponceuse', 'Presse (ecrasement)', 'Machine a coudre (aiguille)', 'Projection de poussiere de cuir'], 3, 2, ['Carter'], ['Carter de protection sur la ponceuse', 'Arret d\'urgence sur chaque machine', 'Lunettes de protection pour le meulage', 'Formation utilisation machines']),
      r('cord-poussieres', 'Poussieres (cuir, caoutchouc)', 'Affections respiratoires par poussieres de ponçage', 'cord-atelier', ['Ponçage semelle', 'Meulage talon', 'Decoupe cuir'], 2, 3, ['Masque papier'], ['Aspiration a la source sur ponceuse', 'Masque FFP2', 'Nettoyage regulier de l\'atelier']),
      r('cord-tms', 'TMS (postures, repetition)', 'Douleurs par postures de travail et gestes repetitifs', 'cord-atelier', ['Position assise penche (reparation)', 'Gestes repetitifs (couture, ponçage)', 'Taillage de cles (bras leves)'], 2, 3, ['Siege reglable'], ['Siege reglable avec dossier', 'Eclairage suffisant du poste', 'Alternance des taches', 'Pauses regulieres']),
      r('cord-coupure', 'Coupure (couteau, cuir)', 'Coupure par couteau de cordonnerie ou materiau tranchant', 'cord-atelier', ['Coupe de cuir au tranchet', 'Decoupe semelle', 'Cle cassee (bord tranchant)'], 2, 2, ['Couteau entretenu'], ['Couteau avec manche ergonomique', 'Plan de coupe stable', 'Gant anti-coupure si necessaire']),
      r('cord-bruit', 'Bruit (machines)', 'Bruit des machines de cordonnerie (ponceuse, presse)', 'cord-machines', ['Ponceuse en fonctionnement', 'Machine a cles (taillage)', 'Presse'], 2, 2, ['Bouchons d\'oreille'], ['Bouchons moules si exposition prolongee', 'Machines entretenues (reduction bruit)']),
    ],
  },

  // ── Toilettage animaux ────────────────────────────────────────
  {
    metierSlug: 'toilettage-animaux', label: 'Toilettage pour animaux', category: 'services_divers',
    nafCodes: ['96.09Z'], idcc: '2098',
    legalReferences: ['Certificat de capacite (animaux domestiques)', 'Tableau RG 65 (dermatoses)', 'Art. L214-6 (code rural)'],
    workUnits: [
      wu('toil-bain', 'Zone bain / sechage', 'Bain, shampooing, sechage de l\'animal', '1'),
      wu('toil-tonte', 'Table de toilettage', 'Tonte, coupe, brossage', '1-2'),
      wu('toil-accueil', 'Accueil / attente', 'Accueil des clients et des animaux', '1'),
      wu('toil-stockage', 'Stockage produits', 'Stockage shampooings, accessoires', '1'),
    ],
    risks: [
      r('toil-morsure', 'Morsure / griffure', 'Morsure ou griffure par un animal stresse ou agressif', 'toil-tonte', ['Chien anxieux (tondeuse)', 'Chat agressif (bain)', 'Animal blesse ou douloureux', 'Manipulation des oreilles/pattes (sensible)'], 3, 3, ['Muserolle'], ['Muserolle pour les chiens nerveux', 'Approche calme et rassurante', 'Formation comportement animal', 'Desinfection immediate des plaies', 'Vaccination tetanos a jour', 'Refus de l\'animal si trop dangereux']),
      r('toil-tms', 'TMS (postures, repetition)', 'Douleurs par posture penche sur l\'animal et gestes repetitifs de brossage', 'toil-tonte', ['Position penchee sur la table', 'Brossage prolonge', 'Contention de l\'animal (force)', 'Station debout prolongee', 'Sechage (bras leve)'], 3, 4, ['Table reglable'], ['Table de toilettage a hauteur hydraulique', 'Sechoir sur pied (pas a bout de bras)', 'Tabouret a roulettes pour les petits chiens', 'Pauses entre les animaux', 'Outils ergonomiques (brosses, tondeuses legeres)']),
      r('toil-chimique', 'Risque chimique (shampooings, antiparasitaires)', 'Irritation cutanee par shampooings et produits antiparasitaires', 'toil-bain', ['Shampooing insecticide', 'Produit antiparasitaire', 'Spray demêlant', 'Contact repete avec l\'eau savonneuse'], 2, 3, ['Gants'], ['Gants nitrile pour le bain', 'Produits hypoallergeniques', 'Creme protectrice pour les mains', 'Aeration du local']),
      r('toil-allergie', 'Allergie (poils, poussieres)', 'Allergie aux poils, pellicules et poussieres animales', 'toil-tonte', ['Poils en suspension (tonte)', 'Poussieres de pellicules', 'Sechage (projection poils)', 'Allergie specifique (chat)'], 2, 3, ['Aeration'], ['Aspiration a la source sur table', 'Masque si sensibilite', 'Aeration renforcee', 'Nettoyage frequent du local']),
      r('toil-bruit', 'Bruit (sechoir, animaux)', 'Exposition au bruit des sechoirs et des aboiements', 'toil-bain', ['Sechoir industriel', 'Aboiements dans le local', 'Tondeuse electrique'], 2, 3, ['Bouchons'], ['Sechoir silencieux', 'Bouchons moules', 'Musique d\'ambiance calmante pour les animaux']),
      r('toil-glissade', 'Glissade (sol mouille)', 'Chute sur sol mouille par le bain et le sechage', 'toil-bain', ['Bain qui eclabousse', 'Sol mouille en permanence', 'Poils au sol (glissant)'], 2, 3, ['Sol antiderapant'], ['Sol antiderapant dans tout le local', 'Chaussures antiderapantes', 'Nettoyage regulier du sol']),
    ],
  },

  // ── Serrurerie-Depannage ──────────────────────────────────────
  {
    metierSlug: 'serrurerie-depannage', label: 'Serrurerie / Depannage d\'urgence', category: 'services_divers',
    nafCodes: ['43.29A'], idcc: '1597',
    legalReferences: ['Art. R4544-1 (electrique)', 'Tableau RG 42 (bruit)', 'Art. R4323-1 (equipements)'],
    workUnits: [
      wu('serr-intervention', 'Intervention sur site', 'Ouverture de porte, changement de serrure', '1'),
      wu('serr-atelier', 'Atelier', 'Fabrication cles, reparation serrures', '1'),
      wu('serr-deplacement', 'Deplacements', 'Conduite entre les interventions', '1'),
      wu('serr-vente', 'Vente / comptoir', 'Vente de serrures, cylindres, accessoires', '1'),
    ],
    risks: [
      r('serr-agression', 'Agression (intervention domicile)', 'Agression lors d\'une intervention a domicile (arnaque, conflit)', 'serr-intervention', ['Intervention de nuit', 'Client mecontent du prix', 'Quartier difficile', 'Confusion avec cambrioleur'], 3, 2, ['Telephone'], ['Facturation transparente (devis avant travaux)', 'Ne jamais intervenir si menace', 'Telephone charge avec numero d\'urgence', 'Carte professionnelle visible']),
      r('serr-bruit', 'Bruit (perçage, meulage)', 'Exposition au bruit du perçage et meulage de serrures', 'serr-intervention', ['Perçage de cylindre', 'Meulage (disqueuse)', 'Marteau sur goupille', 'Taillage de cles'], 3, 3, ['Bouchons d\'oreille'], ['Bouchons moules ou casque antibruit EN 352', 'Choix de technique la moins bruyante', 'Limitation du temps de perçage']),
      r('serr-tms', 'TMS (postures, perçage)', 'Douleurs par postures contraignantes (penche, agenouille devant une porte)', 'serr-intervention', ['Perçage a genoux devant une porte', 'Position inconfortable (acces difficile)', 'Port du sac d\'outils', 'Station debout au comptoir'], 2, 3, ['Genouilleres'], ['Genouilleres pour intervention au sol', 'Sac d\'outils avec roulettes', 'Outils ergonomiques (legere)']),
      r('serr-routier', 'Risque routier (deplacements urgence)', 'Accident lors des deplacements d\'urgence (nuit, pression)', 'serr-deplacement', ['Intervention de nuit (fatigue)', 'Pression du client (presse d\'entrer)', 'Nombreux deplacements par jour'], 3, 3, ['Vehicule entretenu'], ['Pas de conduite si fatigue excessive', 'GPS pour optimiser les trajets', 'Vehicule entretenu et equipe']),
      r('serr-coupure', 'Coupure / projection (meulage)', 'Coupure par bavure metallique ou projection d\'etincelles', 'serr-intervention', ['Meulage d\'un cylindre', 'Bavure metallique', 'Etincelles (disqueuse)', 'Lime a metal'], 2, 3, ['Lunettes', 'Gants'], ['Lunettes de protection EN 166', 'Gants anti-coupure', 'Ecran si meulage prolonge']),
      r('serr-electrique', 'Risque electrique (serrures connectees)', 'Electrisation lors du cablage de serrures electriques ou connectees', 'serr-intervention', ['Serrure electrique (cablage)', 'Digicode (branchement)', 'Interphone (cablage)'], 2, 1, ['Testeur de tension'], ['Coupure du courant avant intervention', 'Testeur de tension (VAT)', 'Habilitation electrique BR si travaux electriques']),
    ],
  },

  // ── Cave a vin ────────────────────────────────────────────────
  {
    metierSlug: 'cave-a-vin', label: 'Cave a vin / Caviste', category: 'commerce_services',
    nafCodes: ['47.25Z'], idcc: '2216',
    legalReferences: ['Licence de vente (debit de boissons)', 'Art. R4541-1 (manutention)', 'Reglementation ERP'],
    workUnits: [
      wu('cav-boutique', 'Boutique / vente', 'Vente, conseil, degustation', '1-3'),
      wu('cav-reserve', 'Reserve / cave', 'Stockage des bouteilles, reception', '1'),
      wu('cav-degustation', 'Espace degustation', 'Degustation, evenements', '1-2'),
      wu('cav-livraison', 'Livraison', 'Livraisons a domicile ou entreprise', '1'),
    ],
    risks: [
      r('cav-tms', 'TMS (manutention bouteilles)', 'Douleurs par manipulation repetitive de cartons et caisses de bouteilles', 'cav-reserve', ['Port de cartons de vin (15-20 kg)', 'Caisses de 12 bouteilles', 'Mise en rayon repetitive', 'Reception palette'], 3, 3, ['Diable'], ['Diable pour les cartons', 'Transpalette pour les palettes', 'Mise en rayon par petites quantites', 'Formation gestes et postures']),
      r('cav-coupure', 'Coupure (verre casse)', 'Coupure par bouteille cassee', 'cav-boutique', ['Bouteille qui tombe et casse', 'Manipulation de cageots en bois (eclisse)', 'Debouchage (capsule)'], 2, 2, ['Balai'], ['Nettoyage immediat des bris de verre', 'Gants pour manipulation cageots', 'Rayonnages stables et adaptes au poids']),
      r('cav-chute', 'Chute (reserve, escalier)', 'Chute dans la reserve (souvent en sous-sol) ou sur sol mouille', 'cav-reserve', ['Escalier de cave (etroit, raide)', 'Sol de cave humide', 'Cartons au sol', 'Eclairage insuffisant'], 2, 2, ['Main courante', 'Eclairage'], ['Main courante dans l\'escalier de cave', 'Eclairage automatique', 'Sol antiderapant', 'Reserve rangee']),
      r('cav-alcool', 'Risque alcool (degustation)', 'Exposition a l\'alcool dans le cadre professionnel (degustation)', 'cav-degustation', ['Degustations repetees', 'Salons du vin', 'Pression sociale de boire'], 2, 2, ['Crachoir'], ['Crachoir a chaque degustation', 'Limitation des quantites goutees', 'Information sur les risques', 'Conduite apres degustation (attention)']),
      r('cav-incendie', 'Incendie (cartons, alcool)', 'Incendie dans un local avec cartons et alcool', 'cav-reserve', ['Cartons (combustible)', 'Alcool fort (inflammable)', 'Installation electrique'], 3, 1, ['Extincteur'], ['Detection incendie', 'Extincteur accessible', 'Stockage spiritueux separe', 'Verification electrique']),
      r('cav-routier', 'Risque routier (livraisons)', 'Accident lors des livraisons et deplacements chez les producteurs', 'cav-livraison', ['Livraison en ville', 'Deplacement chez les vignerons', 'Vehicule charge de bouteilles'], 3, 2, ['Vehicule entretenu'], ['Bouteilles calees dans le vehicule', 'Planning de livraison realiste', 'Pas de conduite apres degustation']),
    ],
  },

  // ── Brocante / Antiquaire ─────────────────────────────────────
  {
    metierSlug: 'brocante-antiquaire', label: 'Brocante / Antiquaire', category: 'commerce_services',
    nafCodes: ['47.79Z'], idcc: '2216',
    legalReferences: ['Art. R4541-1 (manutention)', 'Registre des objets mobiliers (livre de police)'],
    workUnits: [
      wu('broc-boutique', 'Boutique / exposition', 'Presentation et vente des objets', '1-2'),
      wu('broc-reserve', 'Reserve / depot', 'Stockage des objets en attente de vente', '1'),
      wu('broc-deplacement', 'Achats / brocantes', 'Deplacements pour achats, marches aux puces, vide-greniers', '1'),
      wu('broc-restauration', 'Restauration / nettoyage', 'Nettoyage et petite restauration des objets', '1'),
    ],
    risks: [
      r('broc-tms', 'TMS (manutention meubles)', 'Douleurs par manipulation de meubles et objets lourds', 'broc-reserve', ['Port de meubles anciens (lourds)', 'Chargement/dechargement vehicule', 'Amenagement de la boutique', 'Manipulation objets encombrants'], 3, 3, ['Diable'], ['Diable et chariot pour meubles', 'Sangles de portage', 'Aide pour les charges lourdes', 'Formation gestes et postures']),
      r('broc-chimique', 'Risque chimique (produits restauration)', 'Exposition a des solvants et produits de restauration (decapant, vernis)', 'broc-restauration', ['Decapant chimique (solvants)', 'Vernis et patine', 'Produit anti-rouille', 'Cire d\'abeille chaude'], 2, 2, ['Gants', 'Aeration'], ['Gants nitrile pour produits', 'Aeration de l\'atelier', 'Substitution par produits moins toxiques']),
      r('broc-coupure', 'Coupure (objets, verre)', 'Coupure par objet tranchant, verre casse ou meuble endommage', 'broc-boutique', ['Objet rouille avec bord tranchant', 'Verre ou miroir casse', 'Eclisse de bois', 'Clou depassant d\'un meuble'], 2, 2, ['Gants'], ['Gants de manutention', 'Vaccination tetanos a jour', 'Desinfection immediate']),
      r('broc-chute', 'Chute (boutique encombree)', 'Chute par trebuchement dans une boutique ou reserve encombrée', 'broc-boutique', ['Boutique encombrée d\'objets', 'Reserve mal rangee', 'Escalier d\'acces', 'Marche aux puces (terrain inegal)'], 2, 2, ['Eclairage'], ['Passages de circulation degages', 'Eclairage suffisant', 'Chaussures fermees']),
      r('broc-routier', 'Risque routier (deplacements)', 'Accident lors des deplacements pour achats et livraisons', 'broc-deplacement', ['Deplacements frequents', 'Vehicule charge (meubles)', 'Marche aux puces tot le matin'], 3, 2, ['Vehicule entretenu'], ['Arrimage des meubles dans le vehicule', 'Pas de surcharge', 'Repos suffisant (depart tot)']),
      r('broc-poussieres', 'Poussieres (objets anciens)', 'Allergie aux poussieres et moisissures d\'objets anciens', 'broc-restauration', ['Nettoyage d\'objets tres poussiereux', 'Grenier, cave (moisissures)', 'Livres anciens', 'Tissu moisi'], 1, 2, ['Masque'], ['Masque FFP2 pour nettoyage d\'objets tres poussiereux', 'Gants', 'Nettoyage en exterieur si possible']),
    ],
  },
];
