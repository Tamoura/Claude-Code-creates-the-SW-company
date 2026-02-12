import fp from 'fastify-plugin';
import { PrismaClient } from '@prisma/client';
import { FastifyInstance } from 'fastify';
import { logger } from '../utils/logger';

declare module 'fastify' {
  interface FastifyInstance {
    prisma: PrismaClient;
  }
}

export default fp(async (fastify: FastifyInstance) => {
  const poolSize = parseInt(process.env.DATABASE_POOL_SIZE || '10', 10);
  const poolTimeout = parseInt(process.env.DATABASE_POOL_TIMEOUT || '10', 10);

  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
    log: process.env.NODE_ENV === 'development' ? ['query', 'warn', 'error'] : ['warn', 'error'],
  });

  try {
    await prisma.$connect();
    logger.info('Database connected', { poolSize, poolTimeout });
  } catch (err) {
    logger.error('Failed to connect to database', err);
    throw err;
  }

  fastify.decorate('prisma', prisma);

  fastify.addHook('onClose', async () => {
    logger.info('Disconnecting from database');
    await prisma.$disconnect();
  });
}, { name: 'prisma' });
