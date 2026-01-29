import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Clean existing data (in development only)
  if (process.env.NODE_ENV === 'development') {
    console.log('🧹 Cleaning existing data...');
    await prisma.knowledgeArticle.deleteMany();
    await prisma.serviceRequest.deleteMany();
    await prisma.serviceCatalogItem.deleteMany();
    await prisma.change.deleteMany();
    await prisma.problem.deleteMany();
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

  // 2. Create Users
  console.log('👤 Creating users...');
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

  const managerUser = await prisma.user.upsert({
    where: { email: 'manager@itil.dev' },
    update: {},
    create: {
      email: 'manager@itil.dev',
      passwordHash: await bcrypt.hash('Manager123!', 10),
      firstName: 'Jane',
      lastName: 'Manager',
      roleId: managerRole.id,
      status: 'ACTIVE',
    },
  });

  const operatorUser = await prisma.user.upsert({
    where: { email: 'operator@itil.dev' },
    update: {},
    create: {
      email: 'operator@itil.dev',
      passwordHash: await bcrypt.hash('Operator123!', 10),
      firstName: 'John',
      lastName: 'Operator',
      roleId: operatorRole.id,
      status: 'ACTIVE',
    },
  });

  console.log('✅ 3 users created');

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

  // 6. Create Sample Incidents
  console.log('📝 Creating sample incidents...');
  const hardwareCategory = await prisma.category.findFirst({
    where: { name: 'Hardware', type: 'INCIDENT' },
  });
  const softwareCategory = await prisma.category.findFirst({
    where: { name: 'Software', type: 'INCIDENT' },
  });
  const networkCategory = await prisma.category.findFirst({
    where: { name: 'Network', type: 'INCIDENT' },
  });

  const incidents = [];
  if (hardwareCategory && softwareCategory && networkCategory) {
    const incidentData = [
      {
        title: 'Laptop Battery Not Charging',
        description: 'User reports that their Dell Latitude 5420 laptop battery is not charging when connected to power.',
        status: 'NEW' as const,
        priority: 'P3' as const,
        categoryId: hardwareCategory.id,
      },
      {
        title: 'Application Crash on Startup',
        description: 'Microsoft Teams crashes immediately after launch. Error code 0x80070005.',
        status: 'IN_PROGRESS' as const,
        priority: 'P2' as const,
        categoryId: softwareCategory.id,
      },
      {
        title: 'Internet Connection Intermittent',
        description: 'Users in Building A, Floor 3 experiencing intermittent internet connectivity.',
        status: 'PENDING' as const,
        priority: 'P1' as const,
        categoryId: networkCategory.id,
      },
      {
        title: 'Printer Not Responding',
        description: 'HP LaserJet Pro in Conference Room B not responding to print jobs.',
        status: 'RESOLVED' as const,
        priority: 'P4' as const,
        categoryId: hardwareCategory.id,
      },
      {
        title: 'VPN Connection Failed',
        description: 'Unable to establish VPN connection from remote location.',
        status: 'IN_PROGRESS' as const,
        priority: 'P2' as const,
        categoryId: networkCategory.id,
      },
    ];

    for (const inc of incidentData) {
      const sequence = await prisma.idSequence.update({
        where: { prefix: 'INC' },
        data: { currentValue: { increment: 1 } },
      });
      const displayId = `INC-${sequence.currentValue.toString().padStart(5, '0')}`;

      const incident = await prisma.incident.create({
        data: {
          displayId,
          title: inc.title,
          description: inc.description,
          status: inc.status,
          priority: inc.priority,
          impact: 'MEDIUM',
          urgency: 'MEDIUM',
          categoryId: inc.categoryId,
          reportedById: operatorUser.id,
          assigneeId: inc.status !== 'NEW' ? operatorUser.id : undefined,
          slaConfigId: slaConfig.id,
          responseSlaDue: new Date(Date.now() + 2 * 60 * 60 * 1000),
          resolutionSlaDue: new Date(Date.now() + 8 * 60 * 60 * 1000),
          resolvedAt: inc.status === 'RESOLVED' ? new Date() : undefined,
        },
      });
      incidents.push(incident);
    }

    console.log(`✅ ${incidents.length} incidents created`);
  }

  // 7. Create Sample Problems
  console.log('🔍 Creating sample problems...');
  const problems = [];
  if (incidents.length > 0) {
    const problemData = [
      {
        title: 'Recurring Battery Issues on Dell Latitude Models',
        description: 'Multiple users reporting battery charging issues on Dell Latitude 5420 and 5520 models.',
        status: 'UNDER_INVESTIGATION' as const,
        priority: 'P2' as const,
      },
      {
        title: 'Teams Application Instability',
        description: 'Pattern of Teams crashes affecting multiple users after recent Windows update.',
        status: 'KNOWN_ERROR' as const,
        priority: 'P1' as const,
        rootCause: 'Incompatibility with Windows 11 22H2 update',
        workaround: 'Rollback to previous Windows version or use Teams web client',
      },
    ];

    for (const prob of problemData) {
      const sequence = await prisma.idSequence.update({
        where: { prefix: 'PRB' },
        data: { currentValue: { increment: 1 } },
      });
      const displayId = `PRB-${sequence.currentValue.toString().padStart(5, '0')}`;

      const problem = await prisma.problem.create({
        data: {
          displayId,
          title: prob.title,
          description: prob.description,
          status: prob.status,
          priority: prob.priority,
          categoryId: hardwareCategory!.id,
          createdById: managerUser.id,
          assigneeId: operatorUser.id,
          rootCause: prob.rootCause,
          workaround: prob.workaround,
        },
      });
      problems.push(problem);

      // Link to related incidents
      if (incidents[0]) {
        await prisma.problemIncident.create({
          data: {
            problemId: problem.id,
            incidentId: incidents[0].id,
            linkedById: managerUser.id,
          },
        });
      }
    }

    console.log(`✅ ${problems.length} problems created`);
  }

  // 8. Create Sample Changes
  console.log('🔄 Creating sample changes...');
  const changes = [];
  const changeData = [
    {
      title: 'Upgrade Database Server to PostgreSQL 15',
      description: 'Upgrade production database from PostgreSQL 14 to 15 for performance improvements.',
      type: 'NORMAL' as const,
      priority: 'P2' as const,
      risk: 'MEDIUM' as const,
      status: 'APPROVED' as const,
      impact: 'All production services will have 2-hour maintenance window.',
    },
    {
      title: 'Emergency Security Patch for Log4j',
      description: 'Apply critical security patch to address Log4j vulnerability.',
      type: 'EMERGENCY' as const,
      priority: 'P1' as const,
      risk: 'HIGH' as const,
      status: 'COMPLETED' as const,
      impact: 'All Java-based services affected.',
    },
    {
      title: 'Deploy New CRM Version',
      description: 'Deploy CRM v2.5 with new customer portal features.',
      type: 'NORMAL' as const,
      priority: 'P3' as const,
      risk: 'LOW' as const,
      status: 'SCHEDULED' as const,
      impact: 'CRM users will see new interface.',
    },
  ];

  for (const chg of changeData) {
    const sequence = await prisma.idSequence.update({
      where: { prefix: 'CHG' },
      data: { currentValue: { increment: 1 } },
    });
    const displayId = `CHG-${sequence.currentValue.toString().padStart(5, '0')}`;

    const change = await prisma.change.create({
      data: {
        displayId,
        title: chg.title,
        description: chg.description,
        type: chg.type,
        priority: chg.priority,
        risk: chg.risk,
        status: chg.status,
        impact: chg.impact,
        categoryId: softwareCategory!.id,
        requesterId: managerUser.id,
        assigneeId: operatorUser.id,
        implementationPlan: 'Execute upgrade during maintenance window',
        rollbackPlan: 'Restore from backup if issues arise',
        testPlan: 'Verify all services post-upgrade',
        scheduledStartAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        scheduledEndAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000),
      },
    });
    changes.push(change);
  }

  console.log(`✅ ${changes.length} changes created`);

  // 9. Create Service Catalog Items
  console.log('📦 Creating service catalog items...');
  const catalogItems = [];
  const catalogData = [
    {
      name: 'New Employee Laptop Setup',
      description: 'Standard laptop setup for new employees including OS, applications, and security tools.',
      fulfillmentTime: 240, // 4 hours
      requiresApproval: true,
      formSchema: {
        fields: [
          { name: 'employeeName', type: 'text', required: true },
          { name: 'department', type: 'text', required: true },
          { name: 'startDate', type: 'date', required: true },
        ],
      },
    },
    {
      name: 'Software Installation Request',
      description: 'Request installation of approved software applications.',
      fulfillmentTime: 60, // 1 hour
      requiresApproval: true,
      formSchema: {
        fields: [
          { name: 'softwareName', type: 'text', required: true },
          { name: 'businessJustification', type: 'textarea', required: true },
        ],
      },
    },
    {
      name: 'Email Distribution List',
      description: 'Create new email distribution list or add members to existing list.',
      fulfillmentTime: 30,
      requiresApproval: false,
      formSchema: {
        fields: [
          { name: 'listName', type: 'text', required: true },
          { name: 'members', type: 'textarea', required: true },
        ],
      },
    },
  ];

  for (const item of catalogData) {
    const catalogItem = await prisma.serviceCatalogItem.create({
      data: {
        name: item.name,
        description: item.description,
        categoryId: softwareCategory!.id,
        fulfillmentTime: item.fulfillmentTime,
        requiresApproval: item.requiresApproval,
        formSchema: item.formSchema,
        isActive: true,
      },
    });
    catalogItems.push(catalogItem);
  }

  console.log(`✅ ${catalogItems.length} catalog items created`);

  // 10. Create Sample Service Requests
  console.log('📋 Creating sample service requests...');
  const requests = [];
  if (catalogItems.length > 0) {
    const requestData = [
      {
        catalogItem: catalogItems[0],
        status: 'APPROVED' as const,
        formData: { employeeName: 'Alice Smith', department: 'Engineering', startDate: '2024-02-01' },
      },
      {
        catalogItem: catalogItems[1],
        status: 'PENDING_APPROVAL' as const,
        formData: { softwareName: 'Adobe Photoshop', businessJustification: 'Required for marketing materials' },
      },
      {
        catalogItem: catalogItems[2],
        status: 'COMPLETED' as const,
        formData: { listName: 'team-announcements', members: 'alice@itil.dev, bob@itil.dev' },
      },
    ];

    for (const req of requestData) {
      const sequence = await prisma.idSequence.update({
        where: { prefix: 'REQ' },
        data: { currentValue: { increment: 1 } },
      });
      const displayId = `REQ-${sequence.currentValue.toString().padStart(5, '0')}`;

      const request = await prisma.serviceRequest.create({
        data: {
          displayId,
          catalogItemId: req.catalogItem.id,
          requesterId: operatorUser.id,
          status: req.status,
          priority: 'P3',
          formData: req.formData,
          fulfillerId: req.status === 'COMPLETED' ? operatorUser.id : undefined,
          fulfilledAt: req.status === 'COMPLETED' ? new Date() : undefined,
        },
      });
      requests.push(request);
    }

    console.log(`✅ ${requests.length} service requests created`);
  }

  // 11. Create Sample Knowledge Articles
  console.log('📚 Creating sample knowledge articles...');
  const articles = [];
  const articleData = [
    {
      title: 'How to Reset Your Password',
      content: '# Password Reset Guide\n\n1. Go to the login page\n2. Click "Forgot Password"\n3. Enter your email\n4. Check your email for reset link\n5. Follow the link and create a new password',
      summary: 'Step-by-step guide for resetting your account password.',
      keywords: ['password', 'reset', 'login', 'security'],
      status: 'PUBLISHED' as const,
    },
    {
      title: 'VPN Connection Troubleshooting',
      content: '# VPN Troubleshooting\n\n## Common Issues\n- Check internet connection\n- Verify VPN credentials\n- Ensure VPN client is up to date\n- Check firewall settings',
      summary: 'Troubleshooting guide for VPN connection issues.',
      keywords: ['vpn', 'network', 'remote', 'troubleshooting'],
      status: 'PUBLISHED' as const,
    },
    {
      title: 'Microsoft Teams Best Practices',
      content: '# Teams Best Practices\n\nDraft content in progress...',
      summary: 'Guidelines for using Microsoft Teams effectively.',
      keywords: ['teams', 'collaboration', 'communication'],
      status: 'DRAFT' as const,
    },
  ];

  for (const art of articleData) {
    const sequence = await prisma.idSequence.update({
      where: { prefix: 'KB' },
      data: { currentValue: { increment: 1 } },
    });
    const displayId = `KB-${sequence.currentValue.toString().padStart(5, '0')}`;

    const article = await prisma.knowledgeArticle.create({
      data: {
        displayId,
        title: art.title,
        content: art.content,
        summary: art.summary,
        status: art.status,
        keywords: art.keywords,
        categoryId: softwareCategory!.id,
        authorId: adminUser.id,
        publishedAt: art.status === 'PUBLISHED' ? new Date() : undefined,
      },
    });

    // Create initial version
    await prisma.articleVersion.create({
      data: {
        articleId: article.id,
        versionNumber: 1,
        title: article.title,
        content: article.content,
        createdById: adminUser.id,
      },
    });

    articles.push(article);
  }

  console.log(`✅ ${articles.length} knowledge articles created`);

  console.log('\n🎉 Database seeding complete!');
  console.log('\n📊 Summary:');
  console.log(`- 3 Roles`);
  console.log(`- 3 Users`);
  console.log(`- 1 SLA configuration`);
  console.log(`- ${categories.length} Categories`);
  console.log(`- 5 Incidents`);
  console.log(`- 2 Problems`);
  console.log(`- 3 Changes`);
  console.log(`- 3 Catalog items`);
  console.log(`- 3 Service requests`);
  console.log(`- 3 Knowledge articles`);
  console.log('\n🔐 Login credentials:');
  console.log(`   Admin: admin@itil.dev / Admin123!`);
  console.log(`   Manager: manager@itil.dev / Manager123!`);
  console.log(`   Operator: operator@itil.dev / Operator123!`);
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
