import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import prismaPlugin from './plugins/prisma';
import redisPlugin from './plugins/redis';
import authPlugin from './plugins/auth';
import { authRoutes } from './modules/auth/routes';
import { contentRoutes } from './modules/content/routes';
import { analyticsRoutes } from './modules/analytics/routes';
import { scraperRoutes } from './modules/scraper/routes';
import { healthRoutes } from './modules/health/routes';
import { AppError, ValidationError } from './utils/errors';
import { logger } from './utils/logger';

export async function buildServer() {
  const fastify = Fastify({
    logger: false,
    trustProxy: true,
  });

  // ─── Security ────────────────────────────────────────
  await fastify.register(helmet, { contentSecurityPolicy: false });
  await fastify.register(cors, {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3120',
    credentials: true,
  });

  // ─── Infrastructure ──────────────────────────────────
  await fastify.register(prismaPlugin);
  await fastify.register(redisPlugin);
  await fastify.register(authPlugin);

  // ─── Rate Limiting ───────────────────────────────────
  await fastify.register(rateLimit, {
    max: 200,
    timeWindow: '1 minute',
  });

  // ─── Error Handler (RFC 7807) ────────────────────────
  fastify.setErrorHandler((error, request, reply) => {
    if (error instanceof ValidationError) {
      return reply.status(422).send({
        type: 'about:blank',
        title: 'Validation Error',
        status: 422,
        detail: error.message,
        errors: error.errors,
      });
    }

    if (error instanceof AppError) {
      return reply.status(error.statusCode).send({
        type: 'about:blank',
        title: error.code,
        status: error.statusCode,
        detail: error.message,
      });
    }

    logger.error('Unhandled error', { error: error.message, stack: error.stack });
    return reply.status(500).send({
      type: 'about:blank',
      title: 'Internal Server Error',
      status: 500,
      detail: 'An unexpected error occurred',
    });
  });

  // ─── Routes ──────────────────────────────────────────
  await fastify.register(healthRoutes, { prefix: '/api/v1/health' });
  await fastify.register(authRoutes, { prefix: '/api/v1/auth' });
  await fastify.register(contentRoutes, { prefix: '/api/v1/content' });
  await fastify.register(analyticsRoutes, { prefix: '/api/v1/analytics' });
  await fastify.register(scraperRoutes, { prefix: '/api/v1/scraper' });

  return fastify;
}

async function start() {
  const port = Number(process.env.PORT) || 5015;
  const host = process.env.HOST || '0.0.0.0';

  try {
    const server = await buildServer();
    await server.listen({ port, host });
    logger.info(`Viral Content Scraper API running on http://${host}:${port}`);
  } catch (err) {
    logger.error('Failed to start server', { error: (err as Error).message });
    process.exit(1);
  }
}

// Run if this is the main module
const isMain = require.main === module;
if (isMain) {
  start();
}
