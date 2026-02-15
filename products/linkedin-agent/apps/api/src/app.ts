import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import cookie from '@fastify/cookie';
import { ZodError } from 'zod';

import prismaPlugin from './plugins/prisma';

import healthRoutes from './routes/health';
import trendsRoutes from './routes/trends';
import postsRoutes from './routes/posts';
import carouselRoutes from './routes/carousel';
import modelsRoutes from './routes/models';

import { logger } from './utils/logger';

export interface BuildAppOptions {
  logger?: boolean | object;
}

export async function buildApp(
  opts: BuildAppOptions = {}
): Promise<FastifyInstance> {
  const app = Fastify({
    logger: opts.logger ?? false,
    bodyLimit: 2097152, // 2MB for large content pastes
    requestTimeout: 120000, // 2 minutes for LLM calls
  });

  // CORS
  const allowedOrigins = (
    process.env.ALLOWED_ORIGINS || 'http://localhost:3114'
  )
    .split(',')
    .map((o) => o.trim());

  await app.register(cors, {
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  });

  // Cookie
  await app.register(cookie);

  // Security headers
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

  // Global error handler (RFC 7807)
  app.setErrorHandler((error, request, reply) => {
    if (error instanceof ZodError) {
      return reply.code(422).send({
        type: 'https://linkedin-agent.app/errors/validation-error',
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
        type: 'https://linkedin-agent.app/errors/internal-error',
        title: 'Internal Server Error',
        status: 500,
        detail: 'An unexpected error occurred',
        instance: request.url,
      });
    }

    return reply.code(500).send({
      type: 'https://linkedin-agent.app/errors/internal-error',
      title: 'Internal Server Error',
      status: 500,
      detail: error instanceof Error ? error.message : 'Unknown error',
      instance: request.url,
    });
  });

  // Not found handler
  app.setNotFoundHandler((request, reply) => {
    return reply.code(404).send({
      type: 'https://linkedin-agent.app/errors/not-found',
      title: 'Not Found',
      status: 404,
      detail: `Route ${request.method} ${request.url} not found`,
      instance: request.url,
    });
  });

  // Plugins
  await app.register(prismaPlugin);

  // Routes
  await app.register(healthRoutes, { prefix: '/api' });
  await app.register(trendsRoutes, { prefix: '/api/trends' });
  await app.register(postsRoutes, { prefix: '/api/posts' });
  await app.register(carouselRoutes, { prefix: '/api/posts' });
  await app.register(modelsRoutes, { prefix: '/api/models' });

  return app;
}
