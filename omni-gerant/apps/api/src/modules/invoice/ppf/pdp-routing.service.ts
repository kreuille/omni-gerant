// BUSINESS RULE [CDC-2.1 / BL5]: Routing PPF vs PDP (Plateformes de Dematerialisation Partenaires)
//
// La reforme 2026 permet a l'emetteur de choisir :
//   - PPF (Portail Public de Facturation, gratuit, operateur AIFE/Chorus Pro)
//   - PDP (Plateforme Dematerialisation Partenaire agreee, payante, valeur ajoutee)
//
// PDP agreees connues (liste non exhaustive, a date 2026) :
//   - Pennylane (ID officiel : en cours)
//   - Docaposte (ID officiel : AIFE-001)
//   - Yooz (ID officiel : AIFE-023)
//   - Basware / Jefacture / Freedz / Esker / Generix
//
// Le routing final depend du choix du RECEVEUR (destinataire) sauf B2C.
// PPF consulte un annuaire centralise pour trouver la PDP du destinataire.
// L'emetteur ne choisit que sa PDP pour l'emission (ou PPF si pas de PDP).

import type { Result, AppError } from '@zenadmin/shared';
import { ok, err, validationError } from '@zenadmin/shared';

export type PlatformType = 'PPF' | 'PDP';

export interface PlatformConfig {
  type: PlatformType;
  id: string;           // identifiant officiel ex "PPF" ou "AIFE-023"
  name: string;         // nom affiche
  apiUrl: string;       // base URL API
  requiresApiKey: boolean;
  supportedFormats: Array<'factur-x' | 'ubl' | 'cii'>;
  certifiedUntil?: Date; // date fin agrement PDP
}

export const KNOWN_PLATFORMS: PlatformConfig[] = [
  {
    type: 'PPF',
    id: 'PPF',
    name: 'Portail Public de Facturation (PPF)',
    apiUrl: 'https://api-sandbox.ppf.gouv.fr',
    requiresApiKey: true,
    supportedFormats: ['factur-x', 'ubl', 'cii'],
  },
  {
    type: 'PDP',
    id: 'PDP-DOCAPOSTE',
    name: 'Docaposte (PDP agreee)',
    apiUrl: 'https://api.docaposte.fr/pdp',
    requiresApiKey: true,
    supportedFormats: ['factur-x', 'ubl'],
  },
  {
    type: 'PDP',
    id: 'PDP-PENNYLANE',
    name: 'Pennylane (PDP en cours d\'agrement)',
    apiUrl: 'https://api.pennylane.com/pdp',
    requiresApiKey: true,
    supportedFormats: ['factur-x'],
  },
  {
    type: 'PDP',
    id: 'PDP-YOOZ',
    name: 'Yooz (PDP agreee AIFE-023)',
    apiUrl: 'https://api.getyooz.com/pdp',
    requiresApiKey: true,
    supportedFormats: ['factur-x', 'ubl'],
  },
  {
    type: 'PDP',
    id: 'PDP-BASWARE',
    name: 'Basware (PDP agreee)',
    apiUrl: 'https://api.basware.com/pdp',
    requiresApiKey: true,
    supportedFormats: ['factur-x', 'ubl', 'cii'],
  },
];

export interface PlatformCredentials {
  platformId: string;
  apiKey: string;
  technicalId?: string;
}

/**
 * Selectionne la plateforme emettrice selon la config tenant.
 * Fallback : PPF si rien configure.
 */
export function selectEmitterPlatform(tenantPreferredPlatformId?: string | null): PlatformConfig {
  if (tenantPreferredPlatformId) {
    const found = KNOWN_PLATFORMS.find((p) => p.id === tenantPreferredPlatformId);
    if (found) return found;
  }
  return KNOWN_PLATFORMS[0]!; // PPF par defaut
}

/**
 * Lookup annuaire destinataire via PPF (simulateur).
 * En production : appel api PPF /directory/receiver?siret=XXX retourne la PDP du destinataire.
 */
export async function lookupReceiverPlatform(receiverSiret: string): Promise<Result<PlatformConfig, AppError>> {
  if (!receiverSiret || receiverSiret.length !== 14) {
    return err(validationError('SIRET destinataire invalide'));
  }
  // Simulation : PPF par defaut. En prod : appel reel au service annuaire.
  return ok(KNOWN_PLATFORMS[0]!);
}

/**
 * Verifie la compatibilite format entre emetteur et destinataire.
 */
export function checkFormatCompatibility(
  emitter: PlatformConfig,
  receiver: PlatformConfig,
  format: 'factur-x' | 'ubl' | 'cii',
): { compatible: boolean; reason?: string } {
  if (!emitter.supportedFormats.includes(format)) {
    return { compatible: false, reason: `Format ${format} non supporte par ${emitter.name}` };
  }
  if (!receiver.supportedFormats.includes(format)) {
    return { compatible: false, reason: `Format ${format} non supporte par destinataire (${receiver.name})` };
  }
  return { compatible: true };
}
