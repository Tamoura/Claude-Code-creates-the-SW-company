import Fastify, { FastifyInstance } from 'fastify';
import { loadConfig } from './config';

// Plugins
import prismaPlugin from './plugins/prisma';
import corsPlugin from './plugins/cors';
import redisPlugin from './plugins/redis';
import authPlugin from './plugins/auth';
import errorHandlerPlugin from './plugins/error-handler';
import rateLimiterPlugin from './plugins/rate-limiter';
import requestIdPlugin from './plugins/request-id';
import accessLogPlugin from './plugins/access-log';
import swaggerPlugin from './plugins/swagger';
import csrfPlugin from './plugins/csrf';
import metricsPlugin from './plugins/metrics';

// Routes
import healthRoutes from './modules/health/health.routes';
import authRoutes from './modules/auth/auth.routes';
import profileRoutes from './modules/profile/profile.routes';
import connectionRoutes from './modules/connection/connection.routes';
import feedRoutes from './modules/feed/feed.routes';
import consentRoutes from './modules/consent/consent.routes';
import jobsRoutes from './modules/jobs/jobs.routes';

export interface BuildAppOptions {
  skipRateLimit?: boolean;
}

export async function buildApp(
  options: BuildAppOptions = {}
): Promise<FastifyInstance> {
  loadConfig();

  /* istanbul ignore next */
  const app = Fastify({
    logger:
      process.env.NODE_ENV === 'test'
        ? false
        : {
            level:
              process.env.LOG_LEVEL || 'info',
          },
  });

  // Core plugins
  await app.register(requestIdPlugin);
  await app.register(errorHandlerPlugin);
  await app.register(prismaPlugin);
  await app.register(corsPlugin);
  await app.register(redisPlugin); // Must register before authPlugin (blacklist check)
  await app.register(authPlugin);

  /* istanbul ignore next */
  if (!options.skipRateLimit) {
    await app.register(rateLimiterPlugin);
  }

  await app.register(csrfPlugin);

  /* istanbul ignore next */
  if (process.env.NODE_ENV !== 'test') {
    await app.register(accessLogPlugin);
    await app.register(swaggerPlugin);
    await app.register(metricsPlugin);
  }

  // Routes
  await app.register(healthRoutes);
  await app.register(authRoutes, {
    prefix: '/api/v1/auth',
  });
  await app.register(profileRoutes, {
    prefix: '/api/v1/profiles',
  });
  await app.register(connectionRoutes, {
    prefix: '/api/v1/connections',
  });
  await app.register(feedRoutes, {
    prefix: '/api/v1/feed',
  });
  await app.register(consentRoutes, {
    prefix: '/api/v1/consent',
  });
  await app.register(jobsRoutes, {
    prefix: '/api/v1/jobs',
  });

  return app;
}
