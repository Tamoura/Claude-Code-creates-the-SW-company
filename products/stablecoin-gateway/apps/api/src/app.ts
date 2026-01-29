import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import rateLimit from '@fastify/rate-limit';
import helmet from '@fastify/helmet';
import { ZodError } from 'zod';

// Plugins
import prismaPlugin from './plugins/prisma.js';
import authPlugin from './plugins/auth.js';

// Routes
import authRoutes from './routes/v1/auth.js';
import paymentSessionRoutes from './routes/v1/payment-sessions.js';

// Utils
import { logger } from './utils/logger.js';
import { AppError } from './types/index.js';

export async function buildApp(): Promise<FastifyInstance> {
  const fastify = Fastify({
    logger: process.env.NODE_ENV === 'development' ? {
      level: 'info',
      transport: {
        target: 'pino-pretty',
        options: {
          translateTime: 'HH:MM:ss Z',
          ignore: 'pid,hostname',
        },
      },
    } : false,
    requestIdHeader: 'x-request-id',
    requestIdLogLabel: 'request_id',
  });

  // Register security headers (helmet)
  await fastify.register(helmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'https:'],
      },
    },
    hsts: {
      maxAge: 31536000, // 1 year
      includeSubDomains: true,
      preload: true,
    },
  });

  // Register CORS with multiple allowed origins
  const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:3101')
    .split(',')
    .map((origin) => origin.trim());

  await fastify.register(cors, {
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g., mobile apps, Postman, server-to-server)
      if (!origin) {
        callback(null, true);
        return;
      }

      // Check if origin is in whitelist
      if (allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      // Reject origin
      callback(new Error('Not allowed by CORS'), false);
    },
    credentials: true,
  });

  // Register JWT
  // JWT_SECRET is validated in env-validator.ts on startup
  await fastify.register(jwt, {
    secret: process.env.JWT_SECRET!,
  });

  // Register rate limiting
  await fastify.register(rateLimit, {
    max: parseInt(process.env.RATE_LIMIT_MAX || '100'),
    timeWindow: parseInt(process.env.RATE_LIMIT_WINDOW || '60000'),
  });

  // Register plugins
  await fastify.register(prismaPlugin);
  await fastify.register(authPlugin);

  // Register routes
  await fastify.register(authRoutes, { prefix: '/v1/auth' });
  await fastify.register(paymentSessionRoutes, { prefix: '/v1/payment-sessions' });

  // Health check
  fastify.get('/health', async () => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  });

  // Global error handler
  fastify.setErrorHandler((error, request, reply) => {
    if (error instanceof AppError) {
      return reply.code(error.statusCode).send(error.toJSON());
    }

    // Validation errors from Zod
    if (error instanceof ZodError || error.name === 'ZodError' || error.validation) {
      return reply.code(400).send({
        type: 'https://gateway.io/errors/validation-error',
        title: 'Validation Error',
        status: 400,
        detail: error.message,
        request_id: request.id,
      });
    }

    // Log unexpected errors
    logger.error('Unexpected error', error, {
      request_id: request.id,
      url: request.url,
      method: request.method,
    });

    // Don't expose internal errors in production
    if (process.env.NODE_ENV === 'production') {
      return reply.code(500).send({
        type: 'https://gateway.io/errors/internal-error',
        title: 'Internal Server Error',
        status: 500,
        detail: 'An unexpected error occurred',
        request_id: request.id,
      });
    }

    return reply.code(500).send({
      type: 'https://gateway.io/errors/internal-error',
      title: 'Internal Server Error',
      status: 500,
      detail: error.message,
      request_id: request.id,
      stack: error.stack,
    });
  });

  // Not found handler
  fastify.setNotFoundHandler((request, reply) => {
    return reply.code(404).send({
      type: 'https://gateway.io/errors/not-found',
      title: 'Not Found',
      status: 404,
      detail: `Route ${request.method} ${request.url} not found`,
      request_id: request.id,
    });
  });

  return fastify;
}
