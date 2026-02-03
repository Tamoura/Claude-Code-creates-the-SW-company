import { PrismaClient } from '@prisma/client';

let prisma: PrismaClient;

declare global {
  var __prisma: PrismaClient | undefined;
}

if (process.env.NODE_ENV === 'production') {
  prisma = new PrismaClient({
    datasourceUrl: process.env.DATABASE_URL,
  });
} else {
  if (!global.__prisma) {
    global.__prisma = new PrismaClient({
      datasourceUrl: process.env.DATABASE_URL,
    });
  }
  prisma = global.__prisma;
}

export { prisma };
