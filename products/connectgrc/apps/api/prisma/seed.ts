import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding ConnectGRC database...');

  const passwordHash = await bcrypt.hash('Test123!@#', 12);

  // Create admin user
  const admin = await prisma.user.upsert({
    where: { email: 'admin@connectgrc.com' },
    update: {},
    create: {
      email: 'admin@connectgrc.com',
      passwordHash,
      name: 'GRC Admin',
      role: Role.ADMIN,
    },
  });
  console.log(`  Created admin user: ${admin.email}`);

  // Create talent user
  const talent = await prisma.user.upsert({
    where: { email: 'talent@connectgrc.com' },
    update: {},
    create: {
      email: 'talent@connectgrc.com',
      passwordHash,
      name: 'Sample Talent',
      role: Role.TALENT,
    },
  });
  console.log(`  Created talent user: ${talent.email}`);

  // Create employer user
  const employer = await prisma.user.upsert({
    where: { email: 'employer@connectgrc.com' },
    update: {},
    create: {
      email: 'employer@connectgrc.com',
      passwordHash,
      name: 'Sample Employer',
      role: Role.EMPLOYER,
    },
  });
  console.log(`  Created employer user: ${employer.email}`);

  console.log('Seeding complete.');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
