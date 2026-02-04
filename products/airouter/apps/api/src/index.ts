import 'dotenv/config';
import { buildApp } from './app.js';
import { logger } from './utils/logger.js';
import { initializeEncryption } from './utils/encryption.js';

async function start() {
  try {
    // Initialize encryption for provider key vault
    if (process.env.PROVIDER_KEY_ENCRYPTION_KEY) {
      initializeEncryption();
      logger.info('Provider key encryption enabled');
    } else {
      logger.warn('PROVIDER_KEY_ENCRYPTION_KEY not set - provider key encryption disabled');
    }

    const app = await buildApp();

    const port = parseInt(process.env.PORT || '5006');
    const host = process.env.HOST || '0.0.0.0';

    await app.listen({ port, host });

    logger.info(`AIRouter API listening on http://${host}:${port}`);
    logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);

    // Graceful shutdown
    const signals = ['SIGINT', 'SIGTERM'];
    signals.forEach((signal) => {
      process.on(signal, async () => {
        logger.info(`Received ${signal}, closing server...`);
        await app.close();
        process.exit(0);
      });
    });
  } catch (error) {
    logger.error('Failed to start server', error);
    process.exit(1);
  }
}

start();
