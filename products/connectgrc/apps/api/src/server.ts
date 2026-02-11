import { loadConfig } from './config';
import { buildApp } from './app';
import { logger } from './utils/logger';

async function main() {
  try {
    const config = loadConfig();

    const app = await buildApp({
      logger: config.NODE_ENV === 'development',
    });

    await app.listen({
      port: config.PORT,
      host: '0.0.0.0',
    });

    logger.info(`ConnectGRC API running on port ${config.PORT}`, {
      environment: config.NODE_ENV,
      port: config.PORT,
    });

    // Graceful shutdown
    const shutdown = async (signal: string) => {
      logger.info(`Received ${signal}, shutting down gracefully`);
      await app.close();
      process.exit(0);
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
  } catch (error) {
    logger.error('Failed to start server', error);
    process.exit(1);
  }
}

main();
