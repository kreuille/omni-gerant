import type { FastifyInstance, FastifyError } from 'fastify';
import type { AppError, ErrorCode } from '@zenadmin/shared';

// BUSINESS RULE [R13]: Format standard erreurs API
interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

const HTTP_STATUS_MAP: Record<ErrorCode, number> = {
  VALIDATION_ERROR: 400,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  RATE_LIMITED: 429,
  INTERNAL_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
};

export function registerErrorHandler(app: FastifyInstance) {
  app.setErrorHandler((error: FastifyError & { appError?: AppError }, _request, reply) => {
    // Handle AppError (business errors)
    if (error.appError) {
      const appErr = error.appError;
      const statusCode = HTTP_STATUS_MAP[appErr.code] ?? 500;
      const response: ApiErrorResponse = {
        error: {
          code: appErr.code,
          message: appErr.message,
          details: appErr.details,
        },
      };
      return reply.status(statusCode).send(response);
    }

    // Handle Fastify validation errors
    if (error.validation) {
      const response: ApiErrorResponse = {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Request validation failed',
          details: { issues: error.validation },
        },
      };
      return reply.status(400).send(response);
    }

    // Handle known HTTP errors
    if (error.statusCode && error.statusCode < 500) {
      const response: ApiErrorResponse = {
        error: {
          code: error.code ?? 'BAD_REQUEST',
          message: error.message,
        },
      };
      return reply.status(error.statusCode).send(response);
    }

    // Unknown errors - log and return generic message
    app.log.error(error, 'Unhandled error');
    const response: ApiErrorResponse = {
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred',
      },
    };
    return reply.status(500).send(response);
  });
}
