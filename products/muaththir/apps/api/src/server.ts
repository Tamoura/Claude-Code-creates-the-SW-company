import { buildApp } from './app';
import { logger } from './utils/logger';
import { validateEnv } from './lib/env';

const PORT = parseInt(process.env.PORT || '5005', 10);
const HOST = process.env.HOST || '0.0.0.0';

async function start() {
  try {
    validateEnv();

    const app = await buildApp({
      logger: process.env.NODE_ENV === 'development'
        ? {
            level: 'info',
            transport: {
              target: 'pino-pretty',
              options: {
                translateTime: 'HH:MM:ss Z',
                ignore: 'pid,hostname',
              },
            },
          }
        : false,
    });

    await app.listen({ port: PORT, host: HOST });
    logger.info(`Server listening on ${HOST}:${PORT}`);
  } catch (error) {
    logger.error('Failed to start server', error);
    process.exit(1);
  }
}

start();
