import { PrismaClient } from '@prisma/client';
import { SAMPLE_STOCKS } from '../src/data/stocks';
import { ScreeningService } from '../src/services/screening.service';
import { hashPassword, generateApiKey, hashApiKey, getApiKeyPrefix } from '../src/utils/crypto';

const prisma = new PrismaClient();
const screeningService = new ScreeningService();

async function main() {
  console.log('Seeding ShariaScreen database...');

  // Create demo developer account
  const passwordHash = await hashPassword('Test123!@#');

  const devUser = await prisma.user.upsert({
    where: { email: 'developer@shariascreen.com' },
    update: {},
    create: {
      email: 'developer@shariascreen.com',
      passwordHash,
      role: 'DEVELOPER',
    },
  });
  console.log(`Created user: ${devUser.email}`);

  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@shariascreen.com' },
    update: {},
    create: {
      email: 'admin@shariascreen.com',
      passwordHash,
      role: 'ADMIN',
    },
  });
  console.log(`Created user: ${adminUser.email}`);

  // Create demo API key
  const rawKey = generateApiKey('ss_test');
  const keyHash = hashApiKey(rawKey);
  const keyPrefix = getApiKeyPrefix(rawKey);

  const existingKey = await prisma.apiKey.findFirst({
    where: { userId: devUser.id },
  });

  if (!existingKey) {
    await prisma.apiKey.create({
      data: {
        userId: devUser.id,
        name: 'Demo API Key',
        keyHash,
        keyPrefix,
        permissions: { read: true, write: false },
      },
    });
    console.log(`Created API key: ${rawKey}`);
    console.log('(Save this key - it will not be shown again)');
  }

  // Seed stocks and screening results
  for (const stockData of SAMPLE_STOCKS) {
    const stock = await prisma.stock.upsert({
      where: { ticker: stockData.ticker },
      update: {
        name: stockData.name,
        sector: stockData.sector,
        industry: stockData.industry,
        marketCap: stockData.marketCap,
        totalDebt: stockData.totalDebt,
        totalRevenue: stockData.totalRevenue,
        interestIncome: stockData.interestIncome,
        cashAndEquivalents: stockData.cashAndEquivalents,
        accountsReceivable: stockData.accountsReceivable,
        nonPermissibleRevenue: stockData.nonPermissibleRevenue,
        dividendPerShare: stockData.dividendPerShare,
        totalAssets: stockData.totalAssets,
        lastUpdated: new Date(),
      },
      create: {
        ticker: stockData.ticker,
        name: stockData.name,
        sector: stockData.sector,
        industry: stockData.industry,
        marketCap: stockData.marketCap,
        totalDebt: stockData.totalDebt,
        totalRevenue: stockData.totalRevenue,
        interestIncome: stockData.interestIncome,
        cashAndEquivalents: stockData.cashAndEquivalents,
        accountsReceivable: stockData.accountsReceivable,
        nonPermissibleRevenue: stockData.nonPermissibleRevenue,
        dividendPerShare: stockData.dividendPerShare,
        totalAssets: stockData.totalAssets,
      },
    });

    // Generate screening result
    const result = screeningService.screenStock(stockData);

    await prisma.screeningResult.create({
      data: {
        stockId: stock.id,
        standard: 'AAOIFI',
        status: result.status,
        debtRatio: result.ratios.debtRatio,
        interestIncomeRatio: result.ratios.interestIncomeRatio,
        cashRatio: result.ratios.cashRatio,
        receivablesRatio: result.ratios.receivablesRatio,
        businessActivityPass: result.businessActivity.pass,
        purificationPerShare: result.purification.amountPerShare,
        details: {
          businessActivity: result.businessActivity,
          purification: result.purification,
        },
      },
    });

    console.log(
      `Seeded ${stockData.ticker}: ${result.status}`
    );
  }

  console.log(
    `\nSeeded ${SAMPLE_STOCKS.length} stocks with screening results`
  );
  console.log('Seed complete!');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
