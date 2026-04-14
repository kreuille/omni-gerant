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

// BUSINESS RULE [CDC-2.1]: Gestion des taux de TVA multiples (20%, 10%, 5,5%) sur un meme document
// Rates are in basis points: 2000 = 20%, 1000 = 10%, 550 = 5.5%, 210 = 2.1%
export function tvaAmount(ht: Money, rateBasisPoints: number): Money {
  if (!Number.isInteger(rateBasisPoints) || rateBasisPoints < 0) {
    throw new Error(`TVA rate must be a non-negative integer (basis points), got ${rateBasisPoints}`);
  }
  // ht.amount_cents * rate / 10000, rounded to nearest centime
  return money(Math.round((ht.amount_cents * rateBasisPoints) / 10000), ht.currency);
}

export function ttcFromHt(ht: Money, rateBasisPoints: number): Money {
  const tva = tvaAmount(ht, rateBasisPoints);
  return addMoney(ht, tva);
}

export function htFromTtc(ttc: Money, rateBasisPoints: number): Money {
  // HT = TTC / (1 + rate/10000)
  const htCents = Math.round((ttc.amount_cents * 10000) / (10000 + rateBasisPoints));
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
