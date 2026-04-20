// BUSINESS RULE [CDC-7 / S4]: Plans zenAdmin

export type PlanCode = 'trial' | 'starter' | 'pro' | 'business';

export interface Plan {
  code: PlanCode;
  name: string;
  priceMonthlyCents: number;
  priceYearlyCents: number;
  stripeMonthlyPriceId?: string;
  stripeYearlyPriceId?: string;
  maxUsers: number;
  maxInvoicesPerMonth: number;
  maxEmployees: number;
  features: {
    paie: boolean;
    dsn: boolean;
    ppf: boolean;
    bridgeBanking: boolean;
    duerp: boolean;
    eSignature: boolean;
    support: 'email' | 'priority' | 'dedicated';
    customDomain: boolean;
  };
}

export const PLANS: Record<PlanCode, Plan> = {
  trial: {
    code: 'trial',
    name: 'Essai gratuit 14 jours',
    priceMonthlyCents: 0,
    priceYearlyCents: 0,
    maxUsers: 2,
    maxInvoicesPerMonth: 10,
    maxEmployees: 5,
    features: {
      paie: true, dsn: false, ppf: false, bridgeBanking: false,
      duerp: true, eSignature: false, support: 'email', customDomain: false,
    },
  },
  starter: {
    code: 'starter',
    name: 'Starter',
    priceMonthlyCents: 1900, // 19 EUR
    priceYearlyCents: 19000, // 190 EUR (2 mois offerts)
    stripeMonthlyPriceId: process.env['STRIPE_PRICE_STARTER_MONTHLY'],
    stripeYearlyPriceId: process.env['STRIPE_PRICE_STARTER_YEARLY'],
    maxUsers: 3,
    maxInvoicesPerMonth: 50,
    maxEmployees: 10,
    features: {
      paie: true, dsn: true, ppf: true, bridgeBanking: false,
      duerp: true, eSignature: true, support: 'email', customDomain: false,
    },
  },
  pro: {
    code: 'pro',
    name: 'Pro',
    priceMonthlyCents: 4900, // 49 EUR
    priceYearlyCents: 49000, // 490 EUR
    stripeMonthlyPriceId: process.env['STRIPE_PRICE_PRO_MONTHLY'],
    stripeYearlyPriceId: process.env['STRIPE_PRICE_PRO_YEARLY'],
    maxUsers: 10,
    maxInvoicesPerMonth: 500,
    maxEmployees: 50,
    features: {
      paie: true, dsn: true, ppf: true, bridgeBanking: true,
      duerp: true, eSignature: true, support: 'priority', customDomain: false,
    },
  },
  business: {
    code: 'business',
    name: 'Business',
    priceMonthlyCents: 12900, // 129 EUR
    priceYearlyCents: 129000, // 1290 EUR
    stripeMonthlyPriceId: process.env['STRIPE_PRICE_BUSINESS_MONTHLY'],
    stripeYearlyPriceId: process.env['STRIPE_PRICE_BUSINESS_YEARLY'],
    maxUsers: 999,
    maxInvoicesPerMonth: 99999,
    maxEmployees: 999,
    features: {
      paie: true, dsn: true, ppf: true, bridgeBanking: true,
      duerp: true, eSignature: true, support: 'dedicated', customDomain: true,
    },
  },
};

export function getPlan(code: string): Plan | null {
  return PLANS[code as PlanCode] ?? null;
}
