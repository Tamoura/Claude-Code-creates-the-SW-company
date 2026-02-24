import { PrismaClient } from '@prisma/client';

interface AdvancedSearchParams {
  q: string;
  type: 'people' | 'jobs';
  location?: string;
  workType?: string;
  experienceLevel?: string;
  company?: string;
  page?: string;
  limit?: string;
}

export class AdvancedSearchService {
  constructor(private readonly prisma: PrismaClient) {}

  async search(params: AdvancedSearchParams) {
    const limit = Math.min(50, parseInt(params.limit || '20', 10) || 20);
    const page = Math.max(1, parseInt(params.page || '1', 10) || 1);
    const offset = (page - 1) * limit;

    if (params.type === 'people') {
      return this.searchPeople(params, limit, offset);
    }
    return this.searchJobs(params, limit, offset);
  }

  private async searchPeople(params: AdvancedSearchParams, limit: number, offset: number) {
    const pattern = `%${params.q}%`;
    const locationPattern = params.location ? `%${params.location}%` : null;

    let query = `
      SELECT
        u.id,
        u.display_name AS "displayName",
        p.headline_en AS "headlineEn",
        p.headline_ar AS "headlineAr",
        p.avatar_url AS "avatarUrl",
        p.location
      FROM users u
      LEFT JOIN profiles p ON p.user_id = u.id
      WHERE u.status = 'ACTIVE'
        AND (
          u.display_name ILIKE $1
          OR p.headline_en ILIKE $1
          OR p.headline_ar ILIKE $1
          OR p.summary_en ILIKE $1
        )
    `;
    const queryParams: any[] = [pattern];
    let paramIdx = 2;

    if (locationPattern) {
      query += ` AND p.location ILIKE $${paramIdx}`;
      queryParams.push(locationPattern);
      paramIdx++;
    }

    // Count query
    const countQuery = `SELECT COUNT(*) as total FROM (${query}) sub`;
    const countResult = await this.prisma.$queryRawUnsafe<[{ total: bigint }]>(countQuery, ...queryParams);
    const total = Number(countResult[0].total);

    query += ` ORDER BY u.display_name ASC LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`;
    queryParams.push(limit, offset);

    const results = await this.prisma.$queryRawUnsafe<any[]>(query, ...queryParams);

    return {
      results,
      total,
      page: Math.floor(offset / limit) + 1,
      totalPages: Math.ceil(total / limit),
    };
  }

  private async searchJobs(params: AdvancedSearchParams, limit: number, offset: number) {
    const pattern = `%${params.q}%`;
    const queryParams: any[] = [pattern];
    let paramIdx = 2;

    let conditions = `
      j.status = 'OPEN'
      AND (
        j.title ILIKE $1
        OR j.company ILIKE $1
        OR j.description ILIKE $1
      )
    `;

    if (params.location) {
      conditions += ` AND j.location ILIKE $${paramIdx}`;
      queryParams.push(`%${params.location}%`);
      paramIdx++;
    }
    if (params.workType) {
      conditions += ` AND j.work_type::text = $${paramIdx}`;
      queryParams.push(params.workType);
      paramIdx++;
    }
    if (params.experienceLevel) {
      conditions += ` AND j.experience_level::text = $${paramIdx}`;
      queryParams.push(params.experienceLevel);
      paramIdx++;
    }
    if (params.company) {
      conditions += ` AND j.company ILIKE $${paramIdx}`;
      queryParams.push(`%${params.company}%`);
      paramIdx++;
    }

    const baseQuery = `FROM jobs j WHERE ${conditions}`;
    const countResult = await this.prisma.$queryRawUnsafe<[{ total: bigint }]>(
      `SELECT COUNT(*) as total ${baseQuery}`, ...queryParams
    );
    const total = Number(countResult[0].total);

    const selectQuery = `
      SELECT
        j.id,
        j.title,
        j.company,
        j.location,
        j.work_type AS "workType",
        j.experience_level AS "experienceLevel",
        j.salary_min AS "salaryMin",
        j.salary_max AS "salaryMax",
        j.salary_currency AS "salaryCurrency",
        j.created_at AS "createdAt"
      ${baseQuery}
      ORDER BY j.created_at DESC
      LIMIT $${paramIdx} OFFSET $${paramIdx + 1}
    `;
    queryParams.push(limit, offset);

    const results = await this.prisma.$queryRawUnsafe<any[]>(selectQuery, ...queryParams);

    return {
      results,
      total,
      page: Math.floor(offset / limit) + 1,
      totalPages: Math.ceil(total / limit),
    };
  }
}
