import { FastifyInstance } from 'fastify';
import { logger } from '../utils/logger';

/**
 * Register graceful shutdown handlers for SIGTERM and SIGINT.
 *
 * On signal receipt:
 * 1. Close the Fastify server (stop accepting new connections)
 * 2. Disconnect Prisma (close database connection pool)
 * 3. Exit the process cleanly
 */
export function setupGracefulShutdown(
  app: FastifyInstance,
  proc: NodeJS.Process = process
): void {
  const shutdown = async (signal: string) => {
    logger.info(`Received ${signal}, shutting down gracefully...`);

    try {
      await app.close();
      logger.info('Fastify server closed');
    } catch (err) {
      logger.error('Error closing Fastify server', err);
    }

    try {
      await (app as any).prisma.$disconnect();
      logger.info('Prisma disconnected');
    } catch (err) {
      logger.error('Error disconnecting Prisma', err);
    }

    proc.exit(0);
  };

  proc.on('SIGTERM', () => shutdown('SIGTERM'));
  proc.on('SIGINT', () => shutdown('SIGINT'));
}
