import type { Result } from '@zenadmin/shared';
import { ok, err, appError } from '@zenadmin/shared';
import type { AppError } from '@zenadmin/shared';

// BUSINESS RULE [CDC-2.2]: Client API vers service OCR Python

export interface OcrExtractedLine {
  label: string;
  quantity: number;
  unit_price_cents: number;
  tva_rate: number;
  total_ht_cents: number;
  confidence: number;
}

export interface TvaBreakdown {
  rate: number;
  base_cents: number;
  amount_cents: number;
}

export interface OcrExtractedFields {
  supplier_name: string | null;
  supplier_name_confidence: number;
  invoice_number: string | null;
  invoice_number_confidence: number;
  invoice_date: string | null;
  invoice_date_confidence: number;
  due_date: string | null;
  due_date_confidence: number;
  total_ht_cents: number | null;
  total_ht_confidence: number;
  total_tva_cents: number | null;
  total_tva_confidence: number;
  total_ttc_cents: number | null;
  total_ttc_confidence: number;
  tva_breakdown: TvaBreakdown[];
}

export interface OcrExtractionResult {
  document_type: string;
  document_type_confidence: number;
  fields: OcrExtractedFields;
  lines: OcrExtractedLine[];
  overall_confidence: number;
  raw_text: string;
  warnings: string[];
}

export interface OcrClientConfig {
  baseUrl: string;
  timeout?: number;
}

export function createOcrClient(config: OcrClientConfig) {
  const { baseUrl, timeout = 30000 } = config;

  return {
    async extractDocument(
      file: Buffer | ArrayBuffer,
      filename: string,
    ): Promise<Result<OcrExtractionResult, AppError>> {
      try {
        const formData = new FormData();
        const blob = new Blob([file]);
        formData.append('file', blob, filename);

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        const response = await fetch(`${baseUrl}/extract`, {
          method: 'POST',
          body: formData,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorBody = await response.json().catch(() => ({}));
          return err(
            appError(
              'SERVICE_UNAVAILABLE',
              `OCR service error: ${errorBody.detail ?? response.statusText}`,
            ),
          );
        }

        const result = (await response.json()) as OcrExtractionResult;
        return ok(result);
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          return err(appError('SERVICE_UNAVAILABLE', 'OCR service timeout'));
        }
        return err(
          appError(
            'SERVICE_UNAVAILABLE',
            `OCR service unavailable: ${error instanceof Error ? error.message : 'Unknown error'}`,
          ),
        );
      }
    },

    async healthCheck(): Promise<Result<{ status: string; engine: string }, AppError>> {
      try {
        const response = await fetch(`${baseUrl}/health`);
        if (!response.ok) {
          return err(appError('SERVICE_UNAVAILABLE', 'OCR service unhealthy'));
        }
        const data = (await response.json()) as { status: string; engine: string };
        return ok(data);
      } catch {
        return err(appError('SERVICE_UNAVAILABLE', 'OCR service unreachable'));
      }
    },
  };
}
