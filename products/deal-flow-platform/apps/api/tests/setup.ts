import { PrismaClient } from '@prisma/client';

const databaseUrl = process.env.DATABASE_URL
  || 'postgresql://postgres@localhost:5432/deal_flow_test';

process.env.DATABASE_URL = databaseUrl;
process.env.JWT_SECRET = 'test-jwt-secret-min-16-chars';
process.env.NODE_ENV = 'test';

const prisma = new PrismaClient({
  datasources: { db: { url: databaseUrl } },
});

beforeAll(async () => {
  await cleanDatabase();
});

afterAll(async () => {
  await prisma.$disconnect();
});

async function cleanDatabase() {
  // Delete in correct order for FK constraints
  await prisma.auditLog.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.notificationPreference.deleteMany();
  await prisma.watchlistItem.deleteMany();
  await prisma.portfolioItem.deleteMany();
  await prisma.subscription.deleteMany();
  await prisma.dealDocument.deleteMany();
  await prisma.deal.deleteMany();
  await prisma.issuerProfile.deleteMany();
  await prisma.investorProfile.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.webhookEndpoint.deleteMany();
  await prisma.integrationConfig.deleteMany();
  await prisma.tenantBranding.deleteMany();
  await prisma.tenantConfig.deleteMany();
  await prisma.user.deleteMany();
  await prisma.tenant.deleteMany();
}

export { prisma, cleanDatabase };
