import { createHmac, timingSafeEqual } from 'crypto';

// BUSINESS RULE [CDC-3.2]: Client API PPF/AIFE (Portail Public de Facturation)
// BUSINESS RULE [CDC-2.1]: Transmission automatique au PPF ou via PDP

export interface PpfConfig {
  api_url: string;
  api_key: string;
  technical_id: string; // Identifiant technique PDP/PPF
  webhook_secret: string;
  environment: 'sandbox' | 'production';
}

export interface PpfInvoiceSubmission {
  sender_siret: string;
  receiver_siret: string;
  invoice_number: string;
  invoice_date: string; // YYYY-MM-DD
  amount_ht_cents: number;
  amount_ttc_cents: number;
  tax_amount_cents: number;
  facturx_xml: string; // Factur-X XML content
  pdf_base64?: string; // PDF/A-3 with embedded XML
}

export type PpfStatus =
  | 'deposee'
  | 'en_cours_traitement'
  | 'acceptee'
  | 'refusee'
  | 'mise_a_disposition'
  | 'encaissee';

export interface PpfStatusResponse {
  invoice_id: string;
  ppf_id: string;
  status: PpfStatus;
  status_date: string;
  rejection_reason?: string;
}

export interface PpfDirectoryEntry {
  siret: string;
  company_name: string;
  e_invoicing_address: string;
  platform: 'ppf' | 'pdp';
  pdp_name?: string;
  active: boolean;
}

export interface PpfIncomingInvoice {
  ppf_id: string;
  sender_siret: string;
  sender_name: string;
  invoice_number: string;
  invoice_date: string;
  amount_ht_cents: number;
  amount_ttc_cents: number;
  tax_amount_cents: number;
  facturx_xml: string;
  pdf_url?: string;
  received_at: string;
}

export function createPpfClient(config: PpfConfig) {
  const headers = {
    'Authorization': `Bearer ${config.api_key}`,
    'X-Technical-Id': config.technical_id,
    'Content-Type': 'application/json',
  };

  async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
    const response = await fetch(`${config.api_url}${path}`, {
      ...options,
      headers: { ...headers, ...options.headers },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`PPF API error: ${response.status} ${error}`);
    }

    return response.json() as Promise<T>;
  }

  return {
    /**
     * Submit an invoice to PPF
     */
    async submitInvoice(submission: PpfInvoiceSubmission): Promise<{ ppf_id: string; status: PpfStatus }> {
      return apiRequest<{ ppf_id: string; status: PpfStatus }>('/v1/invoices', {
        method: 'POST',
        body: JSON.stringify({
          sender: { siret: submission.sender_siret },
          receiver: { siret: submission.receiver_siret },
          invoice: {
            number: submission.invoice_number,
            date: submission.invoice_date,
            amount_ht: submission.amount_ht_cents,
            amount_ttc: submission.amount_ttc_cents,
            tax_amount: submission.tax_amount_cents,
          },
          facturx_xml: submission.facturx_xml,
          pdf_base64: submission.pdf_base64,
        }),
      });
    },

    /**
     * Get invoice status from PPF
     */
    async getInvoiceStatus(ppfId: string): Promise<PpfStatusResponse> {
      return apiRequest<PpfStatusResponse>(`/v1/invoices/${ppfId}/status`);
    },

    /**
     * Lookup SIRET in PPF directory (annuaire)
     */
    async lookupDirectory(siret: string): Promise<PpfDirectoryEntry | null> {
      try {
        return await apiRequest<PpfDirectoryEntry>(`/v1/directory/${siret}`);
      } catch {
        return null;
      }
    },

    /**
     * List incoming invoices
     */
    async listIncomingInvoices(since?: string): Promise<PpfIncomingInvoice[]> {
      const query = since ? `?since=${encodeURIComponent(since)}` : '';
      const result = await apiRequest<{ invoices: PpfIncomingInvoice[] }>(`/v1/invoices/incoming${query}`);
      return result.invoices;
    },

    /**
     * Download Factur-X XML for an incoming invoice
     */
    async downloadInvoiceXml(ppfId: string): Promise<string> {
      return apiRequest<string>(`/v1/invoices/${ppfId}/facturx`);
    },

    /**
     * Verify webhook signature from PPF
     */
    verifyWebhookSignature(payload: string, signature: string): boolean {
      if (!signature) return false;
      try {
        const expected = createHmac('sha256', config.webhook_secret)
          .update(payload)
          .digest('hex');
        const sig = signature.startsWith('sha256=') ? signature.slice(7) : signature;
        return timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(sig, 'hex'));
      } catch {
        return false;
      }
    },
  };
}
