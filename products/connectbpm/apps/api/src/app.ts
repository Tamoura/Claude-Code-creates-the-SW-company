/**
 * Fastify application factory.
 *
 * CONVENTION (binding for all downstream agents):
 *   `buildApp()` is the ONLY way an app instance comes into existence — tests
 *   build the same object the server does, so there is no "test wiring" that
 *   can drift from production wiring. Never call `Fastify()` anywhere else.
 *
 * Registration order matters: error handler first (so a plugin that throws is
 * rendered correctly), then request context, then infrastructure, then routes.
 */
import Fastify, { type FastifyInstance } from 'fastify';
import { loadConfig } from './config';

import errorHandlerPlugin from './plugins/error-handler';
import requestContextPlugin, { resolveRequestId } from './plugins/request-context';
import securityHeadersPlugin from './plugins/security-headers';
import corsPlugin from './plugins/cors';
import prismaPlugin from './plugins/prisma';
import redisPlugin from './plugins/redis';

import healthRoutes from './routes/health';

export interface BuildAppOptions {
  /** Skip PostgreSQL/Redis connections — for tests that need neither. */
  skipInfrastructure?: boolean;
}

export async function buildApp(
  options: BuildAppOptions = {}
): Promise<FastifyInstance> {
  const config = loadConfig();
  const isTest = config.NODE_ENV === 'test';

  const app = Fastify({
    bodyLimit: 1_048_576, // 1 MB
    // Minted here, not in a hook: the request logger's child is created from
    // this value, so a hook would be too late and every log line would carry
    // an empty reqId.
    genReqId: resolveRequestId,
    logger: isTest ? false : { level: config.LOG_LEVEL },
  });

  await app.register(errorHandlerPlugin);
  await app.register(requestContextPlugin);
  await app.register(securityHeadersPlugin);
  await app.register(corsPlugin);

  if (!options.skipInfrastructure) {
    await app.register(prismaPlugin);
    await app.register(redisPlugin);
  }

  await app.register(healthRoutes);

  // Feature routes are registered here under `/api/v1/<resource>`.
  // Downstream agents: one route module per resource, default-exported as a
  // FastifyPluginAsync, registered with an explicit prefix.

  return app;
}
