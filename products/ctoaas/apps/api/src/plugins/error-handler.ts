import { FastifyPluginAsync, FastifyError } from 'fastify';
import fp from 'fastify-plugin';
import { ZodError } from 'zod';
import { AppError } from '../lib/errors';
import { sendError } from '../lib/response';

const errorHandlerPlugin: FastifyPluginAsync =
  async (fastify) => {
    fastify.setErrorHandler(
      (rawError: unknown, request, reply) => {
        const reqId = request.id as string | undefined;

        // AppError — application-level known errors
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

        // Zod validation errors
        if (rawError instanceof ZodError) {
          const details = rawError.issues.map((i) => ({
            field: i.path.join('.') || 'unknown',
            message: i.message,
          }));
          return sendError(
            reply,
            400,
            'VALIDATION_ERROR',
            'Validation failed',
            details,
            reqId
          );
        }

        const error = rawError as FastifyError & {
          validation?: Array<{
            params?: { missingProperty?: string };
            message?: string;
          }>;
        };

        // Fastify schema validation errors
        if (error.validation) {
          const details = error.validation.map((v) => ({
            field: String(
              v.params?.missingProperty || 'unknown'
            ),
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
          error.code ===
            'FST_JWT_NO_AUTHORIZATION_IN_HEADER' ||
          error.code ===
            'FST_JWT_AUTHORIZATION_TOKEN_EXPIRED' ||
          error.code ===
            'FST_JWT_AUTHORIZATION_TOKEN_INVALID'
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
        if (
          error.code === 'FST_ERR_CTP_BODY_TOO_LARGE'
        ) {
          return sendError(
            reply,
            413,
            'BODY_TOO_LARGE',
            'Request body too large',
            undefined,
            reqId
          );
        }

        // Rate-limit errors from @fastify/rate-limit v9+
        if (
          !(rawError instanceof Error) &&
          (rawError as Record<string, unknown>)?.error &&
          (
            rawError as Record<
              string,
              Record<string, unknown>
            >
          ).error?.code === 'RATE_LIMITED'
        ) {
          return reply.status(429).send(rawError);
        }

        // Unexpected errors — log safe fields only
        const msg =
          rawError instanceof Error
            ? rawError.message
            : String(rawError);
        const name =
          rawError instanceof Error
            ? rawError.name
            : 'UnknownError';
        const stack =
          rawError instanceof Error
            ? rawError.stack
            : undefined;
        fastify.log.error({
          message: msg,
          name,
          code: error.code,
          stack:
            process.env.NODE_ENV !== 'production'
              ? stack
              : undefined,
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
      }
    );
  };

export default fp(errorHandlerPlugin, {
  name: 'error-handler',
});
