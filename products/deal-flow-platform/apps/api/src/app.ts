import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import rateLimit from '@fastify/rate-limit';
// Plugins
import prismaPlugin from './lib/prisma';
import redisPlugin from './lib/redis';

// Routes
import authRoutes from './routes/v1/auth';
import dealRoutes from './routes/v1/deals';
import subscriptionRoutes from './routes/v1/subscriptions';
import investorRoutes from './routes/v1/investors';
import watchlistRoutes from './routes/v1/watchlist';
import notificationRoutes from './routes/v1/notifications';

// Types
import { AppError } from './types/index';
import { getConfig } from './config';

export async function buildApp(): Promise<FastifyInstance> {
  const config = getConfig();

  const fastify = Fastify({
    bodyLimit: 1048576,
    logger: config.NODE_ENV === 'development' ? {
      level: 'info',
      transport: {
        target: 'pino-pretty',
        options: {
          translateTime: 'HH:MM:ss Z',
          ignore: 'pid,hostname',
        },
      },
    } : false,
  });

  // CORS
  const allowedOrigins = config.ALLOWED_ORIGINS
    .split(',')
    .map((o) => o.trim());

  await fastify.register(cors, {
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error('Not allowed by CORS'), false);
    },
    credentials: true,
  });

  // JWT
  await fastify.register(jwt, {
    secret: config.JWT_SECRET,
  });

  // Plugins
  await fastify.register(prismaPlugin);
  await fastify.register(redisPlugin);

  // Rate limiting
  await fastify.register(rateLimit, {
    max: config.RATE_LIMIT_MAX,
    timeWindow: config.RATE_LIMIT_WINDOW,
  });

  // Routes
  await fastify.register(authRoutes, { prefix: '/api/v1/auth' });
  await fastify.register(dealRoutes, { prefix: '/api/v1/deals' });
  await fastify.register(subscriptionRoutes, { prefix: '/api/v1/subscriptions' });
  await fastify.register(investorRoutes, { prefix: '/api/v1/investors' });
  await fastify.register(watchlistRoutes, { prefix: '/api/v1/watchlist' });
  await fastify.register(notificationRoutes, { prefix: '/api/v1/notifications' });

  // Health check
  fastify.get('/api/v1/health', async (_request, reply) => {
    try {
      await fastify.prisma.$queryRaw`SELECT 1`;
      return reply.send({ status: 'healthy', timestamp: new Date().toISOString() });
    } catch (_err) {
      return reply.code(503).send({ status: 'unhealthy' });
    }
  });

  // Error handler
  fastify.setErrorHandler((error, request, reply) => {
    if (error instanceof AppError) {
      return reply.code(error.statusCode).send(error.toJSON());
    }

    // Zod validation errors (caught as safety net)
    if ((error as any).name === 'ZodError' || Array.isArray((error as any).issues)) {
      const issues = (error as any).issues || [];
      const messages = issues.length > 0
        ? issues.map((e: any) => e.message).join(', ')
        : error.message;
      return reply.code(400).send({
        error: 'VALIDATION_ERROR',
        message: messages,
        statusCode: 400,
      });
    }

    // Rate limit error
    if (error.statusCode === 429) {
      return reply.code(429).send({
        error: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests',
        statusCode: 429,
      });
    }

    // Unexpected
    if (request.log) {
      request.log.error(error);
    }
    return reply.code(500).send({
      error: 'INTERNAL_ERROR',
      message: config.NODE_ENV === 'production'
        ? 'An unexpected error occurred'
        : error.message,
      statusCode: 500,
    });
  });

  // 404 handler
  fastify.setNotFoundHandler((_request, reply) => {
    return reply.code(404).send({
      error: 'NOT_FOUND',
      message: 'Route not found',
      statusCode: 404,
    });
  });

  return fastify;
}
