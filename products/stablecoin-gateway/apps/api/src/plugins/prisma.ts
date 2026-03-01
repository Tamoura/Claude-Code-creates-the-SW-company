import { FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';
import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger.js';

function appendPoolParams(url: string, poolSize: number, poolTimeout: number): string {
  if (!url) return url;
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}connection_limit=${poolSize}&pool_timeout=${poolTimeout}`;
}

const prismaPlugin: FastifyPluginAsync = async (fastify) => {
  const poolSize = parseInt(process.env.DATABASE_POOL_SIZE || '20', 10);
  const poolTimeout = parseInt(process.env.DATABASE_POOL_TIMEOUT || '10', 10);

  // RISK-073: Validate pool size to prevent resource exhaustion
  if (isNaN(poolSize) || poolSize < 1 || poolSize > 500) {
    throw new Error(
      `Invalid DATABASE_POOL_SIZE: ${process.env.DATABASE_POOL_SIZE}. Must be between 1 and 500.`
    );
  }
  if (isNaN(poolTimeout) || poolTimeout < 1 || poolTimeout > 300) {
    throw new Error(
      `Invalid DATABASE_POOL_TIMEOUT: ${process.env.DATABASE_POOL_TIMEOUT}. Must be between 1 and 300 seconds.`
    );
  }

  // Slow query threshold in milliseconds (configurable via env)
  const SLOW_QUERY_THRESHOLD_MS = parseInt(process.env.SLOW_QUERY_THRESHOLD_MS || '500', 10);

  // Use event-based logging so we can inspect query duration for slow-query detection.
  // In all environments, subscribe to 'query' events to detect slow queries.
  // 'error' and 'warn' are always emitted as log lines.
  const prisma = new PrismaClient({
    log: [
      { emit: 'event', level: 'query' },
      { emit: 'stdout', level: 'error' },
      { emit: 'stdout', level: 'warn' },
    ],
    datasourceUrl: appendPoolParams(process.env.DATABASE_URL || '', poolSize, poolTimeout),
  });

  // Log slow queries using the structured logger.
  // Prisma emits 'query' events with { query, params, duration, target }.
  prisma.$on('query', (e) => {
    if (e.duration >= SLOW_QUERY_THRESHOLD_MS) {
      logger.warn('Slow query detected', {
        query: e.query,
        duration_ms: e.duration,
        threshold_ms: SLOW_QUERY_THRESHOLD_MS,
        target: e.target,
      });
    }
  });

  // Test connection
  try {
    await prisma.$connect();
    logger.info('Database connected successfully', {
      slow_query_threshold_ms: SLOW_QUERY_THRESHOLD_MS,
    });
  } catch (error) {
    logger.error('Failed to connect to database', error);
    throw error;
  }

  // Decorate fastify instance
  fastify.decorate('prisma', prisma);

  // Cleanup on close
  fastify.addHook('onClose', async () => {
    await prisma.$disconnect();
    logger.info('Database connection closed');
  });
};

export default fp(prismaPlugin, {
  name: 'prisma',
});
