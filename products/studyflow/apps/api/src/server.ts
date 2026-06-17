import { buildApp } from './app';
import { logger } from './utils/logger';

const PORT = parseInt(process.env.PORT || '5017', 10);
const HOST = process.env.HOST || '0.0.0.0';

async function start(): Promise<void> {
  try {
    const app = await buildApp({
      logger:
        process.env.NODE_ENV === 'development'
          ? {
              level: process.env.LOG_LEVEL || 'info',
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

    // Graceful shutdown
    for (const signal of ['SIGINT', 'SIGTERM'] as const) {
      process.on(signal, async () => {
        logger.info(`Received ${signal}, shutting down`);
        await app.close();
        process.exit(0);
      });
    }

    await app.listen({ port: PORT, host: HOST });
    logger.info(`StudyFlow API listening on ${HOST}:${PORT}`);
  } catch (error) {
    logger.error({ err: error }, 'Failed to start server');
    process.exit(1);
  }
}

void start();
