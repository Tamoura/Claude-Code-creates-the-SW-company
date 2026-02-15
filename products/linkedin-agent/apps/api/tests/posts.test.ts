import { FastifyInstance } from 'fastify';
import { PrismaClient } from '@prisma/client';
import {
  buildTestApp,
  cleanDB,
  getTestPrisma,
  disconnectTestPrisma,
} from './setup';

describe('Posts CRUD endpoints', () => {
  let app: FastifyInstance;
  let prisma: PrismaClient;

  beforeAll(async () => {
    app = await buildTestApp();
    prisma = getTestPrisma();
  });

  beforeEach(async () => {
    await cleanDB();
  });

  afterAll(async () => {
    await app.close();
    await disconnectTestPrisma();
  });

  // ----- helpers -----

  async function seedPost(overrides: Record<string, unknown> = {}) {
    return prisma.postDraft.create({
      data: {
        title: 'Test Post',
        content: 'Some content for testing',
        format: 'text',
        status: 'draft',
        tags: ['#test'],
        tone: 'professional',
        targetAudience: 'developers',
        ...overrides,
      },
    });
  }

  // ===== GET /api/posts =====

  describe('GET /api/posts', () => {
    it('returns empty data array and pagination when no posts exist', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/posts',
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

    it('returns a seeded post', async () => {
      const post = await seedPost();

      const res = await app.inject({
        method: 'GET',
        url: '/api/posts',
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.data).toHaveLength(1);
      expect(body.data[0].id).toBe(post.id);
      expect(body.data[0].title).toBe('Test Post');
      expect(body.pagination.total).toBe(1);
    });

    it('filters by status', async () => {
      await seedPost({ status: 'draft' });
      await seedPost({ title: 'Published', status: 'published' });

      const res = await app.inject({
        method: 'GET',
        url: '/api/posts?status=published',
      });

      const body = res.json();
      expect(body.data).toHaveLength(1);
      expect(body.data[0].title).toBe('Published');
    });

    it('filters by format', async () => {
      await seedPost({ format: 'text' });
      await seedPost({ title: 'Carousel Post', format: 'carousel' });

      const res = await app.inject({
        method: 'GET',
        url: '/api/posts?format=carousel',
      });

      const body = res.json();
      expect(body.data).toHaveLength(1);
      expect(body.data[0].title).toBe('Carousel Post');
    });

    it('paginates correctly', async () => {
      // Seed 3 posts
      await seedPost({ title: 'Post 1' });
      await seedPost({ title: 'Post 2' });
      await seedPost({ title: 'Post 3' });

      const res = await app.inject({
        method: 'GET',
        url: '/api/posts?page=1&limit=2',
      });

      const body = res.json();
      expect(body.data).toHaveLength(2);
      expect(body.pagination.total).toBe(3);
      expect(body.pagination.totalPages).toBe(2);
    });
  });

  // ===== GET /api/posts/:id =====

  describe('GET /api/posts/:id', () => {
    it('returns 404 for non-existent post', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/posts/nonexistent-id-123',
      });

      expect(res.statusCode).toBe(404);
      const body = res.json();
      expect(body.status).toBe(404);
      expect(body.title).toBe('Not Found');
    });

    it('returns a seeded post wrapped in { data }', async () => {
      const post = await seedPost();

      const res = await app.inject({
        method: 'GET',
        url: `/api/posts/${post.id}`,
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.data).toBeDefined();
      expect(body.data.id).toBe(post.id);
      expect(body.data.title).toBe('Test Post');
      expect(body.data.content).toBe('Some content for testing');
    });

    it('includes related carouselSlides and generationLogs', async () => {
      const post = await seedPost();

      const res = await app.inject({
        method: 'GET',
        url: `/api/posts/${post.id}`,
      });

      const body = res.json();
      expect(body.data.carouselSlides).toEqual([]);
      expect(body.data.generationLogs).toEqual([]);
    });
  });

  // ===== PATCH /api/posts/:id =====

  describe('PATCH /api/posts/:id', () => {
    it('returns 404 for non-existent post', async () => {
      const res = await app.inject({
        method: 'PATCH',
        url: '/api/posts/nonexistent-id-123',
        payload: { title: 'Updated' },
      });

      expect(res.statusCode).toBe(404);
    });

    it('updates the title', async () => {
      const post = await seedPost();

      const res = await app.inject({
        method: 'PATCH',
        url: `/api/posts/${post.id}`,
        payload: { title: 'Updated Title' },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.data.title).toBe('Updated Title');
    });

    it('updates the status', async () => {
      const post = await seedPost();

      const res = await app.inject({
        method: 'PATCH',
        url: `/api/posts/${post.id}`,
        payload: { status: 'review' },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.data.status).toBe('review');
    });

    it('updates tags', async () => {
      const post = await seedPost();

      const res = await app.inject({
        method: 'PATCH',
        url: `/api/posts/${post.id}`,
        payload: { tags: ['#updated', '#new'] },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.data.tags).toEqual(['#updated', '#new']);
    });

    it('sets publishedAt when status changes to published', async () => {
      const post = await seedPost({ status: 'draft' });

      const res = await app.inject({
        method: 'PATCH',
        url: `/api/posts/${post.id}`,
        payload: { status: 'published' },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.data.publishedAt).not.toBeNull();
    });

    it('returns 422 for invalid status value', async () => {
      const post = await seedPost();

      const res = await app.inject({
        method: 'PATCH',
        url: `/api/posts/${post.id}`,
        payload: { status: 'invalid_status' },
      });

      expect(res.statusCode).toBe(422);
      const body = res.json();
      expect(body.title).toBe('Validation Error');
    });

    it('returns 422 for invalid format value', async () => {
      const post = await seedPost();

      const res = await app.inject({
        method: 'PATCH',
        url: `/api/posts/${post.id}`,
        payload: { format: 'not_a_format' },
      });

      expect(res.statusCode).toBe(422);
    });
  });

  // ===== DELETE /api/posts/:id =====

  describe('DELETE /api/posts/:id', () => {
    it('returns 404 for non-existent post', async () => {
      const res = await app.inject({
        method: 'DELETE',
        url: '/api/posts/nonexistent-id-123',
      });

      expect(res.statusCode).toBe(404);
    });

    it('deletes an existing post and returns 204', async () => {
      const post = await seedPost();

      const res = await app.inject({
        method: 'DELETE',
        url: `/api/posts/${post.id}`,
      });

      expect(res.statusCode).toBe(204);

      // Verify it's gone
      const check = await app.inject({
        method: 'GET',
        url: `/api/posts/${post.id}`,
      });
      expect(check.statusCode).toBe(404);
    });

    it('removes the post from the listing', async () => {
      const post = await seedPost();

      await app.inject({
        method: 'DELETE',
        url: `/api/posts/${post.id}`,
      });

      const res = await app.inject({
        method: 'GET',
        url: '/api/posts',
      });

      const body = res.json();
      expect(body.data).toHaveLength(0);
      expect(body.pagination.total).toBe(0);
    });
  });
});
