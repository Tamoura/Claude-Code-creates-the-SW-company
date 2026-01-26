import Fastify, { FastifyServerOptions } from 'fastify';
import prismaPlugin from './plugins/prisma.js';
import corsPlugin from './plugins/cors.js';
import authPlugin from './plugins/auth.js';
import errorHandlerPlugin from './plugins/error-handler.js';
import healthRoute from './routes/health.js';
import incidentsRoutes from './routes/incidents/index.js';

export function buildApp(opts: FastifyServerOptions = {}) {
  const fastify = Fastify({
    logger: {
      level: process.env.NODE_ENV === 'test' ? 'silent' : 'info',
    },
    ...opts,
  });

  // Register plugins
  fastify.register(prismaPlugin);
  fastify.register(corsPlugin);
  fastify.register(authPlugin);
  fastify.register(errorHandlerPlugin);

  // Register routes
  fastify.register(healthRoute);
  fastify.register(incidentsRoutes, { prefix: '/api/v1' });

  return fastify;
}
