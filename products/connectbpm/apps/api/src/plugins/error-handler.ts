/**
 * Central error handler.
 *
 * CONVENTION (binding for all downstream agents):
 *   Routes throw; they do not build error replies. The mapping itself lives in
 *   `lib/map-error.ts` as a pure function — this plugin only wires it to
 *   Fastify and logs the unexpected ones.
 */
import type { FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';
import { mapError } from '../lib/map-error';
import { sendError } from '../lib/response';

const errorHandlerPlugin: FastifyPluginAsync = async (fastify) => {
  fastify.setErrorHandler((rawError: unknown, request, reply) => {
    const isProduction = process.env.NODE_ENV === 'production';
    const payload = mapError(rawError, { requestId: request.id, isProduction });

    if (payload.status >= 500) {
      fastify.log.error({
        msg: 'Unhandled error',
        requestId: request.id,
        name: rawError instanceof Error ? rawError.name : 'UnknownError',
        detail: rawError instanceof Error ? rawError.message : String(rawError),
        stack: isProduction ? undefined : (rawError as Error).stack,
      });
    }

    return sendError(reply, payload);
  });

  fastify.setNotFoundHandler((request, reply) =>
    sendError(reply, {
      status: 404,
      code: 'NOT_FOUND',
      message: 'Resource not found',
      requestId: request.id,
    })
  );
};

export default fp(errorHandlerPlugin, { name: 'error-handler-plugin' });
