import { PrismaClient } from '@prisma/client';

/**
 * Test database helpers. Article III forbids mocking the database, so every
 * integration test runs against a real PostgreSQL instance and truncates the
 * tables it touched between tests.
 */
export const prisma = new PrismaClient();

export async function resetDatabase(): Promise<void> {
  // Task first: it holds the FK to Project.
  await prisma.task.deleteMany();
  await prisma.project.deleteMany();
}

beforeEach(async () => {
  await resetDatabase();
});

afterAll(async () => {
  await resetDatabase();
  await prisma.$disconnect();
});
