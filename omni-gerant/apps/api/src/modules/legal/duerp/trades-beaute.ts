// BUSINESS RULE [CDC-2.4]: E7d — 4 metiers Beaute & Bien-etre
// Coiffure existe deja dans risk-database-v2.ts (E0)

import type { MetierRiskProfile } from './risk-database-v2.js';

function r(id: string, name: string, desc: string, wuId: string, sits: string[], g: 1|2|3|4, f: 1|2|3|4, exist: string[], proposed: string[], cat: string): MetierRiskProfile['risks'][number] {
  return { id, name, description: desc, workUnitId: wuId, situations: sits, defaultGravity: g, defaultFrequency: f, existingMeasures: exist, proposedActions: proposed, category: cat as MetierRiskProfile['risks'][number]['category'] };
}

function wu(id: string, name: string, desc: string, hc: string): MetierRiskProfile['workUnits'][number] {
  return { id, name, description: desc, typicalHeadcount: hc };
}

export const BEAUTE_TRADES: MetierRiskProfile[] = [
  // ── Esthetique ────────────────────────────────────────────────
  {
    metierSlug: 'esthetique', label: 'Institut de beaute / Estheticienne', category: 'beaute_bien_etre',
    nafCodes: ['96.02B'], idcc: '3032',
    legalReferences: ['Decret 2013-1261 (appareils esthetiques)', 'Tableau RG 65 (dermatoses)', 'Art. R4412-1 (chimique)'],
    workUnits: [
      wu('esth-cabine', 'Cabine de soins', 'Soins du visage, epilation, modelage', '1'),
      wu('esth-uv', 'Zone UV / bronzage', 'Cabines UV, bronzage par pulverisation', '1'),
      wu('esth-manucure', 'Poste onglerie', 'Manucure, pose vernis classique', '1'),
      wu('esth-accueil', 'Accueil / vente', 'Accueil, conseil, vente de produits', '1'),
    ],
    risks: [
      r('esth-chimique', 'Risque chimique (produits cosmetiques)', 'Allergie et irritation par produits cosmetiques et de soin', 'esth-cabine', ['Application de produits de soin', 'Epilation a la cire (resine)', 'Produits de coloration cils/sourcils', 'Nettoyage et desinfection du materiel'], 3, 3, ['Gants pour coloration'], ['Gants nitrile pour toute application de produit', 'Test allergie avant premier emploi de nouveau produit', 'FDS des produits accessibles', 'Produits hypoallergeniques privilegies', 'Aeration de la cabine entre clients']),
      r('esth-uv', 'Rayonnement UV (cabines)', 'Exposition aux UV artificiels des cabines de bronzage', 'esth-uv', ['Maintenance de la cabine (tubes UV allumes)', 'Exposition involontaire (sans lunettes)', 'Surexposition client'], 3, 2, ['Lunettes de protection'], ['Lunettes anti-UV obligatoires lors de la maintenance', 'Minuterie automatique des cabines', 'Information client sur les risques', 'Pas d\'utilisation personnelle des cabines']),
      r('esth-brulure', 'Brulure (cire, laser, UV)', 'Brulure par cire chaude, appareil laser ou IPL', 'esth-cabine', ['Cire trop chaude', 'Flash IPL (lumiere pulsee)', 'Laser esthetique (si autorise)', 'Appareil de radiofrequence'], 2, 3, ['Thermostat sur cire'], ['Thermostat de precision sur le chauffe-cire', 'Formation a chaque appareil', 'Lunettes de protection laser/IPL', 'Test de temperature avant application cire']),
      r('esth-tms', 'TMS (postures, repetition)', 'Douleurs par postures penchees sur le client et gestes repetitifs', 'esth-cabine', ['Position penchee pour soins visage', 'Epilation (gestes repetitifs)', 'Modelage (force des mains)', 'Position debout prolongee'], 3, 4, ['Table reglable'], ['Table de soins a hauteur electrique', 'Tabouret ergonomique a roulettes', 'Alternance des types de soins', 'Pauses entre les clients', 'Formation ergonomie du poste']),
      r('esth-biologique', 'Risque biologique (contact cutane)', 'Contamination par contact avec peau lesee, sang lors d\'epilation', 'esth-cabine', ['Epilation (sang, micro-coupures)', 'Soin du visage (acne, boutons)', 'Manucure (cuticules)', 'Pedicure (mycose)'], 2, 3, ['Gants usage unique'], ['Gants usage unique pour chaque client', 'Desinfection systematique du materiel', 'Materiel a usage unique quand possible', 'Hygiene des mains entre clients']),
      r('esth-psychosocial', 'Risques psychosociaux', 'Stress par relation client, cadence, isolement en cabine', 'esth-accueil', ['Client exigeant ou mecontent', 'Cadence de rendez-vous', 'Travail en cabine fermee (isolement)', 'Samedi oblige'], 2, 2, ['Pause entre clients'], ['Temps suffisant entre les rendez-vous', 'Communication avec l\'equipe', 'Formation gestion de la relation client']),
    ],
  },

  // ── Onglerie / Manucure ───────────────────────────────────────
  {
    metierSlug: 'onglerie-manucure', label: 'Onglerie / Prothesiste ongulaire', category: 'beaute_bien_etre',
    nafCodes: ['96.02B'], idcc: '3032',
    legalReferences: ['Tableau RG 65 (dermatoses)', 'Tableau RG 66 (respiratoires)', 'Art. R4412-1 (chimique)'],
    workUnits: [
      wu('ongl-poste', 'Poste de travail onglerie', 'Pose, remplissage, depose de protheses ongulaires', '1-3'),
      wu('ongl-stockage', 'Stockage produits', 'Stockage des resines, gels, solvants', '1'),
      wu('ongl-accueil', 'Accueil / vente', 'Accueil clients, vente de produits', '1'),
      wu('ongl-uv', 'Zone sechage UV/LED', 'Lampes UV ou LED pour polymerisation', '1-3'),
    ],
    risks: [
      r('ongl-chimique', 'Risque chimique (solvants, acrylique)', 'Exposition aux vapeurs de solvants (acetone, methacrylate) et poussieres acrylique', 'ongl-poste', ['Pose resine acrylique (vapeurs methacrylate)', 'Depose avec acetone', 'Ponçage de gel (poussieres)', 'Primer (acide)', 'Colle cyanoacrylate'], 3, 4, ['Aeration basique'], ['Aspiration a la source au poste de travail (table avec aspiration)', 'Masque FFP2 pour ponçage', 'Gants nitrile pour manipulation solvants', 'Aeration renforcee du local', 'Produits les moins volatils possibles', 'Substitution acrylique par gel UV si possible']),
      r('ongl-allergie', 'Allergie (methacrylate, resines)', 'Dermatite allergique de contact aux resines et methacrylates', 'ongl-poste', ['Contact peau avec resine non polymerisee', 'Gel UV sur la peau', 'Poussieres d\'acrylique', 'Primer acide sur la peau'], 3, 3, ['Gants'], ['Gants nitrile (pas latex) pour chaque client', 'Eviter tout contact peau avec resine non durcie', 'Changement de gants si produit dessus', 'Suivi dermatologique si symptomes']),
      r('ongl-tms', 'TMS (precision, postures)', 'Douleurs poignets, doigts et dos par travail de precision penche', 'ongl-poste', ['Position penchee sur la main du client', 'Travail de precision (pinceau fin)', 'Ponçage repetitif', 'Maintien de la lampe/outil'], 3, 4, ['Repose-mains'], ['Repose-mains ergonomique pour le client', 'Siege reglable avec accoudoirs', 'Loupe eclairante pour reduire la courbure', 'Pauses actives entre les clients', 'Outils ergonomiques (lime electrique legere)']),
      r('ongl-poussieres', 'Poussieres acrylique', 'Inhalation de poussieres d\'acrylique lors du ponçage des ongles', 'ongl-poste', ['Ponçage de gel', 'Ponçage de capsules', 'Limage', 'Pas d\'aspiration au poste'], 2, 4, ['Masque papier'], ['Table avec aspiration integree obligatoire', 'Masque FFP2 si pas d\'aspiration', 'Nettoyage regulier des filtres d\'aspiration', 'Aspirateur avec filtre HEPA pour le sol']),
      r('ongl-uv', 'Rayonnement UV (lampes sechage)', 'Exposition des mains aux UV lors du sechage sous lampe', 'ongl-uv', ['Mains sous lampe UV (polymerisation)', 'Exposition repetee quotidienne', 'Lampe UV puissante (36-48W)'], 2, 3, ['Lampe LED (moins d\'UV)'], ['Lampe LED privilegiee (spectre plus etroit)', 'Creme solaire sur les mains de la prothesiste', 'Gants demi-doigts anti-UV pour les clients', 'Limitation temps d\'exposition']),
      r('ongl-incendie', 'Incendie (solvants)', 'Depart de feu par solvants inflammables stockes', 'ongl-stockage', ['Stockage d\'acetone (tres inflammable)', 'Resines et solvants', 'Installation electrique'], 3, 1, ['Extincteur'], ['Stockage solvants dans armoire ventilee', 'Extincteur CO2 a proximite', 'Interdiction flamme nue', 'Quantite stockee minimale']),
    ],
  },

  // ── Tatouage-Piercing ─────────────────────────────────────────
  {
    metierSlug: 'tatouage-piercing', label: 'Tatouage / Piercing', category: 'beaute_bien_etre',
    nafCodes: ['96.09Z'], idcc: '3032',
    legalReferences: ['Arrete du 12/12/2008 (tatouage)', 'Arrete du 11/03/2009 (piercing)', 'Art. R1311-1 a R1311-12 (CSP)'],
    workUnits: [
      wu('tat-cabine', 'Cabine de tatouage', 'Realisation de tatouages', '1'),
      wu('tat-piercing', 'Poste piercing', 'Realisation de piercings', '1'),
      wu('tat-sterilisation', 'Zone sterilisation', 'Nettoyage, sterilisation du materiel', '1'),
      wu('tat-accueil', 'Accueil / design', 'Accueil, creation de motifs, conseil', '1'),
    ],
    risks: [
      r('tat-biologique', 'Risque biologique (AES, sang)', 'Accident d\'exposition au sang lors du tatouage ou piercing', 'tat-cabine', ['Piqure avec aiguille usagee', 'Eclaboussure de sang', 'Contact peau lesee du client', 'Manipulation DASRI'], 4, 3, ['Gants usage unique', 'Conteneur OPCT'], ['Materiel a usage unique obligatoire', 'Gants nitrile changes a chaque client', 'Conteneur OPCT a portee immediate', 'Protocole AES affiche', 'Vaccination hepatite B obligatoire', 'Formation hygiene et salubrite (obligatoire 21h)']),
      r('tat-chimique', 'Risque chimique (encres, desinfectants)', 'Allergie aux encres de tatouage ou produits de desinfection', 'tat-cabine', ['Contact encres (metaux lourds possibles)', 'Desinfection au spray', 'Savon vert', 'Produits de nettoyage concentres'], 2, 3, ['Gants nitrile'], ['Encres conformes a la resolution ResAP(2008)1', 'Gants nitrile pour toute manipulation', 'Aeration du local', 'FDS des encres disponibles']),
      r('tat-tms', 'TMS (postures, precision)', 'Douleurs par posture contraignante et travail de precision prolonge', 'tat-cabine', ['Position penchee sur le client (heures)', 'Maintien de la machine de tatouage', 'Travail de precision (lignes, ombrage)', 'Client dans une position difficile d\'acces'], 3, 4, ['Siege reglable'], ['Fauteuil client multi-position', 'Siege praticien a hauteur reglable avec roulettes', 'Pauses regulieres entre les seances', 'Etirements des mains et du dos', 'Repose-bras pour le praticien']),
      r('tat-allergie', 'Allergie (latex, encres)', 'Dermatite de contact par allergie au latex ou aux pigments', 'tat-cabine', ['Gants en latex (allergie)', 'Contact encre sur la peau', 'Manipulation de pigments', 'Film protecteur'], 2, 2, ['Gants nitrile (pas latex)'], ['Gants nitrile exclusivement (jamais latex)', 'Identification des allergies praticien', 'Suivi dermatologique']),
      r('tat-psychosocial', 'Risques psychosociaux', 'Stress par concentration prolongee et relation client', 'tat-accueil', ['Seance longue (4-6h de concentration)', 'Client nerveux (premiere fois)', 'Reclamation resultat', 'Travail le week-end'], 2, 3, ['Pauses entre seances'], ['Limitation duree des seances', 'Pause entre chaque client', 'Consentement ecrit du client', 'Communication claire sur le resultat attendu']),
      r('tat-incendie', 'Incendie', 'Depart de feu dans le local (produits, electricite)', 'tat-sterilisation', ['Autoclave (surchauffe)', 'Produits inflammables', 'Installation electrique'], 3, 1, ['Extincteur'], ['Detection incendie', 'Extincteur accessible', 'Entretien autoclave annuel']),
    ],
  },

  // ── Spa / Bien-etre ───────────────────────────────────────────
  {
    metierSlug: 'spa-bien-etre', label: 'Spa / Centre de bien-etre', category: 'beaute_bien_etre',
    nafCodes: ['96.04Z'], idcc: '3032',
    legalReferences: ['Art. D1332-1 (piscines)', 'Arrete du 7/04/1981 (eau de baignade)', 'Art. R4412-1 (chimique)'],
    workUnits: [
      wu('spa-bassin', 'Zone bassins / hammam / sauna', 'Jacuzzi, hammam, sauna, bain froid', '1-2'),
      wu('spa-cabine', 'Cabines de massage', 'Modelage, soin du corps, enveloppement', '1-4'),
      wu('spa-accueil', 'Accueil / vestiaires', 'Accueil clients, vestiaires, boutique', '1-2'),
      wu('spa-technique', 'Local technique', 'Traitement de l\'eau, chaufferie, equipements', '1'),
    ],
    risks: [
      r('spa-chimique', 'Risque chimique (traitement eau)', 'Exposition au chlore et produits de traitement de l\'eau des bassins', 'spa-technique', ['Manipulation de chlore concentre', 'pH correcteur (acide)', 'Brome', 'Brouillard de chlore au-dessus du bassin'], 3, 3, ['Gants et lunettes'], ['Dosage automatique des produits', 'Gants et lunettes pour manipulation concentree', 'Ventilation du local technique', 'FDS accessibles', 'Formation manipulation produits']),
      r('spa-glissade', 'Glissade (sols mouilles)', 'Chute sur sols mouilles autour des bassins, hammam, douches', 'spa-bassin', ['Plage de bassin mouillee', 'Sortie hammam (sol condense)', 'Douche', 'Vestiaires'], 3, 4, ['Sol antiderapant'], ['Revetement antiderapant certifie (classe C)', 'Chaussures antiderapantes pour le personnel', 'Eclairage suffisant dans toutes les zones humides', 'Raclage regulier des plages']),
      r('spa-biologique', 'Risque biologique (legionelle, mycoses)', 'Contamination par legionella dans les circuits d\'eau ou mycoses', 'spa-bassin', ['Eau du jacuzzi (temperature ideale pour legionelle)', 'Vestiaires communs (mycoses)', 'Hammam (moisissures)', 'Circuits d\'eau tiede'], 3, 2, ['Traitement eau', 'Nettoyage quotidien'], ['Controle legionelle trimestriel', 'Temperature eau conforme', 'Nettoyage desinfection quotidien des surfaces', 'Choc thermique des circuits mensuellement', 'Analyse microbiologique de l\'eau']),
      r('spa-tms', 'TMS (massages, postures)', 'Douleurs par pratique de massages et postures repetitives', 'spa-cabine', ['Massage (force des mains, bras leves)', 'Enveloppement (penche sur le client)', 'Position debout prolongee', 'Repetition 6-8 massages/jour'], 3, 4, ['Table reglable'], ['Table electrique a hauteur reglable', 'Technique de massage ergonomique (utilisation du poids du corps)', 'Nombre max de massages/jour', 'Alternance massages/soins legers', 'Pauses entre les seances']),
      r('spa-chaleur', 'Chaleur (sauna, hammam)', 'Malaise par exposition a la chaleur du sauna (80-100°C) ou hammam', 'spa-bassin', ['Entretien du sauna (chaleur extreme)', 'Nettoyage du hammam (chaleur + humidite)', 'Alternance chaud/froid'], 2, 3, ['Temps limite'], ['Limitation du temps de travail dans les zones chaudes', 'Hydratation reguliere', 'Pauses dans une zone temperee', 'Surveillance des signes de malaise']),
      r('spa-electrique', 'Risque electrique (milieu humide)', 'Electrisation par equipements electriques en environnement humide', 'spa-technique', ['Pompes de bassin', 'Eclairage subaquatique', 'Equipements de soins electriques', 'Sauna (resistance electrique)'], 3, 1, ['Differentiel 30mA'], ['Differentiel 30mA sur tous les circuits', 'Equipements IP67 en zone humide', 'Verification electrique annuelle', 'Intervention par electricien qualifie uniquement']),
    ],
  },
];
