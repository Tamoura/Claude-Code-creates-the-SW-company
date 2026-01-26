import { FastifyError, FastifyReply, FastifyRequest } from 'fastify';

/**
 * Custom application error class
 */
export class AppError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'AppError';
  }
}

/**
 * Global error handler for Fastify
 */
export function errorHandler(
  error: FastifyError,
  _request: FastifyRequest,
  reply: FastifyReply
): void {
  // Log the error for debugging
  console.error('Error:', error);

  // Handle custom AppError
  if (error instanceof AppError) {
    reply.status(error.statusCode).send({
      error: {
        code: error.code,
        message: error.message,
        details: error.details,
      },
    });
    return;
  }

  // Handle Prisma errors
  if (error.name === 'PrismaClientKnownRequestError') {
    const prismaError = error as unknown as { code: string; meta?: Record<string, unknown> };

    switch (prismaError.code) {
      case 'P2002':
        reply.status(409).send({
          error: {
            code: 'DUPLICATE_ENTRY',
            message: 'A record with this value already exists',
            details: prismaError.meta,
          },
        });
        return;
      case 'P2025':
        reply.status(404).send({
          error: {
            code: 'NOT_FOUND',
            message: 'Record not found',
            details: prismaError.meta,
          },
        });
        return;
      default:
        reply.status(500).send({
          error: {
            code: 'DATABASE_ERROR',
            message: 'A database error occurred',
          },
        });
        return;
    }
  }

  // Handle validation errors
  if (error.validation) {
    reply.status(400).send({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        details: { validation: error.validation },
      },
    });
    return;
  }

  // Handle generic errors
  const statusCode = error.statusCode || 500;
  const message =
    statusCode >= 500
      ? 'Internal server error'
      : error.message || 'An error occurred';

  reply.status(statusCode).send({
    error: {
      code: 'INTERNAL_ERROR',
      message,
    },
  });
}
