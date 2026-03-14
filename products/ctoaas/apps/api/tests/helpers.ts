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
  await db.riskItem.deleteMany();
  await db.companyProfile.deleteMany();
  await db.knowledgeChunk.deleteMany();
  await db.knowledgeDocument.deleteMany();
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
    `testuser${userCounter}-${Date.now()}@example.com`;
  const password = 'Str0ng!Pass#2026';

  // Sign up
  const signupRes = await testApp.inject({
    method: 'POST',
    url: '/api/v1/auth/signup',
    payload: {
      email,
      password,
      name: `Test User ${userCounter}`,
      companyName: `Test Co ${userCounter}`,
      industry: 'technology',
      employeeCount: 50,
      growthStage: 'seed',
    },
  });

  const signupBody = JSON.parse(signupRes.body);
  const userId = signupBody.data?.user?.id ?? `test-user-${userCounter}`;

  // Log in to get an access token
  const loginRes = await testApp.inject({
    method: 'POST',
    url: '/api/v1/auth/login',
    payload: { email, password },
  });

  const loginBody = JSON.parse(loginRes.body);
  const accessToken = loginBody.data?.accessToken ?? 'stub-token';

  return { id: userId, email, accessToken };
}

export function authHeaders(
  token: string
): Record<string, string> {
  return { Authorization: `Bearer ${token}` };
}
