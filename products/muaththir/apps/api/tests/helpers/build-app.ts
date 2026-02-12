import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';
import path from 'path';
import { buildApp } from '../../src/app';
import { FastifyInstance } from 'fastify';

const TEST_DATABASE_URL =
  process.env.DATABASE_URL ||
  'postgresql://postgres@localhost:5432/muaththir_test';

// Override for Prisma
process.env.DATABASE_URL = TEST_DATABASE_URL;
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-for-jwt-signing-minimum-32-chars';

const prisma = new PrismaClient({
  datasources: { db: { url: TEST_DATABASE_URL } },
});

export async function setupTestDb(): Promise<void> {
  execSync('npx prisma migrate deploy', {
    cwd: path.resolve(__dirname, '..', '..'),
    env: { ...process.env, DATABASE_URL: TEST_DATABASE_URL },
    stdio: 'pipe',
  });
}

export async function cleanDb(): Promise<void> {
  // Delete in dependency order
  await prisma.familyAccess.deleteMany();
  await prisma.scoreCache.deleteMany();
  await prisma.childMilestone.deleteMany();
  await prisma.milestoneDefinition.deleteMany();
  await prisma.observation.deleteMany();
  await prisma.goal.deleteMany();
  await prisma.goalTemplate.deleteMany();
  await prisma.child.deleteMany();
  await prisma.session.deleteMany();
  await prisma.parent.deleteMany();
}

export async function closeDb(): Promise<void> {
  await prisma.$disconnect();
}

export async function createTestApp(): Promise<FastifyInstance> {
  const app = await buildApp({ logger: false });
  await app.ready();
  return app;
}

export { prisma };
