import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';
import path from 'path';
import dotenv from 'dotenv';

// Load test environment
dotenv.config({ path: path.resolve(__dirname, '..', '.env.test') });

const databaseUrl =
  process.env.DATABASE_URL ||
  'postgresql://postgres@localhost:5432/invoiceforge_test';

// Override for Prisma
process.env.DATABASE_URL = databaseUrl;

const prisma = new PrismaClient({
  datasources: { db: { url: databaseUrl } },
});

export async function setupTestDb(): Promise<void> {
  // Deploy migrations
  execSync('npx prisma migrate deploy', {
    cwd: path.resolve(__dirname, '..'),
    env: { ...process.env, DATABASE_URL: databaseUrl },
    stdio: 'pipe',
  });
}

export async function cleanDb(): Promise<void> {
  // Delete in dependency order
  await prisma.invoiceItem.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.client.deleteMany();
  await prisma.session.deleteMany();
  await prisma.passwordResetToken.deleteMany();
  await prisma.user.deleteMany();
}

export async function closeDb(): Promise<void> {
  await prisma.$disconnect();
}

export { prisma };
