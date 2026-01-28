import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Clean database before all tests (not before each)
beforeAll(async () => {
  // Delete in correct order for FK constraints
  await prisma.webhookDelivery.deleteMany();
  await prisma.webhookEndpoint.deleteMany();
  await prisma.refund.deleteMany();
  await prisma.paymentSession.deleteMany();
  await prisma.apiKey.deleteMany();
  await prisma.user.deleteMany();
});

// Disconnect after all tests
afterAll(async () => {
  await prisma.$disconnect();
});

// Export for use in tests
export { prisma };
