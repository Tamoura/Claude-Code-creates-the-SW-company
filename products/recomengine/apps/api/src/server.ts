import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import cookie from '@fastify/cookie';
import rateLimit from '@fastify/rate-limit';
import { logger } from './utils/logger';
import { AppError } from './utils/errors';

// Plugins
import prismaPlugin from './plugins/prisma';
import redisPlugin from './plugins/redis';
import authPlugin from './plugins/auth';
import observabilityPlugin from './plugins/observability';

// Routes
import healthRoutes from './modules/health/routes';
import authRoutes from './modules/auth/routes';
import tenantRoutes from './modules/tenants/routes';
import apiKeyRoutes from './modules/api-keys/routes';
import eventRoutes from './modules/events/routes';
import catalogRoutes from './modules/catalog/routes';
import recommendationRoutes from './modules/recommendations/routes';
import experimentRoutes from './modules/experiments/routes';
import analyticsRoutes from './modules/analytics/routes';
import widgetRoutes from './modules/widgets/routes';

const PORT = parseInt(process.env.PORT || '5008', 10);
const HOST = process.env.HOST || '0.0.0.0';

export async function buildServer() {
  const fastify = Fastify({
    logger: false,
    trustProxy: true,
  });

  // Security
  await fastify.register(helmet, { contentSecurityPolicy: false });
  await fastify.register(cors, {
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key', 'X-Request-ID'],
  });
  await fastify.register(cookie);

  // Infrastructure plugins (order matters)
  await fastify.register(prismaPlugin);
  await fastify.register(redisPlugin);
  await fastify.register(observabilityPlugin);
  await fastify.register(authPlugin);

  // Rate limiting
  await fastify.register(rateLimit, {
    max: 1000,
    timeWindow: '1 minute',
    keyGenerator: (request) => {
      return (request.headers['x-api-key'] as string) || request.ip;
    },
  });

  // RFC 7807 error handler
  fastify.setErrorHandler((error, request, reply) => {
    if (error instanceof AppError) {
      return reply.status(error.statusCode).send({
        type: `https://api.recomengine.com/errors/${error.code.toLowerCase().replace(/_/g, '-')}`,
        title: error.name.replace('Error', ''),
        status: error.statusCode,
        detail: error.message,
        ...('errors' in error ? { errors: (error as any).errors } : {}),
      });
    }

    if (error.statusCode === 429) {
      return reply.status(429).send({
        type: 'https://api.recomengine.com/errors/rate-limit-exceeded',
        title: 'Too Many Requests',
        status: 429,
        detail: 'Rate limit exceeded. Please try again later.',
      });
    }

    logger.error('Unhandled error', error);
    return reply.status(500).send({
      type: 'https://api.recomengine.com/errors/internal-server-error',
      title: 'Internal Server Error',
      status: 500,
      detail: 'An unexpected error occurred',
    });
  });

  // Routes
  await fastify.register(healthRoutes);
  await fastify.register(authRoutes, { prefix: '/api/v1/auth' });
  await fastify.register(tenantRoutes, { prefix: '/api/v1/tenants' });
  await fastify.register(apiKeyRoutes, { prefix: '/api/v1/tenants' });
  await fastify.register(eventRoutes, { prefix: '/api/v1/events' });
  await fastify.register(catalogRoutes, { prefix: '/api/v1/catalog' });
  await fastify.register(recommendationRoutes, { prefix: '/api/v1/recommendations' });
  await fastify.register(experimentRoutes, { prefix: '/api/v1/tenants' });
  await fastify.register(analyticsRoutes, { prefix: '/api/v1/tenants' });
  await fastify.register(widgetRoutes, { prefix: '/api/v1/tenants' });

  return fastify;
}

async function start() {
  try {
    const server = await buildServer();
    await server.listen({ port: PORT, host: HOST });
    logger.info(`RecomEngine API running on port ${PORT}`);
  } catch (err) {
    logger.error('Failed to start server', err);
    process.exit(1);
  }
}

if (require.main === module) {
  start();
}
