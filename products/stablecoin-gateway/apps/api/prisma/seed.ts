import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('Test123!@#', 12);

  const merchant = await prisma.user.upsert({
    where: { email: 'merchant@test.com' },
    update: {},
    create: {
      email: 'merchant@test.com',
      passwordHash,
      role: 'MERCHANT',
    },
  });

  const admin = await prisma.user.upsert({
    where: { email: 'admin@test.com' },
    update: { role: 'ADMIN' },
    create: {
      email: 'admin@test.com',
      passwordHash,
      role: 'ADMIN',
    },
  });

  console.log('Seeded test merchant user:', {
    id: merchant.id,
    email: merchant.email,
    createdAt: merchant.createdAt,
  });

  console.log('Seeded test admin user:', {
    id: admin.id,
    email: admin.email,
    role: admin.role,
    createdAt: admin.createdAt,
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('Seed failed:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
