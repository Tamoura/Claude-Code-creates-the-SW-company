import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import rateLimit from '@fastify/rate-limit';
import helmet from '@fastify/helmet';
import { ZodError } from 'zod';

// Plugins
import prismaPlugin from './plugins/prisma.js';
import redisPlugin from './plugins/redis.js';
import observabilityPlugin from './plugins/observability.js';
import authPlugin from './plugins/auth.js';

// Routes
import authRoutes from './routes/v1/auth.js';
import paymentSessionRoutes from './routes/v1/payment-sessions.js';
import webhookRoutes from './routes/v1/webhooks.js';
import apiKeyRoutes from './routes/v1/api-keys.js';
import refundRoutes from './routes/v1/refunds.js';
import webhookWorkerRoutes from './routes/internal/webhook-worker.js';

// Utils
import { logger } from './utils/logger.js';
import { AppError } from './types/index.js';
import { RedisRateLimitStore } from './utils/redis-rate-limit-store.js';

export async function buildApp(): Promise<FastifyInstance> {
  const fastify = Fastify({
    logger: process.env.NODE_ENV === 'development' ? {
      level: 'info',
      transport: {
        target: 'pino-pretty',
        options: {
          translateTime: 'HH:MM:ss Z',
          ignore: 'pid,hostname',
        },
      },
    } : false,
    requestIdHeader: 'x-request-id',
    requestIdLogLabel: 'request_id',
  });

  // Register security headers (helmet)
  await fastify.register(helmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'https:'],
      },
    },
    hsts: {
      maxAge: 31536000, // 1 year
      includeSubDomains: true,
      preload: true,
    },
  });

  // Register CORS with multiple allowed origins
  const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:3101')
    .split(',')
    .map((origin) => origin.trim());

  await fastify.register(cors, {
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g., mobile apps, Postman, server-to-server)
      if (!origin) {
        callback(null, true);
        return;
      }

      // Check if origin is in whitelist
      if (allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      // Reject origin
      callback(new Error('Not allowed by CORS'), false);
    },
    credentials: true,
  });

  // Register JWT
  // JWT_SECRET is validated in env-validator.ts on startup
  await fastify.register(jwt, {
    secret: process.env.JWT_SECRET!,
  });

  // Register plugins
  await fastify.register(observabilityPlugin); // Register first to track all requests
  await fastify.register(prismaPlugin);
  await fastify.register(redisPlugin);

  // Register rate limiting with Redis-backed distributed store
  const rateLimitConfig: any = {
    max: parseInt(process.env.RATE_LIMIT_MAX || '100'),
    timeWindow: parseInt(process.env.RATE_LIMIT_WINDOW || '60000'),
  };

  if (fastify.redis) {
    // Use Redis for distributed rate limiting across multiple instances
    const redisStore = new RedisRateLimitStore({
      redis: fastify.redis,
      keyPrefix: 'ratelimit:',
    });
    rateLimitConfig.store = redisStore;
    logger.info('Rate limiting configured with Redis distributed store', {
      max: rateLimitConfig.max,
      timeWindow: rateLimitConfig.timeWindow,
    });
  } else {
    logger.warn('Redis not configured - rate limiting uses in-memory store (not suitable for production)');
  }

  await fastify.register(rateLimit, rateLimitConfig);

  await fastify.register(authPlugin);

  // Register routes
  await fastify.register(authRoutes, { prefix: '/v1/auth' });
  await fastify.register(paymentSessionRoutes, { prefix: '/v1/payment-sessions' });
  await fastify.register(webhookRoutes, { prefix: '/v1/webhooks' });
  await fastify.register(apiKeyRoutes, { prefix: '/v1/api-keys' });
  await fastify.register(refundRoutes, { prefix: '/v1/refunds' });

  // Internal routes (for cron jobs, workers, etc.)
  await fastify.register(webhookWorkerRoutes, { prefix: '/internal' });

  // Health check with deep dependency verification
  fastify.get('/health', async (_request, reply) => {
    const checks: Record<string, { status: string; latency?: number; error?: string }> = {};
    let overallStatus = 'healthy';

    // Check database connectivity
    const dbStart = Date.now();
    try {
      await fastify.prisma.$queryRaw`SELECT 1`;
      checks.database = {
        status: 'healthy',
        latency: Date.now() - dbStart,
      };
    } catch (error) {
      checks.database = {
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
      overallStatus = 'unhealthy';
    }

    // Check Redis connectivity (if configured)
    if (fastify.redis) {
      const redisStart = Date.now();
      try {
        await fastify.redis.ping();
        checks.redis = {
          status: 'healthy',
          latency: Date.now() - redisStart,
        };
      } catch (error) {
        checks.redis = {
          status: 'unhealthy',
          error: error instanceof Error ? error.message : 'Unknown error',
        };
        // Redis is optional, so don't mark overall as unhealthy
        // overallStatus = 'degraded'; // Could use this if we want to indicate degraded state
      }
    } else if (process.env.REDIS_URL) {
      // Redis URL configured but client not connected
      checks.redis = {
        status: 'not-connected',
      };
    }

    const statusCode = overallStatus === 'healthy' ? 200 : 503;

    return reply.code(statusCode).send({
      status: overallStatus,
      timestamp: new Date().toISOString(),
      checks,
    });
  });

  // Global error handler
  fastify.setErrorHandler((error, request, reply) => {
    if (error instanceof AppError) {
      return reply.code(error.statusCode).send(error.toJSON());
    }

    // Validation errors from Zod
    if (error instanceof ZodError ||
        (error as any).name === 'ZodError' ||
        (error as any).validation) {
      return reply.code(400).send({
        type: 'https://gateway.io/errors/validation-error',
        title: 'Validation Error',
        status: 400,
        detail: error instanceof Error ? error.message : 'Validation failed',
        request_id: request.id,
      });
    }

    // Log unexpected errors
    logger.error('Unexpected error', error, {
      request_id: request.id,
      url: request.url,
      method: request.method,
    });

    // Don't expose internal errors in production
    if (process.env.NODE_ENV === 'production') {
      return reply.code(500).send({
        type: 'https://gateway.io/errors/internal-error',
        title: 'Internal Server Error',
        status: 500,
        detail: 'An unexpected error occurred',
        request_id: request.id,
      });
    }

    return reply.code(500).send({
      type: 'https://gateway.io/errors/internal-error',
      title: 'Internal Server Error',
      status: 500,
      detail: error instanceof Error ? error.message : 'Unknown error',
      request_id: request.id,
      stack: error instanceof Error ? error.stack : undefined,
    });
  });

  // Not found handler
  fastify.setNotFoundHandler((request, reply) => {
    return reply.code(404).send({
      type: 'https://gateway.io/errors/not-found',
      title: 'Not Found',
      status: 404,
      detail: `Route ${request.method} ${request.url} not found`,
      request_id: request.id,
    });
  });

  return fastify;
}
