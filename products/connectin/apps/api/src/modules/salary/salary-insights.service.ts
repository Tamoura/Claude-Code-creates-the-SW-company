import { PrismaClient } from '@prisma/client';

interface SalaryInsightsParams {
  title: string;
  location?: string;
  experienceLevel?: string;
  currency?: string;
}

interface SalaryBreakdown {
  experienceLevel: string;
  jobCount: number;
  avgMin: number;
  avgMax: number;
}

export class SalaryInsightsService {
  constructor(private readonly prisma: PrismaClient) {}

  async getInsights(params: SalaryInsightsParams) {
    const titlePattern = `%${params.title}%`;
    const queryParams: any[] = [titlePattern];
    let paramIdx = 2;

    let conditions = `
      j.status = 'OPEN'
      AND j.salary_min IS NOT NULL
      AND j.salary_max IS NOT NULL
      AND (j.title ILIKE $1 OR j.description ILIKE $1)
    `;

    if (params.location) {
      conditions += ` AND j.location ILIKE $${paramIdx}`;
      queryParams.push(`%${params.location}%`);
      paramIdx++;
    }
    if (params.experienceLevel) {
      conditions += ` AND j.experience_level::text = $${paramIdx}`;
      queryParams.push(params.experienceLevel);
      paramIdx++;
    }

    // Overall aggregation
    const aggQuery = `
      SELECT
        COUNT(*) as "jobCount",
        ROUND(AVG(j.salary_min), 2) as "avgMin",
        ROUND(AVG(j.salary_max), 2) as "avgMax",
        MIN(j.salary_min) as "minSalary",
        MAX(j.salary_max) as "maxSalary",
        COALESCE(MODE() WITHIN GROUP (ORDER BY j.salary_currency), 'USD') as "currency"
      FROM jobs j
      WHERE ${conditions}
    `;

    const aggResult = await this.prisma.$queryRawUnsafe<any[]>(aggQuery, ...queryParams);
    const agg = aggResult[0];

    // Breakdown by experience level
    const breakdownQuery = `
      SELECT
        j.experience_level as "experienceLevel",
        COUNT(*) as "jobCount",
        ROUND(AVG(j.salary_min), 2) as "avgMin",
        ROUND(AVG(j.salary_max), 2) as "avgMax"
      FROM jobs j
      WHERE ${conditions}
      GROUP BY j.experience_level
      ORDER BY j.experience_level
    `;

    const breakdown = await this.prisma.$queryRawUnsafe<SalaryBreakdown[]>(breakdownQuery, ...queryParams);

    return {
      title: params.title,
      jobCount: Number(agg.jobCount),
      avgMin: agg.avgMin ? Number(agg.avgMin) : null,
      avgMax: agg.avgMax ? Number(agg.avgMax) : null,
      minSalary: agg.minSalary ? Number(agg.minSalary) : null,
      maxSalary: agg.maxSalary ? Number(agg.maxSalary) : null,
      currency: agg.currency || 'USD',
      breakdown: breakdown.map((b) => ({
        experienceLevel: b.experienceLevel,
        jobCount: Number(b.jobCount),
        avgMin: Number(b.avgMin),
        avgMax: Number(b.avgMax),
      })),
    };
  }
}
