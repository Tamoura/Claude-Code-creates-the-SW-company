import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import { ZodError } from 'zod';

// Plugins
import observabilityPlugin from './plugins/observability.js';
import prismaPlugin from './plugins/prisma.js';
import redisPlugin from './plugins/redis.js';
import authPlugin from './plugins/auth.js';
import websocketPlugin from './plugins/websocket.js';

// Routes
import healthRoutes from './modules/health/routes.js';
import authRoutes from './modules/auth/routes.js';
import activityRoutes from './modules/activity/routes.js';
import repoRoutes from './modules/repos/routes.js';
import webhookRoutes from './modules/webhooks/routes.js';
import metricsRoutes from './modules/metrics/routes.js';

// Utils
import { logger } from './utils/logger.js';
import { AppError } from './lib/errors.js';

export async function buildApp(): Promise<FastifyInstance> {
  const fastify = Fastify({
    trustProxy: true,
    bodyLimit: 1048576, // 1MB
    logger: false, // We use our own logger
    requestIdHeader: 'x-request-id',
  });

  // Security headers
  await fastify.register(helmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'https:'],
      },
    },
  });

  // CORS
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3106';
  await fastify.register(cors, {
    origin: (origin, callback) => {
      if (!origin) {
        callback(null, true);
        return;
      }
      const allowed = frontendUrl.split(',').map((o) => o.trim().toLowerCase());
      if (allowed.includes(origin.toLowerCase())) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'), false);
      }
    },
    credentials: true,
    methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  });

  // Rate limiting (global default + per-route overrides)
  await fastify.register(rateLimit, {
    max: 100,          // 100 requests per window per IP
    timeWindow: 60000, // 1 minute
    // Auth endpoints get stricter limits via route-level config
    allowList: [],
    keyGenerator: (request) => {
      return request.ip;
    },
  });

  // JWT
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret && process.env.NODE_ENV === 'production') {
    throw new Error(
      'JWT_SECRET environment variable is required in production'
    );
  }
  await fastify.register(jwt, {
    secret: jwtSecret || 'pulse-dev-secret',
    sign: { algorithm: 'HS256' },
    verify: { algorithms: ['HS256'] },
  });

  // Global error handler (RFC 7807) - set BEFORE routes
  fastify.setErrorHandler((error, request, reply) => {
    if (error instanceof AppError) {
      return reply.code(error.statusCode).send(error.toJSON());
    }

    if (error instanceof ZodError) {
      return reply.code(422).send({
        type: 'https://pulse.dev/errors/validation-error',
        title: 'Validation Error',
        status: 422,
        detail: 'Request validation failed',
        errors: error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      });
    }

    logger.error('Unexpected error', error, {
      request_id: request.id,
      url: request.url,
      method: request.method,
    });

    const statusCode = (error as any).statusCode || 500;
    if (process.env.NODE_ENV === 'production') {
      return reply.code(statusCode).send({
        type: 'https://pulse.dev/errors/internal-error',
        title: 'Internal Server Error',
        status: statusCode,
        detail: 'An unexpected error occurred',
      });
    }

    return reply.code(statusCode).send({
      type: 'https://pulse.dev/errors/internal-error',
      title: 'Internal Server Error',
      status: statusCode,
      detail: error instanceof Error ? error.message : 'Unknown error',
    });
  });

  // 404 handler
  fastify.setNotFoundHandler((_request, reply) => {
    return reply.code(404).send({
      type: 'https://pulse.dev/errors/not-found',
      title: 'Not Found',
      status: 404,
      detail: 'The requested resource was not found',
    });
  });

  // Plugins (PATTERN-009 order)
  await fastify.register(observabilityPlugin);
  await fastify.register(prismaPlugin);
  await fastify.register(redisPlugin);
  await fastify.register(authPlugin);
  await fastify.register(websocketPlugin);

  // Routes
  await fastify.register(healthRoutes);
  await fastify.register(authRoutes, { prefix: '/api/v1/auth' });
  await fastify.register(activityRoutes, { prefix: '/api/v1/activity' });
  await fastify.register(repoRoutes, { prefix: '/api/v1/repos' });
  await fastify.register(webhookRoutes, { prefix: '/api/v1/webhooks' });
  await fastify.register(metricsRoutes, { prefix: '/api/v1/metrics' });

  return fastify;
}
