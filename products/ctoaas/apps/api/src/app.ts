import Fastify, { FastifyInstance } from 'fastify';
import { loadConfig } from './config';

// Plugins
import errorHandlerPlugin from './plugins/error-handler';
import prismaPlugin from './plugins/prisma';
import corsPlugin from './plugins/cors';
import redisPlugin from './plugins/redis';
import authPlugin from './plugins/auth';
import rateLimiterPlugin from './plugins/rate-limiter';

// Routes
import healthRoutes from './routes/health';
import authRoutes from './routes/auth';
import profileRoutes from './routes/profile';
import knowledgeRoutes from './routes/knowledge';
import riskRoutes from './routes/risks';
import copilotRoutes from './routes/copilot';
import conversationRoutes from './routes/conversations';
import preferencesRoutes from './routes/preferences';
import costRoutes from './routes/costs';
import radarRoutes from './routes/radar';
import adrRoutes from './routes/adrs';

export interface BuildAppOptions {
  skipRateLimit?: boolean;
}

export async function buildApp(
  options: BuildAppOptions = {}
): Promise<FastifyInstance> {
  loadConfig();

  const isTest = process.env.NODE_ENV === 'test';
  const isProd = process.env.NODE_ENV === 'production';

  const app = Fastify({
    bodyLimit: 1_048_576, // 1 MB
    logger: isTest
      ? false
      : isProd
        ? { level: 'info' }
        : { level: process.env.LOG_LEVEL ?? 'info' },
  });

  // Core plugins — order matters for dependency resolution
  await app.register(errorHandlerPlugin);
  await app.register(prismaPlugin);
  await app.register(corsPlugin);
  await app.register(redisPlugin);
  await app.register(authPlugin);

  if (!options.skipRateLimit) {
    await app.register(rateLimiterPlugin);
  }

  // Routes
  await app.register(healthRoutes);
  await app.register(authRoutes, {
    prefix: '/api/v1/auth',
  });
  await app.register(profileRoutes);
  await app.register(knowledgeRoutes);
  await app.register(riskRoutes, {
    prefix: '/api/v1/risks',
  });
  await app.register(copilotRoutes, {
    prefix: '/api/v1/copilot',
  });
  await app.register(conversationRoutes);
  await app.register(preferencesRoutes);
  await app.register(costRoutes, {
    prefix: '/api/v1/costs',
  });
  await app.register(radarRoutes, {
    prefix: '/api/v1/radar',
  });
  await app.register(adrRoutes, {
    prefix: '/api/v1/adrs',
  });

  return app;
}
