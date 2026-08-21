import Fastify, { type FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';

import prismaPlugin from './plugins/prisma';
import taskRoutes from './routes/task.routes';
import healthRoutes from './routes/health.routes';
import { registerErrorHandling } from './lib/error-handler';

export interface BuildAppOptions {
  logger?: boolean | object;
}

/**
 * Builds the Fastify instance: security headers, CORS for the web app, the
 * error boundary, then the /api/v1 routes. Tests build the same app with
 * `logger: false` and drive it through `app.inject`.
 */
export async function buildApp(opts: BuildAppOptions = {}): Promise<FastifyInstance> {
  const app = Fastify({
    logger: opts.logger ?? false,
    bodyLimit: 1_048_576,
    requestTimeout: 30_000,
  });

  await registerSecurity(app);
  await app.register(prismaPlugin);

  registerErrorHandling(app);

  await app.register(
    async (api) => {
      await api.register(healthRoutes);
      await api.register(taskRoutes);
    },
    { prefix: '/api/v1' }
  );

  return app;
}

/** CORS for the web app plus a conservative set of security headers. */
async function registerSecurity(app: FastifyInstance): Promise<void> {
  const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:3100')
    .split(',')
    .map((origin) => origin.trim());

  await app.register(cors, {
    origin: allowedOrigins,
    methods: ['GET', 'HEAD', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  });

  await app.register(helmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        objectSrc: ["'none'"],
        frameAncestors: ["'none'"],
        baseUri: ["'self'"],
      },
    },
  });
}
