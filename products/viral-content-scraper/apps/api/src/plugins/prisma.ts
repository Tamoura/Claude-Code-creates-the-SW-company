import { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import { PrismaClient } from '@prisma/client';

declare module 'fastify' {
  interface FastifyInstance {
    prisma: PrismaClient;
  }
}

async function prismaPlugin(fastify: FastifyInstance) {
  const prisma = new PrismaClient({
    datasourceUrl: process.env.DATABASE_URL,
  });

  await prisma.$connect();

  fastify.decorate('prisma', prisma);
  fastify.addHook('onClose', async () => {
    await prisma.$disconnect();
  });
}

export default fp(prismaPlugin, { name: 'prisma' });
