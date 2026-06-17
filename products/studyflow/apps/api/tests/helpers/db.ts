import './env';
import { PrismaClient } from '@prisma/client';

/**
 * Dedicated Prisma client for tests. Talks to `studyflow_test` (set in env.ts).
 * Used by helpers to reset/seed/inspect DB state directly (real DB, no mocks).
 */
export const testPrisma = new PrismaClient();

/**
 * Truncate all domain tables between tests. Order respects FK constraints via
 * CASCADE. Fast and deterministic — gives each test a clean slate (BR-004).
 */
export async function resetDatabase(): Promise<void> {
  await testPrisma.$executeRawUnsafe(
    'TRUNCATE TABLE "progress_entries", "goals", "selections", "subjects", "sessions", "students" RESTART IDENTITY CASCADE'
  );
}

export interface SeedSubject {
  code?: string;
  name: string;
  credits?: number;
  workload?: string;
  prerequisites?: string;
  description?: string;
  term?: string;
  isSeed?: boolean;
  ownerStudentId?: string | null;
}

/**
 * Insert a seed-catalog subject (isSeed=true, no owner) directly. Returns the
 * created row.
 */
export async function seedSubject(data: SeedSubject) {
  return testPrisma.subject.create({
    data: {
      name: data.name,
      code: data.code ?? null,
      credits: data.credits ?? null,
      workload: data.workload ?? null,
      prerequisites: data.prerequisites ?? null,
      description: data.description ?? null,
      term: data.term ?? '2026-S1',
      isSeed: data.isSeed ?? true,
      ownerStudentId: data.ownerStudentId ?? null,
    },
  });
}

export async function closeTestDb(): Promise<void> {
  await testPrisma.$disconnect();
}
