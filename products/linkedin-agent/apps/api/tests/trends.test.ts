import { FastifyInstance } from 'fastify';
import { PrismaClient } from '@prisma/client';
import {
  buildTestApp,
  cleanDB,
  getTestPrisma,
  disconnectTestPrisma,
} from './setup';

// Mock global fetch so we never call the real OpenRouter API
const originalFetch = global.fetch;

const fakeTrendAnalysis = {
  overallTheme: 'AI Technology Trends',
  topics: [
    {
      title: 'LLMs',
      description: 'Large language models are transforming industries',
      relevance: 90,
      suggestedAngle: 'Compare models',
    },
  ],
  recommendedTags: ['#AI', '#LLM'],
};

beforeAll(() => {
  global.fetch = jest.fn().mockImplementation((url: string) => {
    if (url.includes('openrouter.ai')) {
      return Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            id: 'test-id',
            model: 'google/gemini-2.0-flash-001',
            choices: [
              {
                message: {
                  role: 'assistant',
                  content: JSON.stringify(fakeTrendAnalysis),
                },
                finish_reason: 'stop',
              },
            ],
            usage: {
              prompt_tokens: 100,
              completion_tokens: 50,
              total_tokens: 150,
            },
          }),
      });
    }
    return originalFetch(url);
  });
});

afterAll(() => {
  global.fetch = originalFetch;
});

describe('Trends endpoints', () => {
  let app: FastifyInstance;
  let prisma: PrismaClient;

  beforeAll(async () => {
    app = await buildTestApp();
    prisma = getTestPrisma();
  });

  beforeEach(async () => {
    await cleanDB();
    (global.fetch as jest.Mock).mockClear();
    // Restore the default mock after clearing
    (global.fetch as jest.Mock).mockImplementation((url: string) => {
      if (url.includes('openrouter.ai')) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              id: 'test-id',
              model: 'google/gemini-2.0-flash-001',
              choices: [
                {
                  message: {
                    role: 'assistant',
                    content: JSON.stringify(fakeTrendAnalysis),
                  },
                  finish_reason: 'stop',
                },
              ],
              usage: {
                prompt_tokens: 100,
                completion_tokens: 50,
                total_tokens: 150,
              },
            }),
        });
      }
      return originalFetch(url);
    });
  });

  afterAll(async () => {
    await app.close();
    await disconnectTestPrisma();
  });

  // ===== POST /api/trends/analyze =====

  describe('POST /api/trends/analyze', () => {
    it('requires content field (validation error)', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/trends/analyze',
        payload: {},
      });

      expect(res.statusCode).toBe(422);
      const body = res.json();
      expect(body.title).toBe('Validation Error');
    });

    it('rejects content shorter than 10 characters', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/trends/analyze',
        payload: { content: 'short' },
      });

      expect(res.statusCode).toBe(422);
      const body = res.json();
      expect(body.title).toBe('Validation Error');
    });

    it('returns analysis with mocked LLM response', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/trends/analyze',
        payload: {
          content:
            'Artificial intelligence and large language models are reshaping the tech industry in 2025.',
        },
      });

      expect(res.statusCode).toBe(201);
      const body = res.json();

      // Verify analysis structure
      expect(body.analysis).toBeDefined();
      expect(body.analysis.overallTheme).toBe('AI Technology Trends');
      expect(body.analysis.topics).toHaveLength(1);
      expect(body.analysis.topics[0].title).toBe('LLMs');
      expect(body.analysis.recommendedTags).toEqual(['#AI', '#LLM']);

      // Verify usage info
      expect(body.usage).toBeDefined();
      expect(body.usage.model).toBe('google/gemini-2.0-flash-001');
      expect(body.usage.promptTokens).toBe(100);
      expect(body.usage.completionTokens).toBe(50);
    });

    it('creates TrendSource in database', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/trends/analyze',
        payload: {
          content:
            'Artificial intelligence and large language models are reshaping the tech industry in 2025.',
          title: 'AI Trends 2025',
          platform: 'linkedin',
        },
      });

      expect(res.statusCode).toBe(201);
      const body = res.json();

      // Verify the trend source was persisted
      expect(body.trendSource).toBeDefined();
      expect(body.trendSource.id).toBeDefined();
      expect(body.trendSource.title).toBe('AI Trends 2025');
      expect(body.trendSource.platform).toBe('linkedin');
      expect(body.trendSource.tags).toEqual(['#AI', '#LLM']);

      // Also verify directly in the database
      const dbRecord = await prisma.trendSource.findUnique({
        where: { id: body.trendSource.id },
      });
      expect(dbRecord).not.toBeNull();
      expect(dbRecord!.title).toBe('AI Trends 2025');
      expect(dbRecord!.platform).toBe('linkedin');
    });

    it('creates a GenerationLog in database', async () => {
      await app.inject({
        method: 'POST',
        url: '/api/trends/analyze',
        payload: {
          content:
            'Artificial intelligence and large language models are reshaping the tech industry in 2025.',
        },
      });

      const logs = await prisma.generationLog.findMany();
      expect(logs).toHaveLength(1);
      expect(logs[0].taskType).toBe('analysis');
      expect(logs[0].promptTokens).toBe(100);
      expect(logs[0].completionTokens).toBe(50);
    });
  });

  // ===== GET /api/trends =====

  describe('GET /api/trends', () => {
    it('returns empty array initially', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/trends',
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.data).toEqual([]);
      expect(body.pagination).toMatchObject({
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 0,
      });
    });

    it('returns trend sources after creation', async () => {
      // Seed a trend source directly
      await prisma.trendSource.create({
        data: {
          title: 'Seeded Trend',
          content: 'Some trend content for testing purposes.',
          platform: 'hackernews',
          tags: ['#tech'],
        },
      });

      const res = await app.inject({
        method: 'GET',
        url: '/api/trends',
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.data).toHaveLength(1);
      expect(body.data[0].title).toBe('Seeded Trend');
      expect(body.data[0].platform).toBe('hackernews');
      expect(body.pagination.total).toBe(1);
    });

    it('supports pagination (page, limit)', async () => {
      // Seed 3 trend sources
      for (let i = 1; i <= 3; i++) {
        await prisma.trendSource.create({
          data: {
            title: `Trend ${i}`,
            content: `Content for trend number ${i} testing.`,
            platform: 'other',
            tags: [],
          },
        });
      }

      const res = await app.inject({
        method: 'GET',
        url: '/api/trends?page=1&limit=2',
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.data).toHaveLength(2);
      expect(body.pagination).toMatchObject({
        page: 1,
        limit: 2,
        total: 3,
        totalPages: 2,
      });

      // Fetch page 2
      const res2 = await app.inject({
        method: 'GET',
        url: '/api/trends?page=2&limit=2',
      });

      const body2 = res2.json();
      expect(body2.data).toHaveLength(1);
      expect(body2.pagination.page).toBe(2);
    });

    it('filters by platform', async () => {
      await prisma.trendSource.create({
        data: {
          title: 'LinkedIn Trend',
          content: 'Content about LinkedIn trends testing.',
          platform: 'linkedin',
          tags: [],
        },
      });
      await prisma.trendSource.create({
        data: {
          title: 'Twitter Trend',
          content: 'Content about Twitter trends testing.',
          platform: 'twitter',
          tags: [],
        },
      });

      const res = await app.inject({
        method: 'GET',
        url: '/api/trends?platform=linkedin',
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.data).toHaveLength(1);
      expect(body.data[0].title).toBe('LinkedIn Trend');
    });
  });
});
