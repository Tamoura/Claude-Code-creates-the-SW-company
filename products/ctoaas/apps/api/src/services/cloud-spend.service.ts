import { PrismaClient, CloudProvider, ImportSource } from '@prisma/client';
import { AppError } from '../lib/errors';

// ---------- Types ----------

export interface SpendBreakdown {
  compute: number;
  storage: number;
  networking: number;
  database: number;
  other: number;
  [key: string]: number;
}

export interface ManualEntryInput {
  provider: string;
  spendBreakdown: SpendBreakdown;
  totalMonthly: number;
  periodStart: string;
  periodEnd: string;
}

export interface ManualEntry {
  provider: string;
  spendBreakdown: SpendBreakdown;
  totalMonthly: number;
  importSource: string;
  periodStart: string;
  periodEnd: string;
}

export interface ParsedCSV {
  spendBreakdown: SpendBreakdown;
  totalMonthly: number;
}

export interface CategoryBenchmark {
  median: number;
  p25: number;
  p75: number;
}

export interface Benchmarks {
  compute: CategoryBenchmark;
  storage: CategoryBenchmark;
  networking: CategoryBenchmark;
  database: CategoryBenchmark;
  totalMedian: number;
}

export interface Recommendation {
  category: string;
  finding: string;
  potentialSavingsPercent: number;
}

export interface SpendAnalysisInput {
  provider: string;
  totalMonthly: number;
  spendBreakdown: SpendBreakdown;
  companySize: number;
}

// ---------- Industry benchmarks (hardcoded for MVP) ----------

interface SizeTierBenchmarks {
  compute: CategoryBenchmark;
  storage: CategoryBenchmark;
  networking: CategoryBenchmark;
  database: CategoryBenchmark;
  totalMedian: number;
}

/**
 * Hardcoded industry benchmarks by company size tier.
 * Values represent monthly spend per employee in USD.
 */
const BENCHMARKS_PER_EMPLOYEE: Record<string, SizeTierBenchmarks> = {
  small: {
    compute: { median: 80, p25: 50, p75: 120 },
    storage: { median: 25, p25: 15, p75: 40 },
    networking: { median: 15, p25: 8, p75: 25 },
    database: { median: 35, p25: 20, p75: 55 },
    totalMedian: 180,
  },
  medium: {
    compute: { median: 70, p25: 45, p75: 100 },
    storage: { median: 20, p25: 12, p75: 35 },
    networking: { median: 12, p25: 6, p75: 20 },
    database: { median: 30, p25: 18, p75: 48 },
    totalMedian: 155,
  },
  large: {
    compute: { median: 55, p25: 35, p75: 80 },
    storage: { median: 18, p25: 10, p75: 30 },
    networking: { median: 10, p25: 5, p75: 18 },
    database: { median: 25, p25: 15, p75: 40 },
    totalMedian: 125,
  },
};

const VALID_CSV_CATEGORIES = [
  'compute',
  'storage',
  'networking',
  'database',
  'other',
];

// ---------- Service ----------

export class CloudSpendService {
  private prisma?: PrismaClient;

  constructor(prisma?: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * Build a manual spend entry (pure function, no DB).
   */
  buildManualEntry(input: ManualEntryInput): ManualEntry {
    return {
      provider: input.provider,
      spendBreakdown: input.spendBreakdown,
      totalMonthly: input.totalMonthly,
      importSource: 'MANUAL',
      periodStart: input.periodStart,
      periodEnd: input.periodEnd,
    };
  }

  /**
   * Parse CSV content into spend breakdown.
   * Expected format: category,amount (header row + data rows).
   */
  parseCSV(csvContent: string): ParsedCSV {
    const lines = csvContent.trim().split('\n');
    if (lines.length < 2) {
      throw AppError.badRequest(
        'CSV must have a header row and at least one data row'
      );
    }

    const header = lines[0].split(',').map((h) => h.trim().toLowerCase());
    if (header.length !== 2 || header[0] !== 'category' || header[1] !== 'amount') {
      throw AppError.badRequest(
        'CSV header must be: category,amount'
      );
    }

    const breakdown: SpendBreakdown = {
      compute: 0,
      storage: 0,
      networking: 0,
      database: 0,
      other: 0,
    };

    let totalMonthly = 0;

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const parts = line.split(',');
      if (parts.length !== 2) {
        throw AppError.badRequest(
          `CSV line ${i + 1}: expected 2 columns, got ${parts.length}`
        );
      }

      const category = parts[0].trim().toLowerCase();
      const amount = parseFloat(parts[1].trim());

      if (isNaN(amount)) {
        throw AppError.badRequest(
          `CSV line ${i + 1}: invalid amount "${parts[1].trim()}"`
        );
      }

      if (!VALID_CSV_CATEGORIES.includes(category)) {
        throw AppError.badRequest(
          `CSV line ${i + 1}: unknown category "${category}". Valid: ${VALID_CSV_CATEGORIES.join(', ')}`
        );
      }

      breakdown[category] = amount;
      totalMonthly += amount;
    }

    return { spendBreakdown: breakdown, totalMonthly };
  }

