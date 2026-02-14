import Fastify from 'fastify';
import cors from '@fastify/cors';
import { overviewRoutes } from './routes/v1/overview.js';
import { productRoutes } from './routes/v1/products.js';
import { agentRoutes } from './routes/v1/agents.js';
import { activityRoutes } from './routes/v1/activity.js';
import { componentRoutes } from './routes/v1/components.js';
import { infrastructureRoutes } from './routes/v1/infrastructure.js';
import { invokeRoutes } from './routes/v1/invoke.js';

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

  await app.register(cors, {
    origin: process.env.CORS_ORIGIN ?? 'http://localhost:3113',
    credentials: true,
  });

  // Health check
  app.get('/api/v1/health', async () => ({
    status: 'healthy',
    service: 'command-center-api',
    timestamp: new Date().toISOString(),
  }));

  // Routes
  await app.register(overviewRoutes, { prefix: '/api/v1' });
  await app.register(productRoutes, { prefix: '/api/v1' });
  await app.register(agentRoutes, { prefix: '/api/v1' });
  await app.register(activityRoutes, { prefix: '/api/v1' });
  await app.register(componentRoutes, { prefix: '/api/v1' });
  await app.register(infrastructureRoutes, { prefix: '/api/v1' });
  await app.register(invokeRoutes, { prefix: '/api/v1' });

  return app;
}
