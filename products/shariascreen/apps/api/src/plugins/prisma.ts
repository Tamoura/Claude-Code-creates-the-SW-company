import { FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';
import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';

function appendPoolParams(
  url: string,
  poolSize: number,
  poolTimeout: number
): string {
  if (!url) return url;
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}connection_limit=${poolSize}&pool_timeout=${poolTimeout}`;
}

const prismaPlugin: FastifyPluginAsync = async (fastify) => {
  const poolSize = parseInt(
    process.env.DATABASE_POOL_SIZE || '20',
    10
  );
  const poolTimeout = parseInt(
    process.env.DATABASE_POOL_TIMEOUT || '10',
    10
  );

  const prisma = new PrismaClient({
    log:
      process.env.NODE_ENV === 'development'
        ? ['query', 'error', 'warn']
        : ['error'],
    datasourceUrl: appendPoolParams(
      process.env.DATABASE_URL || '',
      poolSize,
      poolTimeout
    ),
  });

  try {
    await prisma.$connect();
    logger.info('Database connected successfully');
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