  /**
   * Get industry benchmarks by company size and provider (pure function).
   * Benchmarks are per-employee; we scale by company size.
   */
  getBenchmarks(
    companySize: number,
    _provider: string
  ): Benchmarks {
    const tier = this.getSizeTier(companySize);
    const perEmployee = BENCHMARKS_PER_EMPLOYEE[tier];

    const scale = (b: CategoryBenchmark): CategoryBenchmark => ({
      median: Math.round(b.median * companySize),
      p25: Math.round(b.p25 * companySize),
      p75: Math.round(b.p75 * companySize),
    });

    return {
      compute: scale(perEmployee.compute),
      storage: scale(perEmployee.storage),
      networking: scale(perEmployee.networking),
      database: scale(perEmployee.database),
      totalMedian: Math.round(perEmployee.totalMedian * companySize),
    };
  }

  /**
   * Generate recommendations by comparing spend to benchmarks.
   */
  getRecommendations(data: SpendAnalysisInput): Recommendation[] {
    const benchmarks = this.getBenchmarks(data.companySize, data.provider);
    const recommendations: Recommendation[] = [];
    const categories = ['compute', 'storage', 'networking', 'database'] as const;

    for (const cat of categories) {
      const actual = data.spendBreakdown[cat] ?? 0;
      const benchmark = benchmarks[cat];

      if (actual > benchmark.p75) {
        const overspend = actual - benchmark.median;
        const savingsPercent = Math.round((overspend / actual) * 100);

        recommendations.push({
          category: cat,
          finding: `${cat.charAt(0).toUpperCase() + cat.slice(1)} spend ($${actual}/mo) exceeds the 75th percentile ($${benchmark.p75}/mo) for companies your size. Consider right-sizing or reserved instances.`,
          potentialSavingsPercent: Math.max(savingsPercent, 5),
        });
      }
    }

    // Total spend check
    if (data.totalMonthly > benchmarks.totalMedian * 1.3) {
      recommendations.push({
        category: 'overall',
        finding: `Total monthly spend ($${data.totalMonthly}) is 30%+ above the industry median ($${benchmarks.totalMedian}) for your company size. A comprehensive cost optimization review is recommended.`,
        potentialSavingsPercent: Math.round(
          ((data.totalMonthly - benchmarks.totalMedian) / data.totalMonthly) * 100
        ),
      });
    }

    return recommendations;
  }

  // ---------- DB-backed methods ----------

  private requirePrisma(): PrismaClient {
    if (!this.prisma) {
      throw new Error('PrismaClient is required for this operation');
    }
    return this.prisma;
  }

  /**
   * Create a cloud spend entry in the database.
   */
  async createEntry(
    userId: string,
    organizationId: string,
    data: ManualEntryInput
  ): Promise<{
    id: string;
    provider: string;
    totalMonthly: string;
    spendBreakdown: SpendBreakdown;
    periodStart: Date;
    periodEnd: Date;
    createdAt: Date;
  }> {
    const prisma = this.requirePrisma();

    const providerMap: Record<string, CloudProvider> = {
      AWS: 'AWS',
      GCP: 'GCP',
      AZURE: 'AZURE',
      OTHER: 'OTHER',
    };

    const provider = providerMap[data.provider.toUpperCase()];
    if (!provider) {
      throw AppError.badRequest(
        `Invalid provider: ${data.provider}. Valid: AWS, GCP, AZURE, OTHER`
      );
    }

    const record = await prisma.cloudSpend.create({
      data: {
        userId,
        organizationId,
        provider,
        spendBreakdown: data.spendBreakdown as unknown as Record<string, unknown>,
        totalMonthly: data.totalMonthly,
        importSource: 'MANUAL' as ImportSource,
        periodStart: new Date(data.periodStart),
        periodEnd: new Date(data.periodEnd),
      },
    });

    return {
      id: record.id,
      provider: record.provider,
      totalMonthly: record.totalMonthly.toString(),
      spendBreakdown: record.spendBreakdown as unknown as SpendBreakdown,
      periodStart: record.periodStart,
      periodEnd: record.periodEnd,
      createdAt: record.createdAt,
    };
  }

  /**
   * List cloud spend entries for an organization.
   */
  async listEntries(
    organizationId: string
  ): Promise<
    Array<{
      id: string;
      provider: string;
      totalMonthly: string;
      spendBreakdown: unknown;
      periodStart: Date;
      periodEnd: Date;
      createdAt: Date;
    }>
  > {
    const prisma = this.requirePrisma();

    const records = await prisma.cloudSpend.findMany({
      where: { organizationId },
      orderBy: { periodStart: 'desc' },
    });

    return records.map((r) => ({
      id: r.id,
      provider: r.provider,
      totalMonthly: r.totalMonthly.toString(),
      spendBreakdown: r.spendBreakdown,
      periodStart: r.periodStart,
      periodEnd: r.periodEnd,
      createdAt: r.createdAt,
    }));
  }

  // ---------- Private helpers ----------

  private getSizeTier(employeeCount: number): string {
    if (employeeCount <= 50) return 'small';
    if (employeeCount <= 500) return 'medium';
    return 'large';
  }
}
