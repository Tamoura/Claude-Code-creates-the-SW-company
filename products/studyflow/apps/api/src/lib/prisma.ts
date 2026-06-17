import { PrismaClient } from '@prisma/client';

/**
 * Prisma client singleton. Reused across the process (and across hot reloads in
 * dev) to avoid exhausting the connection pool. Prisma access is permitted only
 * in repository modules (see architecture.md §4.2).
 */
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === 'development'
        ? ['query', 'error', 'warn']
        : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
