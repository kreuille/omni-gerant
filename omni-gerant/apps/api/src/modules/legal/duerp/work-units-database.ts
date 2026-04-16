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
