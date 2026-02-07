/**
 * Test helper that creates a real Fastify instance with real DB.
 * NO MOCKS - integration tests against actual PostgreSQL.
 */

import { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/app.js';

// Set test environment variables before building the app
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-at-least-32-chars-long';
process.env.DATABASE_URL =
  process.env.DATABASE_URL || 'postgresql://postgres@localhost:5432/pulse_test';
// Disable Redis for tests by default
delete process.env.REDIS_URL;

let app: FastifyInstance | null = null;

export async function getTestApp(): Promise<FastifyInstance> {
  if (!app) {
    app = await buildApp();
    await app.ready();
  }
  return app;
}

export async function closeTestApp(): Promise<void> {
  if (app) {
    await app.close();
    app = null;
  }
}

/**
 * Clean up test data from the database.
 * Deletes in reverse dependency order.
 */
export async function cleanDatabase(fastify: FastifyInstance): Promise<void> {
  const prisma = fastify.prisma;

  await prisma.auditLog.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.teamInvitation.deleteMany();
  await prisma.deviceToken.deleteMany();
  await prisma.notificationPreference.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.riskSnapshot.deleteMany();
  await prisma.metricSnapshot.deleteMany();
  await prisma.coverageReport.deleteMany();
  await prisma.review.deleteMany();
  await prisma.deployment.deleteMany();
  await prisma.pullRequest.deleteMany();
  await prisma.commit.deleteMany();
  await prisma.repository.deleteMany();
  await prisma.teamMember.deleteMany();
  await prisma.team.deleteMany();
  await prisma.user.deleteMany();
}
