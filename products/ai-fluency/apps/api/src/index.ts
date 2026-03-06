/**
 * index.ts — Application entry point
 *
 * Starts the Fastify server on PORT (default: 5014).
 * Validates config at import time — fails fast on missing env vars.
 */

import { config } from './config.js';
import { buildApp } from './app.js';
import { logger } from './utils/logger.js';

async function start() {
  const instance = await buildApp();

  try {
    await instance.listen({ port: config.PORT, host: '0.0.0.0' });
    logger.info('AI Fluency API started', {
      port: config.PORT,
      env: config.NODE_ENV,
      url: `http://localhost:${config.PORT}`,
    });
  } catch (err) {
    logger.error('Failed to start server', err);
    process.exit(1);
  }

  return instance;
}

// Handle graceful shutdown
let app: Awaited<ReturnType<typeof buildApp>> | undefined;

const gracefulShutdown = async (signal: string) => {
  logger.info(`Received ${signal} — shutting down gracefully`);
  if (app) {
    await app.close();
  }
  process.exit(0);
};

process.on('SIGINT', () => void gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => void gracefulShutdown('SIGTERM'));

start().then((a) => { app = a; }).catch(() => process.exit(1));
