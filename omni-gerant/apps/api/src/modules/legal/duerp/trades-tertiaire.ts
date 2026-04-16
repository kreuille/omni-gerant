// BUSINESS RULE [CDC-2.4]: E5 — 12 metiers Tertiaire & Bureau
// Bureau existe deja dans risk-database-v2.ts

import type { MetierRiskProfile } from './risk-database-v2.js';

function r(id: string, name: string, desc: string, wuId: string, sits: string[], g: 1|2|3|4, f: 1|2|3|4, exist: string[], proposed: string[], cat: string): MetierRiskProfile['risks'][number] {
  return { id, name, description: desc, workUnitId: wuId, situations: sits, defaultGravity: g, defaultFrequency: f, existingMeasures: exist, proposedActions: proposed, category: cat as MetierRiskProfile['risks'][number]['category'] };
}
function wu(id: string, name: string, desc: string, hc: string): MetierRiskProfile['workUnits'][number] {
  return { id, name, description: desc, typicalHeadcount: hc };
}

export const TERTIAIRE_TRADES: MetierRiskProfile[] = [
  // ── Auto-ecole ─────────────────────────────────────────────────
  {
    metierSlug: 'auto-ecole', label: 'Auto-ecole', category: 'tertiaire_bureau',
    nafCodes: ['85.53Z'], idcc: '1671',
    legalReferences: ['Code de la route', 'Art. R4541-1 (manutention)'],
    workUnits: [
      wu('ae-vehicule', 'Vehicule a double commande', 'Leçons de conduite avec eleve', '1-2'),
      wu('ae-salle', 'Salle de cours / code', 'Cours theoriques, simulateur', '1-2'),
      wu('ae-bureau', 'Bureau / accueil', 'Inscription, administration', '1-2'),
      wu('ae-moto', 'Piste moto / plateau', 'Leçons de conduite moto sur plateau', '1-2'),
    ],
    risks: [
      r('ae-routier', 'Risque routier (eleve conducteur)', 'Accident de la route avec un eleve conducteur debutant', 'ae-vehicule', ['Eleve qui freine trop tard', 'Mauvaise manoeuvre de l\'eleve', 'Intersection dangereuse', 'Conditions meteo degradees'], 4, 3, ['Double commande', 'Moniteur attentif'], ['Formation continue moniteur (BEPECASER)', 'Vehicule entretenu et assure', 'Parcours pedagoqiques adaptes', 'Refus de conduire si conditions dangereuses', 'Ceinture de securite obligatoire']),
      r('ae-rps', 'Risques psychosociaux', 'Stress lie a la securite des eleves, pression examens, horaires etendus', 'ae-vehicule', ['Vigilance permanente (responsabilite)', 'Eleve anxieux ou agressif', 'Taux de reussite attendu', 'Amplitude horaire (8h-20h)', 'Samedi travaille'], 3, 3, ['Planning anticipe'], ['Limitation du nombre de leçons/jour', 'Pause entre chaque leçon', 'Equilibre vie pro/perso', 'Formation gestion du stress']),
      r('ae-tms', 'TMS (posture siege passager)', 'Douleurs dorsales et cervicales par position statique prolongee cote passager', 'ae-vehicule', ['Position cote passager (pas de volant)', 'Torsion tete/corps pour surveiller', 'Vibrations vehicule', 'Siege non ergonomique'], 2, 4, ['Siege reglable'], ['Siege a reglage lombaire', 'Coussin ergonomique', 'Pauses actives entre leçons', 'Etirements reguliers']),
      r('ae-agression', 'Agression (eleves)', 'Violence verbale ou physique d\'un eleve mecontent ou stresse', 'ae-vehicule', ['Eleve qui refuse les consignes', 'Echec a l\'examen (colere)', 'Eleve sous influence', 'Conflit sur le prix'], 2, 2, ['Communication pedagogique'], ['Formation gestion de conflits', 'Procedure de refus de leçon', 'Signalement systematique']),
      r('ae-moto', 'Risque moto (plateau, circulation)', 'Chute de moto lors de leçons sur plateau ou en circulation', 'ae-moto', ['Chute eleve sur plateau', 'Chute en circulation', 'Moniteur en moto suiveuse', 'Protections insuffisantes'], 4, 2, ['EPI moto obligatoires', 'Plateau securise'], ['EPI complets eleve et moniteur (casque, gants, dorsale, bottes)', 'Plateau conforme et entretenu', 'Communication radio moniteur-eleve', 'Refus sortie si equipement incomplet']),
      r('ae-chute', 'Chute de plain-pied', 'Glissade dans la salle de code ou sur le plateau moto', 'ae-salle', ['Sol salle de code mouille', 'Plateau moto (huile, gravier)', 'Escalier d\'acces'], 2, 2, ['Sol entretenu'], ['Sol antiderapant plateau', 'Eclairage suffisant', 'Nettoyage regulier']),
      r('ae-electrique', 'Risque electrique', 'Contact avec installations electriques (simulateur, informatique)', 'ae-salle', ['Simulateur electrique', 'Ordinateurs salle de code', 'Multiprises'], 3, 1, ['Differentiel 30mA'], ['Verification electrique annuelle', 'Interdiction multiprises en cascade']),
      r('ae-incendie', 'Incendie', 'Depart de feu dans les locaux', 'ae-salle', ['Installations electriques', 'Chauffage', 'Archives papier'], 3, 1, ['Extincteurs'], ['Detection incendie', 'Exercice evacuation annuel']),
    ],
  },

  // ── Avocat ─────────────────────────────────────────────────────
  {
    metierSlug: 'avocat', label: 'Avocat / Cabinet juridique', category: 'tertiaire_bureau',
    nafCodes: ['69.10Z'], idcc: '1850',
    legalReferences: ['Code du travail general (bureau)'],
    workUnits: [
      wu('av-bureau', 'Bureau / cabinet', 'Travail juridique, redaction, recherche', '1-5'),
      wu('av-audience', 'Tribunal / audience', 'Plaidoirie, audience, rendez-vous juge', '1'),
      wu('av-deplacement', 'Deplacements clients', 'Rendez-vous clients, prison, expert', '1'),
      wu('av-reunion', 'Salle de reunion', 'Reunions clients, mediatation', '1-3'),
    ],
    risks: [
      r('av-rps', 'Risques psychosociaux (charge, conflits)', 'Stress chronique lie a la charge de travail, delais judiciaires, conflits clients', 'av-bureau', ['Dossiers urgents (delais imposes)', 'Clients en situation de detresse', 'Dossiers criminels (charge emotionnelle)', 'Concurrence et pression economique', 'Horaires etendus (soir, week-end)'], 3, 4, ['Organisation du cabinet'], ['Limitation du nombre de dossiers actifs', 'Delegation et travail en equipe', 'Droit a la deconnexion', 'Soutien psychologique accessible', 'Formation gestion du stress']),
      r('av-tms', 'TMS (ecran, posture assise)', 'Douleurs dorsales, cervicales, poignets par travail sur ecran prolonge', 'av-bureau', ['Redaction de conclusions (heures d\'ecran)', 'Recherche juridique (ecran)', 'Posture assise prolongee', 'Dossiers papier volumineux'], 2, 4, ['Siege ergonomique'], ['Siege ergonomique avec appui lombaire', 'Ecran a hauteur des yeux', 'Double ecran', 'Pauses actives toutes les 2h', 'Bureau assis-debout']),
      r('av-routier', 'Risque routier', 'Accident lors des deplacements (tribunal, clients, prison)', 'av-deplacement', ['Deplacements frequents entre tribunaux', 'Rendez-vous en prison', 'Pression horaire (audience)', 'Fatigue (preparation de nuit + audience)'], 3, 2, ['Vehicule entretenu'], ['Planning avec marge de temps', 'Transport en commun si possible', 'Pas de conduite apres nuit blanche']),
      r('av-agression', 'Agression (clients mecontents)', 'Violence verbale ou physique de clients mecontents du resultat judiciaire', 'av-reunion', ['Client mecontent du verdict', 'Partie adverse hostile', 'Menaces', 'Client sous influence'], 3, 2, ['Amenagement du cabinet (sortie)'], ['Formation desescalade', 'Bouton d\'alerte au bureau', 'Accueil securise (pas d\'objet contondant)', 'Signalement systematique des menaces']),
      r('av-sedentarite', 'Sedentarite', 'Risques cardiovasculaires lies a la sedentarite prolongee', 'av-bureau', ['Position assise 10h+/jour', 'Pas d\'activite physique', 'Repas devant l\'ecran'], 2, 3, ['Information sante'], ['Bureau assis-debout', 'Pauses mouvement toutes les heures', 'Escaliers plutot qu\'ascenseur']),
      r('av-eclairage', 'Fatigue visuelle', 'Fatigue visuelle par lecture prolongee (ecran et papier)', 'av-bureau', ['Lecture de dossiers volumineux', 'Ecran prolonge', 'Eclairage artificiel'], 2, 3, ['Eclairage reglable'], ['Regle 20-20-20', 'Eclairage naturel privilegie', 'Filtre lumiere bleue ecran']),
      r('av-chute', 'Chute de plain-pied', 'Glissade dans les locaux du cabinet', 'av-bureau', ['Sol lisse', 'Dossiers au sol', 'Cables'], 2, 1, ['Sol entretenu'], ['Rangement des dossiers', 'Gaines pour cables']),
      r('av-incendie', 'Incendie (archives)', 'Depart de feu dans les archives papier du cabinet', 'av-bureau', ['Stock de dossiers papier', 'Installation electrique', 'Multiprises surchargees'], 3, 1, ['Extincteurs', 'Detection'], ['Numerisation des archives', 'Verification electrique annuelle', 'Detection incendie']),
    ],
  },

  // ── Banque ─────────────────────────────────────────────────────
  {
    metierSlug: 'banque', label: 'Banque / Agence bancaire', category: 'tertiaire_bureau',
    nafCodes: ['64.19Z', '64.11Z'], idcc: '2120',
    legalReferences: ['Code monetaire et financier', 'Code du travail (bureau)'],
    workUnits: [
      wu('bq-agence', 'Agence / guichet', 'Accueil clients, operations courantes', '3-8'),
      wu('bq-bureau', 'Bureau conseiller', 'Rendez-vous clients, conseil, vente', '1-4'),
      wu('bq-automates', 'Zone automates / coffres', 'DAB, automates, salle des coffres', '0-1'),
      wu('bq-back-office', 'Back-office', 'Traitement administratif, comptabilite', '1-3'),
    ],
    risks: [
      r('bq-agression', 'Agression / hold-up', 'Risque de braquage et agression verbale de clients mecontents', 'bq-agence', ['Hold-up (caisse)', 'Client mecontent de refus de credit', 'Menaces', 'Agression sur le parking'], 3, 2, ['Camera', 'Vitre blindee guichet', 'Alarme'], ['Vitre blindee aux guichets', 'Sas d\'entree si necessaire', 'Camera reliee telesurveillance', 'Bouton d\'alerte discret', 'Formation reaction braquage', 'Soutien psychologique post-incident']),
      r('bq-rps', 'Risques psychosociaux (objectifs)', 'Stress lie aux objectifs commerciaux, clients en difficulte, changements frequents', 'bq-bureau', ['Pression commerciale (objectifs vente)', 'Clients en situation financiere difficile', 'Reorganisations frequentes', 'Charge de travail administrative'], 3, 3, ['Entretiens individuels'], ['Objectifs realistes et discutes', 'Formation gestion du stress', 'Ligne d\'ecoute psychologique', 'Equilibre vie pro/perso respecte']),
      r('bq-tms', 'TMS (ecran, posture)', 'Douleurs par travail sur ecran prolonge au guichet ou au bureau', 'bq-back-office', ['Travail sur ecran 8h', 'Double ecran non regle', 'Position statique au guichet', 'Saisie repetitive'], 2, 4, ['Siege ergonomique'], ['Evaluation ergonomique du poste', 'Ecran a hauteur des yeux', 'Repose-poignets', 'Alternance guichet/bureau']),
      r('bq-routier', 'Risque routier', 'Accident lors de deplacements professionnels (rendez-vous clients)', 'bq-bureau', ['Rendez-vous client a domicile', 'Deplacement inter-agences', 'Transport de fonds (si applicable)'], 3, 2, ['Vehicule entretenu'], ['Planning avec marge', 'Visioconference si possible', 'Formation eco-conduite']),
      r('bq-chute', 'Chute de plain-pied', 'Glissade dans l\'agence (sol lisse, zone automates)', 'bq-agence', ['Sol lisse de l\'agence', 'Zone automates (sol mouille pluie)', 'Marches d\'acces'], 2, 2, ['Sol entretenu'], ['Tapis d\'entree absorbant', 'Sol antiderapant', 'Eclairage suffisant']),
      r('bq-electrique', 'Risque electrique', 'Contact avec installations electriques ou DAB', 'bq-automates', ['DAB (alimentation HT)', 'Salle serveurs', 'Installations electriques agence'], 3, 1, ['Differentiel 30mA'], ['Verification electrique annuelle', 'Intervention DAB par technicien habilite']),
      r('bq-incendie', 'Incendie', 'Depart de feu dans l\'agence (serveurs, archives)', 'bq-back-office', ['Salle serveurs (surchauffe)', 'Archives papier', 'Installation electrique'], 3, 1, ['Detection', 'Extincteurs'], ['Climatisation salle serveurs', 'Detection incendie', 'Exercice evacuation annuel']),
      r('bq-sedentarite', 'Sedentarite', 'Risques lies a la sedentarite prolongee', 'bq-back-office', ['Position assise 8h', 'Pas d\'activite physique', 'Repas rapide au bureau'], 2, 3, ['Information sante'], ['Bureau assis-debout si possible', 'Pauses actives', 'Escaliers encourage']),
    ],
  },

  // ── Expert-comptable ───────────────────────────────────────────
  {
    metierSlug: 'expert-comptable', label: 'Expert-comptable / Cabinet comptable', category: 'tertiaire_bureau',
    nafCodes: ['69.20Z'], idcc: '787',
    legalReferences: ['Code du travail (bureau)'],
    workUnits: [
      wu('ec-bureau', 'Bureau / poste de travail', 'Travail comptable, analyse, redaction', '2-10'),
      wu('ec-client', 'Deplacements clients', 'Rendez-vous clients, audit, conseil', '1-3'),
      wu('ec-reunion', 'Salle de reunion', 'Reunions equipe, clients', '1-3'),
      wu('ec-archives', 'Archives / serveurs', 'Stockage dossiers, salle serveurs', '0-1'),
    ],
    risks: [
      r('ec-rps', 'Risques psychosociaux (periode fiscale)', 'Stress intense pendant les periodes fiscales (janvier-mai), surcharge, delais', 'ec-bureau', ['Periode fiscale (surcharge 3 mois)', 'Delais legaux imperatifs', 'Clients exigeants', 'Responsabilite sur les comptes', 'Heures supplementaires (60h/sem en pic)'], 3, 4, ['Planning anticipe'], ['Renfort temporaire en periode fiscale', 'Limitation heures supplementaires', 'Droit a la deconnexion hors periodes critiques', 'Soutien managérial', 'Reconnaissance effort fiscal']),
      r('ec-tms', 'TMS (ecran prolonge)', 'Douleurs dorsales, cervicales, poignets par travail sur ecran intensif', 'ec-bureau', ['Saisie comptable (ecran 10h)', 'Double ecran', 'Posture statique prolongee', 'Souris intensive'], 2, 4, ['Siege ergonomique'], ['Evaluation ergonomique de chaque poste', 'Ecran a hauteur des yeux', 'Souris et clavier ergonomiques', 'Bureau assis-debout', 'Micro-pauses toutes les heures']),
      r('ec-routier', 'Risque routier (deplacements clients)', 'Accident lors des deplacements chez les clients pour audit, bilan', 'ec-client', ['Deplacements frequents chez les clients', 'Pression horaire (rendez-vous enchaines)', 'Fatigue (periode fiscale + conduite)'], 3, 2, ['Vehicule entretenu'], ['Visioconference quand possible', 'Planning avec marge', 'Pas de conduite en cas de fatigue excessive']),
      r('ec-sedentarite', 'Sedentarite', 'Risques cardiovasculaires par sedentarite prolongee', 'ec-bureau', ['Position assise 10h+ en periode fiscale', 'Repas devant l\'ecran', 'Pas de pause active'], 2, 3, ['Information sante'], ['Bureau assis-debout', 'Pauses actives encouragees', 'Escaliers plutot qu\'ascenseur']),
      r('ec-eclairage', 'Fatigue visuelle', 'Fatigue oculaire par travail sur ecran intensif et lecture de documents', 'ec-bureau', ['Ecran 10h/jour', 'Lecture documents imprimes', 'Eclairage artificiel'], 2, 3, ['Eclairage reglable'], ['Regle 20-20-20', 'Lumiere naturelle privilegiee', 'Filtre lumiere bleue']),
      r('ec-chute', 'Chute de plain-pied', 'Glissade dans les locaux', 'ec-bureau', ['Dossiers au sol', 'Cables au sol', 'Sol lisse'], 2, 1, ['Sol entretenu'], ['Rangement des dossiers', 'Gaines pour cables']),
      r('ec-incendie', 'Incendie (archives)', 'Depart de feu dans les archives comptables', 'ec-archives', ['Archives papier volumineuses', 'Salle serveurs', 'Installation electrique ancienne'], 3, 1, ['Extincteurs', 'Detection'], ['Numerisation progressive des archives', 'Climatisation salle serveurs', 'Detection incendie']),
      r('ec-electrique', 'Risque electrique', 'Contact avec installations electriques', 'ec-bureau', ['Multiprises surchargees', 'Salle serveurs', 'Prises defectueuses'], 3, 1, ['Differentiel 30mA'], ['Verification electrique annuelle', 'Interdiction multiprises en cascade']),
    ],
  },

  // ── Immobilier ─────────────────────────────────────────────────
  {
    metierSlug: 'immobilier', label: 'Agence immobiliere', category: 'tertiaire_bureau',
    nafCodes: ['68.31Z', '68.32A'], idcc: '1527',
    legalReferences: ['Loi Hoguet', 'Code du travail (bureau)'],
    workUnits: [
      wu('imm-agence', 'Agence / accueil', 'Accueil clients, permanence telephonique', '1-3'),
      wu('imm-visite', 'Visites de biens', 'Visites d\'appartements, maisons, locaux', '1-3'),
      wu('imm-bureau', 'Bureau negociateur', 'Negociation, compromis, gestion', '1-3'),
      wu('imm-vehicule', 'Vehicule / deplacements', 'Deplacements entre biens et agence', '1-3'),
    ],
    risks: [
      r('imm-routier', 'Risque routier (deplacements frequents)', 'Accident lors des nombreux deplacements entre les biens et l\'agence', 'imm-vehicule', ['Deplacements tres frequents (5-10/jour)', 'Pression horaire (enchainer les visites)', 'Telephone en conduisant', 'Conditions meteo degradees'], 3, 4, ['Vehicule entretenu'], ['Kit mains-libres obligatoire', 'Planning avec marge entre visites', 'Formation eco-conduite', 'Interdiction telephone au volant']),
      r('imm-agression', 'Agression (visites seul)', 'Risque d\'agression lors de visites seul dans des biens vides', 'imm-visite', ['Visite seul dans un bien vide', 'Visite en soiree', 'Client inconnu', 'Quartier difficile'], 3, 2, ['Telephone charge'], ['Procedure travailleur isole (PTI)', 'Information collegue avant chaque visite', 'Geolocalisation en temps reel', 'Refus de visite en soiree seul', 'Formation vigilance et desescalade']),
      r('imm-rps', 'Risques psychosociaux', 'Stress lie a la pression commerciale, revenus variables, horaires', 'imm-bureau', ['Remuneration a la commission', 'Pression objectifs vente', 'Horaires etendus (soir, samedi)', 'Clients exigeants ou indecis'], 3, 3, ['Communication equipe'], ['Salaire minimum garanti', 'Objectifs realistes', 'Droit a la deconnexion', 'Equilibre vie pro/perso']),
      r('imm-chute', 'Chute (visites, escaliers)', 'Chute lors de visites de biens (escaliers, terrain, chantier)', 'imm-visite', ['Escalier sans rampe', 'Sol en travaux', 'Terrain accidente', 'Eclairage insuffisant dans bien vide'], 2, 3, ['Chaussures fermees'], ['Lampe portable pour biens sans electricite', 'Chaussures a semelle stable', 'Reperage des dangers avant la visite']),
      r('imm-tms', 'TMS (ecran, conduite)', 'Douleurs par travail sur ecran et conduite prolongee', 'imm-bureau', ['Saisie d\'annonces', 'Conduite prolongee', 'Position assise au bureau'], 2, 3, ['Siege ergonomique'], ['Evaluation ergonomique', 'Alternance bureau/visites', 'Pauses actives']),
      r('imm-amiante', 'Amiante (biens anciens)', 'Exposition a l\'amiante lors de visites de biens anciens non diagnostiques', 'imm-visite', ['Visite bien ancien (flocage)', 'Visite cave avec canalisations amiante', 'Bien en mauvais etat'], 3, 1, ['Diagnostic amiante demande'], ['Verifier diagnostic amiante avant visite', 'Ne pas toucher aux materiaux suspects', 'Formation sensibilisation amiante']),
      r('imm-electrique', 'Risque electrique (biens visites)', 'Contact avec installation electrique defectueuse dans un bien visite', 'imm-visite', ['Installation electrique vetuste', 'Bien vide sans disjoncteur', 'Fils apparents'], 3, 1, ['Prudence'], ['Ne pas manipuler les installations electriques', 'Lampe portable autonome']),
      r('imm-incendie', 'Incendie', 'Depart de feu dans l\'agence', 'imm-agence', ['Archives papier', 'Installations electriques'], 3, 1, ['Extincteurs'], ['Detection incendie', 'Numerisation des archives']),
    ],
  },

  // ── Informatique ───────────────────────────────────────────────
  {
    metierSlug: 'informatique', label: 'Informatique / ESN / Developpement', category: 'tertiaire_bureau',
    nafCodes: ['62.01Z', '62.02A', '62.02B', '62.09Z', '63.11Z'], idcc: '1486',
    legalReferences: ['Code du travail (teletravail)', 'Art. R4542-1 a R4542-19 (ecran)'],
    workUnits: [
      wu('info-bureau', 'Bureau / open space', 'Developpement, gestion de projet, support', '2-20'),
      wu('info-salle-serveurs', 'Salle serveurs / datacenter', 'Maintenance serveurs, cablage, installations', '1-2'),
      wu('info-client', 'Site client / intervention', 'Installation, maintenance, support sur site', '1-3'),
      wu('info-teletravail', 'Teletravail / domicile', 'Travail a distance', '1-10'),
    ],
    risks: [
      r('info-tms', 'TMS (ecran prolonge)', 'Douleurs dorsales, cervicales, syndrome canal carpien par travail sur ecran intensif', 'info-bureau', ['Developpement sur ecran 8-10h', 'Double ou triple ecran', 'Souris intensive', 'Position assise prolongee'], 3, 4, ['Siege ergonomique'], ['Evaluation ergonomique complete du poste', 'Clavier et souris ergonomiques', 'Bureau assis-debout', 'Ecran a hauteur des yeux', 'Micro-pauses programmees toutes les heures', 'Repose-poignets']),
      r('info-rps', 'Risques psychosociaux (astreintes, deadlines)', 'Stress lie aux deadlines, astreintes, changements de projet, inter-contrats', 'info-bureau', ['Deadlines de livraison serrees', 'Astreintes de nuit/week-end', 'Inter-contrat (insecurite)', 'Changements de projet frequents', 'Pression client'], 3, 3, ['Entretiens individuels'], ['Charge de travail suivie et plafonnee', 'Astreintes compensees et limitees', 'Droit a la deconnexion formalise', 'Formation gestion du stress', 'Soutien managérial']),
      r('info-sedentarite', 'Sedentarite', 'Risques cardiovasculaires par sedentarite extreme (8-12h assis)', 'info-bureau', ['Position assise prolongee 10h', 'Absence d\'activite physique', 'Grignotage devant l\'ecran'], 2, 4, ['Information sante'], ['Bureau assis-debout', 'Standing meetings', 'Challenge sport entreprise', 'Pauses actives encouragees']),
      r('info-eclairage', 'Fatigue visuelle', 'Fatigue oculaire par travail sur ecran intensif', 'info-bureau', ['Ecran 10h/jour', 'Code sur fond sombre', 'Reflets sur l\'ecran', 'Eclairage artificiel inadequat'], 2, 4, ['Eclairage reglable'], ['Filtre lumiere bleue', 'Regle 20-20-20', 'Eclairage indirect (pas de reflets)', 'Visite ophtalmo annuelle prise en charge']),
      r('info-electrique', 'Risque electrique (salle serveurs)', 'Electrisation dans la salle serveurs ou lors d\'installations', 'info-salle-serveurs', ['Intervention dans armoire electrique', 'Cables sous tension', 'Salle serveurs avec onduleur HT'], 3, 2, ['Habilitation si necessaire'], ['Habilitation electrique BR si intervention', 'Consignation avant intervention', 'Signalisation armoires electriques']),
      r('info-bruit', 'Bruit (open space, salle serveurs)', 'Exposition au bruit de l\'open space et de la salle serveurs', 'info-bureau', ['Open space (conversations, telephone)', 'Salle serveurs (ventilation > 75 dB)', 'Reunions multiples simultanees'], 2, 3, ['Casque anti-bruit disponible'], ['Espaces de concentration isoles', 'Casque anti-bruit fourni', 'Regles de calme en open space', 'Limitation temps en salle serveurs']),
      r('info-isolement', 'Isolement (teletravail)', 'Isolement social et perte de lien d\'equipe en teletravail prolonge', 'info-teletravail', ['Teletravail 100%', 'Absence de lien social', 'Difficulte a deconnecter', 'Ergonomie du poste a domicile inadequate'], 2, 3, ['Reunions d\'equipe regulieres'], ['2-3 jours de presentiel minimum/semaine', 'Rituel d\'equipe quotidien (standup)', 'Budget equipement teletravail', 'Droit a la deconnexion']),
      r('info-incendie', 'Incendie (salle serveurs)', 'Depart de feu dans la salle serveurs (surchauffe)', 'info-salle-serveurs', ['Surchauffe serveurs', 'Climatisation en panne', 'Court-circuit'], 3, 1, ['Climatisation', 'Detection', 'Extinction automatique'], ['Climatisation redondante', 'Detection precoce (VESDA)', 'Extinction gaz inerte (pas eau)', 'Surveillance temperature 24/7']),
    ],
  },

  // ── Assurance ──────────────────────────────────────────────────
  {
    metierSlug: 'assurance', label: 'Assurance / Courtage', category: 'tertiaire_bureau',
    nafCodes: ['65.11Z', '65.12Z', '66.22Z'], idcc: '2247',
    legalReferences: ['Code des assurances', 'Code du travail (bureau)'],
    workUnits: [
      wu('ass-agence', 'Agence / accueil', 'Accueil assures, gestion sinistres', '1-4'),
      wu('ass-bureau', 'Bureau conseiller', 'Conseil, vente, gestion contrats', '1-4'),
      wu('ass-deplacement', 'Deplacements clients / expertise', 'Visites clients, expertise sinistres', '1-2'),
      wu('ass-back-office', 'Back-office', 'Traitement administratif, indemnisation', '1-3'),
    ],
    risks: [
      r('ass-rps', 'Risques psychosociaux (sinistres, reclamations)', 'Stress lie a la gestion des sinistres, reclamations, clients en detresse', 'ass-agence', ['Client sinistre en detresse', 'Reclamation contentieuse', 'Objectifs commerciaux', 'Charge administrative', 'Refus d\'indemnisation (colere client)'], 3, 3, ['Communication', 'Formation'], ['Formation gestion des emotions', 'Procedure d\'escalade pour sinistres graves', 'Soutien managérial', 'Equilibre vie pro/perso']),
      r('ass-tms', 'TMS (ecran)', 'Douleurs par travail sur ecran prolonge', 'ass-back-office', ['Saisie de contrats', 'Gestion sinistres sur ecran', 'Position assise prolongee'], 2, 4, ['Siege ergonomique'], ['Evaluation ergonomique', 'Ecran a hauteur des yeux', 'Pauses actives', 'Souris ergonomique']),
      r('ass-routier', 'Risque routier (deplacements)', 'Accident lors des deplacements pour expertise ou rendez-vous clients', 'ass-deplacement', ['Expertise sinistre sur site', 'Rendez-vous clients', 'Deplacements inter-agences'], 3, 2, ['Vehicule entretenu'], ['Visioconference si possible', 'Planning avec marge', 'Formation eco-conduite']),
      r('ass-agression', 'Agression (clients mecontents)', 'Violence verbale de clients mecontents d\'un refus d\'indemnisation', 'ass-agence', ['Refus d\'indemnisation', 'Delai de remboursement', 'Client en etat de choc post-sinistre'], 2, 2, ['Amenagement agence'], ['Formation gestion de conflits', 'Bouton d\'alerte discret', 'Zone d\'accueil securisee']),
      r('ass-sedentarite', 'Sedentarite', 'Risques lies a la sedentarite', 'ass-back-office', ['Position assise 8h', 'Peu de deplacement'], 2, 3, ['Information sante'], ['Pauses actives', 'Bureau assis-debout', 'Escaliers']),
      r('ass-chute', 'Chute de plain-pied', 'Glissade dans les locaux ou chez un client', 'ass-agence', ['Sol agence lisse', 'Escalier client pour expertise', 'Terrain exterieur (sinistre)'], 2, 2, ['Chaussures fermees'], ['Chaussures a semelle stable pour expertises', 'Eclairage suffisant agence']),
      r('ass-electrique', 'Risque electrique', 'Contact avec installations electriques', 'ass-agence', ['Installations electriques', 'Equipements informatiques'], 3, 1, ['Differentiel 30mA'], ['Verification electrique annuelle', 'Remplacement immediat prises defectueuses']),
      r('ass-incendie', 'Incendie', 'Depart de feu dans les locaux', 'ass-back-office', ['Archives papier', 'Equipements electriques'], 3, 1, ['Extincteurs', 'Detection'], ['Detection incendie', 'Numerisation archives']),
    ],
  },

  // ── Bureau d'etudes ────────────────────────────────────────────
  {
    metierSlug: 'bureau-etudes', label: 'Bureau d\'etudes / Ingenierie', category: 'tertiaire_bureau',
    nafCodes: ['71.12B', '71.11Z', '71.12A'], idcc: '1486',
    legalReferences: ['Art. R4542-1 (ecran)', 'Code du travail (bureau)'],
    workUnits: [
      wu('be-bureau', 'Bureau / CAO', 'Conception, calculs, plans, modelisation', '2-15'),
      wu('be-chantier', 'Site / chantier (supervision)', 'Suivi de chantier, supervision travaux', '1-3'),
      wu('be-reunion', 'Salle de reunion', 'Reunions equipe, clients, coordination', '1-4'),
      wu('be-archives', 'Archives / maquettes', 'Stockage plans, maquettes, echantillons', '0-1'),
    ],
    risks: [
      r('be-tms', 'TMS (ecran CAO prolonge)', 'Douleurs dorsales et cervicales par travail sur ecran CAO tres prolonge', 'be-bureau', ['CAO/DAO sur ecran 8-10h', 'Plans detailles (precision)', 'Double ecran grand format', 'Souris intensive (CAO)'], 3, 4, ['Siege ergonomique'], ['Ecrans grands formats a hauteur des yeux', 'Clavier et souris ergonomiques (CAO)', 'Bureau assis-debout', 'Micro-pauses programmees', 'Formation ergonomie poste de travail']),
      r('be-rps', 'Risques psychosociaux (delais, precision)', 'Stress lie aux delais de projet, precision requise, responsabilite technique', 'be-bureau', ['Delais de projet serres', 'Responsabilite technique (securite structures)', 'Changements de projet en cours', 'Multiples projets simultanement'], 2, 3, ['Planning equipe'], ['Charge de travail suivie', 'Revue de conception collegiale', 'Objectifs realistes']),
      r('be-chantier', 'Risques chantier (supervision)', 'Risques lors de la supervision sur chantier (chute, heurt, poussiere)', 'be-chantier', ['Visite de chantier en cours', 'Zone de travaux active', 'Terrain irregulier', 'Coactivite avec entreprises'], 3, 2, ['EPI chantier (casque, gilet, chaussures)'], ['EPI complets obligatoires en visite chantier', 'Formation securite chantier', 'Accompagnement par chef de chantier']),
      r('be-eclairage', 'Fatigue visuelle', 'Fatigue oculaire par travail CAO intensif', 'be-bureau', ['Plans detailles sur ecran', 'Alternance ecran/papier', 'Eclairage artificiel'], 2, 3, ['Eclairage reglable'], ['Regle 20-20-20', 'Eclairage indirect sans reflets', 'Filtre lumiere bleue']),
      r('be-bruit', 'Bruit (open space)', 'Exposition au bruit en open space perturbant la concentration', 'be-bureau', ['Conversations telephoniques', 'Reunions improvisees', 'Imprimante/traceur'], 2, 3, ['Espaces calmes'], ['Bureaux individuels ou box pour concentration', 'Casque anti-bruit fourni', 'Regles d\'usage de l\'open space']),
      r('be-routier', 'Risque routier (chantier)', 'Accident lors des deplacements sur les chantiers', 'be-chantier', ['Deplacements chantiers reguliers', 'Pression horaire (reunion + chantier)', 'Route de chantier'], 3, 2, ['Vehicule entretenu'], ['Planning avec marge', 'Covoiturage si meme chantier']),
      r('be-sedentarite', 'Sedentarite', 'Risques lies a la sedentarite prolongee', 'be-bureau', ['Position assise 10h', 'Pas de deplacement en open space'], 2, 3, ['Information sante'], ['Bureau assis-debout', 'Pauses actives']),
      r('be-incendie', 'Incendie', 'Depart de feu dans les locaux', 'be-archives', ['Archives papier, maquettes', 'Traceur grand format', 'Installations electriques'], 3, 1, ['Extincteurs'], ['Detection incendie', 'Numerisation des plans']),
    ],
  },

  // ── Syndic de copropriete ──────────────────────────────────────
  {
    metierSlug: 'syndic-copropriete', label: 'Syndic de copropriete', category: 'tertiaire_bureau',
    nafCodes: ['68.32B'], idcc: '1527',
    legalReferences: ['Loi Hoguet', 'Code du travail (bureau)'],
    workUnits: [
      wu('syn-bureau', 'Bureau / gestion', 'Gestion administrative des coproprietes', '1-5'),
      wu('syn-visite', 'Visites immeubles', 'Visites de coproprietes, AG, reunions', '1-3'),
      wu('syn-ag', 'Assemblees generales', 'Animation d\'AG de copropriete', '1-2'),
      wu('syn-vehicule', 'Vehicule / deplacements', 'Deplacements entre immeubles et bureau', '1'),
    ],
    risks: [
      r('syn-agression', 'Agression (copropietaires mecontents)', 'Violence verbale ou physique de copropietaires mecontents des charges ou travaux', 'syn-ag', ['AG houleuse', 'Copropietaire mecontent des charges', 'Conflit entre copropietaires', 'Visite immeuble en conflit'], 3, 3, ['Communication'], ['Formation gestion de conflits et AG', 'AG dans un lieu neutre si tensions', 'Accompagnement par un tiers si necessaire', 'Procedure de retrait si menace']),
      r('syn-routier', 'Risque routier', 'Accident lors des deplacements entre coproprietes et le bureau', 'syn-vehicule', ['Deplacements frequents (5-10 coproprietes/jour)', 'Pression horaire', 'Telephone en conduisant', 'Stationnement difficile en ville'], 3, 3, ['Vehicule entretenu'], ['Kit mains-libres obligatoire', 'Planning avec marge', 'Transport en commun si possible']),
      r('syn-rps', 'Risques psychosociaux', 'Stress lie a la gestion des conflits, charge administrative, astreintes', 'syn-bureau', ['Conflits copropietaires', 'Charge administrative lourde', 'AG en soiree', 'Astreintes (sinistres degats des eaux)', 'Pression des copropietaires'], 3, 3, ['Communication equipe'], ['Limitation du nombre de lots par gestionnaire', 'Soutien juridique accessible', 'Equilibre vie pro/perso (AG comptees)', 'Formation gestion de conflits']),
      r('syn-chute', 'Chute (visite immeubles)', 'Chute dans les parties communes (escaliers, cave, toiture)', 'syn-visite', ['Escaliers mal eclaires', 'Cave humide et glissante', 'Acces toiture pour inspection', 'Parking souterrain non eclaire'], 2, 3, ['Chaussures fermees', 'Lampe portable'], ['Chaussures a semelle antiderapante', 'Lampe portable pour caves et parkings', 'Signalement immediat des dangers', 'Ne pas monter sur la toiture (faire appel a un professionnel)']),
      r('syn-tms', 'TMS (ecran)', 'Douleurs par travail sur ecran et conduite', 'syn-bureau', ['Gestion administrative sur ecran', 'Conduite frequente', 'Position assise prolongee'], 2, 3, ['Siege ergonomique'], ['Evaluation ergonomique', 'Alternance bureau/visites', 'Pauses actives']),
      r('syn-amiante', 'Amiante (immeubles anciens)', 'Exposition a l\'amiante dans les parties communes d\'immeubles anciens', 'syn-visite', ['Visite chaufferie (calorifugeage)', 'Cave avec canalisations amiante', 'Flocage dans les parties communes'], 3, 1, ['Diagnostic amiante obligatoire'], ['Consulter le DTA (dossier technique amiante)', 'Ne jamais toucher les materiaux suspects', 'Signaler toute degradation']),
      r('syn-electrique', 'Risque electrique', 'Contact avec installations electriques vetustes dans les parties communes', 'syn-visite', ['Tableau electrique vetuste', 'Fils apparents cave', 'Eclairage defectueux'], 3, 1, ['Prudence'], ['Ne pas intervenir sur les installations', 'Faire appel a un electricien agree']),
      r('syn-incendie', 'Incendie', 'Depart de feu au bureau ou dans les parties communes', 'syn-bureau', ['Archives papier', 'Installations electriques'], 3, 1, ['Extincteurs'], ['Detection incendie au bureau', 'Verification des parties communes (issues de secours)']),
    ],
  },

  // ── Courtier immobilier ────────────────────────────────────────
  {
    metierSlug: 'courtier-immobilier', label: 'Courtier en prets immobiliers', category: 'tertiaire_bureau',
    nafCodes: ['66.19B'], idcc: '2216',
    legalReferences: ['Code monetaire et financier', 'IOBSP (intermediaire)'],
    workUnits: [
      wu('court-bureau', 'Bureau / travail', 'Montage dossiers, simulation, negociation banques', '1-5'),
      wu('court-rdv', 'Rendez-vous clients', 'Rendez-vous clients au bureau ou a domicile', '1-3'),
      wu('court-deplacement', 'Deplacements', 'Rendez-vous banques, notaires, clients', '1-2'),
      wu('court-teletravail', 'Teletravail', 'Travail a distance', '1-3'),
    ],
    risks: [
      r('court-routier', 'Risque routier (deplacements nombreux)', 'Accident lors des nombreux deplacements (banques, clients, notaires)', 'court-deplacement', ['Deplacements quotidiens multiples', 'Pression horaire (rendez-vous enchaines)', 'Telephone en conduisant'], 3, 3, ['Vehicule entretenu'], ['Kit mains-libres obligatoire', 'Planning avec marge', 'Visioconference quand possible']),
      r('court-rps', 'Risques psychosociaux', 'Stress lie a la remuneration variable, refus bancaires, delais', 'court-bureau', ['Remuneration a la commission', 'Refus bancaire d\'un dossier travaille', 'Delais de notaire imposes', 'Clients exigeants'], 3, 3, ['Communication'], ['Salaire fixe minimum', 'Portefeuille diversifie', 'Soutien managérial']),
      r('court-agression', 'Agression (clients)', 'Violence verbale de clients dont le pret est refuse', 'court-rdv', ['Client dont le dossier est refuse', 'Client en difficulte financiere', 'Rendez-vous a domicile'], 2, 2, ['Procedure bureau'], ['Formation gestion de conflits', 'Rendez-vous de preference au bureau (pas au domicile)', 'Procedure d\'escalade']),
      r('court-tms', 'TMS (ecran)', 'Douleurs par travail sur ecran et conduite prolongee', 'court-bureau', ['Simulation de prets sur ecran', 'Saisie de dossiers', 'Position assise prolongee'], 2, 3, ['Siege ergonomique'], ['Evaluation ergonomique', 'Ecran a hauteur des yeux', 'Pauses actives']),
      r('court-sedentarite', 'Sedentarite', 'Risques lies a l\'alternance conduite/bureau assis', 'court-bureau', ['Alternance siege voiture/siege bureau', 'Pas d\'activite physique'], 2, 3, ['Information sante'], ['Pauses actives entre rendez-vous', 'Marche entre les rendez-vous proches']),
      r('court-isolement', 'Isolement (teletravail, independant)', 'Isolement professionnel en teletravail ou en tant qu\'independant', 'court-teletravail', ['Travail seul a domicile', 'Pas de collegues', 'Perte de lien social'], 2, 2, ['Contact telephonique regulier'], ['Coworking 1-2 jours/semaine', 'Reunions d\'equipe regulieres', 'Reseau professionnel actif']),
      r('court-chute', 'Chute de plain-pied', 'Glissade dans les locaux ou chez le client', 'court-bureau', ['Sol bureau lisse', 'Escalier client', 'Parking mouille'], 2, 1, ['Chaussures fermees'], ['Sol antiderapant', 'Eclairage suffisant']),
      r('court-incendie', 'Incendie', 'Depart de feu dans les locaux', 'court-bureau', ['Archives papier', 'Equipements electriques'], 3, 1, ['Extincteurs'], ['Detection incendie', 'Numerisation des dossiers']),
    ],
  },

  // ── Finance / Banque d'investissement ──────────────────────────
  {
    metierSlug: 'finance-investissement', label: 'Finance / Banque d\'investissement', category: 'tertiaire_bureau',
    nafCodes: ['64.30Z', '66.12Z', '66.19A'], idcc: '2120',
    legalReferences: ['Code monetaire et financier', 'AMF', 'Code du travail (horaires)'],
    workUnits: [
      wu('fin-salle-marche', 'Salle de marche / trading', 'Operations de marche, trading, execution', '5-30'),
      wu('fin-bureau', 'Bureau / analyse', 'Analyse financiere, modelisation, recherche', '2-10'),
      wu('fin-reunion', 'Salle de reunion', 'Comites, presentations, road shows', '1-5'),
      wu('fin-deplacement', 'Deplacements / road shows', 'Voyages d\'affaires, presentations investisseurs', '1-3'),
    ],
    risks: [
      r('fin-rps', 'Risques psychosociaux (burn-out)', 'Risque eleve de burn-out par horaires extremes, pression des resultats, competition', 'fin-salle-marche', ['Horaires 7h-22h (voire plus)', 'Pression financiere intense', 'Competition entre collegues', 'Decisions a forts enjeux', 'Bonus variable (insecurite)'], 4, 4, ['Entretiens individuels'], ['Suivi de la charge horaire (plafonner a 60h/sem)', 'Droit a la deconnexion meme partiel', 'Ligne d\'ecoute psychologique 24/7', 'Formation management bienveillant', 'Reconnaissance au-dela du seul bonus', 'Suivi medical renforce (stress chronique)']),
      r('fin-tms', 'TMS (ecran multi-ecrans)', 'Douleurs cervicales et dorsales par travail sur 4-6 ecrans simultanes', 'fin-salle-marche', ['4 a 6 ecrans simultanes', 'Position statique 12h', 'Souris et clavier intensifs', 'Posture penchee sur Bloomberg'], 3, 4, ['Siege ergonomique haut de gamme'], ['Configuration ergonomique multi-ecrans (arc, hauteur)', 'Siege premium avec appui lombaire', 'Repose-poignets', 'Micro-pauses toutes les heures', 'Etirements quotidiens']),
      r('fin-sedentarite', 'Sedentarite extreme', 'Risques cardiovasculaires par sedentarite de 10-14h assis sans mouvement', 'fin-bureau', ['Assis 12-14h/jour', 'Repas devant l\'ecran', 'Pas de pause active', 'Absence d\'activite physique'], 3, 4, ['Information sante'], ['Salle de sport entreprise ou abonnement pris en charge', 'Bureau assis-debout', 'Standing meetings encourages', 'Bilan cardiovasculaire annuel pris en charge']),
      r('fin-eclairage', 'Fatigue visuelle (ecrans multiples)', 'Fatigue oculaire severe par exposition prolongee a multiples ecrans', 'fin-salle-marche', ['6 ecrans en continu', 'Donnees temps reel', 'Eclairage artificiel permanent', 'Travail de nuit pour marches US/Asie'], 2, 4, ['Eclairage reglable'], ['Filtres lumiere bleue sur tous les ecrans', 'Regle 20-20-20 stricte', 'Visite ophtalmo annuelle', 'Eclairage biodynamique']),
      r('fin-bruit', 'Bruit (salle de marche)', 'Exposition au bruit de la salle de marche (cris, telephones, alertes)', 'fin-salle-marche', ['Cris de negociation', 'Telephones multiples', 'Alertes sonores marche', 'Conversations multiples'], 2, 3, ['Volume des alertes regle'], ['Panneaux acoustiques absorbants', 'Alertes visuelles en complement sonores', 'Volume maximal des alertes sonores']),
      r('fin-routier', 'Risque routier (deplacements)', 'Accident lors de road shows et deplacements (fatigue)', 'fin-deplacement', ['Road shows (deplacements intensifs)', 'Voyages d\'affaires frequents', 'Fatigue chronique + conduite', 'Decalage horaire'], 3, 2, ['Chauffeur si disponible'], ['VTC pour les deplacements si fatigue', 'Train plutot qu\'avion si possible', 'Repos obligatoire entre voyages']),
      r('fin-addictions', 'Addictions (alcool, substances)', 'Risque d\'addictions lie a la pression et la culture du milieu', 'fin-bureau', ['Afterworks frequents', 'Culture du cocktail', 'Pression + fatigue', 'Stimulants pour tenir les horaires'], 3, 2, ['Politique alcool'], ['Politique de prevention des addictions', 'Ligne d\'ecoute confidentielle', 'Pas d\'alcool au bureau (sauf evenements cadres)', 'Formation sensibilisation addictions']),
      r('fin-incendie', 'Incendie (salle serveurs)', 'Depart de feu dans la salle de marche (chaleur serveurs, cablage dense)', 'fin-salle-marche', ['Cablage dense sous plancher', 'Serveurs de proximite (chaleur)', 'Climatisation en panne'], 3, 1, ['Detection', 'Climatisation'], ['Climatisation redondante', 'Detection precoce', 'Extinction automatique', 'Exercice evacuation']),
    ],
  },

  // ── Commissaire de justice ─────────────────────────────────────
  {
    metierSlug: 'commissaire-justice', label: 'Commissaire de justice (huissier)', category: 'tertiaire_bureau',
    nafCodes: ['69.10Z'], idcc: '1850',
    legalReferences: ['Ordonnance 2016-728 (commissaires de justice)', 'Code des procedures civiles d\'execution'],
    workUnits: [
      wu('cj-bureau', 'Etude / bureau', 'Redaction d\'actes, gestion de dossiers', '1-5'),
      wu('cj-signification', 'Signification / execution', 'Signification d\'actes, saisies, constats, expulsions', '1-2'),
      wu('cj-deplacement', 'Vehicule / deplacements', 'Deplacements pour significations et executions', '1-2'),
      wu('cj-audience', 'Tribunal / audience', 'Audiences, ventes aux encheres', '1'),
    ],
    risks: [
      r('cj-agression', 'Agression (expulsions, saisies)', 'Violence physique lors d\'expulsions locatives, saisies mobilières ou significations', 'cj-signification', ['Expulsion locative (desespoir du locataire)', 'Saisie mobiliere', 'Signification d\'acte de procedure', 'Constat de flagrance', 'Quartier sensible'], 4, 3, ['Accompagnement force de l\'ordre si necessaire'], ['Evaluation prealable du risque (etude du dossier)', 'Force de l\'ordre systematique pour expulsions', 'Formation desescalade specifique', 'Procedure de retrait si danger imminent', 'Gilet pare-coups si necessaire', 'Soutien psychologique post-incident']),
      r('cj-routier', 'Risque routier (deplacements quotidiens)', 'Accident lors des deplacements quotidiens pour significations et constats', 'cj-deplacement', ['Deplacements quotidiens multiples (5-15/jour)', 'Pression horaire', 'Stationnement en double file', 'Quartiers inconnus'], 3, 4, ['Vehicule entretenu', 'GPS'], ['Planning avec marge entre significations', 'Kit mains-libres obligatoire', 'Formation eco-conduite', 'Signalement des zones dangereuses']),
      r('cj-rps', 'Risques psychosociaux (charge emotionnelle)', 'Charge emotionnelle liee aux expulsions, confrontation a la detresse, menaces', 'cj-signification', ['Expulsions de familles', 'Menaces de mort', 'Charge emotionnelle quotidienne', 'Responsabilite juridique', 'Horaires etendus'], 3, 4, ['Soutien equipe'], ['Debriefing apres interventions difficiles', 'Groupes de parole trimestriels', 'Acces psychologue du travail', 'Rotation entre significations et bureau', 'Reconnaissance de la penibilite']),
      r('cj-tms', 'TMS (ecran, conduite)', 'Douleurs par alternance poste informatique et conduite', 'cj-bureau', ['Redaction d\'actes sur ecran', 'Conduite prolongee', 'Position assise alternee bureau/voiture'], 2, 3, ['Siege ergonomique'], ['Evaluation ergonomique du poste', 'Coussin ergonomique pour la voiture', 'Pauses actives']),
      r('cj-chute', 'Chute (terrains divers)', 'Chute lors d\'interventions (escaliers, terrain, immeuble degrade)', 'cj-signification', ['Escalier immeuble degrade', 'Eclairage defectueux', 'Sol verglace', 'Terrain inegal'], 2, 3, ['Chaussures a semelle stable'], ['Chaussures confortables et antiderapantes', 'Lampe portable', 'Vigilance accrue dans les immeubles degrades']),
      r('cj-morsure', 'Morsure (chien)', 'Morsure de chien lors de la signification a domicile', 'cj-signification', ['Chien agressif au domicile', 'Chien non attache', 'Chien de garde'], 3, 2, ['Prudence', 'Rester a distance'], ['Demander l\'enfermement du chien avant d\'entrer', 'Ne pas entrer si chien agressif non controle', 'Trousse premiers secours (desinfectant)', 'Vaccination tetanos a jour']),
      r('cj-incendie', 'Incendie', 'Depart de feu dans l\'etude', 'cj-bureau', ['Archives papier volumineuses', 'Installation electrique', 'Chauffage'], 3, 1, ['Extincteurs'], ['Detection incendie', 'Numerisation progressive', 'Verification electrique annuelle']),
      r('cj-electrique', 'Risque electrique', 'Contact avec installations electriques defectueuses dans les immeubles visites', 'cj-signification', ['Installations vetustes', 'Fils apparents', 'Compteur electrique ouvert'], 3, 1, ['Prudence'], ['Ne pas toucher aux installations electriques', 'Signaler les dangers au proprietaire']),
    ],
  },
];
