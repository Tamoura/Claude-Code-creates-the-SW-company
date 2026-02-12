import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import cookie from '@fastify/cookie';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import { ZodError } from 'zod';

import requestIdPlugin from './plugins/request-id';
import prismaPlugin from './plugins/prisma';
import observabilityPlugin from './plugins/observability';
import authPlugin from './plugins/auth';
import emailPlugin from './plugins/email';

import healthRoutes from './routes/health';
import authRoutes from './routes/auth';
import childrenRoutes from './routes/children';
import observationRoutes from './routes/observations';
import { milestoneDefinitionRoutes, childMilestoneRoutes } from './routes/milestones';
import goalRoutes from './routes/goals';
import dashboardRoutes from './routes/dashboard';
import insightsRoutes from './routes/insights';
import profileRoutes from './routes/profile';
import goalTemplateRoutes from './routes/goal-templates';
import reportRoutes from './routes/reports';
import sharingRoutes from './routes/sharing';
import exportRoutes from './routes/export';

import { logger } from './utils/logger';
import { AppError, ValidationError } from './lib/errors';

export interface BuildAppOptions {
  logger?: boolean | object;
}

export async function buildApp(
  opts: BuildAppOptions = {}
): Promise<FastifyInstance> {
  const app = Fastify({
    logger: opts.logger ?? false,
    bodyLimit: 1048576,
    requestTimeout: 30000,
  });

  // CORS
  const allowedOrigins = (
    process.env.ALLOWED_ORIGINS || 'http://localhost:3108'
  )
    .split(',')
    .map((o) => o.trim());

  await app.register(cors, {
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  });

  // Helmet (security headers)
  await app.register(helmet, {
    contentSecurityPolicy: process.env.NODE_ENV === 'production',
  });

  // Rate limiting (global) - disabled in test environment
  if (process.env.NODE_ENV !== 'test') {
    await app.register(rateLimit, {
      max: 100,
      timeWindow: '1 minute',
    });
  }

  // JWT — fail fast if secret is missing or too short
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret || jwtSecret.length < 32) {
    throw new Error(
      'JWT_SECRET environment variable is required and must be at least 32 characters'
    );
  }

  await app.register(jwt, {
    secret: jwtSecret,
    sign: { algorithm: 'HS256' },
    verify: { algorithms: ['HS256'] },
  });

  // Cookie (for refresh tokens)
  await app.register(cookie);

  // Multipart (for file uploads) — optional, requires @fastify/multipart
  try {
    const multipart = (await import('@fastify/multipart')).default;
    await app.register(multipart, {
      limits: { fileSize: 5 * 1024 * 1024, files: 1 },
    });
  } catch {
    logger.info('Photo upload disabled: @fastify/multipart not installed');
  }

  // Static file serving (uploads directory) — optional, requires @fastify/static
  try {
    const path = await import('path');
    const fastifyStatic = (await import('@fastify/static')).default;
    const uploadsDir = path.resolve(process.cwd(), 'uploads');
    await app.register(fastifyStatic, {
      root: uploadsDir,
      prefix: '/uploads/',
      decorateReply: false,
    });
  } catch {
    logger.info('Static file serving disabled: @fastify/static not installed');
  }

  // Explicit security headers (supplement Helmet defaults)
  app.addHook('onSend', async (_request, reply) => {
    reply.header('X-Content-Type-Options', 'nosniff');
    reply.header('X-Frame-Options', 'DENY');
    reply.header('X-XSS-Protection', '0');
    reply.header('Referrer-Policy', 'strict-origin-when-cross-origin');
    if (process.env.NODE_ENV === 'production') {
      reply.header(
        'Strict-Transport-Security',
        'max-age=31536000; includeSubDomains'
      );
    }
  });

  // Global error handler (RFC 7807) -- set BEFORE routes for encapsulation
  app.setErrorHandler((error, request, reply) => {
    if (error instanceof AppError) {
      const response: Record<string, unknown> = {
        type: `https://muaththir.app/errors/${error.code.toLowerCase().replace(/_/g, '-')}`,
        title: error.name,
        status: error.statusCode,
        detail: error.message,
        instance: request.url,
      };

      if (error instanceof ValidationError && error.errors) {
        response.errors = error.errors;
      }

      return reply.code(error.statusCode).send(response);
    }

    if (error instanceof ZodError) {
      return reply.code(422).send({
        type: 'https://muaththir.app/errors/validation-error',
        title: 'Validation Error',
        status: 422,
        detail: 'Request validation failed',
        instance: request.url,
        errors: error.flatten().fieldErrors,
      });
    }

    logger.error('Unexpected error', error, {
      request_id: request.id,
      url: request.url,
      method: request.method,
    });

    if (process.env.NODE_ENV === 'production') {
      return reply.code(500).send({
        type: 'https://muaththir.app/errors/internal-error',
        title: 'Internal Server Error',
        status: 500,
        detail: 'An unexpected error occurred',
        instance: request.url,
      });
    }

    return reply.code(500).send({
      type: 'https://muaththir.app/errors/internal-error',
      title: 'Internal Server Error',
      status: 500,
      detail: error instanceof Error ? error.message : 'Unknown error',
      instance: request.url,
    });
  });

  // Not found handler
  app.setNotFoundHandler((request, reply) => {
    return reply.code(404).send({
      type: 'https://muaththir.app/errors/not-found',
      title: 'Not Found',
      status: 404,
      detail: `Route ${request.method} ${request.url} not found`,
      instance: request.url,
    });
  });

  // Plugins (order: request-id -> observability -> prisma -> auth -> email)
  await app.register(requestIdPlugin);
  await app.register(observabilityPlugin);
  await app.register(prismaPlugin);
  await app.register(authPlugin);
  await app.register(emailPlugin);

  // Routes
  await app.register(healthRoutes, { prefix: '/api' });
  await app.register(authRoutes, { prefix: '/api/auth' });
  await app.register(childrenRoutes, { prefix: '/api/children' });
  await app.register(observationRoutes, { prefix: '/api/children' });
  await app.register(goalRoutes, { prefix: '/api/children' });
  await app.register(milestoneDefinitionRoutes, { prefix: '/api/milestones' });
  await app.register(childMilestoneRoutes, { prefix: '/api/children/:childId/milestones' });
  await app.register(dashboardRoutes, { prefix: '/api/dashboard' });
  await app.register(insightsRoutes, { prefix: '/api/dashboard' });
  await app.register(profileRoutes, { prefix: '/api/profile' });
  await app.register(goalTemplateRoutes, { prefix: '/api/goal-templates' });
  await app.register(reportRoutes, { prefix: '/api/children' });
  await app.register(sharingRoutes, { prefix: '/api/sharing' });
  await app.register(exportRoutes, { prefix: '/api/export' });

  // Photo upload routes — optional, requires @fastify/multipart
  try {
    const childPhotoRoutes = (await import('./routes/children-photo')).default;
    await app.register(childPhotoRoutes, { prefix: '/api/children' });
  } catch {
    logger.info('Photo upload routes disabled');
  }

  return app;
}
