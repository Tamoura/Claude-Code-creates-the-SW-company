import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import cookie from '@fastify/cookie';
import { ZodError } from 'zod';

import prismaPlugin from './plugins/prisma';
import observabilityPlugin from './plugins/observability';
import authPlugin from './plugins/auth';

import healthRoutes from './routes/health';
import authRoutes from './routes/auth';
import childrenRoutes from './routes/children';
import observationRoutes from './routes/observations';
import { milestoneDefinitionRoutes, childMilestoneRoutes } from './routes/milestones';
import dashboardRoutes from './routes/dashboard';

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

  // JWT
  await app.register(jwt, {
    secret: process.env.JWT_SECRET || 'test-secret-do-not-use-in-production',
    sign: { algorithm: 'HS256' },
    verify: { algorithms: ['HS256'] },
  });

  // Cookie (for refresh tokens)
  await app.register(cookie);

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

  // Plugins (order: observability -> prisma -> auth)
  await app.register(observabilityPlugin);
  await app.register(prismaPlugin);
  await app.register(authPlugin);

  // Routes
  await app.register(healthRoutes, { prefix: '/api' });
  await app.register(authRoutes, { prefix: '/api/auth' });
  await app.register(childrenRoutes, { prefix: '/api/children' });
  await app.register(observationRoutes, { prefix: '/api/children' });
  await app.register(milestoneDefinitionRoutes, { prefix: '/api/milestones' });
  await app.register(childMilestoneRoutes, { prefix: '/api/children/:childId/milestones' });
  await app.register(dashboardRoutes, { prefix: '/api/dashboard' });

  return app;
}
