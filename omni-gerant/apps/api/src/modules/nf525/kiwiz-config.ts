// BUSINESS RULE [NF525-K0]: Configuration Kiwiz pour certification NF525
// L'integration Kiwiz est optionnelle - si les credentials ne sont pas configures,
// le systeme fonctionne sans certification NF525.

export interface KiwizConfig {
  apiUrl: string;
  username: string;
  password: string;
  subscriptionId: string;
}

/**
 * Load Kiwiz configuration from environment variables.
 * Throws if required credentials (username/password) are missing.
 */
export function loadKiwizConfig(): KiwizConfig {
  const username = process.env.KIWIZ_USERNAME;
  const password = process.env.KIWIZ_PASSWORD;

  if (!username || !password) {
    throw new Error(
      'Kiwiz configuration error: KIWIZ_USERNAME and KIWIZ_PASSWORD are required. ' +
      'Set these environment variables or use loadKiwizConfigSafe() for optional integration.',
    );
  }

  return {
    apiUrl: process.env.KIWIZ_API_URL || 'https://api.kiwiz.io',
    username,
    password,
    subscriptionId: process.env.KIWIZ_SUBSCRIPTION_ID || '',
  };
}

/**
 * Load Kiwiz configuration safely - returns null if credentials are not set.
 * Use this when Kiwiz integration is optional.
 */
export function loadKiwizConfigSafe(): KiwizConfig | null {
  const username = process.env.KIWIZ_USERNAME;
  const password = process.env.KIWIZ_PASSWORD;

  if (!username || !password) {
    return null;
  }

  return {
    apiUrl: process.env.KIWIZ_API_URL || 'https://api.kiwiz.io',
    username,
    password,
    subscriptionId: process.env.KIWIZ_SUBSCRIPTION_ID || '',
  };
}
