// BUSINESS RULE [CDC-2.4]: E4 — 10 metiers Sante & Social
// Aide a domicile et Pharmacie existent deja dans risk-database-v2.ts

import type { MetierRiskProfile } from './risk-database-v2.js';

function r(id: string, name: string, desc: string, wuId: string, sits: string[], g: 1|2|3|4, f: 1|2|3|4, exist: string[], proposed: string[], cat: string): MetierRiskProfile['risks'][number] {
  return { id, name, description: desc, workUnitId: wuId, situations: sits, defaultGravity: g, defaultFrequency: f, existingMeasures: exist, proposedActions: proposed, category: cat as MetierRiskProfile['risks'][number]['category'] };
}

function wu(id: string, name: string, desc: string, hc: string): MetierRiskProfile['workUnits'][number] {
  return { id, name, description: desc, typicalHeadcount: hc };
}

export const SANTE_TRADES: MetierRiskProfile[] = [
  // ── Ambulancier ────────────────────────────────────────────────
  {
    metierSlug: 'ambulancier', label: 'Ambulancier', category: 'sante_social',
    nafCodes: ['86.90A'], idcc: '16',
    legalReferences: ['Art. R6312-1 (transport sanitaire)', 'Tableau RG 57 (TMS)', 'Protocole AES'],
    workUnits: [
      wu('amb-vehicule', 'Vehicule sanitaire', 'Conduite ambulance, vehicule sanitaire leger', '2'),
      wu('amb-brancardage', 'Brancardage / transfert', 'Port et transfert de patients sur brancard', '2'),
      wu('amb-soin', 'Soins d\'urgence', 'Gestes de premiers secours, assistance au SMUR', '1-2'),
      wu('amb-admin', 'Administration / regulation', 'Planning, regulation, facturation', '1'),
    ],
    risks: [
      r('amb-routier', 'Risque routier (urgence)', 'Accident de la route en circulation d\'urgence (feux, sirene, vitesse)', 'amb-vehicule', ['Conduite en urgence avec avertisseurs', 'Intersection forcee', 'Conditions meteo degradees', 'Fatigue (gardes de nuit)'], 4, 4, ['Formation conduite d\'urgence', 'Vehicule equipe'], ['Formation conduite d\'urgence recyclage 2 ans', 'Maintien technique du vehicule', 'Ceinture de securite obligatoire meme en urgence', 'Politique vitesse adaptee', 'Temps de repos entre interventions']),
      r('amb-tms', 'TMS (brancardage)', 'Douleurs dorsales et epaules par port de patients sur brancard', 'amb-brancardage', ['Brancardage dans escaliers etroits', 'Transfert lit-brancard patient lourd', 'Port brancard en terrain inegal', 'Position de conduite prolongee'], 4, 4, ['Brancard autoporteur'], ['Brancard electrique (monte-escaliers)', 'Chaise portoir pour escaliers', 'Drap de transfert', 'Formation PRAP (recyclage 2 ans)', 'Limite de poids avec renfort SMUR']),
      r('amb-biologique', 'Risque biologique (AES)', 'Exposition au sang et fluides corporels lors des soins d\'urgence', 'amb-soin', ['Prise en charge patient hemorragique', 'Manipulation DASRI', 'Contact sang (AES)', 'Patient porteur maladie infectieuse'], 4, 3, ['Gants usage unique', 'Gel hydroalcoolique'], ['Kit AES dans chaque vehicule', 'Conteneur DASRI a portee', 'Vaccination hepatite B obligatoire', 'Protocole AES affiche dans le vehicule', 'Formation AES recyclage annuel']),
      r('amb-rps', 'Risques psychosociaux', 'Charge emotionnelle, confrontation a la mort, gardes de nuit', 'amb-soin', ['Deces du patient pendant le transport', 'Accident grave (victimes)', 'Agression du patient', 'Gardes de nuit (sommeil perturbe)', 'Isolement'], 3, 3, ['Soutien equipe', 'Cellule psychologique'], ['Debriefing apres intervention traumatisante', 'Acces psychologue du travail', 'Groupes de parole trimestriels', 'Repos compensateur apres nuit']),
      r('amb-agression', 'Agression (patients, entourage)', 'Violence verbale ou physique de patients ou de leur entourage', 'amb-brancardage', ['Patient confus ou alcoolise', 'Entourage en detresse', 'Quartier difficile', 'Intervention psychiatrique'], 3, 3, ['Telephone charge', 'Procedure d\'alerte'], ['Formation desescalade', 'Equipage de 2 obligatoire', 'Procedure retrait si danger', 'Signalement systematique des incidents']),
      r('amb-chimique', 'Risque chimique (desinfection)', 'Contact avec produits de desinfection du vehicule', 'amb-vehicule', ['Desinfection vehicule entre patients', 'Produits de nettoyage concentres', 'Manipulation DASRI'], 2, 3, ['Gants de menage'], ['Doseurs automatiques desinfectant', 'Gants nitrile pour desinfection', 'Aeration du vehicule apres desinfection']),
      r('amb-chute', 'Chute (terrain, escaliers)', 'Chute lors du brancardage en terrain inegal, escaliers, verglas', 'amb-brancardage', ['Escaliers etroits et raides', 'Verglas devant le domicile', 'Terrain accidente', 'Eclairage insuffisant'], 3, 3, ['Chaussures antiderapantes'], ['Chaussures de securite antiderapantes', 'Lampe frontale pour interventions de nuit', 'Reconnaissance du terrain avant brancardage']),
      r('amb-vibrations', 'Vibrations (conduite prolongee)', 'Vibrations corps entier par conduite prolongee du vehicule sanitaire', 'amb-vehicule', ['Conduite sur route degradee', 'Siege du vehicule use', 'Longue distance'], 2, 3, ['Siege suspendu'], ['Siege conducteur entretenu', 'Pauses regulieres', 'Suivi medical si symptomes']),
    ],
  },

  // ── Creche ─────────────────────────────────────────────────────
  {
    metierSlug: 'creche', label: 'Creche / Assistante maternelle', category: 'sante_social',
    nafCodes: ['88.91A', '88.91B'], idcc: '3127',
    legalReferences: ['Art. R2324-17 (accueil petite enfance)', 'Art. R4541-1 (manutention)'],
    workUnits: [
      wu('cre-accueil', 'Salle d\'accueil / jeux', 'Espace de jeu, motricite, activites', '3-8'),
      wu('cre-change', 'Change / toilette', 'Espace change, toilette des enfants', '1-2'),
      wu('cre-repas', 'Repas / biberonnerie', 'Preparation et service des repas, biberons', '1-2'),
      wu('cre-dortoir', 'Dortoir / repos', 'Surveillance des siestes, endormissement', '1-2'),
      wu('cre-exterieur', 'Espace exterieur / jardin', 'Cour, jardin, sorties', '2-4'),
    ],
    risks: [
      r('cre-biologique', 'Risque biologique (maladies infantiles)', 'Contamination par maladies infantiles (varicelle, gastro, bronchiolite)', 'cre-change', ['Change de couches (contact selles)', 'Enfant malade (fievre, toux)', 'Nettoyage vomissures', 'Contact salive (morsures)'], 2, 4, ['Lavage mains systematique', 'Gel hydroalcoolique'], ['Vaccination a jour (ROR, coqueluche)', 'Protocole eviction malade', 'Lavabo commande non manuelle a chaque piece', 'Gants usage unique pour les changes']),
      r('cre-tms', 'TMS (porter enfants)', 'Douleurs dorsales et epaules par port repetitif d\'enfants (8-15 kg)', 'cre-accueil', ['Porter enfant a bout de bras', 'Poser/prendre enfant dans le lit a barreaux', 'Change sur table haute', 'Position accroupie prolongee (jeux)'], 3, 4, ['Table de change a hauteur'], ['Plan de travail a hauteur pour change', 'Lit a ouverture laterale (pas par-dessus)', 'Coussin d\'assise au sol pour les jeux', 'Formation gestes et postures', 'Pauses regulieres']),
      r('cre-bruit', 'Bruit (cris, pleurs)', 'Exposition au bruit des cris et pleurs d\'enfants (> 80 dB en pic)', 'cre-accueil', ['Pleurs de plusieurs enfants simultanes', 'Cris dans espace clos', 'Jouets sonores', 'Musique d\'animation'], 2, 4, ['Revetement absorbant'], ['Panneaux acoustiques absorbants', 'Espaces de repos (zone calme)', 'Jouets sonores a volume limite', 'Suivi audiometrique si symptomes']),
      r('cre-rps', 'Risques psychosociaux', 'Charge emotionnelle, responsabilite, relations parents, burnout', 'cre-accueil', ['Responsabilite constante des enfants', 'Parents exigeants ou conflictuels', 'Manque de personnel', 'Charge emotionnelle (enfant malade)'], 3, 3, ['Reunions d\'equipe'], ['Groupes d\'analyse de pratiques', 'Ratio adultes/enfants respecte', 'Formation communication parents', 'Acces psychologue du travail']),
      r('cre-chute', 'Chute (equipements, sol)', 'Chute sur sol mouille, jouets au sol, ou depuis equipement', 'cre-accueil', ['Jouets au sol', 'Sol mouille (renversement)', 'Equipement de motricite', 'Escalier d\'acces'], 2, 3, ['Sol amortissant'], ['Sol conforme NF EN 1177 (amortissant)', 'Rangement continu des jouets', 'Barrieres escaliers conformes', 'Eclairage suffisant']),
      r('cre-chimique', 'Risque chimique (produits menage)', 'Irritation par produits de desinfection necessaires a l\'hygiene', 'cre-change', ['Desinfection quotidienne (javel, detergent)', 'Nettoyage jouets', 'Change (lingettes, creme)'], 2, 3, ['Gants de menage', 'Aeration'], ['Produits eco-labellises', 'Doseurs automatiques', 'Stockage produits hors portee enfants', 'Gants nitrile']),
      r('cre-morsure', 'Morsure / griffure (enfants)', 'Blessure par morsure ou griffure d\'enfant', 'cre-accueil', ['Enfant qui mord (phase developpement)', 'Griffure accidentelle', 'Conflit entre enfants'], 2, 3, ['Surveillance attentive'], ['Desinfection immediate des plaies', 'Protocole de morsure (signalement)', 'Trousse premiers secours', 'Formation gestion des comportements']),
      r('cre-incendie', 'Incendie', 'Depart de feu dans les locaux (cuisine, locaux techniques)', 'cre-repas', ['Cuisine (plaque, four)', 'Installation electrique', 'Chauffage'], 4, 1, ['Detection incendie', 'Plan evacuation'], ['Exercice evacuation trimestriel', 'Detection incendie dans chaque piece', 'Poussette d\'evacuation (si etage)', 'Formation equipier premiere intervention']),
    ],
  },

  // ── Laboratoire d'analyses ─────────────────────────────────────
  {
    metierSlug: 'laboratoire', label: 'Laboratoire d\'analyses medicales', category: 'sante_social',
    nafCodes: ['86.90B'], idcc: '959',
    legalReferences: ['Arrete du 26/11/1999 (BPL)', 'Protocole AES', 'Directive 2000/54/CE (biologique)'],
    workUnits: [
      wu('lab-prelevement', 'Salle de prelevement', 'Prises de sang, prelevements biologiques', '1-4'),
      wu('lab-technique', 'Plateau technique', 'Analyses sur automates, microbiologie, chimie', '2-6'),
      wu('lab-reception', 'Reception / secretariat', 'Accueil patients, gestion echantillons', '1-3'),
      wu('lab-stockage', 'Stockage reactifs / DASRI', 'Stockage produits chimiques, DASRI, echantillons', '1'),
    ],
    risks: [
      r('lab-biologique', 'Risque biologique (AES, pathogenes)', 'Accident d\'exposition au sang, manipulation d\'echantillons pathogenes', 'lab-prelevement', ['Prise de sang (piqure aiguille)', 'Manipulation tubes de sang', 'Eclaboussure ouverture tubes', 'Culture microbiologique'], 4, 4, ['Gants usage unique', 'Conteneur OPCT'], ['Systeme de prelevement securise (aiguille retractable)', 'Conteneur OPCT a portee immédiate', 'Poste de securite microbiologique (PSM)', 'Vaccination hepatite B obligatoire', 'Protocole AES affiche', 'Formation AES annuelle']),
      r('lab-chimique', 'Risque chimique (reactifs CMR)', 'Exposition a des reactifs chimiques dont certains CMR (formol, methanol, xylene)', 'lab-technique', ['Manipulation de formol (fixation)', 'Coloration au xylene', 'Methanol pour fixation', 'Acides concentres pour automates'], 3, 3, ['Hotte chimique', 'Gants nitrile'], ['Hotte a flux laminaire pour fixation', 'Substitution formol par fixateurs sans formol', 'Gants nitrile adaptes au produit', 'FDS a chaque poste', 'Suivi medical renforce (CMR)']),
      r('lab-piqure', 'Piqure / coupure (aiguilles, verre)', 'Piqure par aiguille usagee ou coupure par tube en verre casse', 'lab-prelevement', ['Recapuchonnage aiguille (interdit)', 'Tube de prelevement casse', 'Tri DASRI', 'Centrifugeuse (tube casse)'], 4, 3, ['Conteneur OPCT', 'Interdiction recapuchonnage'], ['Aiguilles retractables automatiques', 'Tubes plastique (remplacement verre)', 'Centrifugeuse avec detection desequilibre', 'Protocole tube casse en centrifugeuse']),
      r('lab-rayonnement', 'Rayonnements (radio-immunologie)', 'Exposition a des sources radioactives (iode 125, tritium) en radio-immunologie', 'lab-technique', ['Manipulation traceurs radioactifs', 'Dechets radioactifs', 'Contamination de surface'], 3, 1, ['Dosimetre individuel', 'Ecran plombe'], ['PCR (personne competente radioprotection)', 'Dosimetrie individuelle mensuelle', 'Controle contamination de surface', 'Stockage dechets radioactifs conforme']),
      r('lab-tms', 'TMS (postures, pipetage)', 'Douleurs poignets et dos par pipetage repetitif et posture devant automates', 'lab-technique', ['Pipetage repetitif', 'Posture devant automates', 'Tri d\'echantillons', 'Position assise prolongee'], 2, 3, ['Siege reglable'], ['Pipettes ergonomiques (effort reduit)', 'Alternance taches debout/assis', 'Automates avec chargement ergonomique', 'Pauses actives']),
      r('lab-rps', 'Risques psychosociaux', 'Stress lie a la precision requise, urgences, responsabilite des resultats', 'lab-technique', ['Urgences biologiques', 'Erreur de resultat (consequences sur patient)', 'Effectif reduit', 'Gardes de nuit'], 2, 3, ['Double controle resultats'], ['Procedure de controle qualite', 'Formation continue', 'Gestion des urgences formalisee']),
      r('lab-incendie', 'Incendie (solvants, reactifs)', 'Depart de feu par solvants ou reactifs inflammables', 'lab-stockage', ['Stockage solvants (methanol, ethanol)', 'Reactifs inflammables', 'Installation electrique automates'], 3, 1, ['Extincteurs', 'Armoire ventilee'], ['Armoire ventilee pour solvants', 'Detection incendie dans le lab', 'Douche de securite', 'Exercice evacuation annuel']),
      r('lab-electrique', 'Risque electrique (automates)', 'Electrisation par automates ou centrifugeuses en milieu humide', 'lab-technique', ['Automates avec circuits aqueux', 'Centrifugeuse', 'Bain-marie electrique'], 3, 1, ['Differentiel 30mA'], ['Verification electrique annuelle', 'Maintenance preventive automates']),
    ],
  },

  // ── Sante generale (cabinet medical) ───────────────────────────
  {
    metierSlug: 'sante-generale', label: 'Cabinet medical / Medecin generaliste', category: 'sante_social',
    nafCodes: ['86.21Z'], idcc: '1147',
    legalReferences: ['Protocole AES', 'Art. R4127-1 (code deontologie)', 'Directive 2000/54/CE'],
    workUnits: [
      wu('med-consultation', 'Salle de consultation', 'Consultation, examen clinique, petits gestes', '1-2'),
      wu('med-accueil', 'Accueil / secretariat', 'Accueil patients, gestion dossiers', '1-2'),
      wu('med-soin', 'Salle de soins', 'Injections, pansements, ECG, petite chirurgie', '1'),
      wu('med-attente', 'Salle d\'attente', 'Espace patients', '0'),
    ],
    risks: [
      r('med-biologique', 'Risque biologique (AES)', 'Exposition au sang lors de petits gestes, injections, prelevements', 'med-soin', ['Injection (piqure)', 'Suture/ablation points', 'Prelevement sanguin', 'Pansement souille'], 3, 3, ['Gants usage unique', 'Conteneur OPCT'], ['Aiguilles securisees (retractables)', 'Conteneur OPCT accessible', 'Vaccination hepatite B', 'Protocole AES affiche']),
      r('med-rps', 'Risques psychosociaux', 'Charge emotionnelle (annonce diagnostic), charge de travail, isolement', 'med-consultation', ['Annonce diagnostic grave', 'Charge de consultations (30+/jour)', 'Gardes de nuit/week-end', 'Isolement (cabinet solo)', 'Patients agressifs'], 3, 3, ['Groupe de pairs'], ['Groupes de pairs (Balint)', 'Limitation nombre consultations/jour', 'Secretariat pour filtrer', 'Acces psychologue pour les soignants']),
      r('med-agression', 'Agression (patients)', 'Violence verbale ou physique de patients mecontents ou en detresse', 'med-consultation', ['Patient mecontent du diagnostic', 'Refus de prescription', 'Patient sous influence (alcool, drogue)', 'Consultation sans rendez-vous en urgence'], 3, 2, ['Bouton d\'alerte'], ['Formation desescalade', 'Bouton d\'alerte au bureau', 'Amenagement du cabinet (sortie accessible)', 'Signalement systematique']),
      r('med-chimique', 'Risque chimique (desinfectants)', 'Contact avec produits de desinfection des surfaces et instruments', 'med-soin', ['Desinfection surfaces', 'Sterilisation instruments', 'Manipulation antiseptiques concentres'], 2, 3, ['Gants'], ['Gants nitrile pour desinfection', 'Aeration apres desinfection', 'Doseurs automatiques']),
      r('med-tms', 'TMS (postures, ecran)', 'Douleurs par posture de consultation, ecran, examen clinique', 'med-consultation', ['Position assise prolongee', 'Examen clinique (postures variees)', 'Ecran non regle', 'Saisie dossier patient'], 2, 3, ['Siege ergonomique'], ['Siege reglable avec accoudoirs', 'Ecran a hauteur des yeux', 'Double ecran si necessaire', 'Pauses entre consultations']),
      r('med-chute', 'Chute de plain-pied', 'Glissade dans le cabinet (sols lisses, cables)', 'med-accueil', ['Sol lisse en salle d\'attente', 'Cables au sol (equipements)', 'Seuil de porte'], 2, 1, ['Sol entretenu'], ['Sol antiderapant', 'Gaines pour cables', 'Eclairage suffisant']),
      r('med-dasri', 'DASRI (dechets de soins)', 'Piqure ou contamination lors de la gestion des DASRI', 'med-soin', ['Tri des dechets de soins', 'Conteneur OPCT plein (debordement)', 'Sacs DASRI percces'], 3, 2, ['Conteneur OPCT', 'Sacs DASRI'], ['Conteneur OPCT change avant remplissage max', 'Formation tri des dechets', 'Collecte DASRI conforme (prestataire agree)']),
      r('med-incendie', 'Incendie', 'Depart de feu dans le cabinet', 'med-accueil', ['Installation electrique ancienne', 'Archives papier', 'Equipements electriques'], 3, 1, ['Extincteur', 'Detection'], ['Verification electrique annuelle', 'Detection incendie', 'Exercice evacuation']),
    ],
  },

  // ── Veterinaire ────────────────────────────────────────────────
  {
    metierSlug: 'veterinaire', label: 'Cabinet veterinaire', category: 'sante_social',
    nafCodes: ['75.00Z'], idcc: '1875',
    legalReferences: ['Art. R4412-1 (chimique)', 'Directive 2000/54/CE (zoonoses)', 'Arrete du 31/03/2003 (radioprotection)'],
    workUnits: [
      wu('vet-consultation', 'Salle de consultation', 'Examen clinique, vaccination, soins de base', '1-2'),
      wu('vet-chirurgie', 'Bloc operatoire', 'Chirurgie, anesthesie gazeuse, sterilisation', '1-3'),
      wu('vet-imagerie', 'Imagerie (radiologie)', 'Radiographies, echographies', '1-2'),
      wu('vet-hospitalisation', 'Hospitalisation / chenil', 'Soins post-operatoires, surveillance', '1-2'),
    ],
    risks: [
      r('vet-biologique', 'Zoonoses (brucellose, rage, leptospirose)', 'Contamination par maladies transmissibles de l\'animal a l\'homme', 'vet-consultation', ['Morsure animal infecte', 'Contact urine (leptospirose)', 'Manipulation cadavre (rage)', 'Mise-bas (brucellose)', 'Contact avec parasites'], 4, 3, ['Gants usage unique', 'Vaccination rage'], ['Vaccination rage et leptospirose', 'Gants longs pour examen rectal', 'Desinfection immediate morsures/griffures', 'Protocole rage (signalement)', 'Suivi serologique']),
      r('vet-morsure', 'Morsure / griffure', 'Morsure ou griffure par animal stresse ou douloureux', 'vet-consultation', ['Animal stresse en consultation', 'Contention chat agressif', 'Chien douloureux qui mord', 'NAC (furet, perroquet)'], 3, 4, ['Museliere', 'Gants de contention'], ['Formation contention specifique par espece', 'Museliere adaptee systematique si animal stresse', 'Gants de contention kevlar pour chats', 'Sedation si animal trop agressif', 'Trousse premiers secours avec desinfectant']),
      r('vet-chimique', 'Risque chimique (anesthesiants, formol)', 'Exposition aux gaz anesthesiques (isoflurane, sevoflurane) et formol de conservation', 'vet-chirurgie', ['Anesthesie gazeuse (fuite masque)', 'Conservation specimens (formol)', 'Produits euthanasie', 'Desinfection instruments (glutaraldehyde)'], 3, 3, ['Systeme d\'evacuation gaz anesthesiques'], ['Systeme AGSS (evacuation gaz) verifie annuellement', 'Aspiration locale au poste de fixation formol', 'Substitution glutaraldehyde par acide peracetique', 'Suivi medical renforce']),
      r('vet-rayonnement', 'Rayonnements X (radiologie)', 'Exposition aux rayonnements ionisants lors des radiographies', 'vet-imagerie', ['Radiographie animal non sedaté (contention)', 'Contention manuelle sous rayons', 'Nombre eleve de cliches/jour'], 3, 2, ['Tablier plombe', 'Dosimetre'], ['Dosimetre individuel mensuel', 'Tablier et gants plombes obligatoires', 'Sedation de l\'animal plutot que contention manuelle', 'Salle conforme (protection plombee)', 'PCR (personne competente radioprotection)']),
      r('vet-rps', 'Risques psychosociaux', 'Charge emotionnelle (euthanasie, proprietaires en detresse), burnout', 'vet-consultation', ['Euthanasie frequente', 'Proprietaire en detresse', 'Urgences de nuit', 'Decisions ethiques difficiles', 'Charge de travail'], 3, 3, ['Soutien equipe'], ['Groupes de parole', 'Acces psychologue', 'Formation communication empathique', 'Limitation gardes de nuit']),
      r('vet-tms', 'TMS (contention, chirurgie)', 'Douleurs par contention d\'animaux et postures chirurgicales', 'vet-chirurgie', ['Contention grands animaux', 'Chirurgie prolongee (posture)', 'Port d\'animaux lourds (chien 40+ kg)', 'Position penchee pour examen'], 2, 3, ['Table hydraulique'], ['Table de consultation hydraulique', 'Aide pour gros animaux', 'Rotation des postes', 'Pauses entre chirurgies']),
      r('vet-piqure', 'Piqure accidentelle (aiguille, auto-injection)', 'Piqure par aiguille ou auto-injection accidentelle de produit veterinaire', 'vet-consultation', ['Injection vaccination animal qui bouge', 'Auto-injection antibiotique', 'Auto-injection anesthesique', 'Piqure aiguille usagee'], 3, 3, ['Conteneur OPCT'], ['Technique d\'injection securisee', 'Sedation si animal agite', 'Conteneur OPCT a portee', 'Protocole auto-injection (centre antipoison)']),
      r('vet-allergie', 'Allergie (poils, produits)', 'Allergie aux poils d\'animaux, squames, produits veterinaires', 'vet-hospitalisation', ['Poils et squames en suspension', 'Allergenes de chat', 'Produits de soin (iode, latex)'], 2, 2, ['Ventilation', 'Gants nitrile'], ['Ventilation renforcee du cabinet', 'Aspirateur HEPA', 'Gants nitrile (pas latex)', 'Suivi allergo si symptomes']),
    ],
  },

  // ── Cabinet dentaire ───────────────────────────────────────────
  {
    metierSlug: 'cabinet-dentaire', label: 'Cabinet dentaire', category: 'sante_social',
    nafCodes: ['86.23Z'], idcc: '1619',
    legalReferences: ['Protocole AES', 'Arrete du 31/03/2003 (radioprotection)', 'Art. R4412-1 (chimique)'],
    workUnits: [
      wu('dent-soin', 'Fauteuil de soins', 'Soins dentaires, detartrage, chirurgie buccale', '2-4'),
      wu('dent-sterilisation', 'Zone sterilisation', 'Nettoyage, desinfection, sterilisation des instruments', '1'),
      wu('dent-radio', 'Imagerie dentaire', 'Radiographies retro-alveolaires, panoramique, cone beam', '1'),
      wu('dent-accueil', 'Accueil / secretariat', 'Accueil patients, gestion dossiers, comptabilite', '1-2'),
    ],
    risks: [
      r('dent-biologique', 'Risque biologique (AES, aerosols)', 'Exposition au sang, salive et aerosols produits par les instruments rotatifs', 'dent-soin', ['Aerosols de fraise/detartreur (sang, salive)', 'Piqure aiguille d\'anesthesie', 'Eclaboussure sang', 'Manipulation instruments souilles'], 3, 4, ['Masque chirurgical', 'Gants', 'Lunettes'], ['Masque FFP2 pour aerosols', 'Visiere de protection', 'Aspiration chirurgicale efficace', 'Gants nitrile sans poudre', 'Vaccination hepatite B', 'Protocole AES affiche']),
      r('dent-chimique', 'Risque chimique (resines, desinfectants)', 'Exposition aux resines composites (methacrylates), amalgame, desinfectants', 'dent-soin', ['Application resine composite (methacrylate)', 'Manipulation amalgame (mercure)', 'Adhesifs dentaires', 'Desinfection surfaces entre patients'], 3, 3, ['Aspiration locale', 'Gants nitrile'], ['Substitution amalgame par composite sans mercure', 'Gants nitrile (pas latex)', 'Aspiration locale au fauteuil', 'Aeration entre patients', 'FDS des produits au poste']),
      r('dent-bruit', 'Bruit (turbine, compresseur)', 'Exposition au bruit de la turbine dentaire (80-92 dB), compresseur, aspiration', 'dent-soin', ['Turbine dentaire', 'Detartreur ultrasons', 'Compresseur', 'Aspiration chirurgicale'], 2, 4, ['Bouchons moules disponibles'], ['Bouchons moules sur mesure', 'Turbine electrique (moins bruyante)', 'Compresseur encoffre', 'Audiogramme annuel', 'Maintenance turbines (reduction bruit)']),
      r('dent-tms', 'TMS (postures, precision)', 'Douleurs nuque, epaules, poignets par posture de soin penchee et precision', 'dent-soin', ['Posture penchee sur le patient (4-8h)', 'Bras leves sans appui', 'Gestes de precision prolonges', 'Position statique'], 3, 4, ['Siege operateur ajustable'], ['Siege avec appui lombaire et accoudoirs', 'Loupes binoculaires (posture droite)', 'Fauteuil patient positionne correctement', 'Micro-pauses entre patients', 'Etirements quotidiens']),
      r('dent-rayonnement', 'Rayonnements X', 'Exposition aux rayonnements lors des radiographies dentaires', 'dent-radio', ['Retro-alveolaire', 'Panoramique', 'Cone beam (CBCT)', 'Cliches repetitifs'], 3, 2, ['Tablier plombe patient', 'Dosimetre operateur'], ['Capteur numerique (dose reduite)', 'Sortie de la piece pendant le cliche', 'Dosimetre individuel mensuel', 'Controle qualite annuel du materiel']),
      r('dent-rps', 'Risques psychosociaux', 'Stress lie a la peur des patients, precision requise, charge administrative', 'dent-soin', ['Patients anxieux ou phobiques', 'Charge administrative (mutuelles)', 'Urgences dentaires', 'Horaires etendus'], 2, 3, ['Secretariat'], ['Formation communication avec patients anxieux', 'Secretariat pour gestion administrative', 'Equilibre vie pro/perso']),
      r('dent-projection', 'Projections (eclats, instruments)', 'Projection d\'eclats de dent, de resine, ou de liquide dans les yeux', 'dent-soin', ['Fraisage d\'une dent', 'Eclatement d\'un instrument rotatif', 'Projection de resine', 'Eclaboussure detartrage'], 2, 3, ['Lunettes de protection'], ['Lunettes ou visiere de protection obligatoire', 'Instruments rotatifs verifies avant usage', 'Digue dentaire si possible']),
      r('dent-incendie', 'Incendie', 'Depart de feu par equipement electrique ou produits chimiques', 'dent-sterilisation', ['Autoclave electrique', 'Stockage produits chimiques', 'Court-circuit'], 3, 1, ['Extincteur', 'Detection'], ['Verification electrique annuelle', 'Detection incendie', 'Exercice evacuation']),
    ],
  },

  // ── Centre d'imagerie medicale ─────────────────────────────────
  {
    metierSlug: 'centre-imagerie', label: 'Centre d\'imagerie medicale', category: 'sante_social',
    nafCodes: ['86.22A', '86.22B'], idcc: '1147',
    legalReferences: ['Code de sante publique (radioprotection)', 'Directive 2013/59/Euratom', 'Arrete du 22/08/2019'],
    workUnits: [
      wu('img-scanner', 'Scanner / IRM / radio', 'Salle de scanner, IRM, radiologie conventionnelle', '2-4'),
      wu('img-injection', 'Salle d\'injection / preparation', 'Preparation et injection de produits de contraste', '1-2'),
      wu('img-interpretation', 'Poste d\'interpretation', 'Lecture et interpretation des images', '1-3'),
      wu('img-accueil', 'Accueil / secrétariat', 'Accueil patients, prise de rendez-vous', '1-3'),
    ],
    risks: [
      r('img-rayonnement', 'Rayonnements ionisants', 'Exposition aux rayonnements ionisants (scanner, radio conventionnelle)', 'img-scanner', ['Positionnement patient sous rayons', 'Scanner avec injection (proximite)', 'Interventionnel sous scopie', 'Repetition des examens'], 4, 3, ['Tablier plombe', 'Dosimetre individuel'], ['Dosimetrie individuelle mensuelle', 'Dosimetre extremites si interventionnel', 'Protection plombee salle conforme', 'Moniteur de debit de dose', 'Controle qualite annuel equipements', 'Formation radioprotection (renouvellement 3 ans)']),
      r('img-biologique', 'Risque biologique (AES)', 'Exposition au sang lors des injections de produit de contraste', 'img-injection', ['Pose de catheter veineux', 'Injection produit de contraste', 'Patient hemorragique au scanner', 'DASRI'], 3, 3, ['Gants usage unique', 'Conteneur OPCT'], ['Catheter securise (retractable)', 'Conteneur OPCT au poste d\'injection', 'Vaccination hepatite B', 'Protocole AES affiche']),
      r('img-chimique', 'Risque chimique (produits de contraste)', 'Reaction allergique ou irritation par produits de contraste iodes ou gadolinies', 'img-injection', ['Injection produit iode (allergie)', 'Extravasation sous-cutanee', 'Contact cutane avec gadolinium', 'Manipulation produits de developpement (si argentique)'], 3, 2, ['Chariot d\'urgence', 'Protocole allergie'], ['Chariot d\'urgence avec adrenaline', 'Interrogatoire allergie systematique', 'Catheter bien place avant injection', 'Kit de desensibilisation']),
      r('img-rps', 'Risques psychosociaux', 'Stress lie aux urgences, interpretation, charge de travail', 'img-interpretation', ['Volume eleve d\'examens/jour', 'Interpretation urgente (AVC, polytrauma)', 'Gardes de nuit', 'Responsabilite diagnostique'], 3, 3, ['Rotation des gardes'], ['Limitation du nombre d\'examens/jour', 'Pause entre les interpretations', 'Double lecture si doute', 'Acces psychologue pour les soignants']),
      r('img-tms', 'TMS (postures, ecran)', 'Douleurs par posture devant ecran d\'interpretation et manipulation de patients', 'img-interpretation', ['Interpretation sur ecran prolongee (4-8h)', 'Positionnement de patients (transfert)', 'Position debout au scanner/IRM'], 2, 3, ['Double ecran calibre'], ['Ecrans de diagnostic calibres', 'Siege ergonomique avec appui lombaire', 'Alternance interpretation/salle', 'Pauses visuelles']),
      r('img-champ-magnetique', 'Champ magnetique (IRM)', 'Risque d\'attraction d\'objets metalliques par le champ magnetique de l\'IRM', 'img-scanner', ['Introduction objet ferromagnetique dans la salle IRM', 'Patient avec implant metallique', 'Personnel avec bijoux metalliques', 'Bouteille O2 metallique'], 4, 1, ['Controle acces IRM', 'Detection metal'], ['Questionnaire IRM systematique patient et personnel', 'Detecteur de metaux a l\'entree salle IRM', 'Signalisation "champ magnetique permanent"', 'Bouteille O2 amagnétique', 'Formation risque IRM annuelle']),
      r('img-bruit', 'Bruit (IRM)', 'Exposition au bruit de l\'IRM (> 100 dB pendant acquisition)', 'img-scanner', ['Acquisition IRM', 'Gradient IRM en fonctionnement'], 2, 3, ['Casque anti-bruit patient'], ['Protection auditive patient et personnel', 'Communication interphone pendant examen', 'Limitation du temps en salle IRM']),
      r('img-electrique', 'Risque electrique', 'Contact avec equipements electriques haute puissance', 'img-scanner', ['Scanner (haute tension)', 'IRM (bobines de gradient)', 'Installation electrique dediee'], 3, 1, ['Protection differentielle'], ['Maintenance preventive constructeur', 'Verification electrique annuelle', 'Formation securite equipements']),
    ],
  },

  // ── EHPAD ──────────────────────────────────────────────────────
  {
    metierSlug: 'ehpad', label: 'EHPAD / Maison de retraite', category: 'sante_social',
    nafCodes: ['87.10A', '87.10B', '87.10C'], idcc: '2264',
    legalReferences: ['Art. R4541-1 (manutention)', 'Recommandation CNAM R471', 'Protocole AES'],
    workUnits: [
      wu('ehp-chambre', 'Chambres residents', 'Soins, aide a la toilette, nursing', '5-20'),
      wu('ehp-communs', 'Espaces communs', 'Salle a manger, salon, activites', '2-5'),
      wu('ehp-soin', 'Salle de soins', 'Preparation et distribution medicaments, soins infirmiers', '1-3'),
      wu('ehp-cuisine', 'Cuisine / restauration', 'Preparation et service des repas', '2-5'),
      wu('ehp-lingerie', 'Lingerie / entretien', 'Lavage, repassage, entretien locaux', '1-3'),
    ],
    risks: [
      r('ehp-tms', 'TMS (manutention residents)', 'Douleurs dorsales et epaules par manutention de residents dependants', 'ehp-chambre', ['Aide au lever/coucher', 'Transfert lit-fauteuil', 'Toilette au lit', 'Repositionnement dans le lit', 'Port de resident non autonome'], 4, 4, ['Leve-personne', 'Potence au lit'], ['Leve-personne dans chaque chambre', 'Drap de transfert', 'Lit medicalise electrique', 'Formation PRAP (recyclage 2 ans)', 'Evaluation de la dependance (classement charges)', 'Travail en binome pour residents lourds']),
      r('ehp-rps', 'Risques psychosociaux', 'Charge emotionnelle, confrontation au deces, violence des residents, sous-effectif', 'ehp-chambre', ['Deces de residents (lien affectif)', 'Resident atteint de demence (agression)', 'Sous-effectif chronique', 'Travail de nuit', 'Charge emotionnelle quotidienne'], 3, 4, ['Reunions d\'equipe'], ['Groupes de parole mensuels (obligatoire)', 'Ratio soignant/resident respecte', 'Soutien psychologique accessible', 'Formation bientraitance/Alzheimer', 'Reconnaissance du travail (cadre bienveillant)']),
      r('ehp-agression', 'Agression (residents desorientes)', 'Violence physique ou verbale de residents atteints de demence', 'ehp-chambre', ['Resident Alzheimer desoriente', 'Refus de soins (toilette)', 'Deambulation agressive', 'Cris et insultes', 'Morsures, griffures'], 3, 4, ['Formation desescalade'], ['Formation specifique Alzheimer', 'Procedures non-contentives', 'Signalement systematique des incidents', 'Environnement adapte (Snoezelen, couleurs)', 'Protection personnelle si necessaire']),
      r('ehp-biologique', 'Risque biologique', 'Exposition aux agents infectieux lors des soins (AES, gastro, grippe)', 'ehp-soin', ['Soins de plaie (AES)', 'Epidemie gastro-enterite', 'Grippe (population fragile)', 'DASRI'], 3, 3, ['Gants usage unique', 'Gel hydroalcoolique'], ['Vaccination grippe annuelle du personnel', 'Protocole epidemie (isolement, renfort)', 'Conteneur OPCT dans chaque chambre', 'Formation AES']),
      r('ehp-chimique', 'Risque chimique (desinfection, medicaments)', 'Contact avec produits de desinfection et medicaments (cytostatiques)', 'ehp-lingerie', ['Desinfection chambres', 'Lessive industrielle', 'Manipulation medicaments (cytostatiques)', 'Javel concentree'], 2, 3, ['Gants de menage'], ['Doseurs automatiques', 'Gants nitrile pour preparation medicaments', 'FDS affichees', 'Produits eco-labellises']),
      r('ehp-chute', 'Chute (sol mouille, encombrement)', 'Chute du personnel sur sol mouille ou encombre (deambulateurs, fauteuils)', 'ehp-communs', ['Sol mouille apres nettoyage', 'Deambulateurs dans les couloirs', 'Fauteuils roulants', 'Eclairage insuffisant la nuit'], 2, 3, ['Chaussures antiderapantes'], ['Sol antiderapant certifie', 'Eclairage de nuit dans les couloirs', 'Rangement des deambulateurs', 'Signalisation sol mouille']),
      r('ehp-incendie', 'Incendie', 'Risque d\'incendie avec population non evacuable', 'ehp-communs', ['Population non autonome (evacuation impossible)', 'Cuisine collective', 'Lingerie (seche-linge)', 'Installation electrique'], 4, 1, ['SSI (systeme securite incendie)', 'Compartimentage'], ['Exercice evacuation semestriel', 'Compartimentage conforme', 'Formation equipier premiere intervention', 'Registre securite a jour', 'Veille de nuit formee']),
      r('ehp-bruit', 'Bruit (residents, alarmes)', 'Exposition au bruit des alarmes, cris de residents, equipements', 'ehp-communs', ['Alarmes d\'appel repetees', 'Residents criant la nuit', 'Equipements de cuisine', 'Lingerie (machines)'], 2, 3, ['Reglage alarmes'], ['Alarmes vibrantes en complement', 'Isolation phonique des chambres', 'Protection auditive en lingerie']),
    ],
  },

  // ── Prothesiste dentaire ───────────────────────────────────────
  {
    metierSlug: 'prothesiste-dentaire', label: 'Prothesiste dentaire', category: 'sante_social',
    nafCodes: ['32.50A'], idcc: '993',
    legalReferences: ['Tableau RG 43 (formol)', 'Art. R4412-1 (chimique)', 'Directive Machines'],
    workUnits: [
      wu('pro-modelage', 'Poste de modelage / sculpture', 'Sculpture, modelage de protheses en cire', '1-3'),
      wu('pro-coulage', 'Coulage / four', 'Coulage de metal, four de ceramique, cuisson resine', '1-2'),
      wu('pro-finition', 'Finition / polissage', 'Meulage, polissage, sablage des protheses', '1-3'),
      wu('pro-cao', 'CAO/FAO / usinage', 'Conception numerique, usinage CNC', '1-2'),
    ],
    risks: [
      r('pro-poussieres', 'Poussieres (silice, metaux, platre)', 'Inhalation de poussieres de silice, alliages metalliques, ceramique, platre', 'pro-finition', ['Meulage prothese metallique', 'Sablage (silice cristalline)', 'Ponçage ceramique', 'Demoulage platre'], 3, 4, ['Aspiration au poste', 'Masque FFP2'], ['Aspiration efficace verifiee annuellement', 'Masque FFP3 pour sablage (silice)', 'Cabine de sablage fermee', 'Nettoyage par aspiration (pas soufflette)', 'Spirometrie annuelle', 'Suivi medical renforce']),
      r('pro-chimique', 'Risque chimique (resines, solvants)', 'Exposition aux monomeres de resine (methacrylate), solvants, flux de soudure', 'pro-modelage', ['Manipulation resine (monomere MMA)', 'Flux de soudure (borax, acide)', 'Solvant de nettoyage', 'Cire fondue'], 3, 3, ['Ventilation', 'Gants nitrile'], ['Aspiration locale au poste de resine', 'Gants nitrile adaptes (pas latex)', 'Masque vapeurs organiques si ventilation insuffisante', 'FDS affichees', 'Substitution par resines moins toxiques']),
      r('pro-bruit', 'Bruit (meulage, polissage)', 'Exposition au bruit du meulage, polissage, usinage CNC (> 85 dB)', 'pro-finition', ['Meulage prothese metallique', 'Tour de polissage', 'Sableuse', 'Usinage CNC'], 2, 4, ['Bouchons oreilles'], ['Bouchons moules sur mesure', 'Tour de polissage encoffre', 'Maintenance outils (reduction bruit)', 'Audiogramme annuel']),
      r('pro-tms', 'TMS (postures de precision)', 'Douleurs poignets, nuque, epaules par travail de precision prolonge', 'pro-modelage', ['Sculpture cire sous loupe (4-8h)', 'Meulage fin (force + precision)', 'Position assise statique prolongee', 'Montage sur articulateur'], 2, 4, ['Loupe eclairante'], ['Loupe binoculaire avec eclairage LED', 'Siege ergonomique avec appui-bras', 'Plan de travail a hauteur reglable', 'Micro-pauses toutes les 30 min', 'Etirements quotidiens mains et cou']),
      r('pro-brulure', 'Brulure (four, metal fondu)', 'Brulure par four de ceramique (900°C), coulage metal en fusion, torche', 'pro-coulage', ['Defournement ceramique', 'Coulage alliage en fusion', 'Soudure au chalumeau', 'Contact piece chaude'], 3, 2, ['Gants anti-chaleur', 'Pinces de prehension'], ['Gants EN 407 obligatoires', 'Zone de refroidissement balisee', 'Pinces longues pour defournement', 'Kit brulure au poste']),
      r('pro-projection', 'Projections (meulage, polissage)', 'Projection d\'eclats metalliques, de ceramique dans les yeux lors du meulage', 'pro-finition', ['Meulage prothese metallique', 'Eclatement disque de polissage', 'Sablage (retour de sable)'], 2, 3, ['Lunettes de protection'], ['Lunettes EN 166 obligatoires en finition', 'Ecran facial pour meulage prolonge', 'Carter sur tour de polissage']),
      r('pro-incendie', 'Incendie (gaz, solvants)', 'Depart de feu par gaz de chalumeau, solvants, poussieres metalliques', 'pro-coulage', ['Chalumeau de soudure', 'Solvants inflammables', 'Poussieres metalliques', 'Four'], 3, 1, ['Extincteur', 'Detection'], ['Stockage solvants en armoire ventilee', 'Detection incendie', 'Extincteur CO2 au poste', 'Permis de feu si soudure hors poste']),
      r('pro-electrique', 'Risque electrique', 'Electrisation par equipements electriques du laboratoire', 'pro-cao', ['Four de ceramique', 'Usinage CNC', 'Polymeriseur', 'Tour de polissage'], 3, 1, ['Differentiel 30mA'], ['Verification electrique annuelle', 'Maintenance preventive equipements']),
    ],
  },

  // ── Services funeraires ────────────────────────────────────────
  {
    metierSlug: 'services-funeraires', label: 'Services funeraires / Pompes funebres', category: 'sante_social',
    nafCodes: ['96.03Z'], idcc: '759',
    legalReferences: ['Tableau RG 43 (formaldehyde)', 'Art. R2213-2 (thanatopraxie)', 'CGCT art. L2223-19'],
    workUnits: [
      wu('fun-salle', 'Salle de preparation / thanatopraxie', 'Soins de conservation, habillage, mise en biere', '1-2'),
      wu('fun-ceremonie', 'Lieu de ceremonie', 'Organisation et conduite de la ceremonie', '1-3'),
      wu('fun-transport', 'Vehicule funeraire', 'Transport du defunt, convoi funeraire', '1-2'),
      wu('fun-accueil', 'Accueil / bureau', 'Accueil des familles, demarches administratives', '1-2'),
    ],
    risks: [
      r('fun-biologique', 'Risque biologique (contact defunts)', 'Contamination par contact avec les defunts (hepatite, HIV, tuberculose)', 'fun-salle', ['Habillage du defunt', 'Soins de thanatopraxie (injection)', 'Transport corps en decomposition', 'Contact fluides corporels'], 3, 3, ['Gants usage unique', 'Tablier'], ['Double gant pour thanatopraxie', 'Tablier impermeable', 'Masque FFP2 si decomposition avancee', 'Vaccination hepatite B', 'Protocole AES affiche', 'Desinfection des mains entre chaque corps']),
      r('fun-chimique', 'Risque chimique (formol, thanatopraxie)', 'Exposition au formaldehyde (cancerogene) lors des soins de thanatopraxie — RG 43', 'fun-salle', ['Injection de formol (thanatopraxie)', 'Vapeurs de formol dans la salle', 'Manipulation de produits conservateurs', 'Nettoyage de la salle'], 4, 3, ['Aspiration locale', 'Masque vapeurs'], ['Aspiration locale au poste de thanatopraxie (captage vapeurs)', 'Masque A1B1 (vapeurs organiques et formol)', 'Gants chimiques longs', 'Ventilation de la salle conforme', 'Suivi medical renforce (CMR formol)', 'Mesure d\'exposition formol annuelle']),
      r('fun-rps', 'Risques psychosociaux', 'Charge emotionnelle liee a la confrontation quotidienne a la mort et au deuil', 'fun-ceremonie', ['Confrontation quotidienne au deces', 'Accompagnement familles en deuil', 'Deces d\'enfants', 'Accidents traumatiques (corps abimes)', 'Astreintes permanentes'], 3, 4, ['Soutien equipe'], ['Groupes de parole reguliers', 'Acces psychologue du travail', 'Formation accompagnement du deuil', 'Rotation des taches (pas que thanatopraxie)', 'Repos compensateur apres astreintes']),
      r('fun-tms', 'TMS (port de cercueil)', 'Douleurs dorsales et epaules par port de cercueil (40-80 kg) et de corps', 'fun-ceremonie', ['Port du cercueil (6 porteurs)', 'Mise en biere (port du corps)', 'Descente en caveau', 'Escaliers etroits'], 3, 3, ['Porteurs en nombre suffisant'], ['6 porteurs minimum pour cercueil', 'Chariot de transport dans les locaux', 'Table elevatrice pour mise en biere', 'Formation gestes et postures', 'Monte-cercueil si crematorium']),
      r('fun-routier', 'Risque routier (convoi)', 'Accident lors du transport du defunt ou du convoi funeraire', 'fun-transport', ['Convoi funeraire (conduite lente)', 'Transport longue distance', 'Astreinte de nuit (fatigue)', 'Conditions meteo degradees'], 3, 3, ['Vehicule entretenu', 'Gyrophare'], ['Formation conduite de convoi', 'Gyrophare et feux de detresse', 'Repos entre interventions de nuit', 'Vehicule entretenu regulierement']),
      r('fun-chute', 'Chute (cimetiere, caveau)', 'Chute dans le cimetiere, pres du caveau, terrain irregulier', 'fun-ceremonie', ['Terrain irregulier du cimetiere', 'Caveau ouvert', 'Sol mouille/verglace', 'Allee en gravier'], 2, 3, ['Chaussures antiderapantes'], ['Chaussures de securite', 'Balisage caveau ouvert', 'Eclairage si ceremonie de nuit', 'Prudence par temps de gel']),
      r('fun-agression', 'Agression (familles)', 'Violence verbale ou physique de familles en detresse ou en conflit', 'fun-accueil', ['Famille en detresse', 'Conflit familial sur les funerailles', 'Contestation du prix', 'Client en etat de choc'], 2, 2, ['Formation communication'], ['Formation communication empathique', 'Bureau d\'accueil calme et securise', 'Procedure d\'escalade si conflit grave']),
      r('fun-manutention', 'Manutention (corps, cercueil, materiel)', 'Port de charges lourdes lors du transport du defunt et du materiel de ceremonie', 'fun-transport', ['Transport du corps sur brancard', 'Chargement cercueil dans le vehicule', 'Materiel de ceremonie (fleurs, pupitre)', 'Housse mortuaire'], 3, 3, ['Brancard roulant', 'Chariot'], ['Brancard autoporteur electrique', 'Chariot de transport dans le vehicule', 'Aide pour descente en caveau', 'Limite de poids respectee']),
    ],
  },
];
