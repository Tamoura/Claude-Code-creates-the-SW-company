import { FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';
import { AppError, ValidationError } from '../lib/errors';
import { sendError } from '../lib/response';

const errorHandlerPlugin: FastifyPluginAsync = async (fastify) => {
  fastify.setErrorHandler((error, _request, reply) => {
    if (error instanceof ValidationError) {
      return sendError(
        reply,
        error.statusCode,
        error.code,
        error.message,
        error.details
      );
    }

    if (error instanceof AppError) {
      return sendError(
        reply,
        error.statusCode,
        error.code,
        error.message
      );
    }

    // Fastify validation errors (from schema validation)
    if (error.validation) {
      const details = error.validation.map((v) => ({
        field: String(v.params?.missingProperty || 'unknown'),
        message: v.message || 'Invalid value',
      }));
      return sendError(
        reply,
        422,
        'VALIDATION_ERROR',
        'Validation failed',
        details
      );
    }

    // JWT errors
    if (
      error.code === 'FST_JWT_NO_AUTHORIZATION_IN_HEADER' ||
      error.code === 'FST_JWT_AUTHORIZATION_TOKEN_EXPIRED' ||
      error.code === 'FST_JWT_AUTHORIZATION_TOKEN_INVALID'
    ) {
      return sendError(
        reply,
        401,
        'UNAUTHORIZED',
        'Invalid or expired token'
      );
    }

    // Rate-limit errors: @fastify/rate-limit v9 throws the errorResponseBuilder
    // result directly (not as an Error), so it reaches here as a plain object.
    if (
      !(error instanceof Error) &&
      (error as any)?.error?.code === 'RATE_LIMITED'
    ) {
      return reply.status(429).send(error);
    }

    // Unexpected errors — log safe fields only (no PII)
    fastify.log.error({
      message: error.message,
      name: error.name,
      code: (error as any).code,
      stack: process.env.NODE_ENV !== 'production' ? error.stack : undefined,
    });
    return sendError(
      reply,
      500,
      'INTERNAL_ERROR',
      process.env.NODE_ENV === 'production'
        ? 'An unexpected error occurred'
        : error.message
    );
  });
};

export default fp(errorHandlerPlugin, {
  name: 'error-handler',
});
