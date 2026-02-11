import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import rateLimit from '@fastify/rate-limit';
import { ZodError } from 'zod';

import prismaPlugin from './plugins/prisma';
import redisPlugin from './plugins/redis';
import authPlugin from './plugins/auth';
import observabilityPlugin from './plugins/observability';

import routes from './routes/index';

import { logger } from './utils/logger';
import { AppError, ValidationError } from './utils/errors';

export interface BuildAppOptions {
  logger?: boolean;
}

export async function buildApp(opts: BuildAppOptions = {}): Promise<FastifyInstance> {
  const fastify = Fastify({
    logger: opts.logger ?? false,
    trustProxy: true,
    bodyLimit: 1048576, // 1MB
  });

  // 1. CORS
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
    methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  });

  // 2. Rate Limit
  await fastify.register(rateLimit, {
    max: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
    timeWindow: parseInt(process.env.RATE_LIMIT_WINDOW || '60000', 10),
    allowList: (request) => {
      const url = request.url.split('?')[0];
      return url === '/api/v1/health';
    },
  });

  // 3. Prisma
  await fastify.register(prismaPlugin);

  // 4. Redis (graceful degradation)
  await fastify.register(redisPlugin);

  // 5. JWT
  await fastify.register(jwt, {
    secret: process.env.JWT_SECRET || 'test-secret-for-jwt-signing-minimum-32-chars',
    sign: { algorithm: 'HS256' },
    verify: { algorithms: ['HS256'] },
  });

  // 6. Auth
  await fastify.register(authPlugin);

  // 7. Observability
  await fastify.register(observabilityPlugin);

  // 8. Routes (all under /api/v1/)
  await fastify.register(routes, { prefix: '/api/v1' });

  // Global error handler
  fastify.setErrorHandler((error, request, reply) => {
    // Handle our custom AppError
    if (error instanceof AppError) {
      const payload: Record<string, unknown> = {
        error: {
          code: error.code,
          message: error.message,
          statusCode: error.statusCode,
        },
      };

      if (error instanceof ValidationError) {
        (payload.error as Record<string, unknown>).errors = error.errors;
      }

      return reply.code(error.statusCode).send(payload);
    }

    // Handle Zod validation errors
    if (error instanceof ZodError || (error as any).name === 'ZodError') {
      return reply.code(400).send({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Validation failed',
          statusCode: 400,
          details: error instanceof ZodError ? error.issues : undefined,
        },
      });
    }

    // Handle Fastify validation errors
    if ((error as any).validation) {
      return reply.code(400).send({
        error: {
          code: 'VALIDATION_ERROR',
          message: error.message,
          statusCode: 400,
        },
      });
    }

    // Log unexpected errors
    logger.error('Unexpected error', error, {
      request_id: request.id,
      url: request.url,
      method: request.method,
    });

    // Don't expose internal errors in production
    const message = process.env.NODE_ENV === 'production'
      ? 'An unexpected error occurred'
      : error.message;

    return reply.code(500).send({
      error: {
        code: 'INTERNAL_ERROR',
        message,
        statusCode: 500,
      },
    });
  });

  // Not found handler
  fastify.setNotFoundHandler((request, reply) => {
    return reply.code(404).send({
      error: {
        code: 'NOT_FOUND',
        message: `Route ${request.method} ${request.url} not found`,
        statusCode: 404,
      },
    });
  });

  return fastify;
}
