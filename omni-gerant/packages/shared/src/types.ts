export type UUID = string;

export interface Timestamps {
  created_at: Date;
  updated_at: Date;
}

export interface SoftDeletable {
  deleted_at: Date | null;
}

export interface TenantScoped {
  tenant_id: UUID;
}

export interface PaginationParams {
  cursor?: string;
  limit?: number;
  direction?: 'forward' | 'backward';
}

export interface PaginatedResult<T> {
  items: T[];
  next_cursor: string | null;
  has_more: boolean;
  total?: number;
}

export type SortDirection = 'asc' | 'desc';

export interface SortParams {
  field: string;
  direction: SortDirection;
}

export type Plan = 'free' | 'starter' | 'pro' | 'expert';

export type UserRole = 'owner' | 'admin' | 'member' | 'accountant';

export type TvaRate = 2000 | 1000 | 550 | 210;

export const TVA_RATES: Record<TvaRate, string> = {
  2000: '20%',
  1000: '10%',
  550: '5,5%',
  210: '2,1%',
};
