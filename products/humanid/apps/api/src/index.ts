/**
 * HumanID API - Entry Point
 *
 * Validates environment, builds the app, starts the HTTP server,
 * and handles graceful shutdown.
 */

import { buildApp } from './app.js';
import { logger } from './utils/logger.js';
import { validateEnvironment } from './utils/env-validator.js';

async function start() {
  try {
    // Validate environment variables before starting
    validateEnvironment();

    const app = await buildApp();

    const port = parseInt(process.env.PORT || '5013'); // See .claude/PORT-REGISTRY.md
    const host = process.env.HOST || '0.0.0.0';

    await app.listen({ port, host });

    // Set request timeouts to prevent slow-loris and hung connections
    app.server.timeout = 30000; // 30 seconds
    app.server.headersTimeout = 31000; // slightly more than timeout
    app.server.keepAliveTimeout = 5000; // 5 seconds

    logger.info('Server listening on http://' + host + ':' + port);
    logger.info('Environment: ' + (process.env.NODE_ENV || 'development'));

    // Graceful shutdown
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
