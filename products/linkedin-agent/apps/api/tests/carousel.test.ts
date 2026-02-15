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

const fakeCarouselResponse = {
  slides: [
    {
      slideNumber: 1,
      headline: 'Hook Slide',
      body: 'This is the attention-grabbing opening slide.',
      imagePrompt: 'Professional banner about AI technology',
    },
    {
      slideNumber: 2,
      headline: 'Key Point',
      body: 'Here is the main insight from the post.',
      imagePrompt: 'Clean diagram showing AI workflow',
    },
    {
      slideNumber: 3,
      headline: 'Call to Action',
      body: 'Follow for more AI insights and tips.',
      imagePrompt: 'Motivational professional closing slide',
    },
  ],
};

beforeAll(() => {
  global.fetch = jest.fn().mockImplementation((url: string) => {
    if (url.includes('openrouter.ai')) {
      return Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            id: 'test-id',
            model: 'anthropic/claude-sonnet-4-5-20250929',
            choices: [
              {
                message: {
                  role: 'assistant',
                  content: JSON.stringify(fakeCarouselResponse),
                },
                finish_reason: 'stop',
              },
            ],
            usage: {
              prompt_tokens: 200,
              completion_tokens: 150,
              total_tokens: 350,
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

describe('Carousel endpoints', () => {
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
              model: 'anthropic/claude-sonnet-4-5-20250929',
              choices: [
                {
                  message: {
                    role: 'assistant',
                    content: JSON.stringify(fakeCarouselResponse),
                  },
                  finish_reason: 'stop',
                },
              ],
              usage: {
                prompt_tokens: 200,
                completion_tokens: 150,
                total_tokens: 350,
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

  // ----- helpers -----

  async function seedPost(overrides: Record<string, unknown> = {}) {
    return prisma.postDraft.create({
      data: {
        title: 'AI Trends Post',
        content:
          'A detailed article about how AI is transforming industries worldwide.',
        format: 'text',
        status: 'draft',
        tags: ['#AI', '#Technology'],
        tone: 'professional',
        targetAudience: 'tech leaders',
        ...overrides,
      },
    });
  }

  // ===== POST /api/posts/:id/carousel =====

  describe('POST /api/posts/:id/carousel', () => {
    it('returns 404 for nonexistent post', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/posts/nonexistent-id-123/carousel',
        payload: {},
      });

      expect(res.statusCode).toBe(404);
      const body = res.json();
      expect(body.status).toBe(404);
      expect(body.title).toBe('Not Found');
      expect(body.detail).toContain('nonexistent-id-123');
    });

    it('generates slides with mocked LLM', async () => {
      const post = await seedPost();

      const res = await app.inject({
        method: 'POST',
        url: `/api/posts/${post.id}/carousel`,
        payload: { slideCount: 3 },
      });

      expect(res.statusCode).toBe(201);
      const body = res.json();

      // Verify slide data
      expect(body.data).toHaveLength(3);
      expect(body.data[0].headline).toBe('Hook Slide');
      expect(body.data[0].slideNumber).toBe(1);
      expect(body.data[1].headline).toBe('Key Point');
      expect(body.data[2].headline).toBe('Call to Action');

      // Verify usage info
      expect(body.usage).toBeDefined();
      expect(body.usage.model).toBe('anthropic/claude-sonnet-4-5-20250929');
      expect(typeof body.usage.costUsd).toBe('number');
      expect(typeof body.usage.durationMs).toBe('number');
    });

    it('stores slides in database', async () => {
      const post = await seedPost();

      const res = await app.inject({
        method: 'POST',
        url: `/api/posts/${post.id}/carousel`,
        payload: {},
      });

      expect(res.statusCode).toBe(201);

      // Verify slides were persisted
      const dbSlides = await prisma.carouselSlide.findMany({
        where: { postDraftId: post.id },
        orderBy: { slideNumber: 'asc' },
      });
      expect(dbSlides).toHaveLength(3);
      expect(dbSlides[0].headline).toBe('Hook Slide');
      expect(dbSlides[0].body).toBe(
        'This is the attention-grabbing opening slide.'
      );
      expect(dbSlides[1].slideNumber).toBe(2);
      expect(dbSlides[2].slideNumber).toBe(3);
    });

    it('updates post format to carousel', async () => {
      const post = await seedPost();

      await app.inject({
        method: 'POST',
        url: `/api/posts/${post.id}/carousel`,
        payload: {},
      });

      // Verify the post format was updated
      const updatedPost = await prisma.postDraft.findUnique({
        where: { id: post.id },
      });
      expect(updatedPost!.format).toBe('carousel');
      expect(updatedPost!.formatReason).toContain('3-slide carousel');
    });

    it('creates a GenerationLog in database', async () => {
      const post = await seedPost();

      await app.inject({
        method: 'POST',
        url: `/api/posts/${post.id}/carousel`,
        payload: {},
      });

      const logs = await prisma.generationLog.findMany({
        where: { postDraftId: post.id },
      });
      expect(logs).toHaveLength(1);
      expect(logs[0].taskType).toBe('writing');
      expect(logs[0].promptTokens).toBe(200);
      expect(logs[0].completionTokens).toBe(150);
    });

    it('replaces existing slides on regeneration', async () => {
      const post = await seedPost();

      // Generate carousel first time
      await app.inject({
        method: 'POST',
        url: `/api/posts/${post.id}/carousel`,
        payload: {},
      });

      // Generate again (should replace)
      const res = await app.inject({
        method: 'POST',
        url: `/api/posts/${post.id}/carousel`,
        payload: {},
      });

      expect(res.statusCode).toBe(201);

      // There should still be only 3 slides, not 6
      const dbSlides = await prisma.carouselSlide.findMany({
        where: { postDraftId: post.id },
      });
      expect(dbSlides).toHaveLength(3);
    });
  });

  // ===== GET /api/posts/:id/carousel =====

  describe('GET /api/posts/:id/carousel', () => {
    it('returns 404 for nonexistent post', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/posts/nonexistent-id-123/carousel',
      });

      expect(res.statusCode).toBe(404);
      const body = res.json();
      expect(body.status).toBe(404);
      expect(body.title).toBe('Not Found');
    });

    it('returns empty slides for post without carousel', async () => {
      const post = await seedPost();

      const res = await app.inject({
        method: 'GET',
        url: `/api/posts/${post.id}/carousel`,
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.postDraft).toBeDefined();
      expect(body.postDraft.id).toBe(post.id);
      expect(body.postDraft.title).toBe('AI Trends Post');
      expect(body.data).toEqual([]);
      expect(body.slideCount).toBe(0);
    });

    it('returns slides after generation', async () => {
      const post = await seedPost();

      // Generate carousel first
      await app.inject({
        method: 'POST',
        url: `/api/posts/${post.id}/carousel`,
        payload: { slideCount: 3 },
      });

      // Now GET the slides
      const res = await app.inject({
        method: 'GET',
        url: `/api/posts/${post.id}/carousel`,
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();

      expect(body.postDraft.id).toBe(post.id);
      expect(body.postDraft.format).toBe('carousel');
      expect(body.data).toHaveLength(3);
      expect(body.slideCount).toBe(3);

      // Slides should be ordered by slideNumber
      expect(body.data[0].slideNumber).toBe(1);
      expect(body.data[0].headline).toBe('Hook Slide');
      expect(body.data[1].slideNumber).toBe(2);
      expect(body.data[2].slideNumber).toBe(3);
    });
  });
});
