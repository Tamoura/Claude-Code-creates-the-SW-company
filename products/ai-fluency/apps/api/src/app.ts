/**
 * app.ts — Fastify application factory
 *
 * buildApp() creates a configured Fastify instance with all plugins registered
 * in the mandatory order:
 *
 *   1. configPlugin (env var validation — fail fast)
 *   2. prismaPlugin (Prisma + RLS session middleware)
 *   3. redisPlugin (ioredis)
 *   4. authPlugin (JWT verification + role guards)
 *   5. rateLimitPlugin (@fastify/rate-limit via Redis)
 *   6. observabilityPlugin (Pino access log + /metrics endpoint)
 *   7. Route modules
 *
 * This function is used both by src/index.ts (production server) and
 * tests/helpers/build-app.ts (integration tests with real DB).
 */

import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import jwt from '@fastify/jwt';
import { ZodError } from 'zod';

import prismaPlugin from './plugins/prisma.js';
import redisPlugin from './plugins/redis.js';
import authPlugin from './plugins/auth.js';
import rateLimitPlugin from './plugins/rate-limit.js';
import observabilityPlugin from './plugins/observability.js';
import { registerRoutes } from './routes/index.js';
import { AppError, buildProblemDetails } from './utils/errors.js';
import { logger } from './utils/logger.js';

export async function buildApp(): Promise<FastifyInstance> {
  const isDev = process.env.NODE_ENV === 'development';
  const isTest = process.env.NODE_ENV === 'test';

  const fastify = Fastify({
    trustProxy: true,
    bodyLimit: 1_048_576, // 1 MB
    logger: isDev
      ? {
          level: 'info',
          transport: {
            target: 'pino-pretty',
            options: { translateTime: 'HH:MM:ss Z', ignore: 'pid,hostname' },
          },
        }
      : isTest
      ? false  // Suppress Fastify's own logger in tests
      : { level: process.env.LOG_LEVEL || 'info' },
    requestIdHeader: 'x-request-id',
    requestIdLogLabel: 'request_id',
  });

  // ── CORS ──────────────────────────────────────────────────────────────────
  const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:3118')
    .split(',')
    .map((o) => o.trim().toLowerCase());

  await fastify.register(cors, {
    origin: (origin, callback) => {
      if (!origin) {
        // Allow no-origin in dev/test (Postman, curl, integration tests)
        if (process.env.NODE_ENV === 'production') {
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

  // ── HELMET ────────────────────────────────────────────────────────────────
  // Register security headers before routes and auth
  await fastify.register(helmet, { contentSecurityPolicy: false });

  // ── JWT ───────────────────────────────────────────────────────────────────
  await fastify.register(jwt, {
    secret: process.env.JWT_SECRET!,
    sign: { algorithm: 'HS256' },
    verify: { algorithms: ['HS256'] },
  });

  // ── PLUGIN REGISTRATION ORDER (MANDATORY) ─────────────────────────────────
  // 1. Prisma (DB connection + RLS middleware)
  await fastify.register(prismaPlugin);

  // 2. Redis (cache + rate limiting store)
  await fastify.register(redisPlugin);

  // 3. Auth (JWT verification + role guards) — depends on prisma
  await fastify.register(authPlugin);

  // 4. Rate limiting — depends on redis
  await fastify.register(rateLimitPlugin);

  // 5. Observability (access log + /metrics) — last plugin, before routes
  await fastify.register(observabilityPlugin);

  // ── ROUTES ────────────────────────────────────────────────────────────────
  await registerRoutes(fastify);

  // ── GLOBAL ERROR HANDLER ──────────────────────────────────────────────────
  fastify.setErrorHandler((error, request, reply) => {
    // AppError — structured application error
    if (error instanceof AppError) {
      return reply
        .code(error.status)
        .send(error.toJSON(request.id));
    }

    // Zod validation error
    if (error instanceof ZodError || (error as { name?: string }).name === 'ZodError') {
      const detail =
        error instanceof ZodError
          ? error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')
          : (error as { message?: string }).message ?? 'Validation error';
      return reply
        .code(400)
        .send(buildProblemDetails('validation-error', 400, detail, request.id));
    }

    // Fastify schema validation error (JSON Schema validation)
    if ((error as { validation?: unknown }).validation) {
      return reply
        .code(400)
        .send(
          buildProblemDetails(
            'validation-error',
            400,
            (error as { message?: string }).message || 'Request validation failed',
            request.id
          )
        );
    }

    // @fastify/rate-limit error (v9 throws an object, not an Error instance)
    if (
      typeof error === 'object' &&
      error !== null &&
      (error as { statusCode?: number }).statusCode === 429
    ) {
      return reply
        .code(429)
        .send(
          buildProblemDetails(
            'rate-limit-exceeded',
            429,
            'Too many requests. Please try again later.',
            request.id
          )
        );
    }

    // Log unexpected errors
    logger.error('Unexpected error', error, {
      request_id: request.id,
      url: request.url,
      method: request.method,
    });

    // Don't expose internals in production
    const detail =
      process.env.NODE_ENV === 'production'
        ? 'An unexpected error occurred'
        : error instanceof Error
        ? error.message
        : String(error);

    return reply
      .code(500)
      .send(buildProblemDetails('internal-error', 500, detail, request.id));
  });

  // ── NOT FOUND HANDLER ─────────────────────────────────────────────────────
  fastify.setNotFoundHandler((request, reply) => {
    return reply
      .code(404)
      .send(
        buildProblemDetails(
          'not-found',
          404,
          `Route ${request.method} ${request.url} not found`,
          request.id
        )
      );
  });

  return fastify;
}
