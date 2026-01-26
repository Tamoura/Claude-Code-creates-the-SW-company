import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import { errorHandler } from './middleware/error-handler.js';
import { healthRoutes } from './routes/health.js';
import { authRoutes } from './routes/auth.js';
import prisma from './lib/prisma.js';

export interface BuildAppOptions {
  logger?: boolean;
}

/**
 * Build and configure the Fastify application
 */
export async function buildApp(
  options: BuildAppOptions = {}
): Promise<FastifyInstance> {
  const fastify = Fastify({
    logger: options.logger ?? process.env.NODE_ENV !== 'test',
  });

  // Register security plugins
  await fastify.register(helmet, {
    contentSecurityPolicy: false, // Disable for API
  });

  await fastify.register(cors, {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3100',
    credentials: true,
  });

  // Decorate with Prisma client
  fastify.decorate('prisma', prisma);

  // Register error handler
  fastify.setErrorHandler(errorHandler);

  // Register routes with /api/v1 prefix
  await fastify.register(healthRoutes, { prefix: '/api/v1' });
  await fastify.register(authRoutes, { prefix: '/api/v1/auth' });

  // Graceful shutdown
  fastify.addHook('onClose', async () => {
    await prisma.$disconnect();
  });

  return fastify;
}

// Extend Fastify types
declare module 'fastify' {
  interface FastifyInstance {
    prisma: typeof prisma;
  }
}

export default buildApp;
