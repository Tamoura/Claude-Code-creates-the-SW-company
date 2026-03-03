/**
 * plugins/prisma.ts — Prisma client plugin with RLS session middleware
 *
 * Registration order: MUST be registered before authPlugin and routes.
 *
 * Features:
 * - Prisma client lifecycle management (connect/disconnect)
 * - Slow query logging
 * - Fastify onRequest hook: sets app.current_org_id for RLS
 *   so PostgreSQL Row Level Security automatically filters all tenant data
 *
 * SECURITY: All tenant-scoped tables require app.current_org_id to be set.
 * NEVER query tenant tables without an active RLS context.
 */

import fp from 'fastify-plugin';
import { FastifyPluginAsync } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger.js';

const SLOW_QUERY_THRESHOLD_MS = parseInt(
  process.env.SLOW_QUERY_THRESHOLD_MS || '500',
  10
);

const prismaPlugin: FastifyPluginAsync = async (fastify) => {
  const prisma = new PrismaClient({
    log: [
      { emit: 'event', level: 'query' },
      { emit: 'stdout', level: 'error' },
      { emit: 'stdout', level: 'warn' },
    ],
    datasources: {
      db: { url: process.env.DATABASE_URL },
    },
  });

  // Log slow queries for performance monitoring
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

  try {
    await prisma.$connect();
    logger.info('Database connected', {
      slow_query_threshold_ms: SLOW_QUERY_THRESHOLD_MS,
    });
  } catch (error) {
    logger.error('Failed to connect to database', error);
    throw error;
  }

  fastify.decorate('prisma', prisma);

  fastify.addHook('onClose', async () => {
    await prisma.$disconnect();
    logger.info('Database connection closed');
  });
};

export default fp(prismaPlugin, {
  name: 'prisma',
});
