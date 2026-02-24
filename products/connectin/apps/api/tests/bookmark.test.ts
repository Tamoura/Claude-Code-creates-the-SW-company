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
let user: TestUser;

beforeAll(async () => {
  app = await getApp();
  await cleanDatabase();
  user = await createTestUser(app);
});

afterAll(async () => {
  await cleanDatabase();
  await closeApp();
});

async function createPost(token: string): Promise<string> {
  const res = await app.inject({
    method: 'POST',
    url: '/api/v1/feed/posts',
    headers: authHeaders(token),
    payload: { content: 'Bookmark test post ' + Date.now() },
  });
  return JSON.parse(res.body).data.id;
}

describe('Bookmarks API', () => {
  describe('POST /api/v1/bookmarks', () => {
    it('should bookmark a post', async () => {
      const postId = await createPost(user.accessToken);

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/bookmarks',
        headers: authHeaders(user.accessToken),
        payload: { postId },
      });

      expect(res.statusCode).toBe(201);
      const json = JSON.parse(res.body);
      expect(json.data.id).toBeDefined();
      expect(json.data.postId).toBe(postId);
    });

    it('should be idempotent for same post', async () => {
      const postId = await createPost(user.accessToken);

      await app.inject({
        method: 'POST',
        url: '/api/v1/bookmarks',
        headers: authHeaders(user.accessToken),
        payload: { postId },
      });

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/bookmarks',
        headers: authHeaders(user.accessToken),
        payload: { postId },
      });

      expect(res.statusCode).toBe(200);
    });

    it('should require authentication', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/bookmarks',
        payload: { postId: '00000000-0000-0000-0000-000000000000' },
      });

      expect(res.statusCode).toBe(401);
    });

    it('should reject bookmarking a non-existent post', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/bookmarks',
        headers: authHeaders(user.accessToken),
        payload: { postId: '00000000-0000-0000-0000-000000000000' },
      });

      expect(res.statusCode).toBe(404);
    });
  });

  describe('GET /api/v1/bookmarks', () => {
    it('should list bookmarked posts', async () => {
      const postId = await createPost(user.accessToken);

      await app.inject({
        method: 'POST',
        url: '/api/v1/bookmarks',
        headers: authHeaders(user.accessToken),
        payload: { postId },
      });

      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/bookmarks',
        headers: authHeaders(user.accessToken),
      });

      expect(res.statusCode).toBe(200);
      const json = JSON.parse(res.body);
      expect(json.data.length).toBeGreaterThan(0);
      expect(json.data[0].postId).toBeDefined();
    });
  });

  describe('DELETE /api/v1/bookmarks/:id', () => {
    it('should remove a bookmark', async () => {
      const postId = await createPost(user.accessToken);

      const createRes = await app.inject({
        method: 'POST',
        url: '/api/v1/bookmarks',
        headers: authHeaders(user.accessToken),
        payload: { postId },
      });

      const bookmarkId = JSON.parse(createRes.body).data.id;

      const res = await app.inject({
        method: 'DELETE',
        url: `/api/v1/bookmarks/${bookmarkId}`,
        headers: authHeaders(user.accessToken),
      });

      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res.body).data.deleted).toBe(true);
    });

    it('should return 404 for non-existent bookmark', async () => {
      const res = await app.inject({
        method: 'DELETE',
        url: '/api/v1/bookmarks/00000000-0000-0000-0000-000000000000',
        headers: authHeaders(user.accessToken),
      });

      expect(res.statusCode).toBe(404);
    });
  });
});
