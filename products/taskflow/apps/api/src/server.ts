import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import prismaPlugin from './plugins/prisma';
import authPlugin from './plugins/auth';
import healthRoutes from './routes/health';
import authRoutes from './routes/auth';
import taskRoutes from './routes/tasks';

export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: process.env.NODE_ENV !== 'test' ? {
      level: process.env.LOG_LEVEL || 'info',
    } : false,
  });

  // Register CORS
  await app.register(cors, {
    origin: true,
    credentials: true,
  });

  // Register plugins
  await app.register(prismaPlugin);
  await app.register(authPlugin);

  // Register routes
  await app.register(healthRoutes);
  await app.register(authRoutes);
  await app.register(taskRoutes);

  return app;
}

async function start(): Promise<void> {
  const app = await buildApp();
  const port = parseInt(process.env.PORT || '5007', 10);
  const host = process.env.HOST || '0.0.0.0';

  try {
    await app.listen({ port, host });
    console.log(`TaskFlow API server running at http://${host}:${port}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

// Only start if this file is run directly (not imported by tests)
if (require.main === module) {
  start();
}
