// BUSINESS RULE [CDC-2.1]: Tracking "Le client a ouvert le devis"

export interface TrackingEvent {
  id: string;
  quote_id: string;
  tenant_id: string;
  event_type: 'sent' | 'viewed' | 'signed' | 'refused' | 'expired' | 'duplicated';
  actor: string; // user_id or 'client' or 'system'
  ip_address: string | null;
  user_agent: string | null;
  metadata: Record<string, unknown> | null;
  created_at: Date;
}

export interface TrackingRepository {
  create(data: {
    quote_id: string;
    tenant_id: string;
    event_type: TrackingEvent['event_type'];
    actor: string;
    ip_address?: string;
    user_agent?: string;
    metadata?: Record<string, unknown>;
  }): Promise<TrackingEvent>;
  findByQuote(quoteId: string, tenantId: string): Promise<TrackingEvent[]>;
}

export function createTrackingService(repo: TrackingRepository) {
  return {
    async track(data: {
      quote_id: string;
      tenant_id: string;
      event_type: TrackingEvent['event_type'];
      actor: string;
      ip_address?: string;
      user_agent?: string;
      metadata?: Record<string, unknown>;
    }): Promise<TrackingEvent> {
      return repo.create(data);
    },

    async getTimeline(quoteId: string, tenantId: string): Promise<TrackingEvent[]> {
      return repo.findByQuote(quoteId, tenantId);
    },
  };
}
