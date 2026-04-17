import { PrismaClient, Prisma } from '@prisma/client';
import { prisma } from '../client.js';

// BUSINESS RULE [R03]: tenant_id dans chaque WHERE
// BUSINESS RULE [R04]: Soft delete gere par middleware Prisma

export abstract class BaseRepository {
  protected get db(): PrismaClient {
    return prisma;
  }

  protected tenantWhere(tenantId: string): { tenant_id: string; deleted_at: null } {
    return { tenant_id: tenantId, deleted_at: null };
  }

  protected get prismaInstance(): PrismaClient {
    return prisma;
  }

  // BUSINESS RULE [R11]: Cursor-based pagination
  protected cursorPagination(cursor?: string, take: number = 20): {
    take: number;
    skip: number;
    cursor: { id: string } | undefined;
  } {
    return {
      take,
      skip: cursor ? 1 : 0,
      cursor: cursor ? { id: cursor } : undefined,
    };
  }

  // Transaction helper
  protected async transaction<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    return prisma.$transaction(fn);
  }
}
