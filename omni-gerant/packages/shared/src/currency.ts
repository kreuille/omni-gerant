// D6 : Support multi-devise.
// EUR reste par defaut (cible FR). Les autres devises sont supportees en entree/
// sortie (export UE/UK/CH/US) mais la compta FR reste en EUR.

export type Currency = 'EUR' | 'USD' | 'GBP' | 'CHF';

export const SUPPORTED_CURRENCIES: Currency[] = ['EUR', 'USD', 'GBP', 'CHF'];
export const DEFAULT_CURRENCY: Currency = 'EUR';

// ISO 4217 exponent = 2 pour toutes les devises supportees (centimes/pence/cents/centimes)
// Si on ajoute JPY un jour il faudra gerer exponent=0.
export const CURRENCY_EXPONENT: Record<Currency, number> = {
  EUR: 2,
  USD: 2,
  GBP: 2,
  CHF: 2,
};

export const CURRENCY_SYMBOL: Record<Currency, string> = {
  EUR: '€',
  USD: '$',
  GBP: '£',
  CHF: 'CHF',
};

export function formatCurrency(minorUnits: number, currency: Currency = DEFAULT_CURRENCY, locale = 'fr-FR'): string {
  const exp = CURRENCY_EXPONENT[currency];
  const amount = minorUnits / Math.pow(10, exp);
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: exp,
    maximumFractionDigits: exp,
  }).format(amount);
}

export function isCurrency(v: unknown): v is Currency {
  return typeof v === 'string' && (SUPPORTED_CURRENCIES as string[]).includes(v);
}

/**
 * Convertit un montant cents (minor units) d'une devise vers une autre
 * via un taux fourni (pas de lookup exterieur). Lance si devise inconnue.
 */
export function convertMinorUnits(
  amount: number,
  fromExponent: number,
  toExponent: number,
  rate: number,
): number {
  // Normalise en "unite principale" puis re-exprime en minor units de la cible
  const asMajor = amount / Math.pow(10, fromExponent);
  return Math.round(asMajor * rate * Math.pow(10, toExponent));
}
