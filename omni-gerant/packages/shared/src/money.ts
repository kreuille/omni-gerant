// BUSINESS RULE [R02]: Tous les montants financiers sont des entiers (centimes). Jamais de float.

export interface Money {
  amount_cents: number;
  currency: 'EUR';
}

export function money(amount_cents: number, currency: 'EUR' = 'EUR'): Money {
  if (!Number.isInteger(amount_cents)) {
    throw new Error(`amount_cents must be an integer, got ${amount_cents}`);
  }
  return { amount_cents, currency };
}

export function addMoney(...moneys: Money[]): Money {
  if (moneys.length === 0) {
    return money(0);
  }
  const currency = moneys[0]!.currency;
  const total = moneys.reduce((sum, m) => {
    if (m.currency !== currency) {
      throw new Error(`Cannot add different currencies: ${currency} and ${m.currency}`);
    }
    return sum + m.amount_cents;
  }, 0);
  return money(total, currency);
}

export function subtractMoney(a: Money, b: Money): Money {
  if (a.currency !== b.currency) {
    throw new Error(`Cannot subtract different currencies: ${a.currency} and ${b.currency}`);
  }
  return money(a.amount_cents - b.amount_cents, a.currency);
}

export function multiplyMoney(m: Money, factor: number): Money {
  // Round to nearest centime (banker's rounding)
  return money(Math.round(m.amount_cents * factor), m.currency);
}

export function formatMoney(m: Money): string {
  const euros = Math.abs(m.amount_cents) / 100;
  const formatted = euros.toFixed(2).replace('.', ',');
  const sign = m.amount_cents < 0 ? '-' : '';
  return `${sign}${formatted} ${m.currency}`;
}

// BUSINESS RULE [CDC-2.1]: Gestion des taux de TVA multiples (20%, 10%, 5.5%) sur un meme document
// Rates are in percentage: 20 = 20%, 10 = 10%, 5.5 = 5.5%, 2.1 = 2.1%
export function tvaAmount(ht: Money, ratePercent: number): Money {
  if (ratePercent < 0) {
    throw new Error(`TVA rate must be non-negative, got ${ratePercent}`);
  }
  if (ratePercent > 100) {
    throw new Error('TVA rate seems in basis points, expected percentage (e.g. 20 for 20%)');
  }
  // ht.amount_cents * rate / 100, rounded to nearest centime
  return money(Math.round((ht.amount_cents * ratePercent) / 100), ht.currency);
}

export function ttcFromHt(ht: Money, ratePercent: number): Money {
  const tva = tvaAmount(ht, ratePercent);
  return addMoney(ht, tva);
}

export function htFromTtc(ttc: Money, ratePercent: number): Money {
  // HT = TTC / (1 + rate/100)
  const htCents = Math.round((ttc.amount_cents * 100) / (100 + ratePercent));
  return money(htCents, ttc.currency);
}

export function isZero(m: Money): boolean {
  return m.amount_cents === 0;
}

export function isPositive(m: Money): boolean {
  return m.amount_cents > 0;
}

export function isNegative(m: Money): boolean {
  return m.amount_cents < 0;
}
