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
  // ── E2: Alimentaire & Restauration ──────────────────────────────
  'restauration-rapide': [
    { metierSlug: 'restauration-rapide', name: 'Cuisine / friteuses / grill', description: 'Zone de cuisson rapide', typicalHeadcount: '2-6', associatedRiskIds: ['rr-brulure', 'rr-glissade', 'rr-incendie'], typicalEquipment: ['Friteuse', 'Grill', 'Micro-ondes'], typicalPPE: ['Gants EN 407', 'Chaussures antiderapantes'] },
    { metierSlug: 'restauration-rapide', name: 'Comptoir / caisse', description: 'Prise de commande, service', typicalHeadcount: '2-4', associatedRiskIds: ['rr-tms-cadence', 'rr-agression'], typicalEquipment: ['Caisse', 'Ecran commande'], typicalPPE: [] },
    { metierSlug: 'restauration-rapide', name: 'Reserve / chambre froide', description: 'Stockage denrees', typicalHeadcount: '1', associatedRiskIds: ['rr-froid'], typicalEquipment: ['Chambre froide', 'Congelateur'], typicalPPE: ['Gants thermiques'] },
    { metierSlug: 'restauration-rapide', name: 'Plonge / nettoyage', description: 'Nettoyage equipements', typicalHeadcount: '1-2', associatedRiskIds: ['rr-chimique'], typicalEquipment: ['Lave-vaisselle'], typicalPPE: ['Gants nitrile'] },
  ],
  'restauration-collective': [
    { metierSlug: 'restauration-collective', name: 'Cuisine centrale', description: 'Cuisson grands volumes', typicalHeadcount: '3-10', associatedRiskIds: ['rc-brulure', 'rc-chaleur'], typicalEquipment: ['Marmites', 'Fours mixtes', 'Sauteuses'], typicalPPE: ['Gants EN 407', 'Chaussures antiderapantes'] },
    { metierSlug: 'restauration-collective', name: 'Legumerie / preparation', description: 'Epluchage, decoupe', typicalHeadcount: '2-4', associatedRiskIds: ['rc-coupure', 'rc-biologique'], typicalEquipment: ['Coupe-legumes', 'Eplucheuse'], typicalPPE: ['Gants mailles inox'] },
    { metierSlug: 'restauration-collective', name: 'Plonge batterie', description: 'Lavage gros materiel', typicalHeadcount: '1-3', associatedRiskIds: ['rc-glissade', 'rc-bruit'], typicalEquipment: ['Lave-vaisselle tunnel'], typicalPPE: ['Tablier impermeable', 'Bouchons oreilles'] },
    { metierSlug: 'restauration-collective', name: 'Distribution / self', description: 'Service en ligne', typicalHeadcount: '2-4', associatedRiskIds: ['rc-rps'], typicalEquipment: ['Bain-marie', 'Vitrine froide'], typicalPPE: [] },
  ],
  'traiteur': [
    { metierSlug: 'traiteur', name: 'Laboratoire de production', description: 'Preparation plats', typicalHeadcount: '2-6', associatedRiskIds: ['tr-brulure', 'tr-coupure'], typicalEquipment: ['Fours', 'Plan de travail'], typicalPPE: ['Gants EN 407', 'Gants anti-coupure'] },
    { metierSlug: 'traiteur', name: 'Vehicule / livraison', description: 'Transport plats', typicalHeadcount: '1-3', associatedRiskIds: ['tr-routier', 'tr-chaine-froid'], typicalEquipment: ['Vehicule refrigere'], typicalPPE: [] },
    { metierSlug: 'traiteur', name: 'Site de reception', description: 'Installation et service', typicalHeadcount: '2-6', associatedRiskIds: ['tr-manutention', 'tr-glissade', 'tr-rps', 'tr-electrique'], typicalEquipment: ['Chafing dish', 'Tables'], typicalPPE: ['Chaussures antiderapantes'] },
    { metierSlug: 'traiteur', name: 'Stockage / chambre froide', description: 'Stockage matieres premieres', typicalHeadcount: '1', associatedRiskIds: [], typicalEquipment: ['Chambre froide'], typicalPPE: [] },
  ],
  'poissonnerie': [
    { metierSlug: 'poissonnerie', name: 'Etal de vente', description: 'Vente sur etal glace', typicalHeadcount: '1-3', associatedRiskIds: ['pois-glissade', 'pois-tms', 'pois-chimique'], typicalEquipment: ['Etal glace', 'Balance'], typicalPPE: ['Chaussures antiderapantes', 'Tablier impermeable'] },
    { metierSlug: 'poissonnerie', name: 'Preparation / filetage', description: 'Filetage, ecaillage', typicalHeadcount: '1-3', associatedRiskIds: ['pois-coupure', 'pois-biologique', 'pois-allergie'], typicalEquipment: ['Couteaux filetage', 'Ecailleur'], typicalPPE: ['Gant mailles inox', 'Gants nitrile'] },
    { metierSlug: 'poissonnerie', name: 'Reserve / chambre froide', description: 'Stockage produits frais', typicalHeadcount: '1', associatedRiskIds: ['pois-froid', 'pois-manutention'], typicalEquipment: ['Chambre froide'], typicalPPE: ['Gants thermiques'] },
    { metierSlug: 'poissonnerie', name: 'Reception / livraison', description: 'Reception marchandises', typicalHeadcount: '1', associatedRiskIds: ['pois-manutention'], typicalEquipment: ['Chariot inox'], typicalPPE: ['Chaussures securite'] },
  ],
  'chocolaterie': [
    { metierSlug: 'chocolaterie', name: 'Laboratoire chocolat', description: 'Temperage, moulage, enrobage', typicalHeadcount: '1-4', associatedRiskIds: ['choc-tms', 'choc-chimique', 'choc-allergie'], typicalEquipment: ['Tempereur', 'Enrobeuse', 'Moules'], typicalPPE: ['Gants alimentaires'] },
    { metierSlug: 'chocolaterie', name: 'Cuisson sucre / caramel', description: 'Cuisson haute temperature', typicalHeadcount: '1-2', associatedRiskIds: ['choc-brulure', 'choc-incendie'], typicalEquipment: ['Four', 'Casseroles cuivre'], typicalPPE: ['Gants EN 407'] },
    { metierSlug: 'chocolaterie', name: 'Boutique / vente', description: 'Vente au public', typicalHeadcount: '1-3', associatedRiskIds: [], typicalEquipment: ['Vitrine', 'Caisse'], typicalPPE: [] },
    { metierSlug: 'chocolaterie', name: 'Stockage / reserve', description: 'Stockage cacao, sucre', typicalHeadcount: '1', associatedRiskIds: ['choc-atex', 'choc-manutention'], typicalEquipment: ['Etageres', 'Chambre tempérée'], typicalPPE: ['Masque FFP2'] },
  ],
  'commerce-alimentaire': [
    { metierSlug: 'commerce-alimentaire', name: 'Surface de vente', description: 'Mise en rayon, encaissement', typicalHeadcount: '1-4', associatedRiskIds: ['ca-tms', 'ca-glissade'], typicalEquipment: ['Rayonnages', 'Caisse'], typicalPPE: [] },
    { metierSlug: 'commerce-alimentaire', name: 'Reserve / chambre froide', description: 'Stockage et chambre froide', typicalHeadcount: '1-2', associatedRiskIds: ['ca-manutention', 'ca-froid'], typicalEquipment: ['Chambre froide', 'Transpalette'], typicalPPE: ['Gants thermiques', 'Chaussures securite'] },
    { metierSlug: 'commerce-alimentaire', name: 'Caisse / accueil', description: 'Encaissement', typicalHeadcount: '1-2', associatedRiskIds: ['ca-agression', 'ca-tms'], typicalEquipment: ['Caisse', 'Scanner'], typicalPPE: [] },
    { metierSlug: 'commerce-alimentaire', name: 'Rayon coupe / traiteur', description: 'Coupe charcuterie/fromage', typicalHeadcount: '1-2', associatedRiskIds: ['ca-coupure', 'ca-biologique'], typicalEquipment: ['Trancheuse', 'Balance'], typicalPPE: ['Gant mailles inox'] },
  ],
  'commerce-alimentaire-gros': [
    { metierSlug: 'commerce-alimentaire-gros', name: 'Entrepot / stockage', description: 'Stockage palettes', typicalHeadcount: '3-10', associatedRiskIds: ['cag-chariot', 'cag-manutention', 'cag-chute-rack', 'cag-chute'], typicalEquipment: ['Chariot elevateur', 'Rack'], typicalPPE: ['Gilet EN 20471', 'Chaussures securite S3'] },
    { metierSlug: 'commerce-alimentaire-gros', name: 'Quai de chargement', description: 'Reception et expedition', typicalHeadcount: '2-4', associatedRiskIds: ['cag-routier', 'cag-chute'], typicalEquipment: ['Quai', 'Transpalette'], typicalPPE: ['Gilet EN 20471'] },
    { metierSlug: 'commerce-alimentaire-gros', name: 'Chambre froide', description: 'Stockage frais et congeles', typicalHeadcount: '1-3', associatedRiskIds: ['cag-froid'], typicalEquipment: ['Chambre froide'], typicalPPE: ['Vetements grand froid'] },
    { metierSlug: 'commerce-alimentaire-gros', name: 'Bureau / commercial', description: 'Administration', typicalHeadcount: '1-3', associatedRiskIds: ['cag-rps'], typicalEquipment: ['Ordinateur'], typicalPPE: [] },
  ],
  'cuisine-collective': [
    { metierSlug: 'cuisine-collective', name: 'Cuisine de production', description: 'Cuisson en grands volumes', typicalHeadcount: '3-10', associatedRiskIds: ['cc-brulure', 'cc-chaleur'], typicalEquipment: ['Marmites', 'Fours mixtes'], typicalPPE: ['Gants EN 407', 'Chaussures antiderapantes'] },
    { metierSlug: 'cuisine-collective', name: 'Preparation froide', description: 'Entrees, salades, desserts', typicalHeadcount: '2-4', associatedRiskIds: ['cc-coupure', 'cc-biologique'], typicalEquipment: ['Coupe-legumes', 'Trancheuse'], typicalPPE: ['Gants mailles inox'] },
    { metierSlug: 'cuisine-collective', name: 'Plonge batterie', description: 'Lavage gros materiel', typicalHeadcount: '1-2', associatedRiskIds: ['cc-glissade', 'cc-bruit'], typicalEquipment: ['Lave-vaisselle tunnel'], typicalPPE: ['Tablier', 'Bouchons oreilles'] },
    { metierSlug: 'cuisine-collective', name: 'Service / distribution', description: 'Service en ligne', typicalHeadcount: '2-4', associatedRiskIds: ['cc-rps'], typicalEquipment: ['Bain-marie'], typicalPPE: [] },
  ],
  'bar-cafe': [
    { metierSlug: 'bar-cafe', name: 'Comptoir / bar', description: 'Service boissons', typicalHeadcount: '1-3', associatedRiskIds: ['bar-tms', 'bar-coupure', 'bar-electrique'], typicalEquipment: ['Tireuse', 'Machine a cafe'], typicalPPE: ['Chaussures antiderapantes'] },
    { metierSlug: 'bar-cafe', name: 'Salle / terrasse', description: 'Service en salle', typicalHeadcount: '1-3', associatedRiskIds: ['bar-agression', 'bar-glissade', 'bar-bruit'], typicalEquipment: ['Mobilier'], typicalPPE: [] },
    { metierSlug: 'bar-cafe', name: 'Reserve / cave', description: 'Stockage boissons', typicalHeadcount: '1', associatedRiskIds: ['bar-manutention', 'bar-incendie'], typicalEquipment: ['Etageres', 'Futs'], typicalPPE: ['Chaussures securite'] },
    { metierSlug: 'bar-cafe', name: 'Snacking / cuisine', description: 'Preparation snacking', typicalHeadcount: '0-1', associatedRiskIds: [], typicalEquipment: ['Plancha', 'Micro-ondes'], typicalPPE: [] },
  ],
  'bar-tabac': [
    { metierSlug: 'bar-tabac', name: 'Comptoir tabac / presse', description: 'Vente tabac, presse', typicalHeadcount: '1-2', associatedRiskIds: ['bt-agression', 'bt-tms', 'bt-rps'], typicalEquipment: ['Presentoir tabac', 'Caisse'], typicalPPE: [] },
    { metierSlug: 'bar-tabac', name: 'Bar / service', description: 'Service boissons', typicalHeadcount: '1-2', associatedRiskIds: ['bt-glissade'], typicalEquipment: ['Tireuse', 'Machine cafe'], typicalPPE: ['Chaussures antiderapantes'] },
    { metierSlug: 'bar-tabac', name: 'Reserve / coffre', description: 'Stockage tabac', typicalHeadcount: '1', associatedRiskIds: ['bt-manutention', 'bt-incendie'], typicalEquipment: ['Coffre-fort', 'Etageres'], typicalPPE: [] },
    { metierSlug: 'bar-tabac', name: 'Terrasse fumeurs', description: 'Terrasse exterieure', typicalHeadcount: '0-1', associatedRiskIds: ['bt-tabagisme'], typicalEquipment: ['Mobilier exterieur'], typicalPPE: [] },
  ],
  'brasserie-artisanale': [
    { metierSlug: 'brasserie-artisanale', name: 'Salle de brassage', description: 'Empâtage, filtration, ebullition', typicalHeadcount: '1-3', associatedRiskIds: ['bra-brulure', 'bra-glissade'], typicalEquipment: ['Cuve empâtage', 'Cuve ebullition'], typicalPPE: ['Gants EN 407', 'Bottes securite'] },
    { metierSlug: 'brasserie-artisanale', name: 'Cave fermentation', description: 'Cuves de fermentation', typicalHeadcount: '1-2', associatedRiskIds: ['bra-co2', 'bra-espace-confine', 'bra-pression'], typicalEquipment: ['Cuves inox', 'Detecteur CO2'], typicalPPE: ['Detecteur gaz'] },
    { metierSlug: 'brasserie-artisanale', name: 'Conditionnement', description: 'Mise en bouteille', typicalHeadcount: '1-3', associatedRiskIds: ['bra-bruit'], typicalEquipment: ['Embouteilleuse', 'Capsuleuse'], typicalPPE: ['Casque antibruit'] },
    { metierSlug: 'brasserie-artisanale', name: 'Nettoyage / CIP', description: 'Nettoyage cuves (soude, acide)', typicalHeadcount: '1-2', associatedRiskIds: ['bra-chimique'], typicalEquipment: ['Station CIP', 'Tuyaux'], typicalPPE: ['Gants nitrile longs', 'Lunettes etanches', 'Tablier chimique'] },
    { metierSlug: 'brasserie-artisanale', name: 'Stockage / expedition', description: 'Stockage matieres et produits', typicalHeadcount: '1', associatedRiskIds: ['bra-manutention'], typicalEquipment: ['Transpalette', 'Rack'], typicalPPE: ['Chaussures securite'] },
  ],
  'salon-de-the': [
    { metierSlug: 'salon-de-the', name: 'Salle de service', description: 'Service, accueil', typicalHeadcount: '1-3', associatedRiskIds: ['sdt-tms', 'sdt-glissade', 'sdt-rps'], typicalEquipment: ['Plateau', 'Caisse'], typicalPPE: [] },
    { metierSlug: 'salon-de-the', name: 'Cuisine / preparation', description: 'Preparation patisseries, boissons', typicalHeadcount: '1-2', associatedRiskIds: ['sdt-brulure', 'sdt-coupure', 'sdt-electrique', 'sdt-incendie'], typicalEquipment: ['Machine a cafe', 'Four'], typicalPPE: ['Gants anti-chaleur'] },
    { metierSlug: 'salon-de-the', name: 'Reserve / stockage', description: 'Stockage matieres premieres', typicalHeadcount: '1', associatedRiskIds: [], typicalEquipment: ['Etageres'], typicalPPE: [] },
    { metierSlug: 'salon-de-the', name: 'Plonge / nettoyage', description: 'Lavage vaisselle', typicalHeadcount: '0-1', associatedRiskIds: ['sdt-chimique'], typicalEquipment: ['Lave-vaisselle'], typicalPPE: ['Gants menage'] },
  ],
  'abattoir': [
    { metierSlug: 'abattoir', name: 'Chaine d\'abattage', description: 'Accrochage, saignee, evisceration', typicalHeadcount: '5-20', associatedRiskIds: ['aba-biologique', 'aba-rps', 'aba-bruit', 'aba-tms'], typicalEquipment: ['Chaine', 'Couteaux'], typicalPPE: ['Gant mailles EN 1082', 'Tablier mailles', 'Casque antibruit'] },
    { metierSlug: 'abattoir', name: 'Salle de decoupe', description: 'Decoupe, desossage', typicalHeadcount: '3-10', associatedRiskIds: ['aba-coupure', 'aba-tms'], typicalEquipment: ['Scie a os', 'Couteaux', 'Convoyeur'], typicalPPE: ['Gant mailles EN 1082', 'Tablier mailles', 'Protege-bras'] },
    { metierSlug: 'abattoir', name: 'Chambre froide', description: 'Stockage carcasses', typicalHeadcount: '1-3', associatedRiskIds: ['aba-froid'], typicalEquipment: ['Rails', 'Crochets'], typicalPPE: ['Vetements thermiques'] },
    { metierSlug: 'abattoir', name: 'Triperie / abats', description: 'Traitement des abats', typicalHeadcount: '2-4', associatedRiskIds: ['aba-biologique', 'aba-glissade'], typicalEquipment: ['Plan de travail inox'], typicalPPE: ['Tablier impermeable', 'Bottes S5'] },
    { metierSlug: 'abattoir', name: 'Nettoyage', description: 'Nettoyage equipements', typicalHeadcount: '2-4', associatedRiskIds: ['aba-chimique', 'aba-glissade'], typicalEquipment: ['Nettoyeur HP', 'Station CIP'], typicalPPE: ['Gants chimiques', 'Lunettes etanches', 'Bottes S5'] },
  ],
  'meunerie': [
    { metierSlug: 'meunerie', name: 'Silo a grains', description: 'Reception, stockage grains', typicalHeadcount: '1-3', associatedRiskIds: ['meu-atex', 'meu-chute-hauteur', 'meu-espace-confine', 'meu-incendie'], typicalEquipment: ['Silo', 'Convoyeur', 'Nettoyeur'], typicalPPE: ['Harnais EN 361', 'Casque EN 397', 'Masque FFP2'] },
    { metierSlug: 'meunerie', name: 'Mouture / broyage', description: 'Broyeurs, plansichters', typicalHeadcount: '1-3', associatedRiskIds: ['meu-machines', 'meu-poussieres', 'meu-bruit'], typicalEquipment: ['Broyeurs a cylindres', 'Plansichters'], typicalPPE: ['Casque antibruit EN 352', 'Masque FFP2'] },
    { metierSlug: 'meunerie', name: 'Conditionnement', description: 'Ensachage, palettisation', typicalHeadcount: '1-3', associatedRiskIds: ['meu-manutention', 'meu-poussieres'], typicalEquipment: ['Ensacheuse', 'Palettiseur'], typicalPPE: ['Masque FFP2', 'Gants manutention'] },
    { metierSlug: 'meunerie', name: 'Maintenance', description: 'Maintenance machines', typicalHeadcount: '1-2', associatedRiskIds: ['meu-machines'], typicalEquipment: ['Outillage'], typicalPPE: ['Casque EN 397'] },
  ],
  'boucherie': [
    { metierSlug: 'boucherie', name: 'Atelier decoupe / desossage', description: 'Decoupe, desossage, parage', typicalHeadcount: '1-4', associatedRiskIds: ['bouch-coupure', 'bouch-tms', 'bouch-biologique'], typicalEquipment: ['Billot', 'Scie a os', 'Couteaux'], typicalPPE: ['Gant mailles EN 1082', 'Tablier mailles', 'Protege-bras'] },
    { metierSlug: 'boucherie', name: 'Preparation charcuterie', description: 'Saucisses, pates', typicalHeadcount: '1-2', associatedRiskIds: ['bouch-machines'], typicalEquipment: ['Hachoir', 'Poussoir', 'Melangeur'], typicalPPE: ['Gants anti-coupure'] },
    { metierSlug: 'boucherie', name: 'Etal de vente', description: 'Vente au detail', typicalHeadcount: '1-3', associatedRiskIds: ['bouch-tms', 'bouch-glissade'], typicalEquipment: ['Vitrine refrigeree', 'Balance', 'Trancheuse'], typicalPPE: ['Chaussures antiderapantes'] },
    { metierSlug: 'boucherie', name: 'Chambre froide', description: 'Stockage carcasses', typicalHeadcount: '1', associatedRiskIds: ['bouch-froid', 'bouch-manutention'], typicalEquipment: ['Rail suspension', 'Crochets'], typicalPPE: ['Vetements thermiques', 'Gants thermiques'] },
  ],
  // ── E3: Commerce & Services ────────────────────────────────────
  'carrosserie': [
    { metierSlug: 'carrosserie', name: 'Atelier tolerie', description: 'Debosselage, redressage, soudure', typicalHeadcount: '1-3', associatedRiskIds: ['carr-soudure', 'carr-bruit', 'carr-coupure'], typicalEquipment: ['Marteau', 'Tas', 'Poste a souder'], typicalPPE: ['Cagoule soudeur', 'Casque antibruit'] },
    { metierSlug: 'carrosserie', name: 'Cabine de peinture', description: 'Application peinture, vernis', typicalHeadcount: '1-2', associatedRiskIds: ['carr-chimique', 'carr-incendie'], typicalEquipment: ['Cabine ventilee', 'Pistolet'], typicalPPE: ['Masque A2P3', 'Combinaison'] },
    { metierSlug: 'carrosserie', name: 'Preparation / masticage', description: 'Masticage, ponçage', typicalHeadcount: '1-2', associatedRiskIds: ['carr-poussieres', 'carr-tms'], typicalEquipment: ['Ponceuse', 'Mastics'], typicalPPE: ['Masque FFP2', 'Lunettes'] },
    { metierSlug: 'carrosserie', name: 'Demontage / remontage', description: 'Elements de carrosserie', typicalHeadcount: '1-2', associatedRiskIds: ['carr-coupure'], typicalEquipment: ['Outillage'], typicalPPE: ['Gants EN 388'] },
  ],
  'fleuriste': [
    { metierSlug: 'fleuriste', name: 'Boutique / atelier', description: 'Composition, vente', typicalHeadcount: '1-3', associatedRiskIds: ['fleur-chimique', 'fleur-allergie', 'fleur-tms', 'fleur-coupure'], typicalEquipment: ['Plan de travail', 'Secateur'], typicalPPE: ['Gants'] },
    { metierSlug: 'fleuriste', name: 'Reserve / chambre froide', description: 'Stockage fleurs', typicalHeadcount: '1', associatedRiskIds: ['fleur-froid', 'fleur-manutention'], typicalEquipment: ['Chambre froide'], typicalPPE: [] },
    { metierSlug: 'fleuriste', name: 'Vehicule / livraison', description: 'Livraisons', typicalHeadcount: '1', associatedRiskIds: ['fleur-routier'], typicalEquipment: ['Vehicule utilitaire'], typicalPPE: [] },
    { metierSlug: 'fleuriste', name: 'Espace exterieur', description: 'Plantes en exterieur', typicalHeadcount: '1-2', associatedRiskIds: ['fleur-glissade'], typicalEquipment: ['Presentoirs'], typicalPPE: [] },
  ],
  'grande-distribution': [
    { metierSlug: 'grande-distribution', name: 'Rayons / mise en rayon', description: 'Mise en rayon, facing', typicalHeadcount: '3-15', associatedRiskIds: ['gd-manutention', 'gd-chute'], typicalEquipment: ['Transpalette', 'Escabeau'], typicalPPE: ['Chaussures securite'] },
    { metierSlug: 'grande-distribution', name: 'Caisses', description: 'Encaissement', typicalHeadcount: '3-10', associatedRiskIds: ['gd-tms-caisse', 'gd-agression'], typicalEquipment: ['Scanner', 'Siege caissier'], typicalPPE: [] },
    { metierSlug: 'grande-distribution', name: 'Reserve / quai', description: 'Reception marchandises', typicalHeadcount: '2-6', associatedRiskIds: ['gd-chariot', 'gd-manutention', 'gd-chute'], typicalEquipment: ['Chariot elevateur', 'Transpalette'], typicalPPE: ['Gilet EN 20471', 'Chaussures securite S3'] },
    { metierSlug: 'grande-distribution', name: 'Rayons frais', description: 'Boucherie, poissonnerie', typicalHeadcount: '2-6', associatedRiskIds: ['gd-coupure', 'gd-froid'], typicalEquipment: ['Trancheuse', 'Vitrine'], typicalPPE: ['Gant mailles inox'] },
  ],
  'commerce-gros': [
    { metierSlug: 'commerce-gros', name: 'Entrepot', description: 'Stockage, preparation commandes', typicalHeadcount: '3-15', associatedRiskIds: ['cg-chariot', 'cg-chute-rack', 'cg-manutention', 'cg-chute'], typicalEquipment: ['Chariot elevateur', 'Racks'], typicalPPE: ['Gilet EN 20471', 'Chaussures S3'] },
    { metierSlug: 'commerce-gros', name: 'Quai reception/expedition', description: 'Chargement camions', typicalHeadcount: '2-4', associatedRiskIds: ['cg-routier', 'cg-chute'], typicalEquipment: ['Quai', 'Transpalette'], typicalPPE: ['Gilet EN 20471'] },
    { metierSlug: 'commerce-gros', name: 'Bureau / showroom', description: 'Administration', typicalHeadcount: '1-5', associatedRiskIds: ['cg-rps'], typicalEquipment: ['Ordinateur'], typicalPPE: [] },
    { metierSlug: 'commerce-gros', name: 'Livraison', description: 'Livraison clients', typicalHeadcount: '1-3', associatedRiskIds: ['cg-routier'], typicalEquipment: ['Vehicule utilitaire'], typicalPPE: [] },
  ],
  'reparation-auto': [
    { metierSlug: 'reparation-auto', name: 'Atelier mecanique', description: 'Reparation vehicules', typicalHeadcount: '2-6', associatedRiskIds: ['rep-ecrasement', 'rep-chimique', 'rep-bruit', 'rep-tms', 'rep-incendie', 'rep-chute'], typicalEquipment: ['Pont elevateur', 'Outillage'], typicalPPE: ['Chaussures S3', 'Gants nitrile', 'Lunettes'] },
    { metierSlug: 'reparation-auto', name: 'Zone vehicules electriques', description: 'Intervention HT', typicalHeadcount: '1-2', associatedRiskIds: ['rep-electrique-ht'], typicalEquipment: ['EPI isolants', 'Outillage isole'], typicalPPE: ['Gants isolants', 'Tapis isolant'] },
    { metierSlug: 'reparation-auto', name: 'Poste pneumatiques', description: 'Montage, equilibrage', typicalHeadcount: '1-2', associatedRiskIds: ['rep-manutention', 'rep-bruit'], typicalEquipment: ['Demonte-pneu', 'Equilibreuse'], typicalPPE: ['Casque antibruit'] },
    { metierSlug: 'reparation-auto', name: 'Accueil / magasin', description: 'Reception clients', typicalHeadcount: '1-2', associatedRiskIds: [], typicalEquipment: ['Ordinateur'], typicalPPE: [] },
  ],
  'concession-auto': [
    { metierSlug: 'concession-auto', name: 'Showroom', description: 'Exposition vehicules', typicalHeadcount: '2-5', associatedRiskIds: ['conc-chute', 'conc-agression'], typicalEquipment: ['Vehicules expo'], typicalPPE: [] },
    { metierSlug: 'concession-auto', name: 'Essais vehicules', description: 'Essais routiers', typicalHeadcount: '1-3', associatedRiskIds: ['conc-routier'], typicalEquipment: ['Vehicules essai'], typicalPPE: [] },
    { metierSlug: 'concession-auto', name: 'Preparation / livraison', description: 'Preparation vehicules', typicalHeadcount: '1-3', associatedRiskIds: ['conc-chimique', 'conc-manutention'], typicalEquipment: ['Zone lavage', 'Produits'], typicalPPE: ['Gants'] },
    { metierSlug: 'concession-auto', name: 'Bureau', description: 'Vente, administration', typicalHeadcount: '2-5', associatedRiskIds: ['conc-tms', 'conc-rps'], typicalEquipment: ['Ordinateur'], typicalPPE: [] },
  ],
  'casse-auto': [
    { metierSlug: 'casse-auto', name: 'Zone de demantelement', description: 'Depollution, demantelement', typicalHeadcount: '2-4', associatedRiskIds: ['cas-chimique', 'cas-coupure', 'cas-tetanos', 'cas-manutention'], typicalEquipment: ['Kit depollution', 'Outillage'], typicalPPE: ['Gants EN 388', 'Lunettes', 'Chaussures S3'] },
    { metierSlug: 'casse-auto', name: 'Presse / broyage', description: 'Mise en presse', typicalHeadcount: '1-2', associatedRiskIds: ['cas-ecrasement', 'cas-bruit'], typicalEquipment: ['Presse', 'Grue'], typicalPPE: ['Casque EN 397', 'Casque antibruit'] },
    { metierSlug: 'casse-auto', name: 'Parc de stockage', description: 'Stockage vehicules', typicalHeadcount: '1-2', associatedRiskIds: ['cas-chute', 'cas-incendie'], typicalEquipment: ['Grue', 'Parc'], typicalPPE: ['Gilet EN 20471'] },
    { metierSlug: 'casse-auto', name: 'Magasin pieces', description: 'Vente pieces', typicalHeadcount: '1-2', associatedRiskIds: [], typicalEquipment: ['Etageres', 'Ordinateur'], typicalPPE: [] },
  ],
  'controle-technique': [
    { metierSlug: 'controle-technique', name: 'Ligne de controle', description: 'Inspection, tests', typicalHeadcount: '1-2', associatedRiskIds: ['ct-chimique', 'ct-bruit', 'ct-tms'], typicalEquipment: ['Freinometre', 'Analyseur gaz'], typicalPPE: ['Bouchons moules'] },
    { metierSlug: 'controle-technique', name: 'Fosse d\'inspection', description: 'Verification dessous de caisse', typicalHeadcount: '1', associatedRiskIds: ['ct-chute-fosse', 'ct-ecrasement'], typicalEquipment: ['Fosse', 'Eclairage'], typicalPPE: ['Casque EN 397'] },
    { metierSlug: 'controle-technique', name: 'Bureau / accueil', description: 'Saisie PV, accueil', typicalHeadcount: '1-2', associatedRiskIds: ['ct-agression', 'ct-tms'], typicalEquipment: ['Ordinateur'], typicalPPE: [] },
    { metierSlug: 'controle-technique', name: 'Parking', description: 'Manoeuvres vehicules', typicalHeadcount: '1', associatedRiskIds: ['ct-routier'], typicalEquipment: ['Parking'], typicalPPE: [] },
  ],
  'pret-a-porter': [
    { metierSlug: 'pret-a-porter', name: 'Surface de vente', description: 'Vente, conseil', typicalHeadcount: '2-6', associatedRiskIds: ['pap-tms', 'pap-rps'], typicalEquipment: ['Rayonnages', 'Cabines'], typicalPPE: [] },
    { metierSlug: 'pret-a-porter', name: 'Reserve / stock', description: 'Stockage vetements', typicalHeadcount: '1-2', associatedRiskIds: ['pap-manutention', 'pap-chute', 'pap-incendie'], typicalEquipment: ['Portants', 'Etageres'], typicalPPE: [] },
    { metierSlug: 'pret-a-porter', name: 'Vitrine', description: 'Amenagement vitrine', typicalHeadcount: '0-1', associatedRiskIds: ['pap-electrique'], typicalEquipment: ['Mannequins', 'Eclairage'], typicalPPE: [] },
    { metierSlug: 'pret-a-porter', name: 'Caisse / accueil', description: 'Encaissement', typicalHeadcount: '1-2', associatedRiskIds: ['pap-agression'], typicalEquipment: ['Caisse', 'Antivol'], typicalPPE: [] },
  ],
  'opticien': [
    { metierSlug: 'opticien', name: 'Magasin / vente', description: 'Vente lunettes', typicalHeadcount: '1-3', associatedRiskIds: ['opt-agression', 'opt-chute'], typicalEquipment: ['Vitrines', 'Caisse'], typicalPPE: [] },
    { metierSlug: 'opticien', name: 'Atelier montage', description: 'Taillage, montage verres', typicalHeadcount: '1-2', associatedRiskIds: ['opt-chimique', 'opt-tms', 'opt-projection', 'opt-electrique'], typicalEquipment: ['Meuleuse', 'Perceuse'], typicalPPE: ['Lunettes EN 166'] },
    { metierSlug: 'opticien', name: 'Salle d\'examen', description: 'Examens de vue', typicalHeadcount: '1', associatedRiskIds: ['opt-eclairage'], typicalEquipment: ['Autorefractometre'], typicalPPE: [] },
    { metierSlug: 'opticien', name: 'Bureau', description: 'Devis, mutuelles', typicalHeadcount: '1', associatedRiskIds: [], typicalEquipment: ['Ordinateur'], typicalPPE: [] },
  ],
  'bijouterie': [
    { metierSlug: 'bijouterie', name: 'Boutique / vente', description: 'Vente bijoux', typicalHeadcount: '1-3', associatedRiskIds: ['bij-agression', 'bij-rps'], typicalEquipment: ['Vitrines blindees', 'Coffre'], typicalPPE: [] },
    { metierSlug: 'bijouterie', name: 'Atelier reparation', description: 'Reparation, soudure', typicalHeadcount: '1-2', associatedRiskIds: ['bij-chimique', 'bij-tms', 'bij-brulure', 'bij-projection', 'bij-incendie', 'bij-electrique'], typicalEquipment: ['Chalumeau', 'Touret', 'Loupe'], typicalPPE: ['Lunettes EN 166', 'Gants cuir'] },
    { metierSlug: 'bijouterie', name: 'Coffre / reserve', description: 'Stockage valeurs', typicalHeadcount: '1', associatedRiskIds: ['bij-agression'], typicalEquipment: ['Coffre-fort'], typicalPPE: [] },
    { metierSlug: 'bijouterie', name: 'Bureau / expertise', description: 'Expertise, devis', typicalHeadcount: '1', associatedRiskIds: [], typicalEquipment: ['Loupe', 'Balance'], typicalPPE: [] },
  ],
  'parfumerie': [
    { metierSlug: 'parfumerie', name: 'Espace de vente', description: 'Vente, demonstration', typicalHeadcount: '2-6', associatedRiskIds: ['parf-chimique', 'parf-tms', 'parf-agression', 'parf-rps'], typicalEquipment: ['Testeurs', 'Caisse'], typicalPPE: [] },
    { metierSlug: 'parfumerie', name: 'Reserve', description: 'Stockage parfums', typicalHeadcount: '1', associatedRiskIds: ['parf-manutention', 'parf-incendie'], typicalEquipment: ['Etageres'], typicalPPE: [] },
    { metierSlug: 'parfumerie', name: 'Caisse / emballage', description: 'Encaissement', typicalHeadcount: '1-2', associatedRiskIds: ['parf-chute'], typicalEquipment: ['Caisse', 'Emballage'], typicalPPE: [] },
    { metierSlug: 'parfumerie', name: 'Cabine de soin', description: 'Soins esthetiques', typicalHeadcount: '0-1', associatedRiskIds: ['parf-allergie'], typicalEquipment: ['Table de soin'], typicalPPE: ['Gants nitrile'] },
  ],
  'station-service': [
    { metierSlug: 'station-service', name: 'Piste de distribution', description: 'Distribution carburant', typicalHeadcount: '1-2', associatedRiskIds: ['ss-atex', 'ss-chimique', 'ss-glissade', 'ss-routier'], typicalEquipment: ['Pompes', 'Ilots'], typicalPPE: ['Chaussures antiderapantes', 'Gilet EN 20471'] },
    { metierSlug: 'station-service', name: 'Boutique / caisse', description: 'Vente, encaissement', typicalHeadcount: '1-3', associatedRiskIds: ['ss-agression', 'ss-tms'], typicalEquipment: ['Caisse'], typicalPPE: [] },
    { metierSlug: 'station-service', name: 'Local technique', description: 'Maintenance cuves', typicalHeadcount: '0-1', associatedRiskIds: ['ss-environnement', 'ss-electrique'], typicalEquipment: ['Cuves', 'Detendeurs'], typicalPPE: [] },
    { metierSlug: 'station-service', name: 'Station de lavage', description: 'Entretien lavage auto', typicalHeadcount: '0-1', associatedRiskIds: ['ss-glissade', 'ss-electrique'], typicalEquipment: ['Portique lavage'], typicalPPE: [] },
  ],
  'vente-mobilier': [
    { metierSlug: 'vente-mobilier', name: 'Showroom', description: 'Exposition meubles', typicalHeadcount: '2-6', associatedRiskIds: ['mob-tms', 'mob-agression'], typicalEquipment: ['Meubles expo'], typicalPPE: [] },
    { metierSlug: 'vente-mobilier', name: 'Entrepot', description: 'Stockage meubles', typicalHeadcount: '1-3', associatedRiskIds: ['mob-manutention', 'mob-coupure', 'mob-chute', 'mob-incendie'], typicalEquipment: ['Chariot', 'Racks'], typicalPPE: ['Chaussures S3', 'Gants'] },
    { metierSlug: 'vente-mobilier', name: 'Vehicule / livraison', description: 'Livraison meubles', typicalHeadcount: '1-3', associatedRiskIds: ['mob-routier', 'mob-chute-objet', 'mob-manutention'], typicalEquipment: ['Camion', 'Sangles', 'Monte-meuble'], typicalPPE: ['Chaussures S3'] },
    { metierSlug: 'vente-mobilier', name: 'Bureau', description: 'Devis, SAV', typicalHeadcount: '1-2', associatedRiskIds: [], typicalEquipment: ['Ordinateur'], typicalPPE: [] },
  ],
  'commerce-occasion': [
    { metierSlug: 'commerce-occasion', name: 'Boutique / depot-vente', description: 'Vente, estimation', typicalHeadcount: '1-3', associatedRiskIds: ['occ-agression', 'occ-poussieres'], typicalEquipment: ['Vitrines', 'Caisse'], typicalPPE: [] },
    { metierSlug: 'commerce-occasion', name: 'Reserve / stockage', description: 'Stockage objets', typicalHeadcount: '1-2', associatedRiskIds: ['occ-manutention', 'occ-chute', 'occ-tetanos', 'occ-incendie'], typicalEquipment: ['Etageres'], typicalPPE: ['Gants'] },
    { metierSlug: 'commerce-occasion', name: 'Vehicule / brocante', description: 'Deplacements', typicalHeadcount: '1', associatedRiskIds: ['occ-routier'], typicalEquipment: ['Vehicule'], typicalPPE: [] },
    { metierSlug: 'commerce-occasion', name: 'Atelier restauration', description: 'Nettoyage, restauration', typicalHeadcount: '0-1', associatedRiskIds: ['occ-chimique'], typicalEquipment: ['Outils'], typicalPPE: ['Gants', 'Masque FFP2'] },
  ],
  'maroquinerie': [
    { metierSlug: 'maroquinerie', name: 'Atelier de fabrication', description: 'Coupe, couture, collage cuir', typicalHeadcount: '1-4', associatedRiskIds: ['maro-chimique', 'maro-tms', 'maro-allergie', 'maro-bruit', 'maro-eclairage'], typicalEquipment: ['Machine a coudre', 'Emporte-piece'], typicalPPE: ['Gants nitrile', 'Masque A2'] },
    { metierSlug: 'maroquinerie', name: 'Poste de decoupe', description: 'Decoupe du cuir', typicalHeadcount: '1-2', associatedRiskIds: ['maro-coupure'], typicalEquipment: ['Tranchet', 'Emporte-piece'], typicalPPE: ['Gants EN 388 fins'] },
    { metierSlug: 'maroquinerie', name: 'Boutique / vente', description: 'Vente, reparation', typicalHeadcount: '1-2', associatedRiskIds: [], typicalEquipment: ['Vitrines'], typicalPPE: [] },
    { metierSlug: 'maroquinerie', name: 'Stockage peaux', description: 'Stockage peaux', typicalHeadcount: '1', associatedRiskIds: ['maro-manutention', 'maro-incendie'], typicalEquipment: ['Etageres', 'Armoire solvants'], typicalPPE: [] },
  ],
  'cycles-velos': [
    { metierSlug: 'cycles-velos', name: 'Atelier reparation', description: 'Reparation, montage velos', typicalHeadcount: '1-3', associatedRiskIds: ['velo-chimique', 'velo-tms', 'velo-coupure', 'velo-chute'], typicalEquipment: ['Pied d\'atelier', 'Outillage'], typicalPPE: ['Gants nitrile'] },
    { metierSlug: 'cycles-velos', name: 'Magasin / vente', description: 'Vente velos', typicalHeadcount: '1-3', associatedRiskIds: ['velo-agression'], typicalEquipment: ['Velos expo', 'Caisse'], typicalPPE: [] },
    { metierSlug: 'cycles-velos', name: 'Reserve / stockage', description: 'Stockage velos, batteries', typicalHeadcount: '1', associatedRiskIds: ['velo-manutention', 'velo-incendie', 'velo-electrique'], typicalEquipment: ['Rack velos', 'Zone charge'], typicalPPE: [] },
    { metierSlug: 'cycles-velos', name: 'Zone d\'essai', description: 'Essais clients', typicalHeadcount: '0-1', associatedRiskIds: [], typicalEquipment: ['Parcours'], typicalPPE: [] },
  ],
  'location-ski': [
    { metierSlug: 'location-ski', name: 'Magasin / accueil', description: 'Accueil, essayage', typicalHeadcount: '2-6', associatedRiskIds: ['ski-tms', 'ski-glissade', 'ski-rps'], typicalEquipment: ['Banc chaussage', 'Rack skis'], typicalPPE: ['Chaussures antiderapantes'] },
    { metierSlug: 'location-ski', name: 'Atelier reglage', description: 'Reglage, affutage, fartage', typicalHeadcount: '1-3', associatedRiskIds: ['ski-coupure', 'ski-bruit', 'ski-chimique'], typicalEquipment: ['Affuteuse', 'Machine fartage'], typicalPPE: ['Gants EN 388', 'Casque antibruit', 'Masque FFP2'] },
    { metierSlug: 'location-ski', name: 'Stockage materiel', description: 'Rangement skis', typicalHeadcount: '1-2', associatedRiskIds: ['ski-manutention'], typicalEquipment: ['Racks'], typicalPPE: [] },
    { metierSlug: 'location-ski', name: 'Espace exterieur', description: 'Remise materiel piste', typicalHeadcount: '0-1', associatedRiskIds: ['ski-froid'], typicalEquipment: [], typicalPPE: ['Vetements thermiques'] },
  ],
  // ── E5: Tertiaire & Bureau ─────────────────────────────────────
  'auto-ecole': [
    { metierSlug: 'auto-ecole', name: 'Vehicule double commande', description: 'Leçons de conduite', typicalHeadcount: '1-2', associatedRiskIds: ['ae-routier', 'ae-rps', 'ae-tms', 'ae-agression'], typicalEquipment: ['Vehicule double commande'], typicalPPE: [] },
    { metierSlug: 'auto-ecole', name: 'Salle de cours', description: 'Cours theoriques', typicalHeadcount: '1-2', associatedRiskIds: ['ae-chute', 'ae-electrique', 'ae-incendie'], typicalEquipment: ['Simulateur', 'Ordinateurs'], typicalPPE: [] },
    { metierSlug: 'auto-ecole', name: 'Bureau / accueil', description: 'Inscription, admin', typicalHeadcount: '1-2', associatedRiskIds: [], typicalEquipment: ['Ordinateur'], typicalPPE: [] },
    { metierSlug: 'auto-ecole', name: 'Piste moto', description: 'Leçons moto plateau', typicalHeadcount: '1-2', associatedRiskIds: ['ae-moto'], typicalEquipment: ['Motos ecole', 'Cones'], typicalPPE: ['Casque', 'Gants', 'Bottes', 'Dorsale'] },
  ],
  'avocat': [
    { metierSlug: 'avocat', name: 'Bureau / cabinet', description: 'Travail juridique', typicalHeadcount: '1-5', associatedRiskIds: ['av-rps', 'av-tms', 'av-sedentarite', 'av-eclairage', 'av-chute', 'av-incendie'], typicalEquipment: ['Ordinateur', 'Bibliotheque juridique'], typicalPPE: [] },
    { metierSlug: 'avocat', name: 'Tribunal', description: 'Audiences, plaidoiries', typicalHeadcount: '1', associatedRiskIds: ['av-rps'], typicalEquipment: ['Robe'], typicalPPE: [] },
    { metierSlug: 'avocat', name: 'Deplacements', description: 'RDV clients, prison', typicalHeadcount: '1', associatedRiskIds: ['av-routier', 'av-agression'], typicalEquipment: ['Vehicule'], typicalPPE: [] },
    { metierSlug: 'avocat', name: 'Salle de reunion', description: 'Reunions, mediation', typicalHeadcount: '1-3', associatedRiskIds: ['av-agression'], typicalEquipment: ['Table reunion'], typicalPPE: [] },
  ],
  'banque': [
    { metierSlug: 'banque', name: 'Agence / guichet', description: 'Accueil clients', typicalHeadcount: '3-8', associatedRiskIds: ['bq-agression', 'bq-chute'], typicalEquipment: ['Guichet', 'Caisse'], typicalPPE: [] },
    { metierSlug: 'banque', name: 'Bureau conseiller', description: 'Rendez-vous, conseil', typicalHeadcount: '1-4', associatedRiskIds: ['bq-rps', 'bq-routier'], typicalEquipment: ['Ordinateur'], typicalPPE: [] },
    { metierSlug: 'banque', name: 'Zone automates', description: 'DAB, coffres', typicalHeadcount: '0-1', associatedRiskIds: ['bq-electrique'], typicalEquipment: ['DAB', 'Coffre'], typicalPPE: [] },
    { metierSlug: 'banque', name: 'Back-office', description: 'Traitement admin', typicalHeadcount: '1-3', associatedRiskIds: ['bq-tms', 'bq-sedentarite', 'bq-incendie'], typicalEquipment: ['Ordinateur'], typicalPPE: [] },
  ],
  'expert-comptable': [
    { metierSlug: 'expert-comptable', name: 'Bureau', description: 'Travail comptable', typicalHeadcount: '2-10', associatedRiskIds: ['ec-rps', 'ec-tms', 'ec-sedentarite', 'ec-eclairage', 'ec-chute', 'ec-electrique'], typicalEquipment: ['Ordinateur', 'Double ecran'], typicalPPE: [] },
    { metierSlug: 'expert-comptable', name: 'Deplacements clients', description: 'RDV, audit', typicalHeadcount: '1-3', associatedRiskIds: ['ec-routier'], typicalEquipment: ['Vehicule'], typicalPPE: [] },
    { metierSlug: 'expert-comptable', name: 'Salle de reunion', description: 'Reunions equipe/clients', typicalHeadcount: '1-3', associatedRiskIds: [], typicalEquipment: ['Table reunion'], typicalPPE: [] },
    { metierSlug: 'expert-comptable', name: 'Archives', description: 'Stockage dossiers', typicalHeadcount: '0-1', associatedRiskIds: ['ec-incendie'], typicalEquipment: ['Rayonnages', 'Serveurs'], typicalPPE: [] },
  ],
  'immobilier': [
    { metierSlug: 'immobilier', name: 'Agence', description: 'Accueil clients', typicalHeadcount: '1-3', associatedRiskIds: ['imm-incendie'], typicalEquipment: ['Ordinateur', 'Vitrines annonces'], typicalPPE: [] },
    { metierSlug: 'immobilier', name: 'Visites de biens', description: 'Visites appartements/maisons', typicalHeadcount: '1-3', associatedRiskIds: ['imm-agression', 'imm-chute', 'imm-amiante', 'imm-electrique'], typicalEquipment: ['Lampe', 'Telephone'], typicalPPE: ['Chaussures fermees'] },
    { metierSlug: 'immobilier', name: 'Bureau negociateur', description: 'Negociation, compromis', typicalHeadcount: '1-3', associatedRiskIds: ['imm-rps', 'imm-tms'], typicalEquipment: ['Ordinateur'], typicalPPE: [] },
    { metierSlug: 'immobilier', name: 'Vehicule', description: 'Deplacements', typicalHeadcount: '1-3', associatedRiskIds: ['imm-routier'], typicalEquipment: ['Vehicule'], typicalPPE: [] },
  ],
  'informatique': [
    { metierSlug: 'informatique', name: 'Bureau / open space', description: 'Developpement, support', typicalHeadcount: '2-20', associatedRiskIds: ['info-tms', 'info-rps', 'info-sedentarite', 'info-eclairage', 'info-bruit'], typicalEquipment: ['Ordinateur', 'Double ecran'], typicalPPE: [] },
    { metierSlug: 'informatique', name: 'Salle serveurs', description: 'Maintenance serveurs', typicalHeadcount: '1-2', associatedRiskIds: ['info-electrique', 'info-bruit', 'info-incendie'], typicalEquipment: ['Serveurs', 'Climatisation'], typicalPPE: ['Protection auditive'] },
    { metierSlug: 'informatique', name: 'Site client', description: 'Installation, support', typicalHeadcount: '1-3', associatedRiskIds: ['info-electrique'], typicalEquipment: ['Outillage', 'Ordinateur portable'], typicalPPE: [] },
    { metierSlug: 'informatique', name: 'Teletravail', description: 'Travail a distance', typicalHeadcount: '1-10', associatedRiskIds: ['info-isolement', 'info-tms', 'info-sedentarite'], typicalEquipment: ['Ordinateur portable', 'Ecran'], typicalPPE: [] },
  ],
  'assurance': [
    { metierSlug: 'assurance', name: 'Agence / accueil', description: 'Accueil assures', typicalHeadcount: '1-4', associatedRiskIds: ['ass-agression', 'ass-chute'], typicalEquipment: ['Comptoir', 'Ordinateur'], typicalPPE: [] },
    { metierSlug: 'assurance', name: 'Bureau conseiller', description: 'Conseil, vente', typicalHeadcount: '1-4', associatedRiskIds: ['ass-rps'], typicalEquipment: ['Ordinateur'], typicalPPE: [] },
    { metierSlug: 'assurance', name: 'Deplacements', description: 'Expertise, clients', typicalHeadcount: '1-2', associatedRiskIds: ['ass-routier'], typicalEquipment: ['Vehicule'], typicalPPE: [] },
    { metierSlug: 'assurance', name: 'Back-office', description: 'Traitement admin', typicalHeadcount: '1-3', associatedRiskIds: ['ass-tms', 'ass-sedentarite', 'ass-electrique', 'ass-incendie'], typicalEquipment: ['Ordinateur'], typicalPPE: [] },
  ],
  'bureau-etudes': [
    { metierSlug: 'bureau-etudes', name: 'Bureau / CAO', description: 'Conception, calculs', typicalHeadcount: '2-15', associatedRiskIds: ['be-tms', 'be-rps', 'be-eclairage', 'be-bruit', 'be-sedentarite'], typicalEquipment: ['Ordinateur', 'Ecran CAO'], typicalPPE: [] },
    { metierSlug: 'bureau-etudes', name: 'Site / chantier', description: 'Supervision travaux', typicalHeadcount: '1-3', associatedRiskIds: ['be-chantier', 'be-routier'], typicalEquipment: ['EPI chantier'], typicalPPE: ['Casque EN 397', 'Gilet EN 20471', 'Chaussures S3'] },
    { metierSlug: 'bureau-etudes', name: 'Salle reunion', description: 'Coordination', typicalHeadcount: '1-4', associatedRiskIds: [], typicalEquipment: ['Table', 'Ecran'], typicalPPE: [] },
    { metierSlug: 'bureau-etudes', name: 'Archives / maquettes', description: 'Stockage plans', typicalHeadcount: '0-1', associatedRiskIds: ['be-incendie'], typicalEquipment: ['Rayonnages', 'Traceur'], typicalPPE: [] },
  ],
  'syndic-copropriete': [
    { metierSlug: 'syndic-copropriete', name: 'Bureau / gestion', description: 'Gestion coproprietes', typicalHeadcount: '1-5', associatedRiskIds: ['syn-rps', 'syn-tms', 'syn-incendie'], typicalEquipment: ['Ordinateur'], typicalPPE: [] },
    { metierSlug: 'syndic-copropriete', name: 'Visites immeubles', description: 'Visites coproprietes', typicalHeadcount: '1-3', associatedRiskIds: ['syn-chute', 'syn-amiante', 'syn-electrique'], typicalEquipment: ['Lampe', 'Cles'], typicalPPE: ['Chaussures fermees'] },
    { metierSlug: 'syndic-copropriete', name: 'Assemblees generales', description: 'Animation AG', typicalHeadcount: '1-2', associatedRiskIds: ['syn-agression'], typicalEquipment: ['Documents AG'], typicalPPE: [] },
    { metierSlug: 'syndic-copropriete', name: 'Vehicule', description: 'Deplacements', typicalHeadcount: '1', associatedRiskIds: ['syn-routier'], typicalEquipment: ['Vehicule'], typicalPPE: [] },
  ],
  'courtier-immobilier': [
    { metierSlug: 'courtier-immobilier', name: 'Bureau', description: 'Montage dossiers', typicalHeadcount: '1-5', associatedRiskIds: ['court-tms', 'court-sedentarite', 'court-chute', 'court-incendie'], typicalEquipment: ['Ordinateur'], typicalPPE: [] },
    { metierSlug: 'courtier-immobilier', name: 'RDV clients', description: 'Rendez-vous', typicalHeadcount: '1-3', associatedRiskIds: ['court-agression', 'court-rps'], typicalEquipment: ['Documents'], typicalPPE: [] },
    { metierSlug: 'courtier-immobilier', name: 'Deplacements', description: 'RDV banques', typicalHeadcount: '1-2', associatedRiskIds: ['court-routier'], typicalEquipment: ['Vehicule'], typicalPPE: [] },
    { metierSlug: 'courtier-immobilier', name: 'Teletravail', description: 'Travail a distance', typicalHeadcount: '1-3', associatedRiskIds: ['court-isolement'], typicalEquipment: ['Ordinateur portable'], typicalPPE: [] },
  ],
  'finance-investissement': [
    { metierSlug: 'finance-investissement', name: 'Salle de marche', description: 'Trading, execution', typicalHeadcount: '5-30', associatedRiskIds: ['fin-rps', 'fin-tms', 'fin-eclairage', 'fin-bruit', 'fin-incendie'], typicalEquipment: ['Multi-ecrans', 'Bloomberg'], typicalPPE: [] },
    { metierSlug: 'finance-investissement', name: 'Bureau / analyse', description: 'Analyse, modelisation', typicalHeadcount: '2-10', associatedRiskIds: ['fin-sedentarite', 'fin-addictions'], typicalEquipment: ['Ordinateur', 'Double ecran'], typicalPPE: [] },
    { metierSlug: 'finance-investissement', name: 'Salle reunion', description: 'Comites, presentations', typicalHeadcount: '1-5', associatedRiskIds: [], typicalEquipment: ['Ecran', 'Visio'], typicalPPE: [] },
    { metierSlug: 'finance-investissement', name: 'Deplacements', description: 'Road shows', typicalHeadcount: '1-3', associatedRiskIds: ['fin-routier'], typicalEquipment: ['Vehicule', 'Transport'], typicalPPE: [] },
  ],
  'commissaire-justice': [
    { metierSlug: 'commissaire-justice', name: 'Etude / bureau', description: 'Redaction d\'actes', typicalHeadcount: '1-5', associatedRiskIds: ['cj-tms', 'cj-incendie', 'cj-electrique'], typicalEquipment: ['Ordinateur'], typicalPPE: [] },
    { metierSlug: 'commissaire-justice', name: 'Signification / execution', description: 'Actes, saisies, expulsions', typicalHeadcount: '1-2', associatedRiskIds: ['cj-agression', 'cj-rps', 'cj-chute', 'cj-morsure', 'cj-electrique'], typicalEquipment: ['Actes', 'Telephone'], typicalPPE: ['Chaussures fermees'] },
    { metierSlug: 'commissaire-justice', name: 'Vehicule', description: 'Deplacements', typicalHeadcount: '1-2', associatedRiskIds: ['cj-routier'], typicalEquipment: ['Vehicule', 'GPS'], typicalPPE: [] },
    { metierSlug: 'commissaire-justice', name: 'Tribunal', description: 'Audiences', typicalHeadcount: '1', associatedRiskIds: [], typicalEquipment: [], typicalPPE: [] },
  ],
  // ── E4: Sante & Social ─────────────────────────────────────────
  'ambulancier': [
    { metierSlug: 'ambulancier', name: 'Vehicule sanitaire', description: 'Conduite ambulance', typicalHeadcount: '2', associatedRiskIds: ['amb-routier', 'amb-vibrations'], typicalEquipment: ['Ambulance', 'VSL'], typicalPPE: ['Gilet EN 20471'] },
    { metierSlug: 'ambulancier', name: 'Brancardage / transfert', description: 'Port et transfert patients', typicalHeadcount: '2', associatedRiskIds: ['amb-tms', 'amb-chute', 'amb-agression'], typicalEquipment: ['Brancard', 'Chaise portoir'], typicalPPE: ['Gants', 'Chaussures securite'] },
    { metierSlug: 'ambulancier', name: 'Soins d\'urgence', description: 'Premiers secours', typicalHeadcount: '1-2', associatedRiskIds: ['amb-biologique', 'amb-rps'], typicalEquipment: ['Kit urgence', 'DSA'], typicalPPE: ['Gants usage unique', 'Masque'] },
    { metierSlug: 'ambulancier', name: 'Administration', description: 'Planning, regulation', typicalHeadcount: '1', associatedRiskIds: [], typicalEquipment: ['Ordinateur', 'Radio'], typicalPPE: [] },
  ],
  'creche': [
    { metierSlug: 'creche', name: 'Salle d\'accueil / jeux', description: 'Espace de jeu, activites', typicalHeadcount: '3-8', associatedRiskIds: ['cre-bruit', 'cre-rps', 'cre-chute', 'cre-morsure'], typicalEquipment: ['Jouets', 'Tapis'], typicalPPE: [] },
    { metierSlug: 'creche', name: 'Change / toilette', description: 'Espace change', typicalHeadcount: '1-2', associatedRiskIds: ['cre-biologique', 'cre-tms', 'cre-chimique'], typicalEquipment: ['Table de change', 'Lavabo'], typicalPPE: ['Gants usage unique'] },
    { metierSlug: 'creche', name: 'Repas / biberonnerie', description: 'Preparation repas', typicalHeadcount: '1-2', associatedRiskIds: ['cre-incendie'], typicalEquipment: ['Four', 'Micro-ondes'], typicalPPE: [] },
    { metierSlug: 'creche', name: 'Dortoir / repos', description: 'Surveillance siestes', typicalHeadcount: '1-2', associatedRiskIds: [], typicalEquipment: ['Lits a barreaux'], typicalPPE: [] },
  ],
  'laboratoire': [
    { metierSlug: 'laboratoire', name: 'Salle de prelevement', description: 'Prises de sang', typicalHeadcount: '1-4', associatedRiskIds: ['lab-biologique', 'lab-piqure'], typicalEquipment: ['Fauteuil prelevement', 'Conteneur OPCT'], typicalPPE: ['Gants usage unique'] },
    { metierSlug: 'laboratoire', name: 'Plateau technique', description: 'Analyses sur automates', typicalHeadcount: '2-6', associatedRiskIds: ['lab-chimique', 'lab-rayonnement', 'lab-tms', 'lab-rps', 'lab-electrique'], typicalEquipment: ['Automates', 'Centrifugeuse', 'PSM'], typicalPPE: ['Gants nitrile', 'Blouse'] },
    { metierSlug: 'laboratoire', name: 'Reception / secretariat', description: 'Accueil patients', typicalHeadcount: '1-3', associatedRiskIds: [], typicalEquipment: ['Ordinateur'], typicalPPE: [] },
    { metierSlug: 'laboratoire', name: 'Stockage reactifs / DASRI', description: 'Stockage produits', typicalHeadcount: '1', associatedRiskIds: ['lab-incendie'], typicalEquipment: ['Armoire ventilee', 'Conteneur DASRI'], typicalPPE: ['Gants chimiques'] },
  ],
  'sante-generale': [
    { metierSlug: 'sante-generale', name: 'Salle de consultation', description: 'Consultation, examen', typicalHeadcount: '1-2', associatedRiskIds: ['med-rps', 'med-agression', 'med-tms'], typicalEquipment: ['Bureau', 'Table examen'], typicalPPE: [] },
    { metierSlug: 'sante-generale', name: 'Accueil / secretariat', description: 'Accueil patients', typicalHeadcount: '1-2', associatedRiskIds: ['med-chute', 'med-incendie'], typicalEquipment: ['Ordinateur'], typicalPPE: [] },
    { metierSlug: 'sante-generale', name: 'Salle de soins', description: 'Injections, pansements', typicalHeadcount: '1', associatedRiskIds: ['med-biologique', 'med-chimique', 'med-dasri'], typicalEquipment: ['Chariot soins', 'Conteneur OPCT'], typicalPPE: ['Gants usage unique'] },
    { metierSlug: 'sante-generale', name: 'Salle d\'attente', description: 'Espace patients', typicalHeadcount: '0', associatedRiskIds: [], typicalEquipment: ['Mobilier'], typicalPPE: [] },
  ],
  'veterinaire': [
    { metierSlug: 'veterinaire', name: 'Salle de consultation', description: 'Examen clinique, soins', typicalHeadcount: '1-2', associatedRiskIds: ['vet-biologique', 'vet-morsure', 'vet-piqure', 'vet-rps'], typicalEquipment: ['Table consultation', 'Museliere'], typicalPPE: ['Gants', 'Blouse'] },
    { metierSlug: 'veterinaire', name: 'Bloc operatoire', description: 'Chirurgie, anesthesie', typicalHeadcount: '1-3', associatedRiskIds: ['vet-chimique', 'vet-tms'], typicalEquipment: ['Table chirurgie', 'Anesthesie gazeuse'], typicalPPE: ['Gants steriles', 'Masque'] },
    { metierSlug: 'veterinaire', name: 'Imagerie', description: 'Radiographies', typicalHeadcount: '1-2', associatedRiskIds: ['vet-rayonnement'], typicalEquipment: ['Radio numerique'], typicalPPE: ['Tablier plombe', 'Dosimetre'] },
    { metierSlug: 'veterinaire', name: 'Hospitalisation', description: 'Soins post-op', typicalHeadcount: '1-2', associatedRiskIds: ['vet-morsure', 'vet-allergie'], typicalEquipment: ['Cages', 'Chenils'], typicalPPE: ['Gants contention'] },
  ],
  'cabinet-dentaire': [
    { metierSlug: 'cabinet-dentaire', name: 'Fauteuil de soins', description: 'Soins dentaires', typicalHeadcount: '2-4', associatedRiskIds: ['dent-biologique', 'dent-chimique', 'dent-bruit', 'dent-tms', 'dent-projection', 'dent-rps'], typicalEquipment: ['Fauteuil', 'Turbine', 'Aspiration'], typicalPPE: ['Masque FFP2', 'Visiere', 'Gants nitrile'] },
    { metierSlug: 'cabinet-dentaire', name: 'Zone sterilisation', description: 'Sterilisation instruments', typicalHeadcount: '1', associatedRiskIds: ['dent-incendie'], typicalEquipment: ['Autoclave', 'Bac ultrasons'], typicalPPE: ['Gants epais'] },
    { metierSlug: 'cabinet-dentaire', name: 'Imagerie dentaire', description: 'Radiographies', typicalHeadcount: '1', associatedRiskIds: ['dent-rayonnement'], typicalEquipment: ['Capteur numerique', 'Panoramique'], typicalPPE: ['Tablier plombe'] },
    { metierSlug: 'cabinet-dentaire', name: 'Accueil / secretariat', description: 'Accueil patients', typicalHeadcount: '1-2', associatedRiskIds: [], typicalEquipment: ['Ordinateur'], typicalPPE: [] },
  ],
  'centre-imagerie': [
    { metierSlug: 'centre-imagerie', name: 'Scanner / IRM / radio', description: 'Salles d\'imagerie', typicalHeadcount: '2-4', associatedRiskIds: ['img-rayonnement', 'img-champ-magnetique', 'img-bruit', 'img-electrique'], typicalEquipment: ['Scanner', 'IRM', 'Radio'], typicalPPE: ['Dosimetre', 'Tablier plombe'] },
    { metierSlug: 'centre-imagerie', name: 'Salle d\'injection', description: 'Injection produits contraste', typicalHeadcount: '1-2', associatedRiskIds: ['img-biologique', 'img-chimique'], typicalEquipment: ['Injecteur automatique'], typicalPPE: ['Gants usage unique'] },
    { metierSlug: 'centre-imagerie', name: 'Poste d\'interpretation', description: 'Lecture images', typicalHeadcount: '1-3', associatedRiskIds: ['img-rps', 'img-tms'], typicalEquipment: ['Ecrans diagnostic', 'PACS'], typicalPPE: [] },
    { metierSlug: 'centre-imagerie', name: 'Accueil', description: 'Accueil patients', typicalHeadcount: '1-3', associatedRiskIds: [], typicalEquipment: ['Ordinateur'], typicalPPE: [] },
  ],
  'ehpad': [
    { metierSlug: 'ehpad', name: 'Chambres residents', description: 'Soins, nursing', typicalHeadcount: '5-20', associatedRiskIds: ['ehp-tms', 'ehp-rps', 'ehp-agression', 'ehp-biologique'], typicalEquipment: ['Leve-personne', 'Lit medicalise'], typicalPPE: ['Gants usage unique', 'Tablier'] },
    { metierSlug: 'ehpad', name: 'Espaces communs', description: 'Salle a manger, salon', typicalHeadcount: '2-5', associatedRiskIds: ['ehp-chute', 'ehp-bruit', 'ehp-incendie'], typicalEquipment: ['Mobilier adapte'], typicalPPE: [] },
    { metierSlug: 'ehpad', name: 'Salle de soins', description: 'Preparation medicaments', typicalHeadcount: '1-3', associatedRiskIds: ['ehp-biologique', 'ehp-chimique'], typicalEquipment: ['Chariot soins', 'Armoire pharmacie'], typicalPPE: ['Gants nitrile'] },
    { metierSlug: 'ehpad', name: 'Cuisine / restauration', description: 'Preparation repas', typicalHeadcount: '2-5', associatedRiskIds: ['ehp-incendie'], typicalEquipment: ['Cuisine collective'], typicalPPE: ['Chaussures antiderapantes'] },
    { metierSlug: 'ehpad', name: 'Lingerie / entretien', description: 'Lavage, entretien', typicalHeadcount: '1-3', associatedRiskIds: ['ehp-chimique', 'ehp-bruit'], typicalEquipment: ['Lave-linge', 'Seche-linge'], typicalPPE: ['Gants menage'] },
  ],
  'prothesiste-dentaire': [
    { metierSlug: 'prothesiste-dentaire', name: 'Poste modelage', description: 'Sculpture, modelage', typicalHeadcount: '1-3', associatedRiskIds: ['pro-chimique', 'pro-tms'], typicalEquipment: ['Loupe binoculaire', 'Articulateur'], typicalPPE: ['Gants nitrile'] },
    { metierSlug: 'prothesiste-dentaire', name: 'Coulage / four', description: 'Coulage metal, ceramique', typicalHeadcount: '1-2', associatedRiskIds: ['pro-brulure', 'pro-incendie'], typicalEquipment: ['Four ceramique', 'Centrifugeuse coulage'], typicalPPE: ['Gants EN 407'] },
    { metierSlug: 'prothesiste-dentaire', name: 'Finition / polissage', description: 'Meulage, polissage', typicalHeadcount: '1-3', associatedRiskIds: ['pro-poussieres', 'pro-bruit', 'pro-projection'], typicalEquipment: ['Tour polissage', 'Sableuse'], typicalPPE: ['Masque FFP3', 'Lunettes EN 166', 'Casque antibruit'] },
    { metierSlug: 'prothesiste-dentaire', name: 'CAO/FAO / usinage', description: 'Conception numerique', typicalHeadcount: '1-2', associatedRiskIds: ['pro-electrique'], typicalEquipment: ['Scanner 3D', 'Usineuse CNC'], typicalPPE: [] },
  ],
  'services-funeraires': [
    { metierSlug: 'services-funeraires', name: 'Salle de preparation', description: 'Thanatopraxie, habillage', typicalHeadcount: '1-2', associatedRiskIds: ['fun-biologique', 'fun-chimique'], typicalEquipment: ['Table de preparation', 'Aspiration'], typicalPPE: ['Double gants', 'Masque A1B1', 'Tablier impermeable'] },
    { metierSlug: 'services-funeraires', name: 'Lieu de ceremonie', description: 'Organisation ceremonie', typicalHeadcount: '1-3', associatedRiskIds: ['fun-tms', 'fun-chute', 'fun-agression', 'fun-rps'], typicalEquipment: ['Cercueil', 'Pupitre'], typicalPPE: ['Chaussures securite'] },
    { metierSlug: 'services-funeraires', name: 'Vehicule funeraire', description: 'Transport du defunt', typicalHeadcount: '1-2', associatedRiskIds: ['fun-routier', 'fun-manutention'], typicalEquipment: ['Corbillard', 'Brancard'], typicalPPE: [] },
    { metierSlug: 'services-funeraires', name: 'Accueil / bureau', description: 'Accueil familles', typicalHeadcount: '1-2', associatedRiskIds: ['fun-rps'], typicalEquipment: ['Bureau'], typicalPPE: [] },
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
