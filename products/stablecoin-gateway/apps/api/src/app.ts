import Fastify, { FastifyInstance, FastifyRequest } from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import rateLimit from '@fastify/rate-limit';
import helmet from '@fastify/helmet';
import compress from '@fastify/compress';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { ZodError } from 'zod';

// Plugins
import prismaPlugin from './plugins/prisma.js';
import redisPlugin from './plugins/redis.js';
import observabilityPlugin from './plugins/observability.js';
import authPlugin from './plugins/auth.js';

// Routes
import authRoutes from './routes/v1/auth.js';
import paymentSessionRoutes from './routes/v1/payment-sessions.js';
import webhookRoutes from './routes/v1/webhooks.js';
import apiKeyRoutes from './routes/v1/api-keys.js';
import refundRoutes from './routes/v1/refunds.js';
import adminRoutes from './routes/v1/admin.js';
import checkoutRoutes from './routes/v1/checkout.js';
import paymentLinkRoutes from './routes/v1/payment-links.js';
import notificationRoutes from './routes/v1/notifications.js';
import analyticsRoutes from './routes/v1/analytics.js';
import webhookWorkerRoutes from './routes/internal/webhook-worker.js';

// Utils
import { logger } from './utils/logger.js';
import { AppError } from './types/index.js';
import { RedisRateLimitStore } from './utils/redis-rate-limit-store.js';

