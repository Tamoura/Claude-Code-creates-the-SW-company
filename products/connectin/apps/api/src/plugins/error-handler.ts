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

    // Unexpected errors
    fastify.log.error(error);
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
