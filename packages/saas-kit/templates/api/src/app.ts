import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import { prismaPlugin } from './plugins/prisma.js';
import { redisPlugin } from './plugins/redis.js';
{{#if feature.auth}}import { authPlugin } from '@connectsw/auth/backend';
{{/if feature.auth}}{{#if feature.audit}}import { createAuditHook } from '@connectsw/audit/backend';
{{/if feature.audit}}import { healthRoutes } from './routes/v1/health.js';
{{#if feature.auth}}import { authRoutes, apiKeyRoutes } from '@connectsw/auth/backend';
{{/if feature.auth}}

export async function buildApp() {
  const app = Fastify({
    logger: {
      level: process.env.LOG_LEVEL ?? 'info',
      transport:
        process.env.NODE_ENV !== 'production'
          ? { target: 'pino-pretty', options: { colorize: true } }
          : undefined,
    },
  });

  // Security
  await app.register(helmet);
  await app.register(cors, {
    origin: process.env.CORS_ORIGIN ?? 'http://localhost:{{webPort}}',
    credentials: true,
  });
  await app.register(rateLimit, { max: 100, timeWindow: '1 minute' });

  // Infrastructure plugins
  await app.register(prismaPlugin);
  await app.register(redisPlugin);

{{#if feature.auth}}  // Authentication
  await app.register(authPlugin, {
    jwtSecret: process.env.JWT_SECRET!,
    jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '15m',
    jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? '7d',
  });
{{/if feature.auth}}
{{#if feature.audit}}  // Audit logging
  app.addHook('onResponse', createAuditHook({ prisma: app.prisma }));
{{/if feature.audit}}
  // Routes
  await app.register(healthRoutes, { prefix: '/api/v1' });
{{#if feature.auth}}  await app.register(authRoutes, { prefix: '/api/v1/auth' });
  await app.register(apiKeyRoutes, { prefix: '/api/v1/api-keys' });
{{/if feature.auth}}
  return app;
}