export async function buildApp(): Promise<FastifyInstance> {
  const fastify = Fastify({
    trustProxy: true, // Required behind load balancers for correct request.ip
    bodyLimit: 1048576, // 1MB - prevent oversized request payloads
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
    routerOptions: {
      maxParamLength: 256, // Reject overly long URL parameters
    },
  });

  // Register response compression (gzip/deflate)
  await fastify.register(compress, {
    threshold: 1024,
    encodings: ['gzip', 'deflate'],
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
  // Normalize origins to lowercase to prevent case-sensitivity bypass (RISK-042 fix)
  const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:3104')
    .split(',')
    .map((origin) => origin.trim().toLowerCase());

  const isProduction = process.env.NODE_ENV === 'production';

  await fastify.register(cors, {
    origin: (origin, callback) => {
      if (!origin) {
        if (isProduction) {
          // In production, reject requests with no Origin header.
          // Browsers send Origin: null from sandboxed iframes and
          // data: URIs — combined with credentials: true this is unsafe.
          callback(new Error('Origin required'), false);
          return;
        }
        // In dev/test, allow no-origin for Postman/curl convenience
        callback(null, true);
        return;
      }

      // Check if origin is in whitelist (case-insensitive)
      if (allowedOrigins.includes(origin.toLowerCase())) {
        callback(null, true);
        return;
      }

      // Reject origin
      callback(new Error('Not allowed by CORS'), false);
    },
    credentials: true,
    methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  });

  // Register JWT
  // JWT_SECRET is validated in env-validator.ts on startup
  // Pin JWT algorithm to HS256 to prevent algorithm confusion attacks (Phase 3.6)
  await fastify.register(jwt, {
    secret: process.env.JWT_SECRET!,
    sign: { algorithm: 'HS256' },
    verify: { algorithms: ['HS256'] },
  });

  // Register plugins
  await fastify.register(observabilityPlugin); // Register first to track all requests
  await fastify.register(prismaPlugin);
  await fastify.register(redisPlugin);

  // Register rate limiting with Redis-backed distributed store
  // Enhanced rate limiting (FIX-PHASE2-09):
  // - Health/ready endpoints are exempted
  // - Rate limit headers added to all non-exempt responses
  // - Authenticated endpoints use user/API key as key
  // - Pre-auth endpoints use IP+User-Agent fingerprint (in auth routes)
  const rateLimitConfig: any = {
    max: parseInt(process.env.RATE_LIMIT_MAX || '100'),
    timeWindow: parseInt(process.env.RATE_LIMIT_WINDOW || '60000'),
    // Exempt health and ready endpoints from rate limiting
    // These are critical for load balancers and monitoring
    allowList: (request: FastifyRequest) => {
      const url = request.url.split('?')[0]; // Remove query string
      return url === '/health' || url === '/ready';
    },
    // Do not add rate limit headers for exempted endpoints
    addHeadersOnExemption: false,
    // Add rate limit headers to all non-exempt responses
    addHeaders: {
      'x-ratelimit-limit': true,
      'x-ratelimit-remaining': true,
      'x-ratelimit-reset': true,
    },
    // Key by authenticated user/API key instead of IP to prevent:
    // 1. Shared IP throttling (corporate NAT, VPNs)
    // 2. IP-based abuse (attacker rotating IPs)
    keyGenerator: (request: any) => {
      // Priority 1: Use authenticated user ID
      if (request.currentUser?.id) {
        return `user:${request.currentUser.id}`;
      }

      // Priority 2: Use API key ID
      if (request.apiKey?.id) {
        return `apikey:${request.apiKey.id}`;
      }

      // Fallback: Use IP (for unauthenticated endpoints like health checks)
      // Note: This is a fallback only - authenticated endpoints will use user/API key
      return `ip:${request.ip}`;
    },
  };

  if (fastify.redis) {
    // Use Redis for distributed rate limiting across multiple instances
    // Set the Redis instance globally for the store class
    RedisRateLimitStore.setRedis(fastify.redis);
    // Pass the CLASS (not an instance) to @fastify/rate-limit
    rateLimitConfig.store = RedisRateLimitStore;
    rateLimitConfig.keyPrefix = 'ratelimit:';
    logger.info('Rate limiting configured with Redis distributed store', {
      max: rateLimitConfig.max,
      timeWindow: rateLimitConfig.timeWindow,
      keyStrategy: 'user/apikey with IP fallback',
    });
  } else {
    logger.warn('Redis not configured - rate limiting uses in-memory store (not suitable for production)');
  }

  await fastify.register(rateLimit, rateLimitConfig);

  await fastify.register(authPlugin);


  // Register OpenAPI / Swagger spec generation
  await fastify.register(swagger, {
    openapi: {
      info: {
        title: 'Stablecoin Gateway API',
        description: 'API for processing stablecoin payments (USDC/USDT)',
        version: '1.0.0',
      },
      servers: [{ url: 'http://localhost:5001', description: 'Development' }],
      tags: [
        { name: 'payments', description: 'Payment session management' },
        { name: 'refunds', description: 'Refund processing' },
        { name: 'webhooks', description: 'Webhook endpoint management' },
        { name: 'auth', description: 'Authentication and authorization' },
        { name: 'api-keys', description: 'API key management' },
        { name: 'internal', description: 'Internal service endpoints' },
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
          },
          apiKeyAuth: {
            type: 'http',
            scheme: 'bearer',
            description: 'API key (sk_live_... or sk_test_...)',
          },
        },
      },
    },
  });

  // Only expose Swagger UI in non-production environments
  if (process.env.NODE_ENV !== 'production') {
    await fastify.register(swaggerUi, {
      routePrefix: '/docs',
    });
  }
  // Register routes
  await fastify.register(authRoutes, { prefix: '/v1/auth' });
  await fastify.register(paymentSessionRoutes, { prefix: '/v1/payment-sessions' });
  await fastify.register(webhookRoutes, { prefix: '/v1/webhooks' });
  await fastify.register(apiKeyRoutes, { prefix: '/v1/api-keys' });
  await fastify.register(refundRoutes, { prefix: '/v1/refunds' });
  await fastify.register(adminRoutes, { prefix: '/v1/admin' });
  await fastify.register(checkoutRoutes, { prefix: '/v1/checkout' });
  await fastify.register(paymentLinkRoutes, { prefix: '/v1/payment-links' });
  await fastify.register(notificationRoutes, { prefix: '/v1/notifications' });
  await fastify.register(analyticsRoutes, { prefix: '/v1/analytics' });

  // Dev-only routes (never registered in production)
  if (process.env.NODE_ENV !== 'production') {
    const devRoutes = (await import('./routes/v1/dev.js')).default;
    await fastify.register(devRoutes, { prefix: '/v1/dev' });
  }

  // Internal routes (for cron jobs, workers, etc.)
  await fastify.register(webhookWorkerRoutes, { prefix: '/internal' });

  // Health check with deep dependency verification
  fastify.get('/health', async (_request, reply) => {
    const checks: Record<string, { status: string; latency?: number; error?: string }> = {};
    let overallStatus = 'healthy';

    // Check database connectivity
    const dbStart = Date.now();
    try {
      await fastify.prisma.$queryRaw`SELECT 1`;
      checks.database = {
        status: 'healthy',
        latency: Date.now() - dbStart,
      };
    } catch (error) {
      checks.database = {
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
      overallStatus = 'unhealthy';
    }

    // Check Redis connectivity (if configured)
    if (fastify.redis) {
      const redisStart = Date.now();
      try {
        await fastify.redis.ping();
        checks.redis = {
          status: 'healthy',
          latency: Date.now() - redisStart,
        };
      } catch (error) {
        checks.redis = {
          status: 'unhealthy',
          error: error instanceof Error ? error.message : 'Unknown error',
        };
        // Redis is optional, so don't mark overall as unhealthy
        // overallStatus = 'degraded'; // Could use this if we want to indicate degraded state
      }
    } else if (process.env.REDIS_URL) {
      // Redis URL configured but client not connected
      checks.redis = {
        status: 'not-connected',
      };
    }

    const statusCode = overallStatus === 'healthy' ? 200 : 503;

    return reply.code(statusCode).send({
      status: overallStatus,
      timestamp: new Date().toISOString(),
      checks,
    });
  });

  // Global error handler
  fastify.setErrorHandler((error, request, reply) => {
    if (error instanceof AppError) {
      return reply.code(error.statusCode).send(error.toJSON());
    }

    // Validation errors from Zod
    if (error instanceof ZodError ||
        (error as any).name === 'ZodError' ||
        (error as any).validation) {
      return reply.code(400).send({
        type: 'https://gateway.io/errors/validation-error',
        title: 'Validation Error',
        status: 400,
        detail: error instanceof Error ? error.message : 'Validation failed',
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
      detail: error instanceof Error ? error.message : 'Unknown error',
      request_id: request.id,
      stack: error instanceof Error ? error.stack : undefined,
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
