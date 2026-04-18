// BUSINESS RULE [CDC-2.4]: E7a — 12 metiers Agriculture
// Sources : INRS, MSA, fiches metiers duerp-en-direct.fr

import type { MetierRiskProfile } from './risk-database-v2.js';

function r(id: string, name: string, desc: string, wuId: string, sits: string[], g: 1|2|3|4, f: 1|2|3|4, exist: string[], proposed: string[], cat: string): MetierRiskProfile['risks'][number] {
  return { id, name, description: desc, workUnitId: wuId, situations: sits, defaultGravity: g, defaultFrequency: f, existingMeasures: exist, proposedActions: proposed, category: cat as MetierRiskProfile['risks'][number]['category'] };
}

function wu(id: string, name: string, desc: string, hc: string): MetierRiskProfile['workUnits'][number] {
  return { id, name, description: desc, typicalHeadcount: hc };
}

export const AGRICULTURE_TRADES: MetierRiskProfile[] = [
  // ── Elevage bovin ─────────────────────────────────────────────
  {
    metierSlug: 'elevage-bovin', label: 'Elevage bovin', category: 'agriculture',
    nafCodes: ['01.21Z', '01.41Z', '01.42Z'], idcc: '7024',
    legalReferences: ['Art. R717-1 (MSA)', 'Tableau RG 57 (TMS)', 'Reglement CE 1/2005 (bien-etre animal)'],
    workUnits: [
      wu('ebov-etable', 'Etable / batiment elevage', 'Soins, alimentation, traite des bovins', '1-4'),
      wu('ebov-traite', 'Salle de traite', 'Traite mecanisee des vaches laitieres', '1-2'),
      wu('ebov-paturage', 'Paturage / parcelles', 'Surveillance, clotures, deplacement du troupeau', '1-2'),
      wu('ebov-stockage', 'Stockage alimentation / fourrage', 'Silo, fenil, stockage cereales et foin', '1'),
      wu('ebov-materiel', 'Atelier materiel agricole', 'Entretien tracteur, materiel de traite, reparations', '1'),
    ],
    risks: [
      r('ebov-ecrasement', 'Ecrasement par animal', 'Ecrasement, coup de pied, charge d\'un bovin (600-900 kg)', 'ebov-etable', ['Soins a un animal nerveux', 'Velage (vache agressive)', 'Deplacement du troupeau', 'Contention insuffisante'], 4, 3, ['Couloir de contention', 'Cornadis'], ['Cage de contention conforme', 'Formation manipulation animaux', 'Approche calme et previsible', 'Eclairage suffisant dans les batiments', 'Issue de secours dans chaque parc']),
      r('ebov-zoonose', 'Zoonoses (brucellose, leptospirose)', 'Contamination par maladies transmissibles du bovin a l\'homme', 'ebov-etable', ['Velage (contact placenta)', 'Contact urine/feces', 'Soins a un animal malade', 'Manipulation de cadavre'], 3, 3, ['Gants usage unique', 'Vaccination troupeau'], ['Vaccination leptospirose (MSA)', 'Gants longs pour velage', 'Desinfection apres contact', 'Suivi veterinaire regulier du troupeau', 'Hygiene des mains renforcee']),
      r('ebov-chimique', 'Risque chimique (pesticides, medicaments)', 'Exposition aux produits phytosanitaires, antiparasitaires et medicaments veterinaires', 'ebov-etable', ['Traitement antiparasitaire', 'Pulverisation herbicides paturage', 'Desinfection batiment', 'Manipulation medicaments injectables'], 3, 3, ['Gants pour traitements', 'Local phytosanitaire ferme'], ['EPI complets pour pulverisation (combinaison, masque A2P3)', 'Local phytosanitaire ventile et ferme a cle', 'FDS accessibles', 'Formation Certiphyto', 'Substitution par produits moins dangereux']),
      r('ebov-tms', 'TMS (manutention, postures)', 'Douleurs dorsales par port de charges lourdes et postures contraignantes', 'ebov-traite', ['Port de bidons de lait (40 kg)', 'Pose/depose des griffes de traite', 'Curage litiere a la fourche', 'Velage (traction)', 'Foin en balles rondes (500 kg)'], 3, 4, ['Chariot a lait', 'Tracteur avec fourche'], ['Salle de traite ergonomique (fosse)', 'Pailleuse mecanique', 'Porte-bidons roulant', 'Telescopique pour fourrage', 'Pauses regulieres en traite']),
      r('ebov-machines', 'Machines agricoles (tracteur, materiel)', 'Happage, ecrasement, renversement par machines et tracteur', 'ebov-materiel', ['Conduite tracteur en pente', 'Intervention sur prise de force', 'Manipulation materiel attele', 'Ensilage (machine)'], 4, 2, ['Protection prise de force', 'Arceau de securite tracteur'], ['Arceau de securite homologue', 'Carter sur prise de force', 'Formation conduite tracteur', 'Arret obligatoire moteur pour intervention', 'Entretien annuel materiel']),
      r('ebov-chute', 'Chute (sols glissants, hauteur)', 'Chute sur sol humide dans l\'etable ou depuis silo/fenil', 'ebov-stockage', ['Sol d\'etable glissant (lisier)', 'Montee sur silo', 'Fenil (chute depuis tas de foin)', 'Fosses a lisier (chute)'], 3, 3, ['Bottes antiderapantes'], ['Bottes antiderapantes certifiees', 'Echelle fixe pour acces silo', 'Garde-corps sur silo et fenil', 'Caillebotis drainant dans les passages', 'Grille de protection fosse a lisier']),
      r('ebov-gaz', 'Gaz toxiques (fosse a lisier)', 'Intoxication par H2S, NH3, CO2 degages par le lisier', 'ebov-etable', ['Brassage fosse a lisier', 'Entree en fosse (espace confine)', 'Ventilation insuffisante en hiver'], 4, 2, ['Ventilation batiment'], ['Interdiction entree en fosse sans detecteur', 'Detecteur multi-gaz portable', 'Ventilation forcee avant intervention fosse', 'Brassage par temps venteux uniquement', 'Procedure de sauvetage en espace confine']),
      r('ebov-bruit', 'Bruit (materiel, animaux)', 'Exposition au bruit des machines de traite, tracteur et animaux', 'ebov-traite', ['Salle de traite en fonctionnement', 'Tracteur en cabine', 'Animaux en stress (beuglements)'], 2, 3, ['Cabine tracteur'], ['Bouchons moulés en salle de traite', 'Entretien pompe a vide (reduction bruit)', 'Cabine tracteur isolee phoniquement']),
    ],
  },

  // ── Elevage porcin ────────────────────────────────────────────
  {
    metierSlug: 'elevage-porcin', label: 'Elevage porcin', category: 'agriculture',
    nafCodes: ['01.46Z'], idcc: '7024',
    legalReferences: ['Art. R717-1 (MSA)', 'Tableau RG 66 (affections respiratoires)', 'Reglement CE 1/2005'],
    workUnits: [
      wu('epor-porcherie', 'Porcherie / batiment naisseur', 'Soins, alimentation, insemination', '1-3'),
      wu('epor-engraissement', 'Salle engraissement', 'Alimentation, surveillance des porcs en engraissement', '1-2'),
      wu('epor-quai', 'Quai embarquement', 'Chargement/dechargement des porcs pour transport', '1-2'),
      wu('epor-stockage', 'Stockage aliments / lisier', 'Silos aliment, fosses a lisier', '1'),
    ],
    risks: [
      r('epor-biologique', 'Zoonoses (rouget, leptospirose)', 'Contamination par agents pathogenes porcins', 'epor-porcherie', ['Mise-bas (contact sang)', 'Soins a un animal malade', 'Contact lisier', 'Morsure/griffure'], 3, 3, ['Gants', 'Vaccination troupeau'], ['Vaccination des salaries (leptospirose)', 'Gants manches longues pour mise-bas', 'Douche a l\'entree/sortie porcherie', 'Suivi veterinaire renforce']),
      r('epor-gaz', 'Gaz toxiques (H2S, NH3) en fosse/porcherie', 'Intoxication par gaz degages par le lisier en espace confine', 'epor-stockage', ['Brassage fosse a lisier', 'Ventilation en panne en hiver', 'Entree en prefore pour reparation', 'Curage de fosse'], 4, 2, ['Ventilation permanente'], ['Detecteur H2S/NH3 fixe en porcherie', 'Detecteur portable pour fosse', 'Interdiction entree fosse sans procedure', 'Ventilation de secours (surpresseur)', 'Formation espace confine']),
      r('epor-bruit', 'Bruit (cris des porcs)', 'Exposition au bruit des cris de porcs (> 100 dB en pic)', 'epor-porcherie', ['Alimentation (excitation)', 'Soins/vaccinations (stress)', 'Chargement transport'], 3, 4, ['Bouchons d\'oreille'], ['Casque antibruit EN 352 obligatoire en porcherie', 'Alimentation automatisee (reduction stress)', 'Soins calmes et methodiques', 'Suivi audiometrique annuel']),
      r('epor-tms', 'TMS (manutention, postures)', 'Douleurs dorsales par postures basses et port de charges en porcherie', 'epor-porcherie', ['Soins aux porcelets (position basse)', 'Port de sacs aliment (25 kg)', 'Insemination (position contraignante)', 'Nettoyage haute pression (recul)'], 3, 3, ['Chariot aliment'], ['Alimentation automatisee par silo', 'Table de soins porcelets reglable en hauteur', 'Nettoyeur HP avec lance ergonomique', 'Formation gestes et postures MSA']),
      r('epor-chimique', 'Risque chimique (desinfection, antiparasitaires)', 'Exposition aux produits de desinfection et traitements', 'epor-porcherie', ['Desinfection vide sanitaire', 'Traitement antiparasitaire', 'Chaulage'], 3, 2, ['Gants', 'Masque'], ['EPI complets pour desinfection (combinaison, masque A2P3)', 'Canon a mousse (reduction exposition)', 'Temps de sechage avant reentree', 'FDS accessibles']),
      r('epor-ecrasement', 'Ecrasement par porc / blessure', 'Coup, morsure, ecrasement par truie (150-300 kg)', 'epor-porcherie', ['Truie allaitante agressive', 'Verrat nerveux', 'Chargement dans le camion', 'Soins a un animal blesse'], 3, 3, ['Barriere de separation'], ['Panneau de conduite pour deplacements', 'Couloir de contention pour soins', 'Bottes de securite avec coque', 'Approche calme, pas de gestes brusques']),
      r('epor-chute', 'Chute (sol glissant)', 'Glissade sur sol mouille par lisier ou eau de nettoyage', 'epor-porcherie', ['Sol de porcherie mouille', 'Caillebotis endommage', 'Nettoyage haute pression', 'Quai de chargement mouille'], 2, 3, ['Bottes antiderapantes'], ['Caillebotis conforme et entretenu', 'Bottes antiderapantes certifiees', 'Nettoyage regulier des passages']),
      r('epor-ammoniac', 'Ammoniac (atmosphere porcherie)', 'Irritation respiratoire chronique par ammoniac ambiant', 'epor-engraissement', ['Porcherie avec ventilation insuffisante', 'Brassage litiere', 'Nettoyage'], 2, 4, ['Ventilation mecanique'], ['Ventilation dimensionnee correctement', 'Controle NH3 (seuil < 20 ppm)', 'Paillage ou litiere accumulee pour absorption', 'Masque FFP2 si niveau eleve']),
    ],
  },

  // ── Elevage avicole ───────────────────────────────────────────
  {
    metierSlug: 'elevage-avicole', label: 'Elevage avicole (poulets, pondeuses)', category: 'agriculture',
    nafCodes: ['01.47Z'], idcc: '7024',
    legalReferences: ['Art. R717-1 (MSA)', 'Arrete du 1/2/2002 (influenza aviaire)', 'Tableau RG 66'],
    workUnits: [
      wu('eavi-batiment', 'Batiment d\'elevage', 'Surveillance, alimentation, soins des volailles', '1-3'),
      wu('eavi-ramassage', 'Ramassage / tri oeufs', 'Collecte et conditionnement des oeufs', '1-2'),
      wu('eavi-nettoyage', 'Nettoyage / vide sanitaire', 'Nettoyage et desinfection entre lots', '1-3'),
      wu('eavi-stockage', 'Stockage aliment / materiel', 'Silos, stockage equipements', '1'),
    ],
    risks: [
      r('eavi-biologique', 'Grippe aviaire / zoonoses', 'Contamination par influenza aviaire, salmonellose, ornithose', 'eavi-batiment', ['Contact volailles infectees', 'Nettoyage fiantes', 'Ramassage volailles mortes', 'Epidemie declaree'], 4, 2, ['Combinaison', 'Bottes dediees'], ['Biosecurite renforcee (SAS entree)', 'EPI grippe aviaire (masque FFP2, lunettes, combinaison)', 'Vaccination si disponible', 'Surveillance veterinaire rapprochee', 'Procedure d\'abattage sanitaire']),
      r('eavi-poussieres', 'Poussieres organiques (plumes, fiantes)', 'Affections respiratoires par inhalation de poussieres dans le batiment', 'eavi-batiment', ['Ramassage de volailles (nuage poussiere)', 'Curage litiere', 'Ventilation insuffisante', 'Distribution aliment'], 3, 4, ['Ventilation', 'Masque papier'], ['Masque FFP2 obligatoire dans le batiment', 'Ventilation dimensionnee', 'Brumisation pour abattage poussiere', 'Suivi pneumologique MSA', 'Aspiration poussiere mecanisee']),
      r('eavi-ammoniac', 'Ammoniac (litiere)', 'Irritation des voies respiratoires par ammoniac degage par la litiere', 'eavi-batiment', ['Litiere humide', 'Ventilation insuffisante', 'Fin de lot (litiere saturee)'], 2, 3, ['Ventilation mecanique'], ['Gestion litiere (paillage regulier)', 'Controle NH3 (seuil < 20 ppm)', 'Ventilation dynamique regulee']),
      r('eavi-tms', 'TMS (postures, ramassage)', 'Douleurs dorsales par postures basses et repetitives lors du ramassage', 'eavi-ramassage', ['Ramassage oeufs au sol', 'Attrapage volailles a la main', 'Port de caisses de volailles'], 3, 3, ['Chariot a oeufs'], ['Tapis roulant pour oeufs', 'Chariot de ramassage a hauteur', 'Limitation du nombre de volailles par caisse', 'Formation gestes et postures']),
      r('eavi-machines', 'Machines (chaine, convoyeur)', 'Happage par chaine d\'alimentation, convoyeur a oeufs', 'eavi-stockage', ['Intervention sur convoyeur en marche', 'Chaine d\'alimentation automatique', 'Vis sans fin (silo aliment)'], 4, 1, ['Carter de protection'], ['Carter sur toutes les parties tournantes', 'Arret obligatoire pour intervention', 'Consignation avant maintenance', 'Signalisation des zones dangereuses']),
      r('eavi-chimique', 'Risque chimique (desinfection)', 'Exposition aux produits de desinfection du vide sanitaire', 'eavi-nettoyage', ['Desinfection formol', 'Chaulage', 'Insecticide pour poux rouges', 'Fongicide'], 3, 2, ['Gants', 'Masque'], ['EPI complets (combinaison, masque A2P3, lunettes)', 'Doseurs automatiques', 'Temps d\'attente avant reentree', 'Substitution formol par produit moins dangereux']),
      r('eavi-chute', 'Chute (sol, equipement)', 'Glissade sur litiere ou chute depuis equipement (silo, echelle)', 'eavi-batiment', ['Litiere humide et glissante', 'Montee sur silo', 'Echelle dans le batiment'], 2, 2, ['Bottes antiderapantes'], ['Bottes antiderapantes', 'Echelle fixe avec crinoline pour silo', 'Eclairage suffisant']),
    ],
  },

  // ── Viticulture ───────────────────────────────────────────────
  {
    metierSlug: 'viticulture', label: 'Viticulture', category: 'agriculture',
    nafCodes: ['01.21Z'], idcc: '7012',
    legalReferences: ['Tableau RG 11 (intoxication plomb tetraethyle)', 'Tableau RG 19 (leptospirose)', 'Certiphyto obligatoire'],
    workUnits: [
      wu('viti-vigne', 'Vigne / parcelles', 'Taille, traitement, palissage, vendanges', '2-10'),
      wu('viti-cave', 'Cave / cuverie', 'Vinification, soutirage, elevage, mise en bouteille', '1-4'),
      wu('viti-chai', 'Chai / stockage', 'Stockage barriques et bouteilles', '1-2'),
      wu('viti-atelier', 'Atelier / materiel', 'Entretien tracteur, enjambeur, materiel viticole', '1'),
    ],
    risks: [
      r('viti-chimique', 'Risque chimique (pesticides, soufre)', 'Intoxication par produits phytosanitaires et SO2 en cave', 'viti-vigne', ['Pulverisation fongicides (bouillie bordelaise, soufre)', 'Traitement insecticide', 'Sulfitage du vin (SO2)', 'Manipulation produits concentres'], 3, 4, ['Gants pour traitements'], ['EPI complets pour pulverisation (combinaison, masque A2P3, gants)', 'Cabine tracteur filtree', 'Certiphyto obligatoire', 'Substitution par biocontrole quand possible', 'Douche apres traitement']),
      r('viti-tms', 'TMS (vendanges, taille)', 'Douleurs dorsales et epaules par postures de taille et port de hottes', 'viti-vigne', ['Taille (bras leves, posture)', 'Vendanges manuelles (hotte 20-30 kg)', 'Palissage (bras leves)', 'Ebourgeonnage (position basse)'], 3, 4, ['Secateur pneumatique'], ['Secateur electrique/pneumatique pour taille', 'Hotte ergonomique avec sangle pectorale', 'Machine a vendanger (si possible)', 'Pauses regulieres', 'Formation gestes et postures']),
      r('viti-machines', 'Machines (tracteur, enjambeur)', 'Renversement, happage par tracteur ou enjambeur viticole', 'viti-atelier', ['Conduite enjambeur en pente', 'Intervention sur broyeur', 'Attelage materiel', 'Conduite sur route (transfert)'], 4, 2, ['Arceau securite', 'Ceinture'], ['Arceau de securite homologue sur tracteur', 'Formation conduite enjambeur', 'Carter sur broyeur et effeuilleuse', 'Arret moteur pour intervention', 'Signalisation pour circulation route']),
      r('viti-chute-terrain', 'Chute en terrain pentu', 'Glissade dans les vignes en pente sur sol humide ou caillouteux', 'viti-vigne', ['Terrain en pente mouille', 'Sol caillouteux instable', 'Vendanges (charge sur le dos)', 'Inter-rangs etroits'], 2, 3, ['Chaussures montantes'], ['Chaussures de securite montantes antiderapantes', 'Entretien des chemins d\'acces', 'Desherbage mecanique des inter-rangs']),
      r('viti-gaz-cave', 'Gaz toxiques (CO2 en cave)', 'Asphyxie par CO2 degage par la fermentation en cuve', 'viti-cave', ['Fermentation en cuve ouverte', 'Entree en cuve pour nettoyage', 'Caves mal ventilees', 'Soutirage'], 4, 2, ['Ventilation cave'], ['Detecteur CO2 fixe en cave', 'Detecteur CO2 portable pour entree en cuve', 'Ventilation forcee avant entree en cuve', 'Procedure espace confine (binome, surveillance)', 'Balise individuelle']),
      r('viti-bruit', 'Bruit (materiel viticole)', 'Exposition au bruit des machines viticoles et mise en bouteille', 'viti-cave', ['Embouteilleuse', 'Compresseur', 'Broyeur', 'Tracteur sans cabine'], 2, 3, ['Bouchons d\'oreille'], ['Casque antibruit EN 352 pres des machines', 'Cabine tracteur isolee', 'Entretien des machines (reduction bruit)']),
      r('viti-uv', 'Rayonnement UV / chaleur', 'Exposition prolongee au soleil lors des travaux de vigne', 'viti-vigne', ['Vendanges en ete (chaleur)', 'Traitements en plein soleil', 'Palissage en juin-juillet'], 2, 3, ['Chapeau'], ['Chapeau a large bord et vetements couvrants', 'Creme solaire mise a disposition', 'Amenagement horaires (eviter 12h-16h en ete)', 'Eau fraiche a disposition permanente']),
    ],
  },

  // ── Maraichage ────────────────────────────────────────────────
  {
    metierSlug: 'maraichage', label: 'Maraichage', category: 'agriculture',
    nafCodes: ['01.13Z'], idcc: '7024',
    legalReferences: ['Certiphyto obligatoire', 'Tableau RG 57 (TMS)', 'Art. R717-1 (MSA)'],
    workUnits: [
      wu('mara-pleinchamp', 'Plein champ', 'Culture, recolte, desherbage en exterieur', '2-8'),
      wu('mara-serre', 'Serre / abri', 'Culture sous serre chauffee ou tunnel', '1-4'),
      wu('mara-conditionnement', 'Conditionnement / tri', 'Lavage, tri, mise en caisses des legumes', '1-4'),
      wu('mara-stockage', 'Stockage / chambre froide', 'Conservation et stockage des recoltes', '1'),
    ],
    risks: [
      r('mara-chimique', 'Risque chimique (pesticides)', 'Intoxication par produits phytosanitaires', 'mara-pleinchamp', ['Pulverisation insecticide/fongicide', 'Preparation bouillies', 'Reentree dans serre apres traitement', 'Manipulation produits concentres'], 3, 3, ['Gants pour traitements'], ['EPI complets (combinaison, masque A2P3, gants nitrile)', 'Certiphyto obligatoire', 'Delai de reentree respecte', 'Protection biologique integree (reduction phyto)', 'Local phytosanitaire conforme']),
      r('mara-tms', 'TMS (postures basses, port de charges)', 'Douleurs dorsales par postures basses prolongees et port de caisses', 'mara-pleinchamp', ['Recolte au sol (position accroupie)', 'Desherbage manuel', 'Port de caisses (15-20 kg)', 'Plantation (penche en avant)'], 3, 4, ['Genouilleres'], ['Chariot de recolte bas sur roues', 'Bande transporteuse pour caisses', 'Genouilleres ergonomiques', 'Alternance des taches', 'Formation gestes et postures MSA']),
      r('mara-uv', 'Rayonnement UV / chaleur', 'Coup de chaleur et exposition UV prolongee en exterieur', 'mara-pleinchamp', ['Recolte en plein ete', 'Desherbage au soleil', 'Serre surchauffee (> 40°C)'], 3, 3, ['Chapeau', 'Eau disponible'], ['Amenagement horaires ete (6h-13h)', 'Eau fraiche en permanence', 'Abri ombre disponible', 'Vetements couvrants et aeres', 'Plan canicule formalise']),
      r('mara-machines', 'Machines (motoculteur, arracheuse)', 'Blessure par machine agricole lors du travail du sol ou de la recolte', 'mara-pleinchamp', ['Motoculteur (retour de fraise)', 'Arracheuse a legumes', 'Broyeur de vegetaux', 'Plantation mecanique'], 3, 2, ['Carter de protection'], ['Carter sur toutes parties tournantes', 'Arret moteur pour intervention', 'Formation utilisation machines', 'EPI (chaussures securite, gants)']),
      r('mara-biologique', 'Risque biologique (tetanos, leptospirose)', 'Contamination par agents pathogenes du sol (tetanos, leptospirose)', 'mara-pleinchamp', ['Blessure avec outil souille de terre', 'Contact eau stagnante', 'Contact rongeurs (serre)'], 3, 2, ['Vaccination tetanos'], ['Vaccination tetanos a jour', 'Gants pour tout contact avec la terre', 'Deratisation reguliere des serres', 'Desinfection immediate des plaies']),
      r('mara-allergie', 'Allergie (pollens, moisissures)', 'Reactions allergiques aux pollens, moisissures de serre, latex de plantes', 'mara-serre', ['Travail en serre (moisissures)', 'Recolte de tomates (contact feuilles)', 'Manipulation de compost', 'Poussiere de terreau'], 2, 3, ['Aeration serre'], ['Gants pour manipulation plantes irritantes', 'Masque FFP2 pour manipulation terreau/compost', 'Aeration suffisante des serres', 'Suivi medical si symptomes allergiques']),
      r('mara-froid', 'Froid (chambre froide, exterieur hiver)', 'Exposition au froid en chambre froide ou en exterieur hivernal', 'mara-stockage', ['Travail en chambre froide', 'Recolte hivernale (poireaux, choux)', 'Conditionnement en espace froid'], 2, 3, ['Vetements chauds'], ['Vetements thermiques fournis', 'Temps de travail limite en chambre froide', 'Boissons chaudes disponibles']),
    ],
  },

  // ── Cereales ──────────────────────────────────────────────────
  {
    metierSlug: 'cereales', label: 'Grandes cultures / Cereales', category: 'agriculture',
    nafCodes: ['01.11Z', '01.12Z'], idcc: '7024',
    legalReferences: ['Certiphyto obligatoire', 'Directive ATEX 1999/92/CE', 'Art. R717-1 (MSA)'],
    workUnits: [
      wu('cer-parcelle', 'Parcelles / champs', 'Semis, traitements, recolte', '1-3'),
      wu('cer-silo', 'Silo / stockage cereales', 'Stockage, sechage, ventilation des cereales', '1-2'),
      wu('cer-atelier', 'Atelier materiel', 'Entretien moissonneuse, semoir, pulverisateur', '1'),
      wu('cer-bureau', 'Bureau / gestion', 'Administration, gestion parcellaire', '1'),
    ],
    risks: [
      r('cer-atex', 'ATEX (poussieres cereales en silo)', 'Explosion de poussieres de cereales en silo (ATEX Zone 20/21)', 'cer-silo', ['Remplissage silo (nuage poussiere)', 'Vidange silo', 'Intervention sur vis a grain', 'Sechoir defaillant'], 4, 2, ['Ventilation silo', 'Detection poussiere'], ['Zonage ATEX du silo', 'Materiel electrique ATEX certifie', 'Nettoyage regulier (pas d\'accumulation poussiere)', 'Systeme de detection explosion/incendie', 'Interdiction flamme/etincelle en zone ATEX', 'Event de surpression']),
      r('cer-machines', 'Machines (moissonneuse, semoir)', 'Happage, ecrasement par moissonneuse-batteuse ou materiel attele', 'cer-parcelle', ['Debourrage moissonneuse en marche', 'Attelage semoir au tracteur', 'Intervention sur vis a grain', 'Conduite tracteur sur route'], 4, 3, ['Carter protection', 'Arceau tracteur'], ['Arret moteur obligatoire avant tout debourrage', 'Carter de protection sur vis et courroies', 'Arceau de securite homologue', 'Gilet HV pour circulation route', 'Formation conduite machines agricoles']),
      r('cer-chimique', 'Risque chimique (phytosanitaires)', 'Intoxication par herbicides, fongicides, insecticides', 'cer-parcelle', ['Pulverisation au pulverisateur traine', 'Preparation bouillie', 'Nettoyage pulverisateur', 'Reentree dans parcelle traitee'], 3, 3, ['Cabine tracteur filtree'], ['Cabine tracteur a filtration activee (cat. 4)', 'EPI pour remplissage (combinaison, masque, gants)', 'Systeme de rincage integre', 'Certiphyto valide', 'Registre phytosanitaire a jour']),
      r('cer-ensevelissement', 'Ensevelissement en silo', 'Ensevelissement par la masse de cereales dans un silo', 'cer-silo', ['Entree dans silo pour debloquer', 'Marche sur cereales en surface (effet sable mouvant)', 'Vidange brutale'], 4, 1, ['Interdiction entree seul dans silo'], ['Interdiction formelle d\'entrer dans un silo en cours de vidange', 'Procedure espace confine (binome)', 'Harnais avec corde de rappel', 'Panneau d\'avertissement', 'Formation risque ensevelissement']),
      r('cer-tms', 'TMS (conduite prolongee)', 'Douleurs dorsales par conduite prolongee de tracteur et vibrations', 'cer-parcelle', ['Semis (journee entiere au tracteur)', 'Moisson (longues journees)', 'Traitement (aller-retour parcelle)', 'Vibrations corps entier'], 2, 4, ['Siege suspendu tracteur'], ['Siege pneumatique tracteur de derniere generation', 'Pauses regulieres', 'GPS/autoguidage (reduction fatigue)', 'Alternance des taches']),
      r('cer-poussieres', 'Poussieres (cereales, terre)', 'Affections respiratoires par inhalation de poussieres de cereales', 'cer-silo', ['Remplissage silo', 'Nettoyage silo', 'Manipulation de grains', 'Moisson (poussiere)'], 2, 3, ['Cabine tracteur'], ['Masque FFP2 pour intervention silo', 'Cabine tracteur filtree', 'Aspiration poussiere a la reception', 'Douche apres intervention en silo']),
      r('cer-chute', 'Chute depuis silo / machine', 'Chute depuis le haut d\'un silo ou d\'une machine agricole', 'cer-silo', ['Acces au sommet du silo', 'Montee sur moissonneuse', 'Echelle non securisee'], 4, 1, ['Echelle fixe'], ['Echelle a crinoline pour silo', 'Ligne de vie sur la toiture', 'Garde-corps sur machines', 'Interdiction montee machine en marche']),
    ],
  },

  // ── Horticulture-Pepiniere ────────────────────────────────────
  {
    metierSlug: 'horticulture-pepiniere', label: 'Horticulture / Pepiniere', category: 'agriculture',
    nafCodes: ['01.19Z', '01.30Z'], idcc: '7024',
    legalReferences: ['Certiphyto obligatoire', 'Tableau RG 65 (dermatoses)', 'Art. R717-1 (MSA)'],
    workUnits: [
      wu('hort-serre', 'Serre / tunnel', 'Culture, rempotage, arrosage sous serre', '2-6'),
      wu('hort-pepiniere', 'Pepiniere exterieure', 'Plantation, taille, entretien des vegetaux', '1-4'),
      wu('hort-conditionnement', 'Conditionnement / expedition', 'Mise en pot, etiquetage, chargement', '1-3'),
      wu('hort-vente', 'Espace de vente', 'Vente directe, conseil clients', '1-2'),
    ],
    risks: [
      r('hort-chimique', 'Risque chimique (phytosanitaires)', 'Exposition aux pesticides et engrais chimiques', 'hort-serre', ['Pulverisation sous serre (confinement)', 'Preparation bouillies', 'Manipulation engrais concentres', 'Reentree serre apres traitement'], 3, 3, ['Gants nitrile'], ['EPI complets pour traitement (masque A2P3, combinaison)', 'Delai de reentree affiche', 'Protection biologique integree', 'Certiphyto', 'Ventilation forcee apres traitement']),
      r('hort-tms', 'TMS (rempotage, manutention)', 'Douleurs par gestes repetitifs de rempotage et port de pots lourds', 'hort-conditionnement', ['Rempotage repetitif', 'Port de pots (5-30 kg)', 'Arrosage avec tuyau lourd', 'Position debout prolongee'], 3, 3, ['Table de rempotage'], ['Table de rempotage a hauteur reglable', 'Transpalette pour palettes de pots', 'Arrosage automatise', 'Alternance des taches', 'Pauses regulieres']),
      r('hort-allergie', 'Allergie (pollens, latex vegetal)', 'Reactions allergiques aux pollens, seve, et poussieres de terreau', 'hort-serre', ['Manipulation de plantes en floraison', 'Contact seve irritante (euphorbes)', 'Manipulation terreau/compost', 'Moisissures sous serre'], 2, 3, ['Gants'], ['Gants pour manipulation plantes allergenes', 'Masque FFP2 pour terreau et compost', 'Identification des plantes irritantes', 'Suivi medical allergologique']),
      r('hort-uv', 'Rayonnement UV / chaleur serre', 'Exposition au soleil en exterieur et chaleur excessive sous serre', 'hort-pepiniere', ['Travail sous serre en ete (> 40°C)', 'Travail exterieur en plein soleil', 'Arrosage par forte chaleur'], 2, 3, ['Chapeau', 'Eau'], ['Ombrieres sur les serres en ete', 'Ventilation naturelle ou forcee', 'Amenagement horaires ete', 'Eau fraiche a disposition']),
      r('hort-coupure', 'Coupure (secateur, outils)', 'Blessure par outils tranchants lors de la taille ou du greffage', 'hort-pepiniere', ['Taille au secateur', 'Greffage au greffoir', 'Debroussaillage', 'Tronconneuse pour arbres'], 2, 3, ['Gants de taille'], ['Secateur a lame protegee', 'Gants anti-coupure EN 388', 'Formation utilisation tronconneuse', 'Trousse de secours a proximite']),
      r('hort-machines', 'Machines (rempoteuse, broyeur)', 'Happage ou blessure par machine de conditionnement', 'hort-conditionnement', ['Rempoteuse mecanique', 'Broyeur de vegetaux', 'Convoyeur'], 3, 2, ['Carter protection'], ['Carter sur parties tournantes', 'Arret d\'urgence accessible', 'Formation machines', 'Consignation pour maintenance']),
    ],
  },

  // ── Exploitation forestiere ───────────────────────────────────
  {
    metierSlug: 'exploitation-forestiere', label: 'Exploitation forestiere / Bucheronnage', category: 'agriculture',
    nafCodes: ['02.20Z'], idcc: '7024',
    legalReferences: ['Arrete du 31/03/2011 (travaux forestiers)', 'Tableau RG 69 (vibrations)', 'CACES R482 (engins forestiers)'],
    workUnits: [
      wu('for-abattage', 'Zone d\'abattage', 'Abattage, ebranchage, tronconnage', '1-3'),
      wu('for-debardage', 'Debardage / transport', 'Sortie du bois de la foret par porteur ou cable', '1-2'),
      wu('for-entretien', 'Entretien forestier', 'Debroussaillage, plantation, eclaircies', '1-3'),
      wu('for-atelier', 'Atelier / materiel', 'Entretien tronconneuses, engins', '1'),
    ],
    risks: [
      r('for-tronconneuse', 'Tronconneuse (coupure, kickback)', 'Coupure grave ou amputation par retour de chaine de tronconneuse', 'for-abattage', ['Retour de chaine (kickback)', 'Tronconnage au sol (position instable)', 'Ebranchage sous tension', 'Chaine emportee dans le bois'], 4, 3, ['EPI tronconneuse complet'], ['Pantalon anti-coupure EN 381-5 classe 1 minimum', 'Bottes anti-coupure EN 17249', 'Gants anti-coupure EN 381-7', 'Casque forestier avec visiere et antibruit', 'Formation abattage en securite (CS bûcheronnage)', 'Tronconneuse avec frein de chaine']),
      r('for-chute-arbre', 'Chute d\'arbre / branche', 'Ecrasement par arbre ou branche lors de l\'abattage ou par chablis', 'for-abattage', ['Arbre qui tombe hors direction prevue', 'Branche morte en hauteur (veuve)', 'Chablis instable', 'Arbre encrouee (bloque par un autre)'], 4, 3, ['Zone de repli balisee'], ['Zone de repli a 45° definie avant chaque abattage', 'Observation prealable de l\'arbre (inclinaison, branches mortes)', 'Coin d\'abattage directionnel', 'Perimetre de securite (2x hauteur arbre)', 'Ne jamais abattre seul', 'Communication radio entre equipes']),
      r('for-vibrations', 'Vibrations (tronconneuse, engins)', 'Syndrome des vibrations (main blanche) par utilisation prolongee de tronconneuse', 'for-abattage', ['Tronconnage prolonge', 'Debroussailleuse', 'Conduite engin forestier sur terrain accidente'], 3, 4, ['Gants anti-vibrations'], ['Tronconneuse avec systeme anti-vibrations', 'Limitation du temps d\'utilisation (2h consecutive max)', 'Gants anti-vibrations EN ISO 10819', 'Alternance des taches', 'Suivi medical main-bras']),
      r('for-isolement', 'Isolement / travail seul', 'Absence de secours rapide en cas d\'accident en foret isolee', 'for-abattage', ['Travail seul en foret', 'Zone sans reseau telephone', 'Eloignement des secours (> 30 min)', 'Conditions meteo degradees'], 3, 3, ['Telephone portable'], ['Travail en binome obligatoire pour abattage', 'Telephone satellite ou balise PLB', 'Procedure de pointage regulier', 'Localisation GPS connue du responsable', 'Trousse de secours hemorragique (garrot)']),
      r('for-terrain', 'Chute en terrain accidente', 'Glissade ou chute sur terrain forestier pentu, mouille, encombre', 'for-entretien', ['Terrain pentu et humide', 'Souches et racines', 'Branches au sol', 'Verglas en hiver'], 2, 4, ['Bottes forestieres'], ['Bottes forestieres antiderapantes', 'Baton de marche si necessaire', 'Entretien des chemins d\'acces', 'Report du travail si terrain trop dangereux']),
      r('for-ecrasement-engin', 'Ecrasement (engin forestier)', 'Renversement ou ecrasement par abatteuse, porteur ou debusqueur', 'for-debardage', ['Conduite sur terrain pentu', 'Chargement de grumes', 'Debardage par cable', 'Renversement engin'], 4, 2, ['Cabine FOPS/ROPS'], ['Cabine FOPS (protection chute objets) + ROPS (anti-retournement)', 'CACES R482 obligatoire', 'Perimetre de securite autour de l\'engin', 'Entretien et verification quotidienne']),
    ],
  },

  // ── Paysagiste ────────────────────────────────────────────────
  {
    metierSlug: 'paysagiste', label: 'Paysagiste / Entretien espaces verts', category: 'agriculture',
    nafCodes: ['81.30Z'], idcc: '7018',
    legalReferences: ['Certiphyto obligatoire', 'Tableau RG 69 (vibrations)', 'CACES si engins'],
    workUnits: [
      wu('pays-chantier', 'Chantier creation', 'Amenagement paysager, plantation, engazonnement', '2-6'),
      wu('pays-entretien', 'Entretien courant', 'Tonte, taille, desherbage, arrosage', '1-3'),
      wu('pays-elagage', 'Elagage / abattage', 'Taille d\'arbres en hauteur, abattage', '1-2'),
      wu('pays-vehicule', 'Vehicule / deplacements', 'Conduite camion/fourgon avec remorque', '1-2'),
      wu('pays-depot', 'Depot / atelier', 'Stockage materiel, entretien machines', '1'),
    ],
    risks: [
      r('pays-machines', 'Machines (tondeuse, taille-haie, tronconneuse)', 'Coupure ou projection par machines d\'espaces verts', 'pays-entretien', ['Tondeuse autoportee (projection cailloux)', 'Taille-haie (coupure)', 'Debroussailleuse (projection)', 'Tronconneuse (elagage)'], 3, 4, ['EPI basiques'], ['Lunettes de protection EN 166 pour debroussaillage', 'Pantalon anti-coupure pour tronconneuse', 'Protections auditives EN 352', 'Gants anti-coupure pour taille-haie', 'Formation tronconneuse obligatoire pour elagage']),
      r('pays-chimique', 'Risque chimique (phytosanitaires)', 'Exposition aux herbicides, fongicides et engrais chimiques', 'pays-entretien', ['Desherbage chimique', 'Traitement pelouse (fongicide)', 'Manipulation engrais'], 3, 2, ['Gants pour traitement'], ['Certiphyto obligatoire', 'Zero phyto dans les espaces publics (loi Labbe)', 'Desherbage mecanique ou thermique privilegie', 'EPI pour traitement si necessaire']),
      r('pays-chute-hauteur', 'Chute de hauteur (elagage)', 'Chute depuis arbre, echelle ou nacelle lors de l\'elagage', 'pays-elagage', ['Elagage dans l\'arbre (grimpeur)', 'Nacelle (defaillance)', 'Echelle (glissade)', 'Branche qui cede sous le poids'], 4, 2, ['Harnais', 'Cordes'], ['Harnais d\'elagage EN 813 + longe double', 'Formation CS arboriste-grimpeur', 'Nacelle en alternative quand possible', 'Verification visuelle de l\'arbre avant montee', 'Echelle interdite pour elagage (nacelle ou grimpe)']),
      r('pays-tms', 'TMS (postures, vibrations)', 'Douleurs par postures et vibrations des machines portatives', 'pays-entretien', ['Debroussaillage prolonge (vibrations)', 'Plantation (position basse)', 'Port de vegetaux et sacs (25-50 kg)', 'Tonte (vibrations siege)'], 3, 3, ['Gants anti-vibrations'], ['Machines a faibles vibrations', 'Harnais pour debroussailleuse (repartition poids)', 'Brouette/chariot pour transport charges', 'Alternance des taches', 'Pauses regulieres']),
      r('pays-bruit', 'Bruit (machines espaces verts)', 'Exposition au bruit des tondeuses, souffleurs et tronconneuses (> 85 dB)', 'pays-entretien', ['Souffleur (100+ dB)', 'Tronconneuse (105 dB)', 'Tondeuse autoportee', 'Broyeur de vegetaux'], 3, 4, ['Bouchons d\'oreille'], ['Casque antibruit EN 352 obligatoire', 'Machines a moteur electrique (reduction bruit)', 'Limitation temps d\'exposition', 'Suivi audiometrique annuel']),
      r('pays-routier', 'Risque routier (deplacements)', 'Accident lors des deplacements entre chantiers avec remorque', 'pays-vehicule', ['Conduite avec remorque chargee', 'Circulation en ville', 'Stationnement sur voie publique', 'Chargement/dechargement bord de route'], 3, 3, ['Vehicule entretenu', 'Gilet HV'], ['Formation conduite avec remorque', 'Balisage chantier bord de route', 'Gilet HV obligatoire', 'Gyrophare sur vehicule', 'Verification attelage quotidienne']),
      r('pays-uv', 'Rayonnement UV / intemperies', 'Exposition aux UV et intemperies en exterieur toute l\'annee', 'pays-chantier', ['Travail en plein soleil ete', 'Pluie et froid hiver', 'Vent fort (branches)'], 2, 3, ['Chapeau', 'Vetements de pluie'], ['Creme solaire mise a disposition', 'Vetements de pluie et de froid fournis', 'Amenagement horaires ete', 'Report chantier si conditions dangereuses (vent, orage)']),
    ],
  },

  // ── Apiculture ────────────────────────────────────────────────
  {
    metierSlug: 'apiculture', label: 'Apiculture', category: 'agriculture',
    nafCodes: ['01.49Z'], idcc: '7024',
    legalReferences: ['Art. L211-7 (code rural, abeilles)', 'Arrete du 23/12/2009 (traitements varroa)', 'Tableau RG 65 (dermatoses)'],
    workUnits: [
      wu('api-rucher', 'Rucher', 'Visite des ruches, recolte, traitement varroa', '1-2'),
      wu('api-miellerie', 'Miellerie / extraction', 'Extraction, mise en pots, conditionnement du miel', '1-2'),
      wu('api-atelier', 'Atelier / fabrication', 'Construction et reparation des ruches, cire', '1'),
      wu('api-transport', 'Transport / transhumance', 'Deplacement des ruches entre sites', '1-2'),
    ],
    risks: [
      r('api-piqure', 'Piqures d\'abeilles (choc anaphylactique)', 'Risque de choc anaphylactique par piqures multiples', 'api-rucher', ['Visite de ruche (essaim agressif)', 'Recolte de miel', 'Manipulation de cadres', 'Essaimage'], 4, 4, ['Combinaison apiculteur', 'Enfumoir'], ['Combinaison integrale avec voile', 'Gants cuir longs', 'Kit d\'urgence adrenaline (Epipen) a proximite', 'Visite medicale prealable (allergie)', 'Enfumoir pour calmer les abeilles', 'Eviter les parfums et couleurs sombres']),
      r('api-tms', 'TMS (port de hausses)', 'Douleurs dorsales par port de hausses de miel (20-35 kg)', 'api-rucher', ['Levee de hausse pleine', 'Chargement/dechargement ruches (transhumance)', 'Position penchee pour visite'], 3, 3, ['Diable'], ['Leve-hausse mecanique', 'Chariot rucher pour deplacements', 'Limitation poids par hausse', 'Formation gestes et postures']),
      r('api-chimique', 'Risque chimique (acides organiques, varroa)', 'Exposition aux traitements anti-varroa (acide oxalique, acide formique)', 'api-rucher', ['Traitement acide oxalique (irritant)', 'Traitement acide formique (corrosif)', 'Manipulation de cire d\'abeille fondue'], 2, 3, ['Gants'], ['Gants nitrile pour traitement acide', 'Lunettes de protection', 'Dosage precis selon protocole', 'FDS des produits accessibles']),
      r('api-routier', 'Risque routier (transhumance)', 'Accident lors de la transhumance nocturne avec remorque chargee', 'api-transport', ['Transport de nuit (abeilles calmes)', 'Remorque chargee de ruches', 'Routes de montagne'], 3, 2, ['Vehicule entretenu'], ['Arrimage conforme des ruches', 'Conduite adaptee (charge lourde)', 'Eclairage remorque conforme', 'Pause si fatigue']),
      r('api-chute', 'Chute (terrain, rucher)', 'Glissade sur terrain de rucher (herbe, pente)', 'api-rucher', ['Terrain en pente', 'Herbe mouilee', 'Port de hausse (visibilite reduite)', 'Terrain accidente'], 2, 3, ['Bottes'], ['Bottes montantes antiderapantes', 'Entretien du terrain autour des ruches', 'Eclairage si travail au crepuscule']),
      r('api-isolement', 'Isolement (rucher isole)', 'Absence de secours rapide en cas de choc anaphylactique en rucher isole', 'api-rucher', ['Rucher eloigne', 'Zone sans reseau', 'Travail seul'], 3, 2, ['Telephone'], ['Ne jamais visiter seul un rucher en debut de saison', 'Telephone charge avec localisation', 'Kit urgence adrenaline toujours porte', 'Prevenir un proche de la visite']),
    ],
  },

  // ── Aquaculture ───────────────────────────────────────────────
  {
    metierSlug: 'aquaculture', label: 'Aquaculture / Pisciculture', category: 'agriculture',
    nafCodes: ['03.21Z', '03.22Z'], idcc: '7024',
    legalReferences: ['Art. R717-1 (MSA)', 'Reglement CE 853/2004 (hygiene)', 'Tableau RG 57 (TMS)'],
    workUnits: [
      wu('aqua-bassins', 'Bassins / etangs', 'Alimentation, surveillance, peche des poissons', '1-3'),
      wu('aqua-ecloserie', 'Ecloserie / nurserie', 'Reproduction, alevinage, tri', '1-2'),
      wu('aqua-traitement', 'Salle de traitement / conditionnement', 'Abattage, filetage, conditionnement', '1-3'),
      wu('aqua-technique', 'Local technique', 'Pompes, filtration, oxygenation, analyses d\'eau', '1'),
    ],
    risks: [
      r('aqua-noyade', 'Noyade / chute dans bassin', 'Noyade par chute dans un bassin ou etang', 'aqua-bassins', ['Peche dans le bassin', 'Nettoyage de bassin', 'Sol glissant au bord', 'Travail seul pres de l\'eau'], 4, 2, ['Gilet de sauvetage disponible'], ['Gilet de sauvetage porte pres des bassins', 'Barrieres autour des bassins profonds', 'Travail en binome obligatoire', 'Bouee de sauvetage a chaque bassin', 'Formation PSC1']),
      r('aqua-tms', 'TMS (manutention, postures)', 'Douleurs par port de seaux, filets et position penchee', 'aqua-bassins', ['Port de seaux de nourriture', 'Manipulation de filets charges', 'Tri de poissons (penche)', 'Conditionnement repetitif'], 3, 3, ['Chariot'], ['Distributeur automatique de nourriture', 'Table de tri a hauteur', 'Chariot pour seaux', 'Alternance des taches']),
      r('aqua-biologique', 'Risque biologique (zoonoses aquatiques)', 'Infection par bacteries aquatiques (erysipeloide, vibrio)', 'aqua-traitement', ['Coupure lors du filetage (infection)', 'Contact eau contaminee (plaie ouverte)', 'Manipulation poissons malades'], 3, 2, ['Gants etanches'], ['Gants etanches EN 374 pour manipulation', 'Desinfection immediate des coupures', 'Vaccination tetanos a jour', 'Eau propre pour lavage des mains']),
      r('aqua-chimique', 'Risque chimique (traitements, desinfection)', 'Exposition aux produits de traitement de l\'eau et desinfectants', 'aqua-technique', ['Manipulation de formol (antiparasitaire)', 'Chlore pour desinfection', 'Produits anti-algues', 'Oxygene liquide'], 3, 2, ['Gants', 'Lunettes'], ['Masque pour manipulation formol', 'Gants nitrile', 'Lunettes de protection', 'Dosage automatise des produits', 'FDS accessibles']),
      r('aqua-froid', 'Froid et humidite', 'Exposition au froid et a l\'humidite permanente', 'aqua-bassins', ['Travail exterieur en hiver', 'Manipulation d\'eau froide', 'Environnement humide permanent'], 2, 4, ['Vetements impermeables'], ['Combinaison etanche thermique', 'Gants etanches isoles', 'Bottes fourrees antiderapantes', 'Local chauffee pour pauses']),
      r('aqua-electrique', 'Risque electrique (pompes en milieu humide)', 'Electrisation par pompes et equipements electriques en milieu humide', 'aqua-technique', ['Pompes immergees', 'Branchements electriques au bord de l\'eau', 'Oxygenateurs electriques'], 3, 2, ['Differentiel 30mA'], ['Differentiel 30mA sur tous les circuits', 'Equipements IP67 en zone humide', 'Verification electrique annuelle', 'Interdiction intervention sur pompe immergee sans coupure']),
    ],
  },

  // ── Centre equin ──────────────────────────────────────────────
  {
    metierSlug: 'centre-equin', label: 'Elevage equin / Haras', category: 'agriculture',
    nafCodes: ['01.43Z'], idcc: '7024',
    legalReferences: ['Art. R717-1 (MSA)', 'Tableau RG 57 (TMS)', 'Code rural art. L214-1 (bien-etre animal)'],
    workUnits: [
      wu('equi-ecurie', 'Ecurie / boxes', 'Soins quotidiens, pansage, alimentation', '2-6'),
      wu('equi-manege', 'Manege / carriere', 'Travail des chevaux, debourrage', '1-3'),
      wu('equi-paturage', 'Paturages / paddocks', 'Mise au pre, surveillance, clotures', '1-2'),
      wu('equi-stockage', 'Stockage fourrage / sellerie', 'Foin, granules, materiels d\'equitation', '1'),
    ],
    risks: [
      r('equi-chute-cheval', 'Chute de cheval', 'Chute du cavalier lors du debourrage, travail monte ou manipulation', 'equi-manege', ['Debourrage (cheval imprevisible)', 'Cheval qui se cabre ou rue', 'Terrain glissant dans la carriere', 'Obstacle mal saute'], 4, 3, ['Bombe d\'equitation'], ['Bombe EN 1384 obligatoire', 'Gilet de protection dorsale', 'Sol amorti dans le manege', 'Debourrage progressif et methodique', 'Presence d\'une tierce personne pour debourrage']),
      r('equi-ecrasement', 'Ecrasement / coup de pied', 'Ecrasement par le poids du cheval (400-600 kg) ou coup de pied', 'equi-ecurie', ['Pansage cote arriere', 'Ferrure (sous le cheval)', 'Cheval panique dans le box', 'Soins veterinaires (contention)'], 4, 3, ['Bottes avec coque'], ['Bottes de securite avec coque acier', 'Approche par l\'epaule (jamais par l\'arriere)', 'Attache au mur avec anneau de securite', 'Couloir de contention pour soins', 'Formation ethologie equine']),
      r('equi-tms', 'TMS (curage, port de selles)', 'Douleurs dorsales par curage des boxes et port de materiel lourd', 'equi-ecurie', ['Curage quotidien des boxes (fourche)', 'Port de selles (10-15 kg)', 'Port de sacs de granules (25 kg)', 'Deplacement de bottes de foin'], 3, 4, ['Fourche ergonomique'], ['Pailleuse mecanique', 'Chariot porte-selle', 'Brouette ou chariot electrique pour curage', 'Sacs d\'aliment < 20 kg', 'Tapis roulant pour foin']),
      r('equi-zoonose', 'Zoonoses (dermatophytose, morve)', 'Contamination par champignons cutanes ou agents pathogenes equins', 'equi-ecurie', ['Contact peau cheval infecte (teigne)', 'Manipulation fumier', 'Morsure de tique en paturage'], 2, 3, ['Gants'], ['Gants pour soins cutanes', 'Hygiene des mains apres chaque cheval', 'Desinfection des brosses et materiel', 'Vaccination tetanos a jour']),
      r('equi-allergie', 'Allergie (poils, poussieres foin)', 'Affections respiratoires par poussieres de foin, paille et poils', 'equi-stockage', ['Distribution du foin (poussiere)', 'Paillage des boxes', 'Curage (poussiere)', 'Poils en saison de mue'], 2, 3, ['Masque papier'], ['Foin en filet (reduction poussiere)', 'Masque FFP2 pour manipulation foin', 'Stockage foin dans batiment separe', 'Aspiration poussiere reguliere']),
      r('equi-morsure', 'Morsure de cheval', 'Blessure par morsure de cheval nerveux ou agressif', 'equi-ecurie', ['Distribution de nourriture (gourmandise)', 'Cheval dominant agressif', 'Soins douloureux', 'Etalon nerveux'], 2, 3, ['Contention adaptee'], ['Muserolle si cheval mordeur', 'Friandises donnees main a plat', 'Identification des chevaux agressifs', 'Procedure specifique pour les etalons']),
    ],
  },
];
