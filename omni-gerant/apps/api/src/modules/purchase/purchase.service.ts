import type { Result, PaginatedResult } from '@omni-gerant/shared';
import { ok, err, notFound, validationError, appError } from '@omni-gerant/shared';
import type { AppError } from '@omni-gerant/shared';
import type {
  CreatePurchaseInput,
  UpdatePurchaseInput,
  PurchaseListQuery,
  PurchaseLineInput,
} from './purchase.schemas.js';

// BUSINESS RULE [CDC-2.2]: Gestion des achats fournisseurs
// BUSINESS RULE [R02]: Montants en centimes
// BUSINESS RULE [R03]: Multi-tenant

export interface PurchaseLine {
  id: string;
  purchase_id: string;
  position: number;
  label: string;
  quantity: number;
  unit_price_cents: number;
  tva_rate: number;
  total_ht_cents: number;
}

export interface Purchase {
  id: string;
  tenant_id: string;
  supplier_id: string | null;
  number: string | null;
  status: string;
  source: string;
  issue_date: Date | null;
  due_date: Date | null;
  total_ht_cents: number;
  total_tva_cents: number;
  total_ttc_cents: number;
  paid_cents: number;
  category: string | null;
  notes: string | null;
  document_url: string | null;
  ocr_data: Record<string, unknown> | null;
  ocr_confidence: number | null;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
  lines: PurchaseLine[];
}

export interface PurchaseRepository {
  create(data: {
    tenant_id: string;
    supplier_id?: string | null;
    number?: string | null;
    source: string;
    issue_date?: Date | null;
    due_date?: Date | null;
    total_ht_cents: number;
    total_tva_cents: number;
    total_ttc_cents: number;
    category?: string | null;
    notes?: string | null;
    document_url?: string | null;
    lines: PurchaseLineInput[];
  }): Promise<Purchase>;
  findById(id: string, tenantId: string): Promise<Purchase | null>;
  update(id: string, tenantId: string, data: UpdatePurchaseInput & {
    total_ht_cents?: number;
    total_tva_cents?: number;
    total_ttc_cents?: number;
  }): Promise<Purchase | null>;
  updateStatus(id: string, tenantId: string, status: string): Promise<Purchase | null>;
  updatePayment(id: string, tenantId: string, paidCents: number): Promise<Purchase | null>;
  softDelete(id: string, tenantId: string): Promise<boolean>;
  list(tenantId: string, query: PurchaseListQuery): Promise<{ items: Purchase[]; next_cursor: string | null; has_more: boolean }>;
}

// BUSINESS RULE [R02]: Calcul montants en centimes - jamais de float
export function calculatePurchaseLineTotals(lines: PurchaseLineInput[]): {
  total_ht_cents: number;
  total_tva_cents: number;
  total_ttc_cents: number;
  computed_lines: Array<PurchaseLineInput & { total_ht_cents: number }>;
} {
  let total_ht_cents = 0;
  let total_tva_cents = 0;

  const computed_lines = lines.map((line) => {
    const line_ht = Math.round(line.quantity * line.unit_price_cents);
    const line_tva = Math.round((line_ht * line.tva_rate) / 100);
    total_ht_cents += line_ht;
    total_tva_cents += line_tva;
    return { ...line, total_ht_cents: line_ht };
  });

  return {
    total_ht_cents,
    total_tva_cents,
    total_ttc_cents: total_ht_cents + total_tva_cents,
    computed_lines,
  };
}

// BUSINESS RULE [CDC-2.2]: Statut paiement : pending -> validated -> paid
const VALID_TRANSITIONS: Record<string, string[]> = {
  pending: ['validated', 'disputed'],
  validated: ['paid', 'disputed', 'pending'],
  disputed: ['pending', 'validated'],
  paid: [],
};

