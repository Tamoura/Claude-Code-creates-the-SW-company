/**
 * ArchForge API - Entry Point
 *
 * Validates environment, builds the app, starts the HTTP server,
 * and handles graceful shutdown.
 */

import { buildApp } from './app.js';
import { logger } from './utils/logger.js';
import { validateEnvironment } from './utils/env-validator.js';

async function start() {
  try {
    validateEnvironment();

    const app = await buildApp();

    const port = parseInt(process.env.PORT || '5012'); // See .claude/PORT-REGISTRY.md
    const host = process.env.HOST || '0.0.0.0';

    await app.listen({ port, host });

    app.server.timeout = 30000;
    app.server.headersTimeout = 31000;
    app.server.keepAliveTimeout = 5000;

    logger.info('Server listening on http://' + host + ':' + port);
    logger.info('Environment: ' + (process.env.NODE_ENV || 'development'));

    const signals = ['SIGINT', 'SIGTERM'];
    signals.forEach((signal) => {
      process.on(signal, async () => {
        logger.info('Received ' + signal + ', closing server...');
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
