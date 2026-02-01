import Fastify, { FastifyInstance, FastifyError } from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import cookie from '@fastify/cookie';
import prismaPlugin from './plugins/prisma';
import authPlugin from './plugins/auth';
import { healthRoutes } from './modules/health/routes';
import { authRoutes } from './modules/auth/routes';
import { invoiceRoutes } from './modules/invoices/routes';
import { clientRoutes } from './modules/clients/routes';
import { userRoutes } from './modules/users/routes';
import { AppError } from './lib/errors';

export interface BuildAppOptions {
  logger?: boolean | object;
}

export async function buildApp(
  opts: BuildAppOptions = {}
): Promise<FastifyInstance> {
  const app = Fastify({
    logger: opts.logger ?? false,
  });

  // Plugins
  await app.register(cors, {
    origin: true,
    credentials: true,
  });

  await app.register(helmet, {
    contentSecurityPolicy: false,
  });

  await app.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
  });

  await app.register(cookie);

  // Database
  await app.register(prismaPlugin);

  // Auth middleware
  await app.register(authPlugin);

  // Global error handler (set before routes so encapsulated contexts inherit it)
  app.setErrorHandler((error: FastifyError | AppError, _request, reply) => {
    if (error instanceof AppError) {
      reply.status(error.statusCode).send({
        error: error.code,
        message: error.message,
      });
      return;
    }

    const fastifyError = error as FastifyError;

    // Fastify validation errors
    if (fastifyError.validation) {
      reply.status(400).send({
        error: 'VALIDATION_ERROR',
        message: fastifyError.message,
      });
      return;
    }

    // Rate limit errors
    if (fastifyError.statusCode === 429) {
      reply.status(429).send({
        error: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests',
      });
      return;
    }

    // Unexpected errors
    app.log.error(error);
    reply.status(500).send({
      error: 'INTERNAL_SERVER_ERROR',
      message:
        process.env.NODE_ENV === 'production'
          ? 'Internal server error'
          : fastifyError.message,
    });
  });

  // Routes (registered after error handler so they inherit it)
  await app.register(healthRoutes);
  await app.register(authRoutes);
  await app.register(invoiceRoutes);
  await app.register(clientRoutes);
  await app.register(userRoutes);

  return app;
}
