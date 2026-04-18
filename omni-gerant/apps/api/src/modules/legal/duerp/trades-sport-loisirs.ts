// BUSINESS RULE [CDC-2.4]: E7e — 5 metiers Sport & Loisirs

import type { MetierRiskProfile } from './risk-database-v2.js';

function r(id: string, name: string, desc: string, wuId: string, sits: string[], g: 1|2|3|4, f: 1|2|3|4, exist: string[], proposed: string[], cat: string): MetierRiskProfile['risks'][number] {
  return { id, name, description: desc, workUnitId: wuId, situations: sits, defaultGravity: g, defaultFrequency: f, existingMeasures: exist, proposedActions: proposed, category: cat as MetierRiskProfile['risks'][number]['category'] };
}

function wu(id: string, name: string, desc: string, hc: string): MetierRiskProfile['workUnits'][number] {
  return { id, name, description: desc, typicalHeadcount: hc };
}

export const SPORT_LOISIRS_TRADES: MetierRiskProfile[] = [
  // ── Salle de sport / fitness ──────────────────────────────────
  {
    metierSlug: 'salle-sport', label: 'Salle de sport / Fitness', category: 'sport_loisirs',
    nafCodes: ['93.13Z'], idcc: '1518',
    legalReferences: ['Art. L322-1 (code sport)', 'Arrete du 20/05/1998 (ERP sport)', 'NF EN 957 (equipements fitness)'],
    workUnits: [
      wu('sport-plateau', 'Plateau musculation / cardio', 'Coaching, surveillance, entretien des machines', '1-3'),
      wu('sport-cours', 'Salle de cours collectifs', 'Cours de fitness, yoga, cycling', '1'),
      wu('sport-accueil', 'Accueil / vestiaires', 'Accueil, inscriptions, entretien vestiaires', '1-2'),
      wu('sport-technique', 'Local technique', 'Entretien des equipements, climatisation', '1'),
    ],
    risks: [
      r('sport-tms', 'TMS (demonstrations, manutention)', 'Douleurs par demonstrations repetees et deplacements de machines', 'sport-plateau', ['Demonstrations d\'exercices aux clients', 'Manipulation de poids libres (rangement)', 'Position debout prolongee', 'Cours collectifs physiques (6-8 par jour)'], 3, 3, ['Chaussures de sport'], ['Nombre max de cours/jour pour les coachs', 'Technique de demonstration sans charge excessive', 'Chariot pour deplacer les equipements lourds', 'Echauffement personnel avant les cours']),
      r('sport-bruit', 'Bruit (musique, machines)', 'Exposition au bruit de la musique amplifiee et des machines', 'sport-cours', ['Musique forte en cours collectif', 'Cycling (musique + bruit pedalier)', 'Machines de musculation', 'Bruit ambiant general'], 2, 4, ['Limiteur de son'], ['Limiteur sonore (85 dB max)', 'Micro-casque pour le coach (evite de crier)', 'Isolement phonique des salles de cours', 'Suivi audiometrique si symptomes']),
      r('sport-electrique', 'Risque electrique (equipements)', 'Electrisation par machines electriques en milieu humide (transpiration)', 'sport-plateau', ['Tapis de course (moteur)', 'Velo elliptique', 'Branchements multiples', 'Transpiration sur les machines'], 3, 1, ['Differentiel'], ['Verification electrique annuelle', 'Maintenance preventive des machines', 'Differentiel 30mA sur chaque circuit']),
      r('sport-chute', 'Chute (sol, equipements)', 'Chute sur sol glissant ou trebuchement sur un equipement', 'sport-plateau', ['Sol mouille (transpiration)', 'Haltere au sol', 'Cable de machine', 'Vestiaires/douches mouilles'], 2, 3, ['Sol adapte'], ['Sol caoutchouc dans la zone musculation', 'Rangement systematique des poids et tapis', 'Sol antiderapant dans les vestiaires', 'Nettoyage continu du sol']),
      r('sport-biologique', 'Risque biologique (transpiration, vestiaires)', 'Contamination par contact avec equipements contamines (transpiration, mycoses)', 'sport-accueil', ['Machines non desinfectees entre utilisateurs', 'Vestiaires communs (mycoses)', 'Tapis de sol (yoga)', 'Douches'], 2, 3, ['Spray desinfectant'], ['Spray desinfectant a chaque machine', 'Serviette obligatoire pour les clients', 'Nettoyage desinfection quotidien des vestiaires', 'Aeration continue de la salle']),
      r('sport-incendie', 'Incendie (ERP)', 'Incendie dans un ERP recevant du public', 'sport-technique', ['Installation electrique', 'Climatisation', 'Sauna (si present)'], 3, 1, ['Extincteurs', 'Issue secours'], ['SSI conforme categorie ERP', 'Exercice evacuation annuel', 'Issue de secours degage en permanence']),
    ],
  },

  // ── Piscine / Centre aquatique ────────────────────────────────
  {
    metierSlug: 'piscine-centre-aquatique', label: 'Piscine / Centre aquatique', category: 'sport_loisirs',
    nafCodes: ['93.11Z'], idcc: '1518',
    legalReferences: ['Art. D322-11 (surveillance piscine)', 'Art. D1332-1 (qualite eau)', 'Arrete du 14/09/2004 (POSS)'],
    workUnits: [
      wu('pisc-bassin', 'Bassins', 'Surveillance des bassins, secours', '2-6'),
      wu('pisc-technique', 'Local technique', 'Traitement de l\'eau, chaufferie', '1-2'),
      wu('pisc-accueil', 'Accueil / vestiaires', 'Accueil, caisse, entretien vestiaires', '1-3'),
      wu('pisc-enseign', 'Enseignement / activites', 'Cours de natation, aquagym, bebe-nageur', '1-4'),
    ],
    risks: [
      r('pisc-chimique', 'Risque chimique (chlore, pH)', 'Intoxication par chlore gazeux ou produits de traitement de l\'eau', 'pisc-technique', ['Manipulation de chlore gazeux ou en pastilles', 'Correcteur pH (acide sulfurique)', 'Brouillard de chlore au-dessus des bassins', 'Fuite sur le circuit de traitement', 'Local technique mal ventile'], 3, 3, ['Dosage automatique', 'Ventilation'], ['Dosage automatique avec telesurvveillance', 'Masque a cartouche pour manipulation', 'Gants et lunettes pour produits', 'Ventilation conforme du local technique', 'Douche de securite dans le local', 'Formation manipulation produits']),
      r('pisc-noyade', 'Noyade (intervention sauvetage)', 'Noyade d\'un usager ou du sauveteur lors de l\'intervention', 'pisc-bassin', ['Malaise d\'un nageur', 'Enfant en difficulte', 'Toboggan aquatique', 'Leçon de natation (non-nageur)'], 4, 2, ['MNS diplome', 'POSS'], ['POSS (Plan d\'Organisation de la Surveillance et des Secours)', 'MNS en nombre suffisant', 'Materiel de sauvetage accessible (bouee, perche)', 'Exercice sauvetage mensuel', 'Defibrillateur accessible', 'Camera de surveillance subaquatique']),
      r('pisc-glissade', 'Glissade (plages, vestiaires)', 'Chute sur les plages de bassin et dans les vestiaires mouilles', 'pisc-bassin', ['Plage de bassin mouillee', 'Vestiaires (douches)', 'Escalier d\'acces aux bassins', 'Zone toboggan'], 3, 4, ['Sol antiderapant basique'], ['Revetement sol classe C (antiderapant certifie)', 'Chaussures antiderapantes pour le personnel', 'Raclage regulier des plages', 'Signalisation permanente', 'Eclairage suffisant']),
      r('pisc-tms', 'TMS (enseignement dans l\'eau)', 'Douleurs par postures dans l\'eau et demonstrations', 'pisc-enseign', ['Demonstrations dans l\'eau (heures)', 'Sauvetage (traction du noye)', 'Station debout sur plage (surveillance)', 'Manipulation de materiel pedagogique'], 2, 3, ['Materiel pedagogique'], ['Alternance surveillance/enseignement', 'Pauses hors de l\'eau', 'Combinaison neoprene si eau froide', 'Materiel pedagogique leger']),
      r('pisc-bruit', 'Bruit (reverb bassins)', 'Exposition au bruit amplifie par la reverberation des bassins couverts', 'pisc-bassin', ['Bassin couvert (reverberation)', 'Cris des enfants', 'Toboggan (cris)', 'Musique aquagym'], 2, 4, ['Traitement acoustique basique'], ['Traitement acoustique des plafonds', 'Micro-casque pour les MNS', 'Bouchons moules pour la surveillance', 'Suivi audiometrique annuel']),
      r('pisc-biologique', 'Risque biologique (verrues, mycoses)', 'Contamination par champignons et virus dans l\'environnement humide', 'pisc-accueil', ['Vestiaires communs', 'Plage de bassin', 'Eau du bassin (si traitement insuffisant)'], 2, 3, ['Traitement eau'], ['Traitement eau conforme (chlore, pH)', 'Nettoyage desinfection quotidien vestiaires', 'Pediluve fonctionnel', 'Sandales pour le personnel']),
    ],
  },

  // ── Moniteur de ski ───────────────────────────────────────────
  {
    metierSlug: 'moniteur-ski', label: 'Moniteur de ski / ESF', category: 'sport_loisirs',
    nafCodes: ['93.19Z'], idcc: '2021',
    legalReferences: ['Art. L212-1 (code sport, diplome obligatoire)', 'Arrete du 16/04/2018 (BE ski)', 'Plan avalanche communal'],
    workUnits: [
      wu('ski-piste', 'Pistes de ski', 'Cours collectifs et individuels sur les pistes', '1'),
      wu('ski-hors-piste', 'Hors-piste / randonnee', 'Ski de randonnee, hors-piste encadre', '1'),
      wu('ski-bureau', 'Bureau / ESF', 'Accueil, planification des cours', '1-3'),
      wu('ski-materiel', 'Local materiel', 'Stockage et entretien du materiel de ski', '1'),
    ],
    risks: [
      r('ski-chute', 'Chute a ski (fracture)', 'Fracture ou entorse par chute a ski', 'ski-piste', ['Chute lors d\'une demonstration', 'Collision avec un skieur', 'Verglas ou plaque de glace', 'Chute en hors-piste (rochers, arbres)'], 4, 3, ['Casque', 'Protection dorsale'], ['Casque EN 1077 obligatoire', 'Protection dorsale', 'Ski en bon etat (fixations reglees)', 'Reconnaissance des conditions de neige avant le cours', 'Echauffement avant le premier cours']),
      r('ski-avalanche', 'Avalanche (hors-piste)', 'Ensevelissement par avalanche lors de sorties hors-piste', 'ski-hors-piste', ['Hors-piste apres chute de neige', 'Pente > 30° avec manteau neigeux instable', 'Rechauffement rapide (printemps)', 'Corniche', 'Couloir avalancheux connu'], 4, 2, ['DVA, sonde, pelle'], ['DVA (Detecteur Victimes Avalanche) obligatoire', 'Sonde et pelle dans le sac', 'Airbag anti-avalanche', 'Consultation BRA (Bulletin Risque Avalanche)', 'Annulation si risque > 3/5', 'Formation secours en avalanche', 'Communication radio avec la base']),
      r('ski-froid', 'Froid (gelures, hypothermie)', 'Gelures et hypothermie par exposition prolongee au froid et vent', 'ski-piste', ['Vent catabatique', 'Temperature < -15°C', 'Brouillard (perte de reperes)', 'Client en difficulte (immobilise)', 'Remontee mecanique en panne'], 3, 3, ['Vetements techniques'], ['Vetements techniques multicouches', 'Gants de rechange', 'Baume a levres et creme protectrice', 'Seuil de temperature pour annulation (-20°C)', 'Boisson chaude dans le sac']),
      r('ski-uv', 'Rayonnement UV (altitude, neige)', 'Brulure oculaire et cutanee par UV reflechis par la neige en altitude', 'ski-piste', ['Soleil + altitude + neige (reflexion 80%)', 'Photokeratite (ophtalmie des neiges)', 'Coup de soleil en altitude'], 2, 4, ['Lunettes de soleil'], ['Masque de ski cat. 3-4 obligatoire', 'Creme solaire indice 50+ (renouvellement toutes les 2h)', 'Baume a levres SPF 50', 'Chapeau/buff sous le casque']),
      r('ski-psychosocial', 'Risques psychosociaux (saison, charge)', 'Stress par charge de travail en haute saison et pression de performance', 'ski-bureau', ['Haute saison (8 cours/jour)', 'Client exigeant', 'Conditions meteo stressantes (brouillard)', 'Pression financiere (saisonnier)', 'Concurrence entre moniteurs'], 2, 3, ['Planning ESF'], ['Limitation du nombre de cours/jour', 'Planning equitable de l\'ESF', 'Annulation cours si conditions dangereuses', 'Solidarite entre moniteurs']),
      r('ski-collision', 'Collision (skieurs, dameuse)', 'Collision avec un autre skieur ou un engin de damage', 'ski-piste', ['Skieur incontrole', 'Croisement de pistes', 'Dameuse en operation', 'Enfants imprevisibles'], 3, 3, ['Casque', 'Visibilite'], ['Casque EN 1077', 'Gilet identificatif visible (ESF)', 'Position face a la pente lors des arrets', 'Vigilance permanente', 'Respect des regles FIS']),
    ],
  },

  // ── Centre equestre ───────────────────────────────────────────
  {
    metierSlug: 'centre-equestre', label: 'Centre equestre / Ecole d\'equitation', category: 'sport_loisirs',
    nafCodes: ['93.19Z'], idcc: '7012',
    legalReferences: ['Art. L322-1 (code sport, declaration)', 'Art. L212-1 (diplome)', 'NF EN 1384 (bombes)'],
    workUnits: [
      wu('equ-manege', 'Manege / carriere', 'Cours d\'equitation, reprises', '1-2'),
      wu('equ-ecurie', 'Ecurie / soins', 'Soins aux chevaux, alimentation, pansage', '1-3'),
      wu('equ-exterieur', 'Promenades / randonnees', 'Promenades et randonnees equestres', '1'),
      wu('equ-admin', 'Bureau / accueil', 'Accueil, inscriptions, gestion', '1'),
    ],
    risks: [
      r('equ-chute-cheval', 'Chute de cheval', 'Chute du cavalier (moniteur ou eleve) lors d\'un cours', 'equ-manege', ['Cheval qui se cabre ou rue', 'Obstacle mal saute', 'Cheval effraye (bruit, objet)', 'Cavalier debutant desarconne'], 4, 3, ['Bombe obligatoire'], ['Bombe EN 1384 obligatoire pour tous', 'Gilet de protection dorsale pour les enseignants', 'Sol du manege entretenu et amorti', 'Chevaux adaptes au niveau des cavaliers', 'Ratio cavaliers/enseignant respecte']),
      r('equ-ecrasement', 'Ecrasement par cheval', 'Ecrasement du pied, coup de pied ou de tete du cheval', 'equ-ecurie', ['Pansage (coup de pied)', 'Ferrure', 'Cheval panique dans le box', 'Chargement en van'], 4, 3, ['Bottes a coque'], ['Bottes de securite avec coque obligatoires', 'Approche du cheval par l\'epaule', 'Attache avec anneau anti-panique', 'Formation ethologie equine', 'Contention adaptee pour soins veterinaires']),
      r('equ-tms', 'TMS (curage, sellage)', 'Douleurs par curage des boxes, sellage et manutention', 'equ-ecurie', ['Curage quotidien des boxes', 'Port des selles (10-15 kg)', 'Manipulation du foin et de la paille', 'Position debout prolongee en cours'], 3, 4, ['Brouette', 'Fourche'], ['Pailleuse mecanique', 'Brouette ou chariot motorise', 'Porte-selle a roulettes', 'Sacs d\'aliment < 20 kg', 'Pauses entre les reprises']),
      r('equ-allergie', 'Allergie (poils, poussieres)', 'Affections respiratoires par poussieres de foin et poils de chevaux', 'equ-ecurie', ['Distribution du foin', 'Paillage des boxes', 'Pansage (poils en saison de mue)', 'Poussiere du manege'], 2, 3, ['Aeration'], ['Foin en filet (reduction poussiere)', 'Arrosage du manege (poussiere)', 'Masque FFP2 si manipulation foin intensif', 'Suivi medical si symptomes allergiques']),
      r('equ-routier', 'Risque routier (promenade, van)', 'Accident lors de promenades a cheval sur route ou transport en van', 'equ-exterieur', ['Croisement vehicules en promenade', 'Cheval effraye par vehicule', 'Conduite van/camion', 'Route etroite'], 3, 2, ['Gilet HV', 'Signalisation'], ['Gilet HV obligatoire en promenade', 'Reconnaissance du parcours avant', 'Pas de promenade sur route a fort trafic', 'Van entretenu (permis adapte)', 'Eclairage si crepuscule']),
      r('equ-zoonose', 'Zoonoses (teigne, tetanos)', 'Contamination par champignons cutanes ou tetanos par blessure', 'equ-ecurie', ['Contact cheval infecte (teigne)', 'Blessure avec objet souille (tetanos)', 'Morsure de tique en exterieur'], 2, 2, ['Gants'], ['Vaccination tetanos a jour', 'Gants pour soins cutanes', 'Desinfection des plaies', 'Verification tiques apres promenade']),
    ],
  },

  // ── Parc d'attractions ────────────────────────────────────────
  {
    metierSlug: 'parc-attractions', label: 'Parc d\'attractions / Parc a theme', category: 'sport_loisirs',
    nafCodes: ['93.21Z'], idcc: '1518',
    legalReferences: ['Arrete du 12/03/2009 (machines de jeux)', 'Art. R4323-1 (equipements)', 'Arrete du 25/06/1980 (ERP)'],
    workUnits: [
      wu('parc-attractions', 'Manege / attractions', 'Operation et surveillance des attractions', '2-10'),
      wu('parc-entretien', 'Entretien / maintenance', 'Maintenance des machines et des espaces', '2-6'),
      wu('parc-accueil', 'Accueil / billetterie', 'Accueil visiteurs, controle billets, info', '2-6'),
      wu('parc-restauration', 'Restauration / boutiques', 'Points de restauration et boutiques du parc', '2-10'),
    ],
    risks: [
      r('parc-machines', 'Machines (attractions)', 'Blessure par machine en mouvement lors de l\'operation ou maintenance', 'parc-attractions', ['Pieces mecaniques en mouvement', 'Maintenance d\'une attraction en hauteur', 'Demarrage intempestif (consignation ratee)', 'Visiteur dans la zone machine'], 4, 2, ['Carter', 'Procedure consignation'], ['Consignation obligatoire avant toute intervention', 'Carter sur parties accessibles', 'Formation specifique par attraction', 'Verification quotidienne avant ouverture', 'Controle periodique APAVE/Veritas']),
      r('parc-chute-hauteur', 'Chute de hauteur (maintenance)', 'Chute lors de la maintenance des attractions en hauteur', 'parc-entretien', ['Maintenance grand huit (structure haute)', 'Changement d\'ampoule sur decor', 'Toiture des batiments', 'Montage/demontage d\'attractions'], 4, 2, ['Harnais'], ['Harnais EN 361 obligatoire des 2m', 'Points d\'ancrage sur les structures', 'Nacelle pour les travaux planifies', 'Formation travail en hauteur']),
      r('parc-electrique', 'Risque electrique', 'Electrisation par installations electriques des attractions et eclairage', 'parc-entretien', ['Armoire electrique d\'une attraction', 'Eclairage de decoration (humidite)', 'Spectacle son et lumiere', 'Branchements forain'], 3, 2, ['Habilitation electrique'], ['Habilitation electrique pour le personnel maintenance', 'Verification electrique annuelle', 'Equipements IP65 en exterieur', 'Consignation electrique pour intervention']),
      r('parc-bruit', 'Bruit (musique, attractions)', 'Exposition au bruit des attractions et de la musique ambiante', 'parc-attractions', ['Musique forte pres des attractions', 'Cris des visiteurs', 'Moteur des attractions', 'Spectacles pyrotechniques'], 2, 4, ['Bouchons d\'oreille'], ['Bouchons moules pour le personnel', 'Limitation sonore des enceintes', 'Rotation des postes (zones bruyantes)', 'Suivi audiometrique annuel']),
      r('parc-foule', 'Risque foule (bousculade, mouvement de foule)', 'Bousculade, pietinement, panique dans la foule', 'parc-accueil', ['Spectacle populaire (attroupement)', 'Evacuation d\'urgence', 'File d\'attente longue (mecontentement)', 'Panique (orage, alarme)'], 3, 2, ['Plan de foule'], ['POSS (plan de gestion des foules)', 'Formation gestion de foule', 'Issues de secours en nombre suffisant', 'Jauge maximale par zone', 'Communication radio permanente entre equipes']),
      r('parc-intemperies', 'Intemperies (travail exterieur)', 'Exposition aux intemperies (chaleur, pluie, foudre)', 'parc-attractions', ['Travail en exterieur toute l\'annee', 'Chaleur estivale', 'Orage (foudre sur structures metalliques)', 'Pluie (sol glissant)'], 2, 3, ['Vetements adaptes'], ['Procedure orage (evacuation attractions metalliques)', 'Creme solaire et eau en ete', 'Vetements de pluie fournis', 'Arret attractions si vent fort']),
    ],
  },
];
