/**
 * Test setup and helpers for the LinkedIn Agent API.
 *
 * Sets environment variables BEFORE any app code is imported,
 * provides a helper to build a disposable Fastify instance,
 * and a helper to wipe all rows between tests.
 */

// --- environment (must run before any app import) ---
process.env.DATABASE_URL =
  'postgresql://tamer@localhost:5432/linkedin_agent_dev';
process.env.OPENROUTER_API_KEY = 'test-key';
process.env.NODE_ENV = 'test';

import { FastifyInstance } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { resetValidatedEnv } from '../src/lib/env';
import { buildApp } from '../src/app';

// Shared prisma client for direct DB manipulation in tests
const prisma = new PrismaClient();

/**
 * Build a ready-to-inject Fastify app for testing.
 * The caller is responsible for calling `app.close()` when done.
 */
export async function buildTestApp(): Promise<FastifyInstance> {
  resetValidatedEnv();
  const app = await buildApp({ logger: false });
  await app.ready();
  return app;
}

/**
 * Delete all rows from every application table.
 * Order matters because of foreign-key constraints.
 */
export async function cleanDB(): Promise<void> {
  await prisma.carouselSlide.deleteMany();
  await prisma.generationLog.deleteMany();
  await prisma.postDraft.deleteMany();
  await prisma.trendSource.deleteMany();
}

/**
 * Return the shared Prisma client so tests can seed data directly.
 */
export function getTestPrisma(): PrismaClient {
  return prisma;
}

/**
 * Disconnect the shared Prisma client. Call once at the end of the suite.
 */
export async function disconnectTestPrisma(): Promise<void> {
  await prisma.$disconnect();
}
