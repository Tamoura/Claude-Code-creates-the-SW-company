import { PrismaClient } from '@prisma/client';

const MAX_RESULTS = 20;

export interface SearchResults {
  query: string;
  people: PersonResult[];
  posts: PostResult[];
  jobs: JobResult[];
}

export interface PersonResult {
  id: string;
  displayName: string;
  headlineEn: string | null;
  headlineAr: string | null;
  avatarUrl: string | null;
}

export interface PostResult {
  id: string;
  content: string;
  authorId: string;
  authorName: string;
  createdAt: string;
}

export interface JobResult {
  id: string;
  title: string;
  company: string;
  location: string | null;
  workType: string;
  experienceLevel: string;
  createdAt: string;
}

export type SearchType = 'people' | 'posts' | 'jobs';

export class SearchService {
  constructor(private readonly prisma: PrismaClient) {}

  async search(
    query: string,
    type?: SearchType
  ): Promise<SearchResults> {
    const sanitized = query.trim();

    const [people, posts, jobs] = await Promise.all([
      !type || type === 'people' ? this.searchPeople(sanitized) : [],
      !type || type === 'posts' ? this.searchPosts(sanitized) : [],
      !type || type === 'jobs' ? this.searchJobs(sanitized) : [],
    ]);

    return { query: sanitized, people, posts, jobs };
  }

  private async searchPeople(query: string): Promise<PersonResult[]> {
    // Use ILIKE for simple substring matching — works well for names
    // and doesn't require tsvector columns. For scale, migrate to
    // tsvector + GIN index later.
    const pattern = `%${query}%`;

    const results = await this.prisma.$queryRaw<PersonResult[]>`
      SELECT
        u.id,
        u.display_name AS "displayName",
        p.headline_en  AS "headlineEn",
        p.headline_ar  AS "headlineAr",
        p.avatar_url    AS "avatarUrl"
      FROM users u
      LEFT JOIN profiles p ON p.user_id = u.id
      WHERE u.status = 'ACTIVE'
        AND (
          u.display_name ILIKE ${pattern}
          OR p.headline_en ILIKE ${pattern}
          OR p.headline_ar ILIKE ${pattern}
        )
      ORDER BY u.display_name ASC
      LIMIT ${MAX_RESULTS}
    `;

    return results;
  }

  private async searchPosts(query: string): Promise<PostResult[]> {
    const pattern = `%${query}%`;

    const results = await this.prisma.$queryRaw<PostResult[]>`
      SELECT
        po.id,
        po.content,
        po.author_id   AS "authorId",
        u.display_name  AS "authorName",
        po.created_at   AS "createdAt"
      FROM posts po
      JOIN users u ON u.id = po.author_id
      WHERE po.is_deleted = false
        AND po.content ILIKE ${pattern}
      ORDER BY po.created_at DESC
      LIMIT ${MAX_RESULTS}
    `;

    return results;
  }

  private async searchJobs(query: string): Promise<JobResult[]> {
    const pattern = `%${query}%`;

    const results = await this.prisma.$queryRaw<JobResult[]>`
      SELECT
        j.id,
        j.title,
        j.company,
        j.location,
        j.work_type         AS "workType",
        j.experience_level  AS "experienceLevel",
        j.created_at        AS "createdAt"
      FROM jobs j
      WHERE j.status = 'OPEN'
        AND (
          j.title ILIKE ${pattern}
          OR j.company ILIKE ${pattern}
          OR j.description ILIKE ${pattern}
        )
      ORDER BY j.created_at DESC
      LIMIT ${MAX_RESULTS}
    `;

    return results;
  }
}
