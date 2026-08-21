import { buildApp } from './app';
import { logger } from './utils/logger';

const PORT = parseInt(process.env.PORT || '5000', 10);
const HOST = process.env.HOST || '0.0.0.0';

async function start(): Promise<void> {
  try {
    const app = await buildApp({
      logger:
        process.env.NODE_ENV === 'development' ? { level: process.env.LOG_LEVEL || 'info' } : true,
    });

    for (const signal of ['SIGINT', 'SIGTERM'] as const) {
      // The listener itself stays synchronous: node does not await it, and an
      // async listener would leave the shutdown promise unhandled.
      process.on(signal, () => {
        logger.info(`received ${signal}, shutting down`);
        void app.close().then(() => process.exit(0));
      });
    }

    await app.listen({ port: PORT, host: HOST });
    logger.info(`TaskFlow API listening on ${HOST}:${PORT}`);
  } catch (error) {
    logger.error({ err: error }, 'failed to start server');
    process.exit(1);
  }
}

void start();
