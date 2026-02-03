import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import rateLimit from '@fastify/rate-limit';
import { AppError } from './lib/errors';
import { logger } from './utils/logger';

// Plugins
import prismaPlugin from './plugins/prisma';
import redisPlugin from './plugins/redis';
import observabilityPlugin from './plugins/observability';
import authPlugin from './plugins/auth';

// Routes
import screenRoutes from './routes/v1/screen';
import authRoutes from './routes/v1/auth';

export interface AppOptions {
  skipPlugins?: {
    prisma?: boolean;
    redis?: boolean;
    rateLimit?: boolean;
  };
}

export async function buildApp(
  options: AppOptions = {}
): Promise<FastifyInstance> {
  const app = Fastify({
    logger: false,
    trustProxy: true,
  });

  // CORS
  await app.register(cors, {
    origin: true,
    credentials: true,
  });

  // JWT
  await app.register(jwt, {
    secret: process.env.JWT_SECRET || 'dev-secret-change-me',
  });

  // Rate limiting (skip in test mode if needed)
  if (!options.skipPlugins?.rateLimit) {
    await app.register(rateLimit, {
      max: 100,
      timeWindow: '1 minute',
    });
  }

  // Observability (request logging, metrics)
  await app.register(observabilityPlugin);

  // Database
  if (!options.skipPlugins?.prisma) {
    await app.register(prismaPlugin);
  }

  // Redis (optional - graceful degradation)
  if (!options.skipPlugins?.redis) {
    await app.register(redisPlugin);
  }

  // Auth plugin
  if (!options.skipPlugins?.prisma) {
    await app.register(authPlugin);
  }

  // Health check
  app.get('/health', async (_request, reply) => {
    return reply.send({
      status: 'ok',
      timestamp: new Date().toISOString(),
      version: '0.1.0',
    });
  });

  // API v1 routes
  await app.register(screenRoutes, { prefix: '/api/v1' });
  await app.register(authRoutes, { prefix: '/api/v1' });

  // Error handler
  app.setErrorHandler(async (error, _request, reply) => {
    if (error instanceof AppError) {
      return reply.code(error.statusCode).send({
        statusCode: error.statusCode,
        code: error.code,
        message: error.message,
      });
    }

    // Fastify validation errors
    if (error.validation) {
      return reply.code(400).send({
        statusCode: 400,
        code: 'VALIDATION_ERROR',
        message: error.message,
      });
    }

    // Rate limit errors
    if (error.statusCode === 429) {
      return reply.code(429).send({
        statusCode: 429,
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests',
      });
    }

    logger.error('Unhandled error', error);

    return reply.code(500).send({
      statusCode: 500,
      code: 'INTERNAL_ERROR',
      message: 'Internal server error',
    });
  });

  return app;
}
