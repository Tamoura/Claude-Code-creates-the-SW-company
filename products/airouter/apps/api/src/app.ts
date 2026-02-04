import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import { ZodError } from 'zod';

// Plugins
import prismaPlugin from './plugins/prisma.js';
import redisPlugin from './plugins/redis.js';
import authPlugin from './plugins/auth.js';

// Routes
import authRoutes from './routes/v1/auth.js';
import providerRoutes from './routes/v1/providers.js';
import keyRoutes from './routes/v1/keys.js';
import chatRoutes from './routes/v1/chat.js';
import usageRoutes from './routes/v1/usage.js';

// Utils
import { logger } from './utils/logger.js';
import { AppError } from './types/index.js';

export async function buildApp(): Promise<FastifyInstance> {
  const fastify = Fastify({
    trustProxy: true,
    bodyLimit: 1048576,
    logger: false,
  });

  // CORS
  const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:3110')
    .split(',')
    .map((origin) => origin.trim().toLowerCase());

  await fastify.register(cors, {
    origin: (origin, callback) => {
      if (!origin) {
        callback(null, true);
        return;
      }
      if (allowedOrigins.includes(origin.toLowerCase())) {
        callback(null, true);
        return;
      }
      callback(new Error('Not allowed by CORS'), false);
    },
    credentials: true,
  });

  // JWT
  await fastify.register(jwt, {
    secret: process.env.JWT_SECRET || 'dev-jwt-secret-change-in-production',
    sign: { algorithm: 'HS256' },
    verify: { algorithms: ['HS256'] },
  });

  // Plugins
  await fastify.register(prismaPlugin);
  await fastify.register(redisPlugin);
  await fastify.register(authPlugin);

  // Error handlers must be set before routes for proper scoping
  fastify.setErrorHandler((error, request, reply) => {
    if (error instanceof AppError) {
      return reply.code(error.statusCode).send(error.toJSON());
    }

    if (error instanceof ZodError || (error as any).name === 'ZodError'
        || (Array.isArray((error as any).issues) && (error as any).issues.length > 0)) {
      return reply.code(400).send({
        type: 'https://airouter.dev/errors/validation-error',
        title: 'Validation Error',
        status: 400,
        detail: error.message,
        request_id: request.id,
      });
    }

    logger.error('Unexpected error', error, {
      request_id: request.id,
      url: request.url,
      method: request.method,
    });

    return reply.code(500).send({
      type: 'https://airouter.dev/errors/internal-error',
      title: 'Internal Server Error',
      status: 500,
      detail: process.env.NODE_ENV === 'production'
        ? 'An unexpected error occurred'
        : (error instanceof Error ? error.message : 'Unknown error'),
      request_id: request.id,
    });
  });

  fastify.setNotFoundHandler((request, reply) => {
    return reply.code(404).send({
      type: 'https://airouter.dev/errors/not-found',
      title: 'Not Found',
      status: 404,
      detail: `Route ${request.method} ${request.url} not found`,
    });
  });

  // Routes (registered after error handlers)
  await fastify.register(authRoutes, { prefix: '/api/v1/auth' });
  await fastify.register(providerRoutes, { prefix: '/api/v1/providers' });
  await fastify.register(keyRoutes, { prefix: '/api/v1/keys' });
  await fastify.register(chatRoutes, { prefix: '/v1' });
  await fastify.register(usageRoutes, { prefix: '/api/v1/usage' });

  // Health check
  fastify.get('/health', async (_request, reply) => {
    const checks: Record<string, { status: string; latency?: number }> = {};
    let overallStatus = 'healthy';

    const dbStart = Date.now();
    try {
      await fastify.prisma.$queryRaw`SELECT 1`;
      checks.database = { status: 'healthy', latency: Date.now() - dbStart };
    } catch (_error) {
      checks.database = { status: 'unhealthy' };
      overallStatus = 'unhealthy';
    }

    if (fastify.redis) {
      const redisStart = Date.now();
      try {
        await fastify.redis.ping();
        checks.redis = { status: 'healthy', latency: Date.now() - redisStart };
      } catch (_error) {
        checks.redis = { status: 'unhealthy' };
      }
    }

    const statusCode = overallStatus === 'healthy' ? 200 : 503;
    return reply.code(statusCode).send({
      status: overallStatus,
      service: 'airouter-api',
      version: '0.1.0',
      timestamp: new Date().toISOString(),
      checks,
    });
  });

  return fastify;
}
