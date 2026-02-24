import { FastifyInstance } from 'fastify';
import {
  getApp,
  closeApp,
  cleanDatabase,
  createTestUser,
  authHeaders,
  TestUser,
} from './helpers';

let app: FastifyInstance;
let author: TestUser;
let viewer1: TestUser;
let viewer2: TestUser;
let postId: string;

beforeAll(async () => {
  app = await getApp();
  await cleanDatabase();
  author = await createTestUser(app);
  viewer1 = await createTestUser(app);
  viewer2 = await createTestUser(app);

  // Create a post
  const res = await app.inject({
    method: 'POST',
    url: '/api/v1/feed/posts',
    headers: authHeaders(author.accessToken),
    payload: { content: 'Analytics test post' },
  });
  postId = JSON.parse(res.body).data.id;
});

afterAll(async () => {
  await cleanDatabase();
  await closeApp();
});

describe('Content Analytics API', () => {
  describe('POST /api/v1/feed/posts/:id/view', () => {
    it('should record a post view', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/feed/posts/${postId}/view`,
        headers: authHeaders(viewer1.accessToken),
      });

      expect(res.statusCode).toBe(201);
    });

    it('should allow multiple views from different users', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/feed/posts/${postId}/view`,
        headers: authHeaders(viewer2.accessToken),
      });

      expect(res.statusCode).toBe(201);
    });

    it('should return 404 for non-existent post', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/feed/posts/00000000-0000-0000-0000-000000000000/view',
        headers: authHeaders(viewer1.accessToken),
      });

      expect(res.statusCode).toBe(404);
    });
  });

  describe('GET /api/v1/feed/posts/:id/analytics', () => {
    it('should return analytics for post author', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/feed/posts/${postId}/analytics`,
        headers: authHeaders(author.accessToken),
      });

      expect(res.statusCode).toBe(200);
      const json = JSON.parse(res.body);
      expect(json.data.viewCount).toBeGreaterThanOrEqual(2);
      expect(typeof json.data.reactionCount).toBe('number');
      expect(typeof json.data.commentCount).toBe('number');
    });

    it('should deny analytics to non-authors', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/feed/posts/${postId}/analytics`,
        headers: authHeaders(viewer1.accessToken),
      });

      expect(res.statusCode).toBe(403);
    });

    it('should require authentication', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/feed/posts/${postId}/analytics`,
      });

      expect(res.statusCode).toBe(401);
    });
  });
});
