import { PrismaClient } from '@prisma/client';
import Redis from 'ioredis';

const prisma = new PrismaClient();
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: 3,
});

// Clean database and Redis before all tests
// NOTE: This runs once before the entire test suite, not before each test file
beforeAll(async () => {
  // Flush Redis to clear rate-limit, circuit-breaker, and lockout keys
  await redis.flushdb();

  // Delete in correct order for FK constraints
  await prisma.teamMember.deleteMany();
  await prisma.organization.deleteMany();
  await prisma.webhookDelivery.deleteMany();
  await prisma.webhookEndpoint.deleteMany();
  await prisma.refund.deleteMany();
  await prisma.paymentSession.deleteMany();
  await prisma.apiKey.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.user.deleteMany();
});

// Disconnect after all tests
afterAll(async () => {
  await redis.quit();
  await prisma.$disconnect();
});

// Export for use in tests
export { prisma };
