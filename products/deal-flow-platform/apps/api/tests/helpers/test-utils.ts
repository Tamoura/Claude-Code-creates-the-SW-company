import { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/app';
import { prisma, cleanDatabase } from '../setup';
import bcrypt from 'bcrypt';

export async function createTestApp(): Promise<FastifyInstance> {
  const app = await buildApp();
  await app.ready();
  return app;
}

export async function createTestTenant() {
  return prisma.tenant.create({
    data: {
      name: 'DealGate Test',
      slug: 'dealgate',
      isActive: true,
    },
  });
}

interface CreateUserOpts {
  tenantId: string;
  email?: string;
  password?: string;
  role?: 'INVESTOR' | 'ISSUER' | 'TENANT_ADMIN' | 'SUPER_ADMIN';
  fullNameEn?: string;
}

export async function createTestUser(opts: CreateUserOpts) {
  const passwordHash = await bcrypt.hash(opts.password || 'Test123!@#', 12);
  return prisma.user.create({
    data: {
      tenantId: opts.tenantId,
      email: opts.email || 'test@example.com',
      passwordHash,
      role: opts.role || 'INVESTOR',
      fullNameEn: opts.fullNameEn || 'Test User',
    },
  });
}

export async function createTestInvestorProfile(userId: string) {
  return prisma.investorProfile.create({
    data: {
      userId,
      classification: 'RETAIL',
      shariaPreference: true,
    },
  });
}

export async function createTestIssuerProfile(userId: string) {
  return prisma.issuerProfile.create({
    data: {
      userId,
      companyNameEn: 'Test Issuer Co',
    },
  });
}

export async function loginUser(
  app: FastifyInstance,
  email: string,
  password: string
) {
  const response = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/login',
    payload: { email, password },
  });
  return response.json();
}

export async function setupTestData() {
  await cleanDatabase();
  const tenant = await createTestTenant();
  return { tenant };
}

export { cleanDatabase };
