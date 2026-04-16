// BUSINESS RULE [CDC-2.4]: Unites de travail types par metier
// Pre-remplies depuis le code NAF/metier, ajustables par l'utilisateur

export interface WorkUnitTemplate {
  id: string;
  metierSlug: string;
  name: string;
  description: string;
  typicalHeadcount: string;
  associatedRiskIds: string[];
  typicalEquipment: string[];
  typicalPPE: string[];
  sourceType: 'naf_template' | 'pappers_establishment' | 'user_custom';
}

// BUSINESS RULE [CDC-2.4]: Templates d'UT par metier
export const WORK_UNIT_TEMPLATES: Record<string, Omit<WorkUnitTemplate, 'id' | 'sourceType'>[]> = {
  'btp-general': [
    { metierSlug: 'btp-general', name: 'Chantier gros oeuvre', description: 'Zone principale de construction (fondations, murs, dalles)', typicalHeadcount: '4-15', associatedRiskIds: ['btp-chute-hauteur', 'btp-ensevelissement', 'btp-manutention', 'btp-machines', 'btp-bruit'], typicalEquipment: ['Grue', 'Betonniere', 'Echafaudage'], typicalPPE: ['Casque EN 397', 'Chaussures securite EN 20345 S3', 'Gilet EN 20471'] },
    { metierSlug: 'btp-general', name: 'Chantier second oeuvre', description: 'Travaux de finition (electricite, plomberie, peinture)', typicalHeadcount: '2-8', associatedRiskIds: ['btp-chute-hauteur', 'btp-chimique', 'btp-poussieres'], typicalEquipment: ['Escabeau', 'Outillage electro', 'Outillage plomberie'], typicalPPE: ['Casque EN 397', 'Lunettes EN 166', 'Gants EN 388'] },
    { metierSlug: 'btp-general', name: 'Zone stockage materiaux', description: 'Stockage materiaux, outillage, produits dangereux', typicalHeadcount: '1-3', associatedRiskIds: ['btp-manutention', 'btp-chimique'], typicalEquipment: ['Rayonnages', 'Transpalette'], typicalPPE: ['Gants manutention', 'Chaussures securite'] },
    { metierSlug: 'btp-general', name: 'Zone demolition / desamiantage', description: 'Zone de demolition ou intervention sur materiaux amiantiferes', typicalHeadcount: '2-6', associatedRiskIds: ['btp-ensevelissement', 'btp-poussieres', 'btp-bruit', 'btp-machines'], typicalEquipment: ['BRH', 'Aspirateur HEPA', 'Sas decontamination'], typicalPPE: ['Combinaison amiante', 'Masque FFP3', 'Sur-chaussures'] },
    { metierSlug: 'btp-general', name: 'Bureau / base de vie', description: 'Bureau de chantier, vestiaires, refectoire', typicalHeadcount: '1-3', associatedRiskIds: [], typicalEquipment: ['Ordinateur', 'Telephone'], typicalPPE: [] },
    { metierSlug: 'btp-general', name: 'Vehicules / deplacements', description: 'Conduite entre chantiers, livraisons', typicalHeadcount: '1-4', associatedRiskIds: ['btp-vibrations'], typicalEquipment: ['Camionnette', 'Camion benne'], typicalPPE: ['Gilet EN 20471'] },
  ],
  'restaurant': [
    { metierSlug: 'restaurant', name: 'Cuisine', description: 'Zone de preparation et cuisson des aliments', typicalHeadcount: '2-8', associatedRiskIds: ['rest-brulure', 'rest-coupure', 'rest-chute', 'rest-chimique', 'rest-incendie-cuisine'], typicalEquipment: ['Four', 'Friteuse', 'Couteaux', 'Trancheuse'], typicalPPE: ['Gants anti-chaleur EN 407', 'Chaussures antiderapantes EN 20345', 'Tablier'] },
    { metierSlug: 'restaurant', name: 'Salle de restaurant', description: 'Zone de service et accueil des clients', typicalHeadcount: '2-6', associatedRiskIds: ['rest-chute', 'rest-manutention', 'rest-agression'], typicalEquipment: ['Plateau', 'Caisse enregistreuse'], typicalPPE: ['Chaussures fermees antiderapantes'] },
    { metierSlug: 'restaurant', name: 'Bar / Comptoir', description: 'Zone de preparation et service des boissons', typicalHeadcount: '1-2', associatedRiskIds: ['rest-chute', 'rest-coupure'], typicalEquipment: ['Machine a cafe', 'Tireuse', 'Verres'], typicalPPE: ['Chaussures antiderapantes'] },
    { metierSlug: 'restaurant', name: 'Plonge', description: 'Zone de nettoyage de la vaisselle', typicalHeadcount: '1-2', associatedRiskIds: ['rest-chimique', 'rest-chute', 'rest-bruit'], typicalEquipment: ['Lave-vaisselle industriel'], typicalPPE: ['Gants etanches', 'Tablier impermeable'] },
    { metierSlug: 'restaurant', name: 'Reserve / Stockage', description: 'Stockage denrees, chambre froide, reserve seche', typicalHeadcount: '1-2', associatedRiskIds: ['rest-manutention'], typicalEquipment: ['Rayonnages', 'Chambre froide'], typicalPPE: ['Vetements thermiques (chambre froide)'] },
    { metierSlug: 'restaurant', name: 'Terrasse', description: 'Espace exterieur de service', typicalHeadcount: '1-3', associatedRiskIds: ['rest-chute', 'rest-agression'], typicalEquipment: ['Mobilier exterieur'], typicalPPE: [] },
  ],
  'coiffure': [
    { metierSlug: 'coiffure', name: 'Espace coupe', description: 'Postes de coiffage et coupe', typicalHeadcount: '2-4', associatedRiskIds: ['coif-tms', 'coif-coupure', 'coif-electrique-outils'], typicalEquipment: ['Fauteuil coiffure', 'Ciseaux', 'Tondeuse'], typicalPPE: [] },
    { metierSlug: 'coiffure', name: 'Espace coloration / technique', description: 'Zone de preparation et application des colorations', typicalHeadcount: '1-3', associatedRiskIds: ['coif-chimique', 'coif-dermatose'], typicalEquipment: ['Bols coloration', 'Papier meches', 'Casque'], typicalPPE: ['Gants nitrile EN 374', 'Tablier'] },
    { metierSlug: 'coiffure', name: 'Bac a shampooing', description: 'Espace lavage des cheveux', typicalHeadcount: '1-2', associatedRiskIds: ['coif-posture', 'coif-brulure'], typicalEquipment: ['Bac ergonomique', 'Douchette'], typicalPPE: ['Tablier impermeable'] },
    { metierSlug: 'coiffure', name: 'Accueil / caisse', description: 'Reception clients et encaissement', typicalHeadcount: '1', associatedRiskIds: ['coif-psycho'], typicalEquipment: ['Caisse', 'Ordinateur'], typicalPPE: [] },
    { metierSlug: 'coiffure', name: 'Reserve produits', description: 'Stockage des produits capillaires', typicalHeadcount: '0-1', associatedRiskIds: ['coif-chimique'], typicalEquipment: ['Etageres'], typicalPPE: ['Gants manipulation'] },
  ],
  'commerce': [
    { metierSlug: 'commerce', name: 'Surface de vente', description: 'Zone de vente et presentation des produits', typicalHeadcount: '2-8', associatedRiskIds: ['com-manutention', 'com-agression', 'com-stress'], typicalEquipment: ['Rayonnages', 'Echelle'], typicalPPE: [] },
    { metierSlug: 'commerce', name: 'Caisse / Accueil', description: 'Encaissement et accueil clients', typicalHeadcount: '1-4', associatedRiskIds: ['com-tms-caisse', 'com-agression', 'com-stress'], typicalEquipment: ['Caisse', 'Scanner'], typicalPPE: [] },
    { metierSlug: 'commerce', name: 'Reserve / Stockage', description: 'Stockage marchandises, reception livraisons', typicalHeadcount: '1-3', associatedRiskIds: ['com-manutention', 'com-chute-reserve', 'com-froid'], typicalEquipment: ['Transpalette', 'Diable', 'Escabeau'], typicalPPE: ['Chaussures securite', 'Gants manutention'] },
    { metierSlug: 'commerce', name: 'Bureau / Administration', description: 'Gestion administrative et comptable', typicalHeadcount: '1-2', associatedRiskIds: ['com-ergonomie'], typicalEquipment: ['Ordinateur'], typicalPPE: [] },
    { metierSlug: 'commerce', name: 'Livraison / Quai', description: 'Zone de reception et expedition', typicalHeadcount: '1-2', associatedRiskIds: ['com-manutention', 'com-circulation'], typicalEquipment: ['Quai', 'Transpalette'], typicalPPE: ['Gilet EN 20471', 'Chaussures securite'] },
    { metierSlug: 'commerce', name: 'Vitrine / Exterieur', description: 'Amenagement vitrine et abords', typicalHeadcount: '0-1', associatedRiskIds: [], typicalEquipment: ['Escabeau'], typicalPPE: [] },
  ],
  'boulangerie': [
    { metierSlug: 'boulangerie', name: 'Fournil', description: 'Zone de petrissage, faconnage et cuisson du pain', typicalHeadcount: '1-4', associatedRiskIds: ['boul-farine', 'boul-brulure', 'boul-nuit', 'boul-manutention', 'boul-atex', 'boul-machines', 'boul-chaleur'], typicalEquipment: ['Petrin', 'Four', 'Diviseuse', 'Chambre de pousse'], typicalPPE: ['Gants anti-chaleur EN 407', 'Masque FFP2 EN 149', 'Chaussures antiderapantes'] },
    { metierSlug: 'boulangerie', name: 'Boutique / Vente', description: 'Zone de vente au public', typicalHeadcount: '1-3', associatedRiskIds: ['boul-sol'], typicalEquipment: ['Caisse', 'Trancheuse a pain'], typicalPPE: [] },
    { metierSlug: 'boulangerie', name: 'Laboratoire patisserie', description: 'Zone de preparation patissiere', typicalHeadcount: '1-2', associatedRiskIds: ['boul-farine', 'boul-machines', 'boul-brulure'], typicalEquipment: ['Batteur', 'Laminoir', 'Four'], typicalPPE: ['Gants anti-chaleur', 'Charlotte'] },
    { metierSlug: 'boulangerie', name: 'Reserve / Silo a farine', description: 'Stockage farine et matieres premieres', typicalHeadcount: '0-1', associatedRiskIds: ['boul-farine', 'boul-atex', 'boul-manutention'], typicalEquipment: ['Silo', 'Rayonnages'], typicalPPE: ['Masque FFP2'] },
    { metierSlug: 'boulangerie', name: 'Zone livraison', description: 'Reception matieres premieres, livraison clients', typicalHeadcount: '0-1', associatedRiskIds: ['boul-manutention'], typicalEquipment: ['Diable'], typicalPPE: ['Chaussures securite'] },
    { metierSlug: 'boulangerie', name: 'Local technique / Nettoyage', description: 'Nettoyage des equipements et locaux', typicalHeadcount: '0-1', associatedRiskIds: ['boul-sol'], typicalEquipment: ['Nettoyeur HP'], typicalPPE: ['Gants menage', 'Tablier'] },
  ],
  'garage-auto': [
    { metierSlug: 'garage-auto', name: 'Atelier mecanique', description: 'Reparation et entretien des vehicules', typicalHeadcount: '2-6', associatedRiskIds: ['gar-chimique', 'gar-ecrasement', 'gar-bruit', 'gar-manutention', 'gar-postures'], typicalEquipment: ['Pont elevateur', 'Cric', 'Compresseur'], typicalPPE: ['Chaussures securite EN 20345 S3', 'Gants nitrile EN 374', 'Lunettes EN 166'] },
    { metierSlug: 'garage-auto', name: 'Carrosserie-peinture', description: 'Travaux de carrosserie et peinture', typicalHeadcount: '1-3', associatedRiskIds: ['gar-peinture', 'gar-chimique', 'gar-bruit', 'gar-incendie-atelier'], typicalEquipment: ['Cabine peinture', 'Ponceuse', 'Compresseur'], typicalPPE: ['Masque A2P3', 'Combinaison jetable', 'Gants nitrile'] },
    { metierSlug: 'garage-auto', name: 'Reception / accueil', description: 'Accueil client et devis', typicalHeadcount: '1', associatedRiskIds: [], typicalEquipment: ['Ordinateur', 'Telephone'], typicalPPE: [] },
    { metierSlug: 'garage-auto', name: 'Magasin pieces', description: 'Stockage et distribution pieces detachees', typicalHeadcount: '1', associatedRiskIds: ['gar-manutention'], typicalEquipment: ['Etageres', 'Transpalette'], typicalPPE: ['Gants manutention'] },
    { metierSlug: 'garage-auto', name: 'Parking / aire lavage', description: 'Stationnement vehicules et nettoyage', typicalHeadcount: '0-1', associatedRiskIds: [], typicalEquipment: ['Nettoyeur HP'], typicalPPE: ['Chaussures antiderapantes'] },
    { metierSlug: 'garage-auto', name: 'Bureau / administration', description: 'Gestion administrative', typicalHeadcount: '1', associatedRiskIds: [], typicalEquipment: ['Ordinateur'], typicalPPE: [] },
  ],
  'aide-domicile': [
    { metierSlug: 'aide-domicile', name: 'Domicile personne agee', description: 'Intervention au domicile de personnes agees', typicalHeadcount: '5-20', associatedRiskIds: ['ad-manutention', 'ad-biologique', 'ad-chimique-menage', 'ad-chute-domicile', 'ad-agression', 'ad-tms'], typicalEquipment: ['Leve-personne', 'Produits menagers'], typicalPPE: ['Gants usage unique', 'Chaussures fermees'] },
    { metierSlug: 'aide-domicile', name: 'Domicile handicap', description: 'Intervention aupres de personnes en situation de handicap', typicalHeadcount: '2-8', associatedRiskIds: ['ad-manutention', 'ad-biologique', 'ad-agression'], typicalEquipment: ['Fauteuil roulant', 'Lit medicalise'], typicalPPE: ['Gants usage unique'] },
    { metierSlug: 'aide-domicile', name: 'Trajet entre beneficiaires', description: 'Deplacements en vehicule entre les domiciles', typicalHeadcount: '5-20', associatedRiskIds: ['ad-routier', 'ad-psycho'], typicalEquipment: ['Vehicule personnel'], typicalPPE: [] },
    { metierSlug: 'aide-domicile', name: 'Bureau administratif', description: 'Coordination et gestion des plannings', typicalHeadcount: '1-3', associatedRiskIds: [], typicalEquipment: ['Ordinateur', 'Telephone'], typicalPPE: [] },
  ],
  'peintre-batiment': [
    { metierSlug: 'peintre-batiment', name: 'Chantier interieur', description: 'Peinture murs, plafonds, boiseries en interieur', typicalHeadcount: '2-4', associatedRiskIds: ['pb-chimique', 'pb-tms', 'pb-glissade'], typicalEquipment: ['Rouleau', 'Pistolet', 'Ponceuse'], typicalPPE: ['Masque A2', 'Gants nitrile', 'Lunettes EN 166'] },
    { metierSlug: 'peintre-batiment', name: 'Chantier facade/exterieur', description: 'Ravalement, peinture facade sur echafaudage', typicalHeadcount: '2-4', associatedRiskIds: ['pb-chute-hauteur', 'pb-chimique'], typicalEquipment: ['Echafaudage', 'Nacelle', 'Pistolet airless'], typicalPPE: ['Harnais EN 361', 'Masque A2', 'Casque EN 397'] },
    { metierSlug: 'peintre-batiment', name: 'Preparation / ponçage', description: 'Ponçage, decapage, enduit, rebouchage', typicalHeadcount: '1-3', associatedRiskIds: ['pb-poussieres', 'pb-chimique'], typicalEquipment: ['Ponceuse', 'Grattoir', 'Decapeur'], typicalPPE: ['Masque FFP2/FFP3', 'Lunettes EN 166'] },
    { metierSlug: 'peintre-batiment', name: 'Atelier / stockage', description: 'Preparation peintures, stockage produits', typicalHeadcount: '1', associatedRiskIds: ['pb-chimique'], typicalEquipment: ['Melangeur', 'Etageres'], typicalPPE: ['Gants nitrile'] },
    { metierSlug: 'peintre-batiment', name: 'Vehicule / deplacements', description: 'Deplacements inter-chantiers', typicalHeadcount: '1-2', associatedRiskIds: ['pb-routier'], typicalEquipment: ['Vehicule utilitaire'], typicalPPE: ['Gilet EN 20471'] },
  ],
  'menuisier': [
    { metierSlug: 'menuisier', name: 'Atelier machines', description: 'Debit, usinage, assemblage sur machines fixes', typicalHeadcount: '2-5', associatedRiskIds: ['men-machines', 'men-poussieres', 'men-bruit', 'men-projection'], typicalEquipment: ['Scie circulaire', 'Toupie', 'Raboteuse'], typicalPPE: ['Casque antibruit EN 352', 'Lunettes EN 166', 'Masque FFP2'] },
    { metierSlug: 'menuisier', name: 'Poste etabli / montage', description: 'Assemblage, finition, collage a l\'etabli', typicalHeadcount: '1-3', associatedRiskIds: ['men-tms', 'men-chimique'], typicalEquipment: ['Etabli', 'Serre-joints', 'Visseuse'], typicalPPE: ['Gants'] },
    { metierSlug: 'menuisier', name: 'Chantier pose', description: 'Pose de menuiseries sur chantier', typicalHeadcount: '1-3', associatedRiskIds: ['men-chute-pose'], typicalEquipment: ['Escabeau', 'Outillage electroportatif'], typicalPPE: ['Casque EN 397', 'Chaussures securite'] },
    { metierSlug: 'menuisier', name: 'Zone finition / vernissage', description: 'Application vernis, lasure, teinte', typicalHeadcount: '1-2', associatedRiskIds: ['men-chimique'], typicalEquipment: ['Pistolet', 'Cabine ventilee'], typicalPPE: ['Masque A2', 'Gants nitrile'] },
    { metierSlug: 'menuisier', name: 'Stockage bois / materiel', description: 'Stockage panneaux, bois massif', typicalHeadcount: '1', associatedRiskIds: ['men-tms', 'men-incendie'], typicalEquipment: ['Chariot', 'Rack'], typicalPPE: ['Gants manutention'] },
  ],
  'carreleur': [
    { metierSlug: 'carreleur', name: 'Zone de pose carrelage', description: 'Pose de carreaux au sol et mur, joints', typicalHeadcount: '1-3', associatedRiskIds: ['car-tms-genoux', 'car-chute', 'car-chimique'], typicalEquipment: ['Peigne', 'Maillet', 'Croisillons'], typicalPPE: ['Genouilleres EN 14404', 'Chaussures antiderapantes'] },
    { metierSlug: 'carreleur', name: 'Poste de decoupe', description: 'Decoupe carreaux avec carrelette, disqueuse, scie eau', typicalHeadcount: '1', associatedRiskIds: ['car-silice', 'car-coupure', 'car-bruit', 'car-vibrations'], typicalEquipment: ['Scie a eau', 'Disqueuse', 'Carrelette'], typicalPPE: ['Masque FFP3', 'Lunettes EN 166', 'Casque antibruit', 'Gants EN 388'] },
    { metierSlug: 'carreleur', name: 'Preparation support', description: 'Ragréage, chape, primaire, etancheite', typicalHeadcount: '1-2', associatedRiskIds: ['car-chimique'], typicalEquipment: ['Malaxeur', 'Regle de macon'], typicalPPE: ['Gants nitrile'] },
    { metierSlug: 'carreleur', name: 'Stockage materiaux', description: 'Stockage carreaux, mortier, colles', typicalHeadcount: '1', associatedRiskIds: ['car-manutention'], typicalEquipment: ['Diable', 'Chariot'], typicalPPE: ['Chaussures securite', 'Gants manutention'] },
  ],
  'macon': [
    { metierSlug: 'macon', name: 'Elevation murs / maconnerie', description: 'Construction murs parpaings, briques, pierre', typicalHeadcount: '2-6', associatedRiskIds: ['mac-dermatite', 'mac-manutention', 'mac-bruit', 'mac-vibrations', 'mac-intemperies'], typicalEquipment: ['Betonniere', 'Auge', 'Truelle'], typicalPPE: ['Casque EN 397', 'Gants maçon', 'Chaussures securite S3'] },
    { metierSlug: 'macon', name: 'Coffrage / ferraillage / coulage', description: 'Coffrage, pose armatures, coulage beton', typicalHeadcount: '2-4', associatedRiskIds: ['mac-ecrasement', 'mac-manutention'], typicalEquipment: ['Banches', 'Etais', 'Vibreur'], typicalPPE: ['Casque EN 397', 'Gants etanches', 'Bottes securite'] },
    { metierSlug: 'macon', name: 'Fondations / terrassement', description: 'Fouilles, semelles, dallages', typicalHeadcount: '2-4', associatedRiskIds: ['mac-ensevelissement'], typicalEquipment: ['Mini-pelle', 'Blindage'], typicalPPE: ['Casque EN 397', 'Gilet EN 20471'] },
    { metierSlug: 'macon', name: 'Echafaudage / travaux hauteur', description: 'Montage echafaudage, travaux en elevation', typicalHeadcount: '2-4', associatedRiskIds: ['mac-chute'], typicalEquipment: ['Echafaudage', 'Garde-corps'], typicalPPE: ['Harnais EN 361', 'Casque EN 397'] },
    { metierSlug: 'macon', name: 'Zone stockage / approvisionnement', description: 'Stockage materiaux, approvisionnement chantier', typicalHeadcount: '1-2', associatedRiskIds: ['mac-manutention'], typicalEquipment: ['Brouette', 'Monte-materiaux'], typicalPPE: ['Gants manutention'] },
  ],
  'couvreur': [
    { metierSlug: 'couvreur', name: 'Toiture / couverture', description: 'Travail sur toiture : depose, pose tuiles/ardoises, zinguerie', typicalHeadcount: '2-4', associatedRiskIds: ['couv-chute-toiture', 'couv-manutention', 'couv-brulure', 'couv-intemperies', 'couv-amiante', 'couv-poussieres'], typicalEquipment: ['Echelle de toit', 'Chalumeau', 'Monte-tuiles'], typicalPPE: ['Harnais EN 361', 'Casque EN 397', 'Chaussures antiderapantes'] },
    { metierSlug: 'couvreur', name: 'Charpente / structure', description: 'Acces et travail sur charpente bois ou metallique', typicalHeadcount: '1-3', associatedRiskIds: ['couv-chute-toiture'], typicalEquipment: ['Passerelle', 'Ligne de vie'], typicalPPE: ['Harnais EN 361'] },
    { metierSlug: 'couvreur', name: 'Echafaudage / acces', description: 'Echafaudage de pied, nacelle, echelle de toit', typicalHeadcount: '1-2', associatedRiskIds: ['couv-chute-echafaudage'], typicalEquipment: ['Echafaudage de pied'], typicalPPE: ['Casque EN 397'] },
    { metierSlug: 'couvreur', name: 'Zone sol / approvisionnement', description: 'Preparation materiaux, stockage, monte-charge', typicalHeadcount: '1-2', associatedRiskIds: ['couv-chute-objets'], typicalEquipment: ['Monte-tuiles electrique'], typicalPPE: ['Casque EN 397', 'Gilet EN 20471'] },
  ],
  'platrier': [
    { metierSlug: 'platrier', name: 'Pose plaques / cloisons', description: 'Montage cloisons seches, doublages, faux-plafonds', typicalHeadcount: '2-4', associatedRiskIds: ['pla-tms', 'pla-rps'], typicalEquipment: ['Leve-plaque', 'Visseuse sur perche'], typicalPPE: ['Gants EN 388'] },
    { metierSlug: 'platrier', name: 'Enduit / bandes / finition', description: 'Application enduit, bandes a joints, ponçage', typicalHeadcount: '1-3', associatedRiskIds: ['pla-poussieres', 'pla-chimique'], typicalEquipment: ['Ponceuse girafe', 'Couteau a enduire'], typicalPPE: ['Masque FFP2', 'Lunettes'] },
    { metierSlug: 'platrier', name: 'Decoupe / perçage', description: 'Decoupe plaques de platre, perçage fixations', typicalHeadcount: '1-2', associatedRiskIds: ['pla-coupure', 'pla-electrique'], typicalEquipment: ['Scie a platre', 'Cutter'], typicalPPE: ['Gants EN 388'] },
    { metierSlug: 'platrier', name: 'Travail en hauteur', description: 'Echafaudage roulant, nacelle pour faux-plafonds', typicalHeadcount: '1-2', associatedRiskIds: ['pla-chute-hauteur'], typicalEquipment: ['Echafaudage roulant', 'PIRL'], typicalPPE: ['Casque EN 397'] },
    { metierSlug: 'platrier', name: 'Stockage / manutention', description: 'Stockage plaques (28kg chaque), rails, visserie', typicalHeadcount: '1', associatedRiskIds: ['pla-manutention'], typicalEquipment: ['Chariot a plaques', 'Monte-charge'], typicalPPE: ['Gants manutention', 'Chaussures securite'] },
  ],
  'charpentier': [
    { metierSlug: 'charpentier', name: 'Atelier taille/assemblage', description: 'Taille, debit, assemblage de la charpente en atelier', typicalHeadcount: '2-4', associatedRiskIds: ['cha-machines', 'cha-poussieres', 'cha-bruit', 'cha-chimique'], typicalEquipment: ['Scie a ruban', 'Tronconneuse', 'Raboteuse'], typicalPPE: ['Casque antibruit EN 352', 'Lunettes EN 166', 'Masque FFP2'] },
    { metierSlug: 'charpentier', name: 'Levage / pose chantier', description: 'Levage et pose de la charpente sur le chantier', typicalHeadcount: '3-6', associatedRiskIds: ['cha-chute', 'cha-ecrasement', 'cha-manutention'], typicalEquipment: ['Grue', 'Elingues', 'Passerelle'], typicalPPE: ['Harnais EN 361', 'Casque EN 397', 'Gants'] },
    { metierSlug: 'charpentier', name: 'Structure en hauteur', description: 'Travail sur la structure de charpente en elevation', typicalHeadcount: '2-4', associatedRiskIds: ['cha-chute', 'cha-intemperies'], typicalEquipment: ['Ligne de vie', 'Filet de securite'], typicalPPE: ['Harnais EN 361', 'Casque EN 397'] },
    { metierSlug: 'charpentier', name: 'Stockage bois', description: 'Stockage des bois de charpente, panneaux', typicalHeadcount: '1', associatedRiskIds: ['cha-manutention'], typicalEquipment: ['Chariot', 'Rack'], typicalPPE: ['Gants manutention'] },
    { metierSlug: 'charpentier', name: 'Transport / livraison', description: 'Transport de bois par camion, livraison chantier', typicalHeadcount: '1-2', associatedRiskIds: [], typicalEquipment: ['Camion plateau'], typicalPPE: ['Gilet EN 20471'] },
  ],
  'chaudronnier': [
    { metierSlug: 'chaudronnier', name: 'Poste de soudure', description: 'Soudure MIG/MAG, TIG, arc, chalumeau', typicalHeadcount: '2-4', associatedRiskIds: ['chau-brulure', 'chau-fumees', 'chau-rayonnement', 'chau-electrique'], typicalEquipment: ['Poste a souder', 'Torche aspirante', 'Chalumeau'], typicalPPE: ['Cagoule soudeur', 'Tablier cuir', 'Gants soudeur EN 12477'] },
    { metierSlug: 'chaudronnier', name: 'Decoupe / meulage', description: 'Decoupe plasma, oxycoupage, meulage', typicalHeadcount: '1-3', associatedRiskIds: ['chau-bruit', 'chau-coupure'], typicalEquipment: ['Decoupeur plasma', 'Meuleuse', 'Tronconneuse'], typicalPPE: ['Casque antibruit EN 352', 'Lunettes EN 166', 'Gants EN 388'] },
    { metierSlug: 'chaudronnier', name: 'Assemblage / montage', description: 'Assemblage de structures metalliques, cintrage, pliage', typicalHeadcount: '2-4', associatedRiskIds: ['chau-manutention'], typicalEquipment: ['Plieuse', 'Cintreuse', 'Palan'], typicalPPE: ['Gants manutention', 'Chaussures securite S3'] },
    { metierSlug: 'chaudronnier', name: 'Chantier exterieur', description: 'Interventions de soudure et chaudronnerie sur site client', typicalHeadcount: '2-4', associatedRiskIds: ['chau-brulure', 'chau-fumees', 'chau-incendie'], typicalEquipment: ['Poste a souder mobile', 'Groupe electrogene'], typicalPPE: ['Cagoule soudeur', 'Tablier cuir', 'Permis de feu'] },
    { metierSlug: 'chaudronnier', name: 'Stockage / approvisionnement', description: 'Stockage toles, tubes, gaz de soudage', typicalHeadcount: '1', associatedRiskIds: ['chau-incendie', 'chau-manutention'], typicalEquipment: ['Rack a toles', 'Chariot bouteilles gaz'], typicalPPE: ['Gants manutention', 'Chaussures securite'] },
  ],
  'serrurier-metallier': [
    { metierSlug: 'serrurier-metallier', name: 'Atelier fabrication', description: 'Decoupe, soudure, assemblage metallerie', typicalHeadcount: '2-5', associatedRiskIds: ['ser-coupure', 'ser-projection'], typicalEquipment: ['Scie a ruban', 'Poinconneuse', 'Perceuse a colonne'], typicalPPE: ['Gants EN 388', 'Lunettes EN 166', 'Chaussures securite S3'] },
    { metierSlug: 'serrurier-metallier', name: 'Poste meulage / finition', description: 'Meulage, ponçage, ebavurage, peinture metallerie', typicalHeadcount: '1-3', associatedRiskIds: ['ser-bruit', 'ser-projection', 'ser-chimique'], typicalEquipment: ['Meuleuse', 'Ponceuse', 'Cabine peinture'], typicalPPE: ['Casque antibruit EN 352', 'Ecran facial', 'Masque A2'] },
    { metierSlug: 'serrurier-metallier', name: 'Chantier pose / depannage', description: 'Pose de menuiseries metalliques, serrures, garde-corps', typicalHeadcount: '1-3', associatedRiskIds: ['ser-chute-hauteur', 'ser-manutention'], typicalEquipment: ['Echafaudage roulant', 'Perceuse'], typicalPPE: ['Casque EN 397', 'Harnais'] },
    { metierSlug: 'serrurier-metallier', name: 'Poste de soudure', description: 'Soudure MIG, TIG, arc sur acier, inox, aluminium', typicalHeadcount: '1-3', associatedRiskIds: ['ser-fumees'], typicalEquipment: ['Poste a souder', 'Torche aspirante'], typicalPPE: ['Cagoule soudeur', 'Tablier cuir'] },
  ],
  'terrassement-demolition': [
    { metierSlug: 'terrassement-demolition', name: 'Fouilles / terrassement', description: 'Creusement de tranchees, fouilles, terrassements', typicalHeadcount: '2-6', associatedRiskIds: ['terr-ensevelissement'], typicalEquipment: ['Blindages', 'Pelle mecanique'], typicalPPE: ['Casque EN 397', 'Gilet EN 20471', 'Chaussures securite S3'] },
    { metierSlug: 'terrassement-demolition', name: 'Demolition structures', description: 'Demolition de batiments, murs, dalles', typicalHeadcount: '2-6', associatedRiskIds: ['terr-chute-objets', 'terr-poussieres', 'terr-bruit'], typicalEquipment: ['BRH', 'Pince de demolition'], typicalPPE: ['Casque EN 397', 'Masque FFP3', 'Casque antibruit'] },
    { metierSlug: 'terrassement-demolition', name: 'Conduite engins', description: 'Pelle mecanique, mini-pelle, chargeuse, camion benne', typicalHeadcount: '1-3', associatedRiskIds: ['terr-ecrasement-engin', 'terr-vibrations', 'terr-routier'], typicalEquipment: ['Pelle mecanique', 'Chargeuse', 'Camion benne'], typicalPPE: ['Siege suspendu', 'Casque EN 397'] },
    { metierSlug: 'terrassement-demolition', name: 'Zone amiante / desamiantage', description: 'Intervention sur materiaux amiantiferes', typicalHeadcount: '2-4', associatedRiskIds: ['terr-amiante'], typicalEquipment: ['Sas decontamination', 'Aspirateur HEPA'], typicalPPE: ['Masque TM3P', 'Combinaison amiante', 'Sur-chaussures'] },
    { metierSlug: 'terrassement-demolition', name: 'Zone de stockage / tri', description: 'Tri et stockage des materiaux de demolition', typicalHeadcount: '1-2', associatedRiskIds: ['terr-poussieres'], typicalEquipment: ['Bennes', 'Concasseur'], typicalPPE: ['Gants manutention', 'Masque FFP2'] },
  ],
  'construction-routes': [
    { metierSlug: 'construction-routes', name: 'Chaussee / voirie', description: 'Mise en oeuvre enrobes, compactage, revetements', typicalHeadcount: '4-10', associatedRiskIds: ['route-circulation', 'route-bitume', 'route-chimique', 'route-uv'], typicalEquipment: ['Finisseur', 'Compacteur', 'Repandeur'], typicalPPE: ['Gilet EN 20471 classe 3', 'Gants cuir EN 407', 'Chaussures securite S3'] },
    { metierSlug: 'construction-routes', name: 'Signalisation / balisage', description: 'Pose de signalisation temporaire et definitive', typicalHeadcount: '1-3', associatedRiskIds: ['route-circulation'], typicalEquipment: ['Panneaux', 'Cones', 'Feux tricolores'], typicalPPE: ['Gilet EN 20471 classe 3'] },
    { metierSlug: 'construction-routes', name: 'Terrassement routier', description: 'Preparation de la plateforme, decaissement, remblai', typicalHeadcount: '3-8', associatedRiskIds: ['route-bruit', 'route-manutention'], typicalEquipment: ['Pelle mecanique', 'Chargeuse'], typicalPPE: ['Casque EN 397', 'Casque antibruit'] },
    { metierSlug: 'construction-routes', name: 'Engins / materiels', description: 'Conduite finisseur, compacteur, repandeur de liant', typicalHeadcount: '2-4', associatedRiskIds: ['route-ecrasement-engin', 'route-vibrations'], typicalEquipment: ['Finisseur', 'Compacteur'], typicalPPE: ['Siege suspendu'] },
  ],
  'solier-moquettiste': [
    { metierSlug: 'solier-moquettiste', name: 'Zone de pose', description: 'Pose de revetements souples (moquette, PVC, lino, parquet colle)', typicalHeadcount: '1-4', associatedRiskIds: ['sol-chimique', 'sol-tms-genoux', 'sol-glissade'], typicalEquipment: ['Rouleau de maroufle', 'Araseur'], typicalPPE: ['Genouilleres EN 14404', 'Masque A2', 'Gants nitrile'] },
    { metierSlug: 'solier-moquettiste', name: 'Preparation support', description: 'Ragréage, primaire, soudure de les', typicalHeadcount: '1-3', associatedRiskIds: ['sol-poussieres', 'sol-chimique'], typicalEquipment: ['Ponceuse', 'Malaxeur', 'Pistolet soudure'], typicalPPE: ['Masque FFP2', 'Gants'] },
    { metierSlug: 'solier-moquettiste', name: 'Poste de decoupe', description: 'Decoupe de revetements au cutter, outils speciaux', typicalHeadcount: '1-2', associatedRiskIds: ['sol-coupure'], typicalEquipment: ['Cutter', 'Araseur', 'Regle'], typicalPPE: ['Gants EN 388 fins'] },
    { metierSlug: 'solier-moquettiste', name: 'Stockage rouleaux', description: 'Stockage rouleaux (30-50 kg), colles, ragréages', typicalHeadcount: '1', associatedRiskIds: ['sol-manutention'], typicalEquipment: ['Chariot porte-rouleaux'], typicalPPE: ['Gants manutention', 'Chaussures securite'] },
  ],
  'poseur-menuiseries-ext': [
    { metierSlug: 'poseur-menuiseries-ext', name: 'Pose fenetres / portes', description: 'Depose et pose de fenetres, portes, baies vitrees, volets', typicalHeadcount: '2-4', associatedRiskIds: ['pmx-coupure-verre', 'pmx-poussieres', 'pmx-chimique', 'pmx-electrique'], typicalEquipment: ['Visseuse', 'Scie a onglet', 'Perforateur'], typicalPPE: ['Gants EN 388', 'Lunettes EN 166'] },
    { metierSlug: 'poseur-menuiseries-ext', name: 'Travail en hauteur', description: 'Intervention en facade avec echafaudage, nacelle', typicalHeadcount: '1-3', associatedRiskIds: ['pmx-chute-hauteur', 'pmx-chute-objet'], typicalEquipment: ['Echafaudage', 'Nacelle'], typicalPPE: ['Harnais EN 361', 'Casque EN 397'] },
    { metierSlug: 'poseur-menuiseries-ext', name: 'Atelier preparation', description: 'Preparation des menuiseries, pre-montage', typicalHeadcount: '1-2', associatedRiskIds: ['pmx-coupure-verre'], typicalEquipment: ['Etabli', 'Outillage'], typicalPPE: ['Gants EN 388'] },
    { metierSlug: 'poseur-menuiseries-ext', name: 'Stockage / manutention', description: 'Stockage fenetres, portes, vitrages', typicalHeadcount: '1', associatedRiskIds: ['pmx-manutention'], typicalEquipment: ['Ventouses', 'Chariot'], typicalPPE: ['Gants EN 388', 'Chaussures securite'] },
  ],
  'ascensoriste': [
    { metierSlug: 'ascensoriste', name: 'Gaine d\'ascenseur', description: 'Intervention dans la gaine : montage guides, contrepoids, cables', typicalHeadcount: '1-3', associatedRiskIds: ['asc-chute-gaine', 'asc-ecrasement'], typicalEquipment: ['Ligne de vie verticale', 'Harnais'], typicalPPE: ['Harnais EN 361', 'Casque EN 397', 'Lampe frontale'] },
    { metierSlug: 'ascensoriste', name: 'Machinerie / local technique', description: 'Intervention sur moteur, armoire de commande, treuil', typicalHeadcount: '1-2', associatedRiskIds: ['asc-electrocution', 'asc-bruit', 'asc-chute-plain-pied'], typicalEquipment: ['Outillage isole 1000V', 'VAT'], typicalPPE: ['Gants isolants', 'Ecran facial arc flash'] },
    { metierSlug: 'ascensoriste', name: 'Cabine / portes palieres', description: 'Montage, reglage et maintenance de la cabine et des portes', typicalHeadcount: '1-3', associatedRiskIds: ['asc-ecrasement', 'asc-manutention'], typicalEquipment: ['Cles de porte paliere', 'Jauges'], typicalPPE: ['Chaussures securite'] },
    { metierSlug: 'ascensoriste', name: 'Fosse d\'ascenseur', description: 'Intervention en fosse de cuvette (espace confine)', typicalHeadcount: '1-2', associatedRiskIds: ['asc-espace-confine'], typicalEquipment: ['Detecteur 4 gaz', 'Ventilation portable'], typicalPPE: ['Detecteur gaz', 'Casque EN 397'] },
    { metierSlug: 'ascensoriste', name: 'Vehicule / deplacements', description: 'Deplacements entre sites de maintenance', typicalHeadcount: '1', associatedRiskIds: ['asc-routier'], typicalEquipment: ['Vehicule equipe'], typicalPPE: ['Gilet EN 20471'] },
  ],
  'vitrier': [
    { metierSlug: 'vitrier', name: 'Atelier decoupe / faconnage', description: 'Decoupe, meulage, perçage de vitrages en atelier', typicalHeadcount: '1-3', associatedRiskIds: ['vit-coupure', 'vit-projection'], typicalEquipment: ['Table de decoupe', 'Meuleuse', 'Perceuse a verre'], typicalPPE: ['Gants EN 388 F', 'Manchettes', 'Lunettes EN 166'] },
    { metierSlug: 'vitrier', name: 'Chantier pose', description: 'Pose de vitrages, miroirs, verrieres sur chantier', typicalHeadcount: '1-3', associatedRiskIds: ['vit-coupure', 'vit-tms', 'vit-chimique'], typicalEquipment: ['Ventouses', 'Mastic'], typicalPPE: ['Gants EN 388', 'Chaussures securite'] },
    { metierSlug: 'vitrier', name: 'Travail en hauteur', description: 'Pose de vitrages en facade, verrieres de toiture', typicalHeadcount: '1-2', associatedRiskIds: ['vit-chute-hauteur', 'vit-chute-vitrage'], typicalEquipment: ['Nacelle', 'Echafaudage'], typicalPPE: ['Harnais EN 361', 'Casque EN 397'] },
    { metierSlug: 'vitrier', name: 'Stockage vitrages', description: 'Stockage des vitrages sur chevalets, rack', typicalHeadcount: '1', associatedRiskIds: ['vit-manutention'], typicalEquipment: ['Chevalets', 'Chariot a vitrages'], typicalPPE: ['Gants EN 388', 'Chaussures securite'] },
  ],
  'bureau': [
    { metierSlug: 'bureau', name: 'Bureau / poste de travail', description: 'Poste de travail informatique', typicalHeadcount: '2-20', associatedRiskIds: ['bur-ecran', 'bur-sedentarite', 'bur-tms-siege', 'bur-electrique-info'], typicalEquipment: ['Ordinateur', 'Ecran', 'Siege'], typicalPPE: [] },
    { metierSlug: 'bureau', name: 'Salle de reunion', description: 'Espaces de reunion et visioconference', typicalHeadcount: '2-15', associatedRiskIds: ['bur-qualite-air'], typicalEquipment: ['Table', 'Ecran', 'Visio'], typicalPPE: [] },
    { metierSlug: 'bureau', name: 'Accueil / reception', description: 'Zone d\'accueil des visiteurs', typicalHeadcount: '1-2', associatedRiskIds: ['bur-stress'], typicalEquipment: ['Banque accueil'], typicalPPE: [] },
    { metierSlug: 'bureau', name: 'Archives / stockage', description: 'Stockage documents et fournitures', typicalHeadcount: '0-1', associatedRiskIds: [], typicalEquipment: ['Rayonnages', 'Escabeau'], typicalPPE: [] },
  ],
};

// BUSINESS RULE [CDC-2.4]: Generer les UT pour un metier
export function getWorkUnitTemplates(metierSlug: string): WorkUnitTemplate[] {
  const templates = WORK_UNIT_TEMPLATES[metierSlug];
  if (!templates) return [];
  return templates.map((t) => ({
    ...t,
    id: crypto.randomUUID(),
    sourceType: 'naf_template' as const,
  }));
}

// BUSINESS RULE [CDC-2.4]: Generer les UT depuis les etablissements Pappers
export function createEstablishmentWorkUnit(establishment: { siret: string; nom: string; adresse: string }): WorkUnitTemplate {
  return {
    id: crypto.randomUUID(),
    metierSlug: 'custom',
    name: establishment.nom || `Etablissement ${establishment.siret}`,
    description: establishment.adresse,
    typicalHeadcount: 'Variable',
    associatedRiskIds: [],
    typicalEquipment: [],
    typicalPPE: [],
    sourceType: 'pappers_establishment',
  };
}
