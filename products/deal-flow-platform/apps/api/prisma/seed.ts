import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding DealGate database...');

  // 1. Create default tenant
  const tenant = await prisma.tenant.upsert({
    where: { slug: 'dealgate' },
    update: {},
    create: {
      name: 'DealGate',
      slug: 'dealgate',
      isActive: true,
      config: {
        create: {
          features: {
            enableIPO: true,
            enableSukuk: true,
            enablePEVC: true,
            enableMutualFund: true,
            enableRealEstate: true,
            enableSavings: true,
            enablePrivatePlacement: true,
          },
          complianceRules: { minKYCLevel: 'BASIC', amlCheckRequired: true },
          apiRateLimit: 1000,
        },
      },
      branding: {
        create: {
          primaryColor: '#1E3A5F',
          accentColor: '#C5A572',
          fontFamily: 'Inter',
        },
      },
    },
  });

  console.log('Tenant created:', tenant.id);

  // 2. Create test users
  const passwordHash = await bcrypt.hash('Test123!@#', 12);

  const users = await Promise.all([
    // Qatari HNWI investor
    prisma.user.upsert({
      where: { email: 'investor.hnwi@dealgate.qa' },
      update: {},
      create: {
        tenantId: tenant.id,
        email: 'investor.hnwi@dealgate.qa',
        passwordHash,
        role: 'INVESTOR',
        fullNameEn: 'Mohammed Al-Thani',
        fullNameAr: 'محمد آل ثاني',
        phone: '+97433001001',
        preferredLanguage: 'ar',
      },
    }),
    // Expat professional investor
    prisma.user.upsert({
      where: { email: 'investor.expat@dealgate.qa' },
      update: {},
      create: {
        tenantId: tenant.id,
        email: 'investor.expat@dealgate.qa',
        passwordHash,
        role: 'INVESTOR',
        fullNameEn: 'James Wilson',
        phone: '+97455002002',
        preferredLanguage: 'en',
      },
    }),
    // QFC fund manager / issuer
    prisma.user.upsert({
      where: { email: 'issuer.qfc@dealgate.qa' },
      update: {},
      create: {
        tenantId: tenant.id,
        email: 'issuer.qfc@dealgate.qa',
        passwordHash,
        role: 'ISSUER',
        fullNameEn: 'Sarah Al-Kuwari',
        fullNameAr: 'سارة الكواري',
        phone: '+97444003003',
        preferredLanguage: 'en',
      },
    }),
    // QSE-listed company / issuer
    prisma.user.upsert({
      where: { email: 'issuer.qse@dealgate.qa' },
      update: {},
      create: {
        tenantId: tenant.id,
        email: 'issuer.qse@dealgate.qa',
        passwordHash,
        role: 'ISSUER',
        fullNameEn: 'Khalid Al-Marri',
        fullNameAr: 'خالد المري',
        phone: '+97444004004',
        preferredLanguage: 'ar',
      },
    }),
    // Admin
    prisma.user.upsert({
      where: { email: 'admin@dealgate.qa' },
      update: {},
      create: {
        tenantId: tenant.id,
        email: 'admin@dealgate.qa',
        passwordHash,
        role: 'SUPER_ADMIN',
        fullNameEn: 'Admin User',
        phone: '+97444005005',
        preferredLanguage: 'en',
      },
    }),
  ]);

  console.log(`Created ${users.length} users`);

  // 3. Create investor profiles
  const hnwiProfile = await prisma.investorProfile.upsert({
    where: { userId: users[0].id },
    update: {},
    create: {
      userId: users[0].id,
      classification: 'PROFESSIONAL',
      nin: 'QA-NIN-100001',
      isQatariNational: true,
      kycStatus: 'VERIFIED',
      kycVerifiedAt: new Date(),
      shariaPreference: true,
      riskTolerance: 'HIGH',
    },
  });

  const expatProfile = await prisma.investorProfile.upsert({
    where: { userId: users[1].id },
    update: {},
    create: {
      userId: users[1].id,
      classification: 'RETAIL',
      nin: 'QA-NIN-200002',
      isQatariNational: false,
      kycStatus: 'VERIFIED',
      kycVerifiedAt: new Date(),
      shariaPreference: false,
      riskTolerance: 'MEDIUM',
    },
  });

  // 4. Create issuer profiles
  const qfcIssuer = await prisma.issuerProfile.upsert({
    where: { userId: users[2].id },
    update: {},
    create: {
      userId: users[2].id,
      companyNameEn: 'Qatar Capital Partners',
      companyNameAr: 'شركاء قطر المالية',
      registrationType: 'QFC',
      registrationNumber: 'QFC-2024-0891',
      sector: 'FINANCIAL_SERVICES',
      website: 'https://qcp.qa',
      contactEmail: 'ir@qcp.qa',
    },
  });

  const qseIssuer = await prisma.issuerProfile.upsert({
    where: { userId: users[3].id },
    update: {},
    create: {
      userId: users[3].id,
      companyNameEn: 'Doha Technology Group',
      companyNameAr: 'مجموعة الدوحة للتكنولوجيا',
      registrationType: 'QFMA',
      registrationNumber: 'QFMA-CR-40982',
      sector: 'TECHNOLOGY',
      website: 'https://dohatech.qa',
      contactEmail: 'ir@dohatech.qa',
    },
  });

  console.log('Created investor and issuer profiles');

  // 5. Create 15 sample deals
  const deals = await Promise.all([
    // IPO 1 - Tech company
    prisma.deal.create({
      data: {
        tenantId: tenant.id,
        issuerId: qseIssuer.id,
        titleEn: 'Doha Technology Group IPO',
        titleAr: 'الاكتتاب العام لمجموعة الدوحة للتكنولوجيا',
        descriptionEn: 'Initial public offering of Doha Technology Group, a leading Qatari technology company specializing in smart city solutions and digital transformation services for government entities.',
        dealType: 'IPO',
        status: 'SUBSCRIPTION_OPEN',
        targetRaise: 500000000,
        minInvestment: 10000,
        maxInvestment: 5000000,
        currency: 'QAR',
        shariaCompliance: 'CERTIFIED',
        purificationRatio: 0.0023,
        sector: 'TECHNOLOGY',
        eligibleClassifications: ['RETAIL', 'PROFESSIONAL', 'INSTITUTIONAL'],
        subscriptionOpenDate: new Date('2026-02-01'),
        subscriptionCloseDate: new Date('2026-02-28'),
        dealMetadata: { sharePrice: 12.50, totalShares: 40000000, lotSize: 100 },
      },
    }),
    // IPO 2 - Logistics
    prisma.deal.create({
      data: {
        tenantId: tenant.id,
        issuerId: qseIssuer.id,
        titleEn: 'Qatar Logistics Solutions IPO',
        titleAr: 'الاكتتاب العام لحلول قطر اللوجستية',
        descriptionEn: 'IPO of Qatar Logistics Solutions, operating the largest fleet of temperature-controlled vehicles in the GCC region. Key supplier to Qatar Airways Cargo and Hamad Port.',
        dealType: 'IPO',
        status: 'ACTIVE',
        targetRaise: 300000000,
        minInvestment: 5000,
        maxInvestment: 2000000,
        currency: 'QAR',
        shariaCompliance: 'CERTIFIED',
        sector: 'LOGISTICS',
        eligibleClassifications: ['RETAIL', 'PROFESSIONAL', 'INSTITUTIONAL'],
        dealMetadata: { sharePrice: 8.75, totalShares: 34285714, lotSize: 50 },
      },
    }),
    // Mutual Fund 1 - Sharia equity
    prisma.deal.create({
      data: {
        tenantId: tenant.id,
        issuerId: qfcIssuer.id,
        titleEn: 'Al Jazeera GCC Equity Fund',
        titleAr: 'صندوق الجزيرة للأسهم الخليجية',
        descriptionEn: 'Sharia-compliant equity fund investing in blue-chip stocks across the GCC markets. Focus on Qatar, UAE, and Saudi Arabia with a minimum 60% allocation to QSE-listed securities.',
        dealType: 'MUTUAL_FUND',
        status: 'SUBSCRIPTION_OPEN',
        targetRaise: 200000000,
        minInvestment: 5000,
        currency: 'QAR',
        shariaCompliance: 'CERTIFIED',
        purificationRatio: 0.0015,
        sector: 'DIVERSIFIED',
        eligibleClassifications: ['RETAIL', 'PROFESSIONAL', 'INSTITUTIONAL', 'QFC'],
        dealMetadata: { nav: 10.00, managementFee: 0.015, performanceFee: 0.10 },
      },
    }),
    // Mutual Fund 2 - Sharia equity (focused)
    prisma.deal.create({
      data: {
        tenantId: tenant.id,
        issuerId: qfcIssuer.id,
        titleEn: 'Qatar National Champions Fund',
        titleAr: 'صندوق أبطال قطر الوطنيين',
        descriptionEn: 'Concentrated Sharia-compliant fund targeting the top 15 QSE-listed companies by market capitalization. Holdings include QNB, Industries Qatar, and Qatar Fuel.',
        dealType: 'MUTUAL_FUND',
        status: 'ACTIVE',
        targetRaise: 150000000,
        minInvestment: 2000,
        currency: 'QAR',
        shariaCompliance: 'CERTIFIED',
        purificationRatio: 0.0018,
        sector: 'EQUITIES',
        eligibleClassifications: ['RETAIL', 'PROFESSIONAL', 'INSTITUTIONAL'],
        dealMetadata: { nav: 11.25, managementFee: 0.0125, performanceFee: 0.15 },
      },
    }),
    // Mutual Fund 3 - Fixed income
    prisma.deal.create({
      data: {
        tenantId: tenant.id,
        issuerId: qfcIssuer.id,
        titleEn: 'Gulf Income Plus Fund',
        titleAr: 'صندوق الخليج للدخل الثابت',
        descriptionEn: 'Fixed income fund investing in investment-grade corporate bonds and government securities across GCC markets. Target annual yield of 5-6%.',
        dealType: 'MUTUAL_FUND',
        status: 'SUBSCRIPTION_OPEN',
        targetRaise: 100000000,
        minInvestment: 10000,
        currency: 'QAR',
        shariaCompliance: 'NON_CERTIFIED',
        sector: 'FIXED_INCOME',
        eligibleClassifications: ['PROFESSIONAL', 'INSTITUTIONAL'],
        dealMetadata: { nav: 100.00, managementFee: 0.0075, targetYield: 0.055 },
      },
    }),
    // Sukuk 1 - Sovereign
    prisma.deal.create({
      data: {
        tenantId: tenant.id,
        issuerId: qseIssuer.id,
        titleEn: 'State of Qatar Sovereign Sukuk 2031',
        titleAr: 'صكوك دولة قطر السيادية 2031',
        descriptionEn: 'Five-year sovereign sukuk issued by the State of Qatar, rated Aa2/AA/AA. Ijarah structure backed by government real estate assets.',
        dealType: 'SUKUK',
        status: 'SUBSCRIPTION_OPEN',
        targetRaise: 2000000000,
        minInvestment: 50000,
        currency: 'QAR',
        shariaCompliance: 'CERTIFIED',
        purificationRatio: 0,
        sector: 'SOVEREIGN',
        eligibleClassifications: ['PROFESSIONAL', 'INSTITUTIONAL', 'QFC'],
        subscriptionOpenDate: new Date('2026-01-15'),
        subscriptionCloseDate: new Date('2026-03-15'),
        dealMetadata: { couponRate: 0.0425, maturityDate: '2031-03-15', structure: 'Ijarah' },
      },
    }),
    // Sukuk 2 - Corporate (QIIB-style)
    prisma.deal.create({
      data: {
        tenantId: tenant.id,
        issuerId: qfcIssuer.id,
        titleEn: 'QIIB Tier 1 Capital Sukuk',
        titleAr: 'صكوك رأس المال من الشريحة الأولى لبنك قطر الإسلامي',
        descriptionEn: 'Additional Tier 1 perpetual sukuk issued by Qatar International Islamic Bank. Mudarabah structure with quarterly profit distribution.',
        dealType: 'SUKUK',
        status: 'ACTIVE',
        targetRaise: 1000000000,
        minInvestment: 200000,
        currency: 'QAR',
        shariaCompliance: 'CERTIFIED',
        purificationRatio: 0,
        sector: 'BANKING',
        eligibleClassifications: ['PROFESSIONAL', 'INSTITUTIONAL'],
        dealMetadata: { couponRate: 0.0575, structure: 'Mudarabah', perpetual: true },
      },
    }),
    // Sukuk 3 - Infrastructure
    prisma.deal.create({
      data: {
        tenantId: tenant.id,
        issuerId: qseIssuer.id,
        titleEn: 'Lusail Smart City Infrastructure Sukuk',
        titleAr: 'صكوك البنية التحتية لمدينة لوسيل الذكية',
        descriptionEn: 'Green sukuk financing smart infrastructure development in Lusail City including IoT networks, renewable energy, and smart transportation systems.',
        dealType: 'SUKUK',
        status: 'UNDER_REVIEW',
        targetRaise: 750000000,
        minInvestment: 100000,
        currency: 'QAR',
        shariaCompliance: 'CERTIFIED',
        purificationRatio: 0,
        sector: 'INFRASTRUCTURE',
        eligibleClassifications: ['PROFESSIONAL', 'INSTITUTIONAL'],
        dealMetadata: { couponRate: 0.05, maturityDate: '2033-06-30', structure: 'Wakalah', green: true },
      },
    }),
    // PE/VC 1 - Tech VC
    prisma.deal.create({
      data: {
        tenantId: tenant.id,
        issuerId: qfcIssuer.id,
        titleEn: 'Qatar Ventures Technology Fund III',
        titleAr: 'صندوق قطر للتكنولوجيا الجريئة الثالث',
        descriptionEn: 'Venture capital fund targeting early-stage and growth-stage technology startups in Qatar and the wider MENA region. Focus on fintech, healthtech, and edtech.',
        dealType: 'PE_VC',
        status: 'SUBSCRIPTION_OPEN',
        targetRaise: 250000000,
        minInvestment: 500000,
        currency: 'QAR',
        shariaCompliance: 'CERTIFIED',
        sector: 'TECHNOLOGY',
        eligibleClassifications: ['PROFESSIONAL', 'INSTITUTIONAL'],
        dealMetadata: { fundSize: 250000000, vintage: 2026, managementFee: 0.02, carry: 0.20 },
      },
    }),
    // PE/VC 2 - Healthcare PE
    prisma.deal.create({
      data: {
        tenantId: tenant.id,
        issuerId: qfcIssuer.id,
        titleEn: 'GCC Healthcare Partners Fund',
        titleAr: 'صندوق شركاء الرعاية الصحية الخليجي',
        descriptionEn: 'Private equity fund focused on healthcare service providers and medical technology companies across the GCC. Co-investment with Qatar Investment Authority.',
        dealType: 'PE_VC',
        status: 'ACTIVE',
        targetRaise: 500000000,
        minInvestment: 1000000,
        currency: 'QAR',
        shariaCompliance: 'CERTIFIED',
        sector: 'HEALTHCARE',
        eligibleClassifications: ['INSTITUTIONAL'],
        dealMetadata: { fundSize: 500000000, vintage: 2025, managementFee: 0.0175, carry: 0.20 },
      },
    }),
    // Private Placement 1 - Real estate dev
    prisma.deal.create({
      data: {
        tenantId: tenant.id,
        issuerId: qseIssuer.id,
        titleEn: 'West Bay Tower Development',
        titleAr: 'مشروع تطوير برج الخليج الغربي',
        descriptionEn: 'Private placement for the development of a 45-story mixed-use tower in West Bay, Doha. Project includes premium office space, serviced apartments, and retail.',
        dealType: 'PRIVATE_PLACEMENT',
        status: 'SUBSCRIPTION_OPEN',
        targetRaise: 400000000,
        minInvestment: 250000,
        maxInvestment: 10000000,
        currency: 'QAR',
        shariaCompliance: 'CERTIFIED',
        sector: 'REAL_ESTATE',
        eligibleClassifications: ['PROFESSIONAL', 'INSTITUTIONAL'],
        dealMetadata: { projectTimeline: '36 months', targetIRR: 0.18, location: 'West Bay, Doha' },
      },
    }),
    // Private Placement 2 - Fintech growth
    prisma.deal.create({
      data: {
        tenantId: tenant.id,
        issuerId: qfcIssuer.id,
        titleEn: 'QatarPay Series B',
        titleAr: 'جولة التمويل ب لكيوتار باي',
        descriptionEn: 'Series B funding round for QatarPay, the leading digital payment platform in Qatar processing over QR 2B in annual transactions. Expansion to KSA and UAE markets.',
        dealType: 'PRIVATE_PLACEMENT',
        status: 'ACTIVE',
        targetRaise: 75000000,
        minInvestment: 100000,
        currency: 'QAR',
        shariaCompliance: 'CERTIFIED',
        sector: 'FINTECH',
        eligibleClassifications: ['PROFESSIONAL', 'INSTITUTIONAL'],
        dealMetadata: { valuation: 500000000, previousRound: 'Series A', activeUsers: 850000 },
      },
    }),
    // Real Estate Fund 1 - Commercial REIT
    prisma.deal.create({
      data: {
        tenantId: tenant.id,
        issuerId: qfcIssuer.id,
        titleEn: 'Qatar Commercial REIT',
        titleAr: 'صندوق قطر العقاري التجاري',
        descriptionEn: 'Real estate investment trust focused on prime commercial properties in Doha including Msheireb Downtown, The Pearl, and Lusail Marina District.',
        dealType: 'REAL_ESTATE',
        status: 'SUBSCRIPTION_OPEN',
        targetRaise: 350000000,
        minInvestment: 25000,
        currency: 'QAR',
        shariaCompliance: 'CERTIFIED',
        purificationRatio: 0.0012,
        sector: 'REAL_ESTATE',
        eligibleClassifications: ['RETAIL', 'PROFESSIONAL', 'INSTITUTIONAL'],
        dealMetadata: { dividendYield: 0.065, properties: 12, totalArea: 250000 },
      },
    }),
    // Real Estate Fund 2 - Residential
    prisma.deal.create({
      data: {
        tenantId: tenant.id,
        issuerId: qseIssuer.id,
        titleEn: 'Lusail Residential Income Fund',
        titleAr: 'صندوق دخل لوسيل السكني',
        descriptionEn: 'Income-generating residential real estate fund focused on premium apartments in Lusail City and Al Dafna. Targeting 7%+ annual distribution yield.',
        dealType: 'REAL_ESTATE',
        status: 'DRAFT',
        targetRaise: 200000000,
        minInvestment: 50000,
        currency: 'QAR',
        shariaCompliance: 'CERTIFIED',
        sector: 'REAL_ESTATE',
        eligibleClassifications: ['PROFESSIONAL', 'INSTITUTIONAL'],
        dealMetadata: { dividendYield: 0.07, units: 480, occupancyRate: 0.92 },
      },
    }),
    // Savings Instrument - Government sukuk
    prisma.deal.create({
      data: {
        tenantId: tenant.id,
        issuerId: qseIssuer.id,
        titleEn: 'Qatar National Savings Sukuk',
        titleAr: 'صكوك الادخار الوطنية القطرية',
        descriptionEn: 'Government-backed savings sukuk designed for Qatari nationals. Capital-protected with quarterly profit distribution. Minimum 3-year holding period.',
        dealType: 'SAVINGS',
        status: 'SUBSCRIPTION_OPEN',
        targetRaise: 500000000,
        minInvestment: 1000,
        maxInvestment: 1000000,
        currency: 'QAR',
        shariaCompliance: 'CERTIFIED',
        purificationRatio: 0,
        sector: 'SAVINGS',
        eligibleClassifications: ['RETAIL', 'PROFESSIONAL'],
        dealMetadata: { profitRate: 0.04, minHoldingPeriod: '3 years', capitalProtected: true },
      },
    }),
  ]);

  console.log(`Created ${deals.length} deals`);

  // 6. Create sample subscriptions
  const subscriptions = await Promise.all([
    prisma.subscription.create({
      data: {
        investorId: hnwiProfile.id,
        dealId: deals[0].id, // Doha Tech IPO
        amount: 500000,
        currency: 'QAR',
        status: 'SUBMITTED',
        acceptedTerms: true,
        acceptedRisks: true,
      },
    }),
    prisma.subscription.create({
      data: {
        investorId: hnwiProfile.id,
        dealId: deals[5].id, // Sovereign Sukuk
        amount: 2000000,
        currency: 'QAR',
        status: 'APPROVED',
        acceptedTerms: true,
        acceptedRisks: true,
      },
    }),
    prisma.subscription.create({
      data: {
        investorId: expatProfile.id,
        dealId: deals[2].id, // Al Jazeera GCC Fund
        amount: 25000,
        currency: 'QAR',
        status: 'INTENT_EXPRESSED',
        acceptedTerms: true,
        acceptedRisks: true,
      },
    }),
    prisma.subscription.create({
      data: {
        investorId: expatProfile.id,
        dealId: deals[14].id, // National Savings Sukuk
        amount: 10000,
        currency: 'QAR',
        status: 'ALLOCATED',
        acceptedTerms: true,
        acceptedRisks: true,
        allocatedAmount: 10000,
        allocatedUnits: 100,
      },
    }),
  ]);

  console.log(`Created ${subscriptions.length} subscriptions`);

  // 7. Create sample watchlist items
  await Promise.all([
    prisma.watchlistItem.create({
      data: { userId: users[0].id, dealId: deals[8].id },  // HNWI watches VC fund
    }),
    prisma.watchlistItem.create({
      data: { userId: users[0].id, dealId: deals[12].id }, // HNWI watches REIT
    }),
    prisma.watchlistItem.create({
      data: { userId: users[1].id, dealId: deals[0].id },  // Expat watches IPO
    }),
    prisma.watchlistItem.create({
      data: { userId: users[1].id, dealId: deals[3].id },  // Expat watches fund
    }),
  ]);

  console.log('Created watchlist items');

  // 8. Create sample notifications
  await Promise.all([
    prisma.notification.create({
      data: {
        userId: users[0].id,
        titleEn: 'Welcome to DealGate',
        titleAr: 'مرحبا بك في ديل قيت',
        bodyEn: 'Your account has been verified. Start exploring investment opportunities.',
        bodyAr: 'تم التحقق من حسابك. ابدأ استكشاف فرص الاستثمار.',
        channel: 'IN_APP',
      },
    }),
    prisma.notification.create({
      data: {
        userId: users[0].id,
        titleEn: 'New IPO Available',
        titleAr: 'اكتتاب عام جديد متاح',
        bodyEn: 'Doha Technology Group IPO is now open for subscription. Minimum QR 10,000.',
        bodyAr: 'الاكتتاب العام لمجموعة الدوحة للتكنولوجيا مفتوح الآن. الحد الأدنى 10,000 ريال.',
        channel: 'IN_APP',
        actionUrl: '/deals/' + deals[0].id,
      },
    }),
    prisma.notification.create({
      data: {
        userId: users[0].id,
        titleEn: 'Subscription Approved',
        titleAr: 'تمت الموافقة على الاشتراك',
        bodyEn: 'Your subscription to Qatar Sovereign Sukuk 2031 has been approved.',
        bodyAr: 'تمت الموافقة على اشتراكك في صكوك دولة قطر السيادية 2031.',
        channel: 'IN_APP',
        isRead: true,
        readAt: new Date(),
      },
    }),
    prisma.notification.create({
      data: {
        userId: users[1].id,
        titleEn: 'Welcome to DealGate',
        bodyEn: 'Your account has been created. Complete your KYC to start investing.',
        channel: 'IN_APP',
      },
    }),
  ]);

  console.log('Created notifications');
  console.log('Seed complete!');
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
