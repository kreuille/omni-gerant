export type ErrorCode =
  | 'VALIDATION_ERROR'
  | 'NOT_FOUND'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'CONFLICT'
  | 'INTERNAL_ERROR'
  | 'RATE_LIMITED'
  | 'SERVICE_UNAVAILABLE'
  | 'BAD_REQUEST';

export interface AppError {
  code: ErrorCode;
  message: string;
  details?: Record<string, unknown>;
}

export function appError(code: ErrorCode, message: string, details?: Record<string, unknown>): AppError {
  return { code, message, details };
}

export function notFound(entity: string, id?: string): AppError {
  return appError(
    'NOT_FOUND',
    id ? `${entity} with id ${id} not found` : `${entity} not found`,
  );
}

export function validationError(message: string, details?: Record<string, unknown>): AppError {
  return appError('VALIDATION_ERROR', message, details);
}

export function unauthorized(message = 'Authentication required'): AppError {
  return appError('UNAUTHORIZED', message);
}

export function forbidden(message = 'Insufficient permissions'): AppError {
  return appError('FORBIDDEN', message);
}

export function conflict(message: string): AppError {
  return appError('CONFLICT', message);
}
