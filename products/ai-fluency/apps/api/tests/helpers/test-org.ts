/**
 * tests/helpers/test-org.ts — Test organization setup and cleanup
 *
 * Provides createTestOrg() and cleanupTestOrg() for integration tests
 * that need authenticated requests with org context.
 *
 * Auth flow:
 * 1. Create organization in DB
 * 2. Create admin user in DB (Argon2id hashed password)
 * 3. Return org, user, and JWT access token
 */

import { PrismaClient } from '@prisma/client';
import { hash as argon2Hash } from 'argon2';
import { FastifyInstance } from 'fastify';

export interface TestOrg {
  id: string;
  name: string;
  slug: string;
}

export interface TestUser {
  id: string;
  orgId: string;
  email: string;
  role: string;
}

export interface TestContext {
  org: TestOrg;
  user: TestUser;
  token: string;
}

/**
 * Create a test organization with an admin user and return a JWT token.
 * The token is signed with the test JWT_SECRET and includes orgId for RLS.
 */
export async function createTestOrg(app: FastifyInstance): Promise<TestContext> {
  const prisma = app.prisma as PrismaClient;
  const uniqueSuffix = Date.now();

  // Create organization
  const org = await prisma.organization.create({
    data: {
      name: `Test Org ${uniqueSuffix}`,
      slug: `test-org-${uniqueSuffix}`,
      status: 'ACTIVE',
      plan: 'TRIAL',
    },
  });

  // Create admin user
  const passwordHash = await argon2Hash('TestPass123!@#', {
    type: 2, // argon2id
    memoryCost: 65536,
    timeCost: 3,
    parallelism: 1,
  });

  const user = await prisma.user.create({
    data: {
      orgId: org.id,
      email: `admin-${uniqueSuffix}@test.example.com`,
      firstName: 'Test',
      lastName: 'Admin',
      passwordHash,
      role: 'ADMIN',
      status: 'ACTIVE',
      emailVerifiedAt: new Date(),
    },
  });

  // Sign JWT access token
  const token = app.jwt.sign(
    {
      sub: user.id,
      orgId: org.id,
      role: user.role,
    },
    { expiresIn: '15m' }
  );

  return {
    org: { id: org.id, name: org.name, slug: org.slug },
    user: { id: user.id, orgId: user.orgId, email: user.email, role: user.role },
    token,
  };
}

/**
 * Clean up all test data for an org (call in afterAll).
 * Deletes in FK-safe order.
 */
export async function cleanupTestOrg(orgId: string, prisma: PrismaClient): Promise<void> {
  // Delete in correct FK order
  await prisma.auditLog.deleteMany({ where: { orgId } });
  await prisma.moduleCompletion.deleteMany({ where: { orgId } });
  await prisma.learningPathModule.deleteMany({ where: { orgId } });
  await prisma.learningPath.deleteMany({ where: { orgId } });
  await prisma.certificate.deleteMany({ where: { orgId } });
  await prisma.fluencyProfile.deleteMany({ where: { orgId } });
  await prisma.response.deleteMany({ where: { orgId } });
  await prisma.assessmentSession.deleteMany({ where: { orgId } });
  await prisma.assessmentTemplate.deleteMany({ where: { orgId } });
  await prisma.sSOConfig.deleteMany({ where: { orgId } });
  await prisma.userSession.deleteMany({ where: { orgId } });
  await prisma.user.deleteMany({ where: { orgId } });
  await prisma.team.deleteMany({ where: { orgId } });
  await prisma.organization.deleteMany({ where: { id: orgId } });
}
