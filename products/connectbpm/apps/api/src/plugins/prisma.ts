/**
 * PrismaClient lifecycle.
 *
 * WARNING (ADR-004 §2) — `fastify.prisma` is the RAW, UNSCOPED client.
 * It exists so that migrations, the health probe and the job runner can reach
 * the database. Feature code MUST NOT touch it. Every tenant-scoped read or
 * write goes through `withTenant(ctx, fn)`, which returns a branded
 * `TenantScopedClient`; a repository that accepts a raw `PrismaClient` will
 * not type-check against the repository signature convention.
 *
 * `withTenant` itself is BACKEND work (tenancy task), not scaffolding.
 */
import type { FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';
import { PrismaClient } from '@prisma/client';
import { getConfig } from '../config';

declare module 'fastify' {
  interface FastifyInstance {
    prisma: PrismaClient;
  }
}

const prismaPlugin: FastifyPluginAsync = async (fastify) => {
  const config = getConfig();
  const prisma = new PrismaClient({
    log: config.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });

  try {
    await prisma.$connect();
    fastify.log.info('Database connected');
  } catch (error) {
    fastify.log.error('Failed to connect to database');
    throw error;
  }

  fastify.decorate('prisma', prisma);

  fastify.addHook('onClose', async () => {
    await prisma.$disconnect();
  });
};

export default fp(prismaPlugin, { name: 'prisma-plugin' });
