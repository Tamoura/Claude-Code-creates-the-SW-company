import {
  getApp,
  closeApp,
  cleanDatabase,
  createTestUser,
  authHeaders,
  getPrisma,
} from './helpers';

beforeEach(async () => {
  await cleanDatabase();
});

afterAll(async () => {
  await cleanDatabase();
  await closeApp();
});

describe('Repost Module', () => {
  describe('POST /api/v1/feed/posts/:id/repost', () => {
    it('reposts a post and returns 201', async () => {
      const app = await getApp();
      const author = await createTestUser(app, {
        email: 'repostauthor@test.com',
      });
      const reposter = await createTestUser(app, {
        email: 'reposter@test.com',
      });

      // Create a post
      const postRes = await app.inject({
        method: 'POST',
        url: '/api/v1/feed/posts',
        headers: authHeaders(author.accessToken),
        payload: { content: 'Original post content' },
      });
      const postId = JSON.parse(postRes.body).data.id;

      // Repost it
      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/feed/posts/${postId}/repost`,
        headers: authHeaders(reposter.accessToken),
        payload: {},
      });

      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(body.data.originalPostId).toBe(postId);
      expect(body.data.repostCount).toBe(1);
    });

    it('reposts with optional comment', async () => {
      const app = await getApp();
      const author = await createTestUser(app, {
        email: 'repostcommentauthor@test.com',
      });
      const reposter = await createTestUser(app, {
        email: 'repostcommenter@test.com',
      });

      const postRes = await app.inject({
        method: 'POST',
        url: '/api/v1/feed/posts',
        headers: authHeaders(author.accessToken),
        payload: { content: 'Great insight here' },
      });
      const postId = JSON.parse(postRes.body).data.id;

      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/feed/posts/${postId}/repost`,
        headers: authHeaders(reposter.accessToken),
        payload: { comment: 'Totally agree with this!' },
      });

      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res.body);
      expect(body.data.comment).toBe('Totally agree with this!');
    });

    it('is idempotent (reposting twice returns same repost)', async () => {
      const app = await getApp();
      const author = await createTestUser(app, {
        email: 'idemauthor@test.com',
      });
      const reposter = await createTestUser(app, {
        email: 'idemposter@test.com',
      });

      const postRes = await app.inject({
        method: 'POST',
        url: '/api/v1/feed/posts',
        headers: authHeaders(author.accessToken),
        payload: { content: 'Idem post' },
      });
      const postId = JSON.parse(postRes.body).data.id;

      await app.inject({
        method: 'POST',
        url: `/api/v1/feed/posts/${postId}/repost`,
        headers: authHeaders(reposter.accessToken),
        payload: {},
      });

      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/feed/posts/${postId}/repost`,
        headers: authHeaders(reposter.accessToken),
        payload: {},
      });

      expect(res.statusCode).toBe(201);

      // Verify only one repost record
      const db = getPrisma();
      const reposts = await db.repost.findMany({
        where: { originalPostId: postId, userId: reposter.id },
      });
      expect(reposts).toHaveLength(1);
    });

    it('increments repostCount on original post', async () => {
      const app = await getApp();
      const author = await createTestUser(app, {
        email: 'countauthor@test.com',
      });
      const r1 = await createTestUser(app, {
        email: 'counter1@test.com',
      });
      const r2 = await createTestUser(app, {
        email: 'counter2@test.com',
      });

      const postRes = await app.inject({
        method: 'POST',
        url: '/api/v1/feed/posts',
        headers: authHeaders(author.accessToken),
        payload: { content: 'Count my reposts' },
      });
      const postId = JSON.parse(postRes.body).data.id;

      await app.inject({
        method: 'POST',
        url: `/api/v1/feed/posts/${postId}/repost`,
        headers: authHeaders(r1.accessToken),
        payload: {},
      });
      await app.inject({
        method: 'POST',
        url: `/api/v1/feed/posts/${postId}/repost`,
        headers: authHeaders(r2.accessToken),
        payload: {},
      });

      const db = getPrisma();
      const post = await db.post.findUnique({
        where: { id: postId },
      });
      expect(post!.repostCount).toBe(2);
    });

    it('returns 404 for non-existent post', async () => {
      const app = await getApp();
      const user = await createTestUser(app, {
        email: 'repost404@test.com',
      });

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/feed/posts/00000000-0000-0000-0000-000000000001/repost',
        headers: authHeaders(user.accessToken),
        payload: {},
      });

      expect(res.statusCode).toBe(404);
    });

    it('rejects unauthenticated request with 401', async () => {
      const app = await getApp();

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/feed/posts/00000000-0000-0000-0000-000000000001/repost',
        payload: {},
      });

      expect(res.statusCode).toBe(401);
    });
  });

  describe('DELETE /api/v1/feed/posts/:id/repost', () => {
    it('removes a repost and decrements count', async () => {
      const app = await getApp();
      const author = await createTestUser(app, {
        email: 'delrepostauthor@test.com',
      });
      const reposter = await createTestUser(app, {
        email: 'delreposter@test.com',
      });

      const postRes = await app.inject({
        method: 'POST',
        url: '/api/v1/feed/posts',
        headers: authHeaders(author.accessToken),
        payload: { content: 'Delete repost test' },
      });
      const postId = JSON.parse(postRes.body).data.id;

      // Repost then remove
      await app.inject({
        method: 'POST',
        url: `/api/v1/feed/posts/${postId}/repost`,
        headers: authHeaders(reposter.accessToken),
        payload: {},
      });

      const res = await app.inject({
        method: 'DELETE',
        url: `/api/v1/feed/posts/${postId}/repost`,
        headers: authHeaders(reposter.accessToken),
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.data.repostCount).toBe(0);

      // Verify DB
      const db = getPrisma();
      const reposts = await db.repost.findMany({
        where: { originalPostId: postId, userId: reposter.id },
      });
      expect(reposts).toHaveLength(0);
    });

    it('is idempotent (removing non-existent repost returns 200)', async () => {
      const app = await getApp();
      const author = await createTestUser(app, {
        email: 'delidemauthor@test.com',
      });
      const user = await createTestUser(app, {
        email: 'delidemuser@test.com',
      });

      const postRes = await app.inject({
        method: 'POST',
        url: '/api/v1/feed/posts',
        headers: authHeaders(author.accessToken),
        payload: { content: 'Idempotent unrepost' },
      });
      const postId = JSON.parse(postRes.body).data.id;

      const res = await app.inject({
        method: 'DELETE',
        url: `/api/v1/feed/posts/${postId}/repost`,
        headers: authHeaders(user.accessToken),
      });

      expect(res.statusCode).toBe(200);
    });
  });
});
