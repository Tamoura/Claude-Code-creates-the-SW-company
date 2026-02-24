import { FastifyPluginAsync, FastifyError } from 'fastify';
import fp from 'fastify-plugin';
import { AppError, ValidationError } from '../lib/errors';
import { sendError } from '../lib/response';

const errorHandlerPlugin: FastifyPluginAsync = async (fastify) => {
  fastify.setErrorHandler((rawError: unknown, request, reply) => {
    // Cast once for type-safe property access
    const error = rawError as FastifyError & {
      validation?: Array<{ params?: { missingProperty?: string }; message?: string }>;
    };

    // Include requestId in all error responses for traceability
    const reqId = request.id as string | undefined;

    if (rawError instanceof ValidationError) {
      return sendError(
        reply,
        rawError.statusCode,
        rawError.code,
        rawError.message,
        rawError.details,
        reqId
      );
    }

    if (rawError instanceof AppError) {
      return sendError(
        reply,
        rawError.statusCode,
        rawError.code,
        rawError.message,
        undefined,
        reqId
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
        details,
        reqId
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
        'Invalid or expired token',
        undefined,
        reqId
      );
    }

    // Body too large
    if (error.code === 'FST_ERR_CTP_BODY_TOO_LARGE') {
      return sendError(reply, 413, 'BODY_TOO_LARGE', 'Request body too large', undefined, reqId);
    }

    // Multipart file too large
    if (
      error.code === 'FST_REQ_FILE_TOO_LARGE' ||
      (rawError instanceof Error && rawError.message?.includes('request file too large'))
    ) {
      return sendError(reply, 400, 'FILE_TOO_LARGE', 'File exceeds the maximum allowed size', undefined, reqId);
    }

    // Rate-limit errors: @fastify/rate-limit v9+ throws the errorResponseBuilder
    // result directly (not as an Error), so it reaches here as a plain object.
    if (
      !(rawError instanceof Error) &&
      (rawError as Record<string, unknown>)?.error &&
      ((rawError as Record<string, Record<string, unknown>>).error?.code === 'RATE_LIMITED')
    ) {
      return reply.status(429).send(rawError);
    }

    // Unexpected errors — log safe fields only (no PII)
    const msg = rawError instanceof Error ? rawError.message : String(rawError);
    const name = rawError instanceof Error ? rawError.name : 'UnknownError';
    const stack = rawError instanceof Error ? rawError.stack : undefined;
    fastify.log.error({
      message: msg,
      name,
      code: error.code,
      stack: process.env.NODE_ENV !== 'production' ? stack : undefined,
    });
    return sendError(
      reply,
      500,
      'INTERNAL_ERROR',
      process.env.NODE_ENV === 'production'
        ? 'An unexpected error occurred'
        : msg,
      undefined,
      reqId
    );
  });
};

export default fp(errorHandlerPlugin, {
  name: 'error-handler',
});
