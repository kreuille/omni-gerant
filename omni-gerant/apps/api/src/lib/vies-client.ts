import type { Result } from '@zenadmin/shared';
import { ok, err, appError } from '@zenadmin/shared';
import type { AppError } from '@zenadmin/shared';

// BUSINESS RULE [CDC-11.1]: Verification N° TVA intracommunautaire via API VIES UE
// API REST: https://ec.europa.eu/taxation_customs/vies/rest-api/check-vat-number

export interface ViesCheckResult {
  valid: boolean;
  countryCode: string;
  vatNumber: string;
  name: string | null;
  address: string | null;
  requestDate: string;
}

export interface ViesClient {
  checkVatNumber(countryCode: string, vatNumber: string): Promise<Result<ViesCheckResult, AppError>>;
}

export function createViesClient(httpFetch?: typeof fetch): ViesClient {
  const fetchFn = httpFetch ?? globalThis.fetch;

  return {
    async checkVatNumber(countryCode: string, vatNumber: string): Promise<Result<ViesCheckResult, AppError>> {
      // Normalize: remove spaces, dots, dashes
      const cleanVat = vatNumber.replace(/[\s.\-]/g, '');
      const cleanCountry = countryCode.toUpperCase().trim();

      if (cleanCountry.length !== 2) {
        return err(appError('VALIDATION_ERROR', 'Country code must be 2 characters (e.g., FR, DE, ES)'));
      }

      try {
        const response = await fetchFn(
          'https://ec.europa.eu/taxation_customs/vies/rest-api/check-vat-number',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json',
            },
            body: JSON.stringify({
              countryCode: cleanCountry,
              vatNumber: cleanVat,
            }),
            signal: AbortSignal.timeout(15000),
          },
        );

        if (!response.ok) {
          if (response.status === 400) {
            return err(appError('VALIDATION_ERROR', 'Invalid VAT number format'));
          }
          return err(appError('SERVICE_UNAVAILABLE', `VIES API returned ${response.status}`));
        }

        const data = await response.json() as {
          isValid: boolean;
          requestDate: string;
          userError?: string;
          name?: string;
          address?: string;
          vatNumber: string;
          countryCode: string;
        };

        if (data.userError && data.userError !== 'VALID') {
          return err(appError('SERVICE_UNAVAILABLE', `VIES error: ${data.userError}`));
        }

        return ok({
          valid: data.isValid,
          countryCode: data.countryCode,
          vatNumber: data.vatNumber,
          name: data.name && data.name !== '---' ? data.name : null,
          address: data.address && data.address !== '---' ? data.address : null,
          requestDate: data.requestDate,
        });
      } catch (error) {
        if (error instanceof DOMException && error.name === 'TimeoutError') {
          return err(appError('SERVICE_UNAVAILABLE', 'VIES API timeout'));
        }
        return err(appError(
          'SERVICE_UNAVAILABLE',
          `VIES API error: ${error instanceof Error ? error.message : 'Unknown'}`,
        ));
      }
    },
  };
}

/**
 * Compute French TVA intracommunautaire number from SIREN.
 * Formula: FR + (12 + 3 × (SIREN mod 97)) mod 97 + SIREN
 */
export function computeFrenchTvaNumber(siren: string): string {
  const sirenNum = parseInt(siren, 10);
  if (isNaN(sirenNum) || siren.length !== 9) return '';
  const key = (12 + 3 * (sirenNum % 97)) % 97;
  return `FR${key.toString().padStart(2, '0')}${siren}`;
}
