import { FastifyInstance } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { buildApp } from '../src/app';

let app: FastifyInstance | null = null;
let prisma: PrismaClient | null = null;

export async function getApp(): Promise<FastifyInstance> {
  if (!app) {
    app = await buildApp({ skipRateLimit: true });
    await app.ready();
  }
  return app;
}

export function getPrisma(): PrismaClient {
  if (!prisma) {
    prisma = new PrismaClient();
  }
  return prisma;
}

export async function closeApp(): Promise<void> {
  if (app) {
    await app.close();
    app = null;
  }
  if (prisma) {
    await prisma.$disconnect();
    prisma = null;
  }
}

export async function cleanDatabase(): Promise<void> {
  const db = getPrisma();
  // Delete in FK-safe order
  await db.auditLog.deleteMany();
  await db.refreshToken.deleteMany();
  await db.userPreference.deleteMany();
  await db.cloudSpend.deleteMany();
  await db.tcoComparison.deleteMany();
  await db.message.deleteMany();
  await db.conversation.deleteMany();
  await db.companyProfile.deleteMany();
  await db.user.deleteMany();
  await db.organization.deleteMany();
}

export interface TestUser {
  id: string;
  email: string;
  accessToken: string;
}

let userCounter = 0;

export async function createTestUser(
  appInstance?: FastifyInstance,
  overrides?: { email?: string }
): Promise<TestUser> {
  const testApp = appInstance || (await getApp());
  userCounter++;
  const email =
    overrides?.email ||
    `testuser${userCounter}@example.com`;

  // Will be implemented after auth routes in IMPL-010
  void testApp;
  return {
    id: `test-user-${userCounter}`,
    email,
    accessToken: 'stub-token',
  };
}

export function authHeaders(
  token: string
): Record<string, string> {
  return { Authorization: `Bearer ${token}` };
}
