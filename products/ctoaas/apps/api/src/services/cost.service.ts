import { PrismaClient } from '@prisma/client';
import { AppError } from '../lib/errors';

// ---------- Types ----------

export interface TcoOption {
  name: string;
  upfrontCost: number;
  monthlyCost: number;
  teamSize: number;
  hourlyRate: number;
  months: number;
  scalingFactor: number;
}

export interface YearBreakdown {
  year: number;
  upfront: number;
  infrastructure: number;
  development: number;
  maintenance: number;
  total: number;
}

export interface TcoResult {
  name: string;
  totalCost: number;
  years: YearBreakdown[];
}

export interface TcoComparison {
  options: TcoResult[];
  cheapest: string;
}

// ---------- Service ----------

export class CostService {
  private prisma?: PrismaClient;

  constructor(prisma?: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * Calculate 3-year TCO for a single option (pure function).
   *
   * Year 1: upfront + (monthly x 12) + (teamSize x hourlyRate x 160 x months)
   * Year 2: (monthly x 12 x scalingFactor) + maintenance (15% of year-1)
   * Year 3: (monthly x 12 x scalingFactor^2) + maintenance
   */
  calculateTCO(option: TcoOption): TcoResult {
    const year1Upfront = option.upfrontCost;
    const year1Infra = option.monthlyCost * 12;
    const year1Dev = option.teamSize * option.hourlyRate * 160 * option.months;
    const year1Total = year1Upfront + year1Infra + year1Dev;

    const maintenance = Math.round(year1Total * 0.15);

    const year2Infra = Math.round(option.monthlyCost * 12 * option.scalingFactor);
    const year2Total = year2Infra + maintenance;

    const year3Infra = Math.round(
      option.monthlyCost * 12 * option.scalingFactor * option.scalingFactor
    );
    const year3Total = year3Infra + maintenance;

    const years: YearBreakdown[] = [
      {
        year: 1,
        upfront: year1Upfront,
        infrastructure: year1Infra,
        development: year1Dev,
        maintenance: 0,
        total: year1Total,
      },
      {
        year: 2,
        upfront: 0,
        infrastructure: year2Infra,
        development: 0,
        maintenance,
        total: year2Total,
      },
      {
        year: 3,
        upfront: 0,
        infrastructure: year3Infra,
        development: 0,
        maintenance,
        total: year3Total,
      },
    ];

    return {
      name: option.name,
      totalCost: year1Total + year2Total + year3Total,
      years,
    };
  }

  /**
   * Compare multiple TCO options side by side and identify cheapest.
   */
  compareOptions(options: TcoOption[]): TcoComparison {
    const results = options.map((opt) => this.calculateTCO(opt));

    const cheapest = results.reduce((min, curr) =>
      curr.totalCost < min.totalCost ? curr : min
    );

    return {
      options: results,
      cheapest: cheapest.name,
    };
  }

  // ---------- DB-backed methods ----------

  private requirePrisma(): PrismaClient {
    if (!this.prisma) {
      throw new Error('PrismaClient is required for this operation');
    }
    return this.prisma;
  }

  /**
   * Create a TCO comparison, calculate projections, and persist.
   */
  async createComparison(
    userId: string,
    title: string,
    options: TcoOption[]
  ): Promise<{
    id: string;
    title: string;
    projections: TcoComparison;
    createdAt: Date;
  }> {
    const prisma = this.requirePrisma();
    const projections = this.compareOptions(options);

    const record = await prisma.tcoComparison.create({
      data: {
        userId,
        title,
        options: options as unknown as Record<string, unknown>[],
        projections: projections as unknown as Record<string, unknown>,
      },
    });

    return {
      id: record.id,
      title: record.title,
      projections,
      createdAt: record.createdAt,
    };
  }

  /**
   * Get a single TCO comparison by ID, scoped to the user.
   */
  async getComparison(
    id: string,
    userId: string
  ): Promise<{
    id: string;
    title: string;
    options: TcoOption[];
    projections: TcoComparison;
    createdAt: Date;
  } | null> {
    const prisma = this.requirePrisma();

    const record = await prisma.tcoComparison.findFirst({
      where: { id, userId },
    });

    if (!record) return null;

    return {
      id: record.id,
      title: record.title,
      options: record.options as unknown as TcoOption[],
      projections: record.projections as unknown as TcoComparison,
      createdAt: record.createdAt,
    };
  }

  /**
   * List all TCO comparisons for a user.
   */
  async listComparisons(
    userId: string
  ): Promise<
    Array<{ id: string; title: string; createdAt: Date }>
  > {
    const prisma = this.requirePrisma();

    const records = await prisma.tcoComparison.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: { id: true, title: true, createdAt: true },
    });

    return records;
  }
}
