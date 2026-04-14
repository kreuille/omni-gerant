import { Prisma } from '@prisma/client';

// BUSINESS RULE [R04]: Soft delete uniquement (deleted_at)
// - Intercepte delete → update { deleted_at: now() }
// - Intercepte deleteMany → updateMany { deleted_at: now() }
// - Ajoute where: { deleted_at: null } sur findMany, findFirst, findUnique, count

// Models that support soft delete (have deleted_at column)
const SOFT_DELETE_MODELS = new Set([
  'Tenant',
  'User',
  'Client',
]);

export const softDeleteMiddleware: Prisma.Middleware = async (params, next) => {
  const model = params.model;
  if (!model || !SOFT_DELETE_MODELS.has(model)) {
    return next(params);
  }

  // Intercept delete → soft delete
  if (params.action === 'delete') {
    params.action = 'update';
    params.args['data'] = { deleted_at: new Date() };
    return next(params);
  }

  // Intercept deleteMany → soft delete
  if (params.action === 'deleteMany') {
    params.action = 'updateMany';
    if (params.args['data']) {
      params.args['data']['deleted_at'] = new Date();
    } else {
      params.args['data'] = { deleted_at: new Date() };
    }
    return next(params);
  }

  // Add deleted_at filter on read operations
  if (['findFirst', 'findMany', 'findUnique', 'findFirstOrThrow', 'findUniqueOrThrow', 'count', 'aggregate', 'groupBy'].includes(params.action)) {
    // Skip if explicitly querying deleted records (where includes deleted_at)
    if (params.args?.['where']?.['deleted_at'] !== undefined) {
      return next(params);
    }

    if (!params.args) {
      params.args = {};
    }
    if (!params.args['where']) {
      params.args['where'] = {};
    }
    params.args['where']['deleted_at'] = null;
  }

  // Add deleted_at filter on update operations to prevent updating deleted records
  if (['update', 'updateMany'].includes(params.action)) {
    // Only add filter if not explicitly targeting deleted records
    if (params.args?.['where']?.['deleted_at'] === undefined) {
      if (!params.args) {
        params.args = {};
      }
      if (!params.args['where']) {
        params.args['where'] = {};
      }
      params.args['where']['deleted_at'] = null;
    }
  }

  return next(params);
};
