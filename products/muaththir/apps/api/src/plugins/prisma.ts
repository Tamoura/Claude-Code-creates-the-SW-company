import { FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';
import { PrismaClient, Prisma } from '@prisma/client';
import { logger } from '../utils/logger';

/**
 * Models that use soft-delete (have a `deletedAt` column).
 * The middleware automatically injects `deletedAt: null` into
 * findMany, findFirst, findUnique, and count queries on these
 * models to prevent accidental data leakage.
 */
const SOFT_DELETE_MODELS = ['Observation'] as const;

function isSoftDeleteModel(model: string | undefined): boolean {
  if (!model) return false;
  return (SOFT_DELETE_MODELS as readonly string[]).includes(model);
}

/**
 * Inject `deletedAt: null` into a where clause if not already
 * specified. This is idempotent: if the caller already filters
 * on deletedAt (e.g., `deletedAt: null` or `deletedAt: { not: null }`),
 * the middleware leaves it alone.
 */
function injectSoftDeleteFilter(
  args: { where?: Record<string, unknown> }
): void {
  if (!args.where) {
    args.where = { deletedAt: null };
    return;
  }
  if (!('deletedAt' in args.where)) {
    args.where.deletedAt = null;
  }
}

const prismaPlugin: FastifyPluginAsync = async (fastify) => {
  const basePrisma = new PrismaClient({
    log: process.env.NODE_ENV === 'development'
      ? ['query', 'error', 'warn']
      : ['error'],
  });

  // Extend with soft-delete query filter middleware
  const prisma = basePrisma.$extends({
    query: {
      observation: {
        async findMany({ args, query }) {
          injectSoftDeleteFilter(args);
          return query(args);
        },
        async findFirst({ args, query }) {
          injectSoftDeleteFilter(args);
          return query(args);
        },
        async findUnique({ args, query }) {
          injectSoftDeleteFilter(args as { where?: Record<string, unknown> });
          return query(args);
        },
        async count({ args, query }) {
          injectSoftDeleteFilter(args);
          return query(args);
        },
      },
    },
  }) as unknown as PrismaClient;

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
