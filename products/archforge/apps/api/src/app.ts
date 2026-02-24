/**
 * ArchForge API - Main Application Builder
 *
 * Registers all plugins in order and configures the Fastify instance.
 * Export `buildApp()` for use in index.ts and integration tests.
 */

import Fastify, { FastifyInstance, FastifyRequest } from 'fastify';
import cors from '@fastify/cors';
import cookie from '@fastify/cookie';
import jwt from '@fastify/jwt';
import rateLimit from '@fastify/rate-limit';
import helmet from '@fastify/helmet';
import compress from '@fastify/compress';
import { ZodError } from 'zod';
import crypto from 'crypto';

// Plugins
import prismaPlugin from './plugins/prisma.js';
import redisPlugin from './plugins/redis.js';
import observabilityPlugin from './plugins/observability.js';
import authPlugin from './plugins/auth.js';

// Routes
import { authRoutes } from './modules/auth/index.js';
import { projectRoutes } from './modules/projects/index.js';

// Utils
import { logger } from './utils/logger.js';
import { AppError } from './types/index.js';

export interface BuildAppOptions {
  skipRateLimit?: boolean;
}

export async function buildApp(options?: BuildAppOptions): Promise<FastifyInstance> {
  const fastify = Fastify({
    trustProxy: true,
    bodyLimit: 1048576, // 1MB
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
    routerOptions: {
      maxParamLength: 256,
    },
  });

  // 1. Compress + Helmet (security headers)
  await fastify.register(compress, {
    threshold: 1024,
    encodings: ['gzip', 'deflate'],
  });

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
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
  });

  // 2. CORS
  const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:3116')
    .split(',')
    .map((origin) => origin.trim().toLowerCase());

  const isProduction = process.env.NODE_ENV === 'production';

  await fastify.register(cors, {
    origin: (origin, callback) => {
      if (!origin) {
        if (isProduction) {
          callback(new Error('Origin required'), false);
          return;
        }
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
    methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  });

  // 3. Cookie (for httpOnly refresh tokens)
  await fastify.register(cookie, {
    secret: process.env.JWT_SECRET!,
    parseOptions: {},
  });

  // 4. JWT (HS256 pinned)
  await fastify.register(jwt, {
    secret: process.env.JWT_SECRET!,
    sign: { algorithm: 'HS256' },
    verify: { algorithms: ['HS256'] },
  });

  // 5. Observability
  await fastify.register(observabilityPlugin);

  // 6. Prisma
  await fastify.register(prismaPlugin);

  // 7. Redis
  await fastify.register(redisPlugin);

  // 8. Rate limiting (Redis-backed when available)
  const rateLimitConfig: Record<string, unknown> = {
    max: parseInt(process.env.RATE_LIMIT_MAX || '100'),
    timeWindow: parseInt(process.env.RATE_LIMIT_WINDOW || '60000'),
    allowList: (request: FastifyRequest) => {
      const url = request.url.split('?')[0];
      return url === '/health' || url === '/ready';
    },
    addHeadersOnExemption: false,
    addHeaders: {
      'x-ratelimit-limit': true,
      'x-ratelimit-remaining': true,
      'x-ratelimit-reset': true,
    },
    keyGenerator: (request: FastifyRequest) => {
      const req = request as FastifyRequest & { currentUser?: { id: string }; apiKey?: { id: string } };
      if (req.currentUser?.id) {
        return `user:${req.currentUser.id}`;
      }
      if (req.apiKey?.id) {
        return `apikey:${req.apiKey.id}`;
      }
      return `ip:${request.ip}`;
    },
  };

  if (!options?.skipRateLimit) {
    if (fastify.redis) {
      logger.info('Rate limiting configured with Redis distributed store');
    } else {
      logger.warn('Redis not configured - rate limiting uses in-memory store');
    }
    await fastify.register(rateLimit, rateLimitConfig);
  }

  // 9. Auth plugin
  await fastify.register(authPlugin);

  // 10. Health route
  fastify.get('/health', async (request, reply) => {
    const checks: Record<string, { status: string; latency?: number; error?: string }> = {};
    let overallStatus = 'healthy';

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
      }
    } else if (process.env.REDIS_URL) {
      checks.redis = { status: 'not-connected' };
    }

    const statusCode = overallStatus === 'healthy' ? 200 : 503;

    const internalKey = process.env.INTERNAL_API_KEY;
    const providedKey = request.headers['x-internal-api-key'] as string | undefined;
    const isAuthorized = internalKey && providedKey &&
      internalKey.length === providedKey.length &&
      crypto.timingSafeEqual(Buffer.from(internalKey), Buffer.from(providedKey));

    if (isAuthorized) {
      return reply.code(statusCode).send({
        status: overallStatus,
        timestamp: new Date().toISOString(),
        checks,
      });
    }

    return reply.code(statusCode).send({
      status: overallStatus,
      timestamp: new Date().toISOString(),
    });
  });

  // Register API routes under /api/v1 prefix
  await fastify.register(authRoutes, { prefix: '/api/v1/auth' });
  await fastify.register(projectRoutes, { prefix: '/api/v1/projects' });

  // Validate :id path parameters
  const SAFE_ID_RE = /^[a-zA-Z0-9_-]{1,128}$/;
  fastify.addHook('preValidation', async (request, reply) => {
    const params = request.params as Record<string, string> | undefined;
    if (params?.id && !SAFE_ID_RE.test(params.id)) {
      return reply.code(400).send({
        type: 'https://archforge.io/errors/validation-error',
        title: 'Validation Error',
        status: 400,
        detail: 'Invalid ID format',
      });
    }
  });

  // 11. Global error handler
  fastify.setErrorHandler((error, request, reply) => {
    if (error instanceof AppError) {
      return reply.code(error.statusCode).send(error.toJSON());
    }

    if (error instanceof ZodError ||
        (error as Record<string, unknown>).name === 'ZodError' ||
        (error as Record<string, unknown>).validation) {
      return reply.code(400).send({
        type: 'https://archforge.io/errors/validation-error',
        title: 'Validation Error',
        status: 400,
        detail: error instanceof Error ? error.message : 'Validation failed',
        request_id: request.id,
      });
    }

    logger.error('Unexpected error', error, {
      request_id: request.id,
      url: request.url,
      method: request.method,
    });

    if (process.env.NODE_ENV === 'production') {
      return reply.code(500).send({
        type: 'https://archforge.io/errors/internal-error',
        title: 'Internal Server Error',
        status: 500,
        detail: 'An unexpected error occurred',
        request_id: request.id,
      });
    }

    return reply.code(500).send({
      type: 'https://archforge.io/errors/internal-error',
      title: 'Internal Server Error',
      status: 500,
      detail: error instanceof Error ? error.message : 'Unknown error',
      request_id: request.id,
      stack: error instanceof Error ? error.stack : undefined,
    });
  });

  // 12. Not-found handler
  fastify.setNotFoundHandler((request, reply) => {
    return reply.code(404).send({
      type: 'https://archforge.io/errors/not-found',
      title: 'Not Found',
      status: 404,
      detail: `Route ${request.method} ${request.url} not found`,
      request_id: request.id,
    });
  });

  return fastify;
}
