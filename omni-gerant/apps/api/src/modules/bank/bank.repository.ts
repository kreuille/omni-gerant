import { prisma } from '@zenadmin/db';
import type { Prisma } from '@prisma/client';
import type {
  BankAccountRepository,
  BankTransactionRepository,
  BankAccount,
  BankTransaction,
  CreateBankAccountData,
  CreateTransactionData,
} from './bank.service.js';

// BUSINESS RULE [CDC-2.3]: Bank module Prisma repositories

export function createPrismaBankAccountRepository(): BankAccountRepository {
  return {
    async create(data: CreateBankAccountData): Promise<BankAccount> {
      const row = await prisma.bankAccount.create({
        data: {
          tenant_id: data.tenant_id,
          provider_id: data.provider_id ?? null,
          bank_name: data.bank_name,
          account_name: data.account_name ?? null,
          iban: data.iban ?? null,
          bic: data.bic ?? null,
          balance_cents: data.balance_cents ?? 0,
          currency: data.currency ?? 'EUR',
          status: 'active',
        },
      });
      return mapAccount(row);
    },

    async findById(id, tenantId) {
      const row = await prisma.bankAccount.findFirst({
        where: { id, tenant_id: tenantId },
      });
      return row ? mapAccount(row) : null;
    },

    async findByProviderId(providerId, tenantId) {
      const row = await prisma.bankAccount.findFirst({
        where: { provider_id: providerId, tenant_id: tenantId },
      });
      return row ? mapAccount(row) : null;
    },

    async update(id, tenantId, data) {
      const existing = await prisma.bankAccount.findFirst({
        where: { id, tenant_id: tenantId },
      });
      if (!existing) return null;
      const row = await prisma.bankAccount.update({
        where: { id },
        data: data as Prisma.BankAccountUpdateInput,
      });
      return mapAccount(row);
    },

    async softDelete(id, tenantId) {
      const existing = await prisma.bankAccount.findFirst({
        where: { id, tenant_id: tenantId },
      });
      if (!existing) return false;
      await prisma.bankAccount.delete({ where: { id } });
      return true;
    },

    async list(tenantId, query) {
      const where: Prisma.BankAccountWhereInput = { tenant_id: tenantId };
      if (query.status) where.status = query.status;

      const rows = await prisma.bankAccount.findMany({
        where,
        take: (query.limit ?? 20) + 1,
        orderBy: { created_at: 'desc' },
      });

      const limit = query.limit ?? 20;
      const hasMore = rows.length > limit;
      const items = hasMore ? rows.slice(0, limit) : rows;
      const nextCursor = hasMore && items.length > 0 ? items[items.length - 1]!.id : null;

      return { items: items.map(mapAccount), next_cursor: nextCursor, has_more: hasMore };
    },
  };
}

export function createPrismaBankTransactionRepository(): BankTransactionRepository {
  return {
    async create(data: CreateTransactionData): Promise<BankTransaction> {
      const row = await prisma.bankTransaction.create({
        data: {
          tenant_id: data.tenant_id,
          bank_account_id: data.bank_account_id,
          provider_id: data.provider_id ?? null,
          date: data.date,
          value_date: data.value_date ?? null,
          amount_cents: data.amount_cents,
          currency: data.currency ?? 'EUR',
          label: data.label,
          raw_label: data.raw_label ?? null,
          category: data.category ?? null,
          type: data.type ?? null,
          matched: false,
        },
      });
      return mapTransaction(row);
    },

    async createMany(data: CreateTransactionData[]): Promise<number> {
      const result = await prisma.bankTransaction.createMany({
        data: data.map((d) => ({
          tenant_id: d.tenant_id,
          bank_account_id: d.bank_account_id,
          provider_id: d.provider_id ?? null,
          date: d.date,
          value_date: d.value_date ?? null,
          amount_cents: d.amount_cents,
          currency: d.currency ?? 'EUR',
          label: d.label,
          raw_label: d.raw_label ?? null,
          category: d.category ?? null,
          type: d.type ?? null,
          matched: false,
        })),
      });
      return result.count;
    },

    async findById(id, tenantId) {
      const row = await prisma.bankTransaction.findFirst({
        where: { id, tenant_id: tenantId },
      });
      return row ? mapTransaction(row) : null;
    },

    async findByProviderId(providerId, bankAccountId) {
      const row = await prisma.bankTransaction.findFirst({
        where: { provider_id: providerId, bank_account_id: bankAccountId },
      });
      return row ? mapTransaction(row) : null;
    },

    async update(id, tenantId, data) {
      const existing = await prisma.bankTransaction.findFirst({
        where: { id, tenant_id: tenantId },
      });
      if (!existing) return null;
      const row = await prisma.bankTransaction.update({
        where: { id },
        data: data as Prisma.BankTransactionUpdateInput,
      });
      return mapTransaction(row);
    },

    async list(tenantId, query) {
      const where: Prisma.BankTransactionWhereInput = { tenant_id: tenantId };
      if (query.bank_account_id) where.bank_account_id = query.bank_account_id;
      if (query.type) where.type = query.type;
      if (query.category) where.category = query.category;
      if (query.matched !== undefined) where.matched = query.matched === 'true';
      if (query.search) where.label = { contains: query.search, mode: 'insensitive' };
      if (query.date_from || query.date_to) {
        where.date = {};
        if (query.date_from) (where.date as Record<string, Date>).gte = new Date(query.date_from);
        if (query.date_to) (where.date as Record<string, Date>).lte = new Date(query.date_to);
      }

      const rows = await prisma.bankTransaction.findMany({
        where,
        take: (query.limit ?? 20) + 1,
        orderBy: { date: 'desc' },
      });

      const limit = query.limit ?? 20;
      const hasMore = rows.length > limit;
      const items = hasMore ? rows.slice(0, limit) : rows;
      const nextCursor = hasMore && items.length > 0 ? items[items.length - 1]!.id : null;

      return { items: items.map(mapTransaction), next_cursor: nextCursor, has_more: hasMore };
    },
  };
}

function mapAccount(row: {
  id: string;
  tenant_id: string;
  provider_id: string | null;
  bank_name: string;
  account_name: string | null;
  iban: string | null;
  bic: string | null;
  balance_cents: number;
  currency: string;
  last_sync_at: Date | null;
  status: string;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
}): BankAccount {
  return { ...row };
}

function mapTransaction(row: {
  id: string;
  tenant_id: string;
  bank_account_id: string;
  provider_id: string | null;
  date: Date;
  value_date: Date | null;
  amount_cents: number;
  currency: string;
  label: string;
  raw_label: string | null;
  category: string | null;
  type: string | null;
  matched: boolean;
  invoice_id: string | null;
  purchase_id: string | null;
  created_at: Date;
}): BankTransaction {
  return { ...row };
}
