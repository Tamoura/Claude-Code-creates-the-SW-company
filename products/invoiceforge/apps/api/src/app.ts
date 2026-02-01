import Fastify, { FastifyInstance, FastifyError } from 'fastify';
import cors from '@fastify/cors';
import compress from '@fastify/compress';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import cookie from '@fastify/cookie';
import prismaPlugin from './plugins/prisma';
import authPlugin from './plugins/auth';
import { healthRoutes } from './modules/health/routes';
import { authRoutes } from './modules/auth/routes';
import { invoiceRoutes } from './modules/invoices/routes';
import { publicInvoiceRoutes } from './modules/invoices/public-routes';
import { clientRoutes } from './modules/clients/routes';
import { userRoutes } from './modules/users/routes';
import { webhookRoutes } from './modules/webhooks/routes';
import stripePlugin from './plugins/stripe';
import { AppError } from './lib/errors';
import { config } from './config';

export interface BuildAppOptions {
  logger?: boolean | object;
}

export async function buildApp(
  opts: BuildAppOptions = {}
): Promise<FastifyInstance> {
  const app = Fastify({
    logger: opts.logger ?? false,
    bodyLimit: 524288, // 512KB
    requestTimeout: 30000, // 30 seconds
  });

  // Response compression (register early, before other plugins)
  await app.register(compress, { threshold: 1024 });

  // Plugins
  const allowedOrigins = config.nodeEnv === 'production'
    ? [config.appUrl]
    : ['http://localhost:3109', 'http://localhost:3100', config.appUrl];

  await app.register(cors, {
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  });

  await app.register(helmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'", config.appUrl],
      },
    },
  });

  await app.register(rateLimit, {
    max: 200,
    timeWindow: '1 minute',
  });

  await app.register(cookie);

  // Database
  await app.register(prismaPlugin);

  // Auth middleware
  await app.register(authPlugin);

  // Stripe (only if configured)
  if (config.stripeSecretKey && config.stripeSecretKey !== 'sk_test_fake') {
    await app.register(stripePlugin);
  }

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

  // Public routes (no auth required)
  await app.register(publicInvoiceRoutes);
  await app.register(webhookRoutes);

  // Auth-protected routes
  await app.register(healthRoutes);
  await app.register(authRoutes);
  await app.register(invoiceRoutes);
  await app.register(clientRoutes);
  await app.register(userRoutes);

  return app;
}
