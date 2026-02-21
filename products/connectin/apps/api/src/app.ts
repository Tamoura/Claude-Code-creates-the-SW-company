import Fastify, { FastifyInstance } from 'fastify';
import { loadConfig } from './config';

// Plugins
import prismaPlugin from './plugins/prisma';
import corsPlugin from './plugins/cors';
import authPlugin from './plugins/auth';
import errorHandlerPlugin from './plugins/error-handler';
import rateLimiterPlugin from './plugins/rate-limiter';
import swaggerPlugin from './plugins/swagger';

// Routes
import healthRoutes from './modules/health/health.routes';
import authRoutes from './modules/auth/auth.routes';
import profileRoutes from './modules/profile/profile.routes';
import connectionRoutes from './modules/connection/connection.routes';
import feedRoutes from './modules/feed/feed.routes';

export interface BuildAppOptions {
  skipRateLimit?: boolean;
}

export async function buildApp(
  options: BuildAppOptions = {}
): Promise<FastifyInstance> {
  loadConfig();

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
  await app.register(errorHandlerPlugin);
  await app.register(prismaPlugin);
  await app.register(corsPlugin);
  await app.register(authPlugin);

  if (!options.skipRateLimit) {
    await app.register(rateLimiterPlugin);
  }

  if (process.env.NODE_ENV !== 'test') {
    await app.register(swaggerPlugin);
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

  return app;
}
