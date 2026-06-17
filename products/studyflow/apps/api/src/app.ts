import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import cookie from '@fastify/cookie';
import helmet from '@fastify/helmet';
import { ZodError } from 'zod';

import prismaPlugin from './plugins/prisma';
import sessionAuthPlugin from './plugins/sessionAuth';
import authRoutes from './routes/auth.routes';
import subjectRoutes from './routes/subject.routes';
import selectionRoutes from './routes/selection.routes';
import goalRoutes from './routes/goal.routes';
import progressRoutes from './routes/progress.routes';
import dashboardRoutes from './routes/dashboard.routes';
import { logger } from './utils/logger';
import { AppError } from './lib/errors';

export interface BuildAppOptions {
  logger?: boolean | object;
}

/**
 * Builds the Fastify instance: cookie/cors/helmet, a single RFC 7807 error
 * handler (AppError + ZodError → problem+json), and the /v1/health route.
 *
 * Domain modules (auth, catalog, selection, goal, progress, dashboard,
 * reminder, export) are registered here by the Backend Engineer following the
 * layering contract in architecture.md §4.2, each under the /v1 prefix.
 */
export async function buildApp(
  opts: BuildAppOptions = {}
): Promise<FastifyInstance> {
  const app = Fastify({
    logger: opts.logger ?? false,
    bodyLimit: 1048576,
    requestTimeout: 30000,
  });

  // CORS — allow the web app (3122) with credentials so the session cookie flows.
  const allowedOrigins = (
    process.env.ALLOWED_ORIGINS ||
    process.env.FRONTEND_URL ||
    'http://localhost:3122'
  )
    .split(',')
    .map((o) => o.trim());

  await app.register(cors, {
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  });

  // Security headers
  await app.register(helmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:'],
        fontSrc: ["'self'"],
        connectSrc: ["'self'"],
        objectSrc: ["'none'"],
        frameAncestors: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
      },
    },
  });

  // Cookie (session auth — ADR-002)
  await app.register(cookie);

  // Tolerate an empty body on requests that carry `Content-Type:
  // application/json` (common from browser fetch on DELETE/POST). Without this,
  // Fastify throws FST_ERR_CTP_EMPTY_JSON_BODY. We parse empty → undefined so
  // bodyless mutations (logout, delete) proceed normally.
  app.addContentTypeParser(
    'application/json',
    { parseAs: 'string' },
    (_req, body: string, done) => {
      if (body === '' || body == null) {
        done(null, undefined);
        return;
      }
      try {
        done(null, JSON.parse(body));
      } catch (err) {
        (err as { statusCode?: number }).statusCode = 400;
        done(err as Error, undefined);
      }
    }
  );

  // Single RFC 7807 error handler — set BEFORE routes for encapsulation.
  app.setErrorHandler((error, request, reply) => {
    if (error instanceof AppError) {
      const problem = error.toProblem(request.url);
      return reply.code(error.statusCode).send(problem);
    }

    if (error instanceof ZodError) {
      return reply.code(400).send({
        type: 'https://studyflow.app/errors/validation-error',
        title: 'ValidationError',
        status: 400,
        detail: 'Request validation failed',
        instance: request.url,
        errors: error.flatten().fieldErrors,
      });
    }

    // Fastify's own framework errors carry a meaningful 4xx statusCode (e.g.
    // FST_ERR_CTP_EMPTY_JSON_BODY when a DELETE/POST is sent with an empty body
    // and Content-Type: application/json). Honour it instead of masking as 500.
    const fwError = error as { statusCode?: number; name?: string; message?: string };
    const fastifyStatus = fwError.statusCode;
    if (
      typeof fastifyStatus === 'number' &&
      fastifyStatus >= 400 &&
      fastifyStatus < 500
    ) {
      return reply.code(fastifyStatus).send({
        type: 'about:blank',
        title: fwError.name || 'Bad Request',
        status: fastifyStatus,
        detail: fwError.message || 'Request error',
        instance: request.url,
      });
    }

    logger.error(
      { err: error, request_id: request.id, url: request.url, method: request.method },
      'Unexpected error'
    );

    const detail =
      process.env.NODE_ENV === 'production'
        ? 'An unexpected error occurred'
        : error instanceof Error
          ? error.message
          : 'Unknown error';

    return reply.code(500).send({
      type: 'https://studyflow.app/errors/internal-error',
      title: 'Internal Server Error',
      status: 500,
      detail,
      instance: request.url,
    });
  });

  app.setNotFoundHandler((request, reply) => {
    return reply.code(404).send({
      type: 'https://studyflow.app/errors/not-found',
      title: 'Not Found',
      status: 404,
      detail: `Route ${request.method} ${request.url} not found`,
      instance: request.url,
    });
  });

  // Plugins
  await app.register(prismaPlugin);
  await app.register(sessionAuthPlugin);

  // Health route (ops, no auth) — verifies DB connectivity via SELECT 1.
  app.get('/v1/health', async (_request, reply) => {
    try {
      await app.prisma.$queryRaw`SELECT 1`;
      return {
        status: 'ok',
        database: 'connected',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      logger.error({ err: error }, 'Health check DB query failed');
      return reply.code(503).send({
        status: 'error',
        database: 'disconnected',
        timestamp: new Date().toISOString(),
      });
    }
  });

  // Domain modules registered under the /v1 prefix (architecture.md §4.2).
  await app.register(authRoutes, { prefix: '/v1' });
  await app.register(subjectRoutes, { prefix: '/v1' });
  await app.register(selectionRoutes, { prefix: '/v1' });
  await app.register(goalRoutes, { prefix: '/v1' });
  await app.register(progressRoutes, { prefix: '/v1' });
  await app.register(dashboardRoutes, { prefix: '/v1' });

  return app;
}
