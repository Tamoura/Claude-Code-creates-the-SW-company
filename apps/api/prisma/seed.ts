import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Clean existing data (in development only)
  if (process.env.NODE_ENV === 'development') {
    console.log('🧹 Cleaning existing data...');
    await prisma.incident.deleteMany();
    await prisma.user.deleteMany();
    await prisma.category.deleteMany();
    await prisma.sLAConfig.deleteMany();
    await prisma.role.deleteMany();
    await prisma.idSequence.deleteMany();
  }

  // 1. Create Roles
  console.log('👥 Creating roles...');
  const adminRole = await prisma.role.upsert({
    where: { name: 'Admin' },
    update: {},
    create: {
      name: 'Admin',
      description: 'Full system access',
      level: 3,
      permissions: ['*'],
    },
  });

  const managerRole = await prisma.role.upsert({
    where: { name: 'Manager' },
    update: {},
    create: {
      name: 'Manager',
      description: 'Team management and oversight',
      level: 2,
      permissions: ['incident:*', 'problem:*', 'change:approve', 'report:view'],
    },
  });

  const operatorRole = await prisma.role.upsert({
    where: { name: 'Operator' },
    update: {},
    create: {
      name: 'Operator',
      description: 'Day-to-day operations',
      level: 1,
      permissions: ['incident:create', 'incident:update', 'incident:view'],
    },
  });

  console.log('✅ Roles created');

  // 2. Create Admin User
  console.log('👤 Creating admin user...');
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@itil.dev' },
    update: {},
    create: {
      email: 'admin@itil.dev',
      passwordHash: await bcrypt.hash('Admin123!', 10),
      firstName: 'System',
      lastName: 'Administrator',
      roleId: adminRole.id,
      status: 'ACTIVE',
    },
  });

  console.log('✅ Admin user created (admin@itil.dev / Admin123!)');

  // 3. Create SLA Config
  console.log('⏱️  Creating SLA configuration...');
  const slaConfig = await prisma.sLAConfig.upsert({
    where: { name: 'Default SLA' },
    update: {},
    create: {
      name: 'Default SLA',
      businessStartMinutes: 540, // 9:00 AM
      businessEndMinutes: 1020, // 5:00 PM
      workingDays: [1, 2, 3, 4, 5], // Mon-Fri
      timezone: 'UTC',
      p1ResponseMinutes: 15,
      p1ResolutionMinutes: 60,
      p2ResponseMinutes: 30,
      p2ResolutionMinutes: 240,
      p3ResponseMinutes: 120,
      p3ResolutionMinutes: 480,
      p4ResponseMinutes: 480,
      p4ResolutionMinutes: 1440,
    },
  });

  console.log('✅ SLA configuration created');

  // 4. Create Categories
  console.log('📁 Creating categories...');
  const categories = [
    { name: 'Hardware', description: 'Hardware-related issues' },
    { name: 'Software', description: 'Software and application issues' },
    { name: 'Network', description: 'Network connectivity issues' },
    { name: 'Security', description: 'Security-related incidents' },
    { name: 'Access', description: 'Access and permissions' },
    { name: 'Email', description: 'Email system issues' },
    { name: 'Database', description: 'Database-related issues' },
    { name: 'Server', description: 'Server infrastructure issues' },
    { name: 'Desktop', description: 'Desktop and workstation issues' },
    { name: 'Mobile', description: 'Mobile device issues' },
    { name: 'Other', description: 'Miscellaneous issues' },
  ];

  for (const cat of categories) {
    await prisma.category.upsert({
      where: { name_type: { name: cat.name, type: 'INCIDENT' } },
      update: {},
      create: {
        name: cat.name,
        description: cat.description,
        type: 'INCIDENT',
        isActive: true,
      },
    });
  }

  console.log('✅ Categories created');

  // 5. Create ID Sequences
  console.log('🔢 Creating ID sequences...');
  const sequences = ['INC', 'PRB', 'CHG', 'REQ', 'KB'];
  for (const prefix of sequences) {
    await prisma.idSequence.upsert({
      where: { prefix },
      update: {},
      create: {
        prefix,
        currentValue: 0,
      },
    });
  }

  console.log('✅ ID sequences created');

  // 6. Create Sample Incident
  console.log('📝 Creating sample incident...');
  const hardwareCategory = await prisma.category.findFirst({
    where: { name: 'Hardware', type: 'INCIDENT' },
  });

  if (hardwareCategory) {
    // Generate INC-00001
    const sequence = await prisma.idSequence.upsert({
      where: { prefix: 'INC' },
      update: { currentValue: { increment: 1 } },
      create: { prefix: 'INC', currentValue: 1 },
    });

    const displayId = `INC-${sequence.currentValue.toString().padStart(5, '0')}`;

    await prisma.incident.create({
      data: {
        displayId,
        title: 'Sample Incident: Laptop Battery Not Charging',
        description: 'User reports that their Dell Latitude 5420 laptop battery is not charging when connected to power. The power LED indicator is not lit. This has been ongoing for the past 2 hours.',
        status: 'NEW',
        priority: 'P3',
        impact: 'MEDIUM',
        urgency: 'MEDIUM',
        categoryId: hardwareCategory.id,
        reportedById: adminUser.id,
        slaConfigId: slaConfig.id,
        responseSlaDue: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours from now
        resolutionSlaDue: new Date(Date.now() + 8 * 60 * 60 * 1000), // 8 hours from now
      },
    });

    console.log('✅ Sample incident created (INC-00001)');
  }

  console.log('🎉 Database seeding complete!');
  console.log('\n📊 Summary:');
  console.log(`- 3 Roles created`);
  console.log(`- 1 Admin user created`);
  console.log(`- 1 SLA configuration created`);
  console.log(`- ${categories.length} Categories created`);
  console.log(`- ${sequences.length} ID sequences created`);
  console.log(`- 1 Sample incident created`);
  console.log('\n🔐 Login credentials:');
  console.log(`   Email: admin@itil.dev`);
  console.log(`   Password: Admin123!`);
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
