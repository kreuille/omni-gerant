// BUSINESS RULE [CDC-3.1]: Configuration SWR pour cache frontend

// @ts-ignore - swr may not be installed yet
import type { SWRConfiguration } from 'swr';

/**
 * Default SWR configuration for the application
 */
export const swrConfig: SWRConfiguration = {
  revalidateOnFocus: true,
  revalidateOnReconnect: true,
  dedupingInterval: 5000,      // Dedupe requests within 5s
  errorRetryCount: 3,
  errorRetryInterval: 5000,
  shouldRetryOnError: true,
};

/**
 * Preset configurations for different data types
 */
export const SWR_PRESETS = {
  /** Dashboard KPIs - cache 5 min, refresh on focus */
  dashboard: {
    refreshInterval: 5 * 60 * 1000, // 5 min auto-refresh
    dedupingInterval: 30_000,
  },

  /** Lists (clients, products) - cache 1 min */
  list: {
    refreshInterval: 60 * 1000,
    dedupingInterval: 10_000,
  },

  /** SIRET lookup - cache 24h, no auto-refresh */
  siretLookup: {
    refreshInterval: 0,
    dedupingInterval: 24 * 60 * 60 * 1000,
    revalidateOnFocus: false,
  },

  /** Real-time data (bank sync) - frequent refresh */
  realtime: {
    refreshInterval: 30 * 1000,
    dedupingInterval: 5000,
  },

  /** Static config - rarely changes */
  config: {
    refreshInterval: 10 * 60 * 1000,
    dedupingInterval: 60_000,
    revalidateOnFocus: false,
  },
} as const;

/**
 * API fetcher for SWR
 */
export async function fetcher<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    const error = new Error('An error occurred while fetching the data.');
    throw error;
  }
  return res.json() as Promise<T>;
}
