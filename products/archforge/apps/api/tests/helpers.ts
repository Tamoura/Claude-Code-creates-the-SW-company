/**
 * Shared test helpers for ArchForge API integration tests.
 *
 * Provides singleton app instance, database cleanup,
 * and user creation utilities.
 */

import { FastifyInstance } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { buildApp } from '../src/app';

let appInstance: FastifyInstance | null = null;
let prismaInstance: PrismaClient | null = null;

export async function getApp(): Promise<FastifyInstance> {
  if (!appInstance) {
    process.env.INTERNAL_API_KEY = 'test-internal-api-key';
    appInstance = await buildApp({ skipRateLimit: true });
  }
  return appInstance;
}

export function getPrisma(): PrismaClient {
  if (!prismaInstance) {
    prismaInstance = new PrismaClient();
  }
  return prismaInstance;
}

/**
 * Delete all data in FK-safe order (leaf tables first).
 */
export async function cleanDatabase(): Promise<void> {
  const prisma = getPrisma();
  await prisma.$transaction([
    prisma.notificationPreferences.deleteMany(),
    prisma.auditLog.deleteMany(),
    prisma.apiKey.deleteMany(),
    prisma.export.deleteMany(),
    prisma.share.deleteMany(),
    prisma.comment.deleteMany(),
    prisma.documentUpload.deleteMany(),
    prisma.artifactRelationship.deleteMany(),
    prisma.artifactElement.deleteMany(),
    prisma.artifactVersion.deleteMany(),
    prisma.artifact.deleteMany(),
    prisma.template.deleteMany(),
    prisma.projectMember.deleteMany(),
    prisma.project.deleteMany(),
    prisma.workspaceMember.deleteMany(),
    prisma.workspace.deleteMany(),
    prisma.session.deleteMany(),
    prisma.oauthAccount.deleteMany(),
    prisma.user.deleteMany(),
  ]);
}

export interface TestUser {
  id: string;
  email: string;
  accessToken: string;
  refreshTokenCookie: string;
}

let userCounter = 0;

/**
 * Register and login a test user, returning tokens.
 */
export async function createTestUser(
  app?: FastifyInstance,
  overrides?: { email?: string; password?: string; fullName?: string }
): Promise<TestUser> {
  const testApp = app || await getApp();
  userCounter++;

  const email = overrides?.email || `testuser${userCounter}+${Date.now()}@test.com`;
  const password = overrides?.password || 'Test123!@#';
  const fullName = overrides?.fullName || `Test User ${userCounter}`;

  const registerRes = await testApp.inject({
    method: 'POST',
    url: '/api/v1/auth/register',
    payload: { email, password, fullName },
  });

  if (registerRes.statusCode !== 201) {
    throw new Error(`Registration failed: ${registerRes.body}`);
  }

  // Activate user (bypass email verification for tests)
  const prisma = getPrisma();
  const registerBody = registerRes.json();
  await prisma.user.update({
    where: { id: registerBody.userId },
    data: { status: 'active', emailVerified: true },
  });

  const loginRes = await testApp.inject({
    method: 'POST',
    url: '/api/v1/auth/login',
    payload: { email, password },
  });

  if (loginRes.statusCode !== 200) {
    throw new Error(`Login failed: ${loginRes.body}`);
  }

  const loginBody = loginRes.json();
  const cookies = loginRes.cookies || [];
  const refreshCookie = cookies.find(
    (c: { name: string }) => c.name === 'refreshToken'
  );

  return {
    id: loginBody.user.id,
    email,
    accessToken: loginBody.accessToken,
    refreshTokenCookie: refreshCookie?.value || '',
  };
}

export function authHeaders(token: string): Record<string, string> {
  return { Authorization: `Bearer ${token}` };
}

export async function closeApp(): Promise<void> {
  if (appInstance) {
    await appInstance.close();
    appInstance = null;
  }
  if (prismaInstance) {
    await prismaInstance.$disconnect();
    prismaInstance = null;
  }
}