export function createPurchaseService(repo: PurchaseRepository) {
  return {
    async create(
      tenantId: string,
      input: CreatePurchaseInput,
    ): Promise<Result<Purchase, AppError>> {
      const { total_ht_cents, total_tva_cents, total_ttc_cents, computed_lines } =
        calculatePurchaseLineTotals(input.lines);

      const purchase = await repo.create({
        tenant_id: tenantId,
        supplier_id: input.supplier_id ?? null,
        number: input.number ?? null,
        source: input.source ?? 'manual',
        issue_date: input.issue_date ? new Date(input.issue_date) : null,
        due_date: input.due_date ? new Date(input.due_date) : null,
        total_ht_cents,
        total_tva_cents,
        total_ttc_cents,
        category: input.category ?? null,
        notes: input.notes ?? null,
        document_url: input.document_url ?? null,
        lines: computed_lines,
      });

      return ok(purchase);
    },

    async getById(id: string, tenantId: string): Promise<Result<Purchase, AppError>> {
      const purchase = await repo.findById(id, tenantId);
      if (!purchase) {
        return err(notFound('Purchase', id));
      }
      return ok(purchase);
    },

    async update(
      id: string,
      tenantId: string,
      input: UpdatePurchaseInput,
    ): Promise<Result<Purchase, AppError>> {
      const existing = await repo.findById(id, tenantId);
      if (!existing) {
        return err(notFound('Purchase', id));
      }

      // BUSINESS RULE: Cannot update a paid purchase
      if (existing.status === 'paid') {
        return err(appError('FORBIDDEN', 'Cannot update a paid purchase'));
      }

      let totals = {};
      if (input.lines) {
        const calculated = calculatePurchaseLineTotals(input.lines);
        totals = {
          total_ht_cents: calculated.total_ht_cents,
          total_tva_cents: calculated.total_tva_cents,
          total_ttc_cents: calculated.total_ttc_cents,
        };
      }

      const updated = await repo.update(id, tenantId, { ...input, ...totals });
      if (!updated) {
        return err(notFound('Purchase', id));
      }
      return ok(updated);
    },

    async validate(
      id: string,
      tenantId: string,
      newStatus: string,
    ): Promise<Result<Purchase, AppError>> {
      const existing = await repo.findById(id, tenantId);
      if (!existing) {
        return err(notFound('Purchase', id));
      }

      const allowedTransitions = VALID_TRANSITIONS[existing.status] ?? [];
      if (!allowedTransitions.includes(newStatus)) {
        return err(
          validationError(
            `Cannot transition from '${existing.status}' to '${newStatus}'`,
          ),
        );
      }

      const updated = await repo.updateStatus(id, tenantId, newStatus);
      if (!updated) {
        return err(notFound('Purchase', id));
      }
      return ok(updated);
    },

    async markPaid(
      id: string,
      tenantId: string,
      amountCents: number,
    ): Promise<Result<Purchase, AppError>> {
      const existing = await repo.findById(id, tenantId);
      if (!existing) {
        return err(notFound('Purchase', id));
      }

      if (existing.status !== 'validated') {
        return err(validationError('Purchase must be validated before payment'));
      }

      if (amountCents <= 0) {
        return err(validationError('Payment amount must be positive'));
      }

      const newPaid = existing.paid_cents + amountCents;
      if (newPaid > existing.total_ttc_cents) {
        return err(validationError('Payment exceeds total amount'));
      }

      const updated = await repo.updatePayment(id, tenantId, newPaid);
      if (!updated) {
        return err(notFound('Purchase', id));
      }

      // BUSINESS RULE: Auto-transition to paid when fully paid
      if (newPaid === existing.total_ttc_cents) {
        const paid = await repo.updateStatus(id, tenantId, 'paid');
        if (paid) return ok(paid);
      }

      return ok(updated);
    },

    async delete(id: string, tenantId: string): Promise<Result<void, AppError>> {
      const existing = await repo.findById(id, tenantId);
      if (!existing) {
        return err(notFound('Purchase', id));
      }

      if (existing.status === 'paid') {
        return err(appError('FORBIDDEN', 'Cannot delete a paid purchase'));
      }

      await repo.softDelete(id, tenantId);
      return ok(undefined);
    },

    async list(
      tenantId: string,
      query: PurchaseListQuery,
    ): Promise<Result<PaginatedResult<Purchase>, AppError>> {
      const result = await repo.list(tenantId, query);
      return ok({
        items: result.items,
        next_cursor: result.next_cursor,
        has_more: result.has_more,
      });
    },

    // BUSINESS RULE [CDC-2.2]: Dashboard achats - factures a payer
    async getDueThisWeek(tenantId: string): Promise<Result<Purchase[], AppError>> {
      const now = new Date();
      const endOfWeek = new Date(now);
      endOfWeek.setDate(now.getDate() + (7 - now.getDay()));
      endOfWeek.setHours(23, 59, 59, 999);

      const result = await repo.list(tenantId, {
        status: 'validated',
        due_before: endOfWeek.toISOString(),
        limit: 100,
        sort_by: 'due_date',
        sort_dir: 'asc',
      });

      return ok(result.items);
    },
  };
}
