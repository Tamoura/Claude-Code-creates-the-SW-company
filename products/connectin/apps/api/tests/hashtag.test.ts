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

describe('Hashtag Module', () => {
  describe('Auto-extraction on post creation', () => {
    it('extracts hashtags from post content and creates records', async () => {
      const app = await getApp();
      const user = await createTestUser(app, {
        email: 'hashtag1@test.com',
      });

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/feed/posts',
        headers: authHeaders(user.accessToken),
        payload: {
          content: 'Hello #typescript and #react developers!',
        },
      });

      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res.body);
      expect(body.data.hashtags).toEqual(
        expect.arrayContaining(['typescript', 'react'])
      );
      expect(body.data.hashtags).toHaveLength(2);

      // Verify hashtag records were created in DB
      const db = getPrisma();
      const hashtags = await db.hashtag.findMany();
      expect(hashtags).toHaveLength(2);
      expect(hashtags.map((h: { tag: string }) => h.tag).sort()).toEqual([
        'react',
        'typescript',
      ]);
    });

    it('stores hashtags lowercase (case-insensitive)', async () => {
      const app = await getApp();
      const user = await createTestUser(app, {
        email: 'hashcase@test.com',
      });

      await app.inject({
        method: 'POST',
        url: '/api/v1/feed/posts',
        headers: authHeaders(user.accessToken),
        payload: { content: '#TypeScript is great!' },
      });

      const db = getPrisma();
      const tag = await db.hashtag.findUnique({
        where: { tag: 'typescript' },
      });
      expect(tag).not.toBeNull();
    });

    it('supports Arabic hashtags', async () => {
      const app = await getApp();
      const user = await createTestUser(app, {
        email: 'hasharabic@test.com',
      });

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/feed/posts',
        headers: authHeaders(user.accessToken),
        payload: { content: 'مرحبا #تقنية #برمجة' },
      });

      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res.body);
      expect(body.data.hashtags).toHaveLength(2);
      expect(body.data.hashtags).toContain('تقنية');
    });

    it('increments postCount on hashtag when used in posts', async () => {
      const app = await getApp();
      const user1 = await createTestUser(app, {
        email: 'hashcount1@test.com',
      });
      const user2 = await createTestUser(app, {
        email: 'hashcount2@test.com',
      });

      await app.inject({
        method: 'POST',
        url: '/api/v1/feed/posts',
        headers: authHeaders(user1.accessToken),
        payload: { content: '#javascript rocks' },
      });
      await app.inject({
        method: 'POST',
        url: '/api/v1/feed/posts',
        headers: authHeaders(user2.accessToken),
        payload: { content: 'I love #javascript' },
      });

      const db = getPrisma();
      const tag = await db.hashtag.findUnique({
        where: { tag: 'javascript' },
      });
      expect(tag!.postCount).toBe(2);
    });

    it('deduplicates hashtags within a single post', async () => {
      const app = await getApp();
      const user = await createTestUser(app, {
        email: 'hashdedup@test.com',
      });

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/feed/posts',
        headers: authHeaders(user.accessToken),
        payload: { content: '#react #react #React' },
      });

      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res.body);
      expect(body.data.hashtags).toHaveLength(1);
      expect(body.data.hashtags[0]).toBe('react');
    });
  });

  describe('GET /api/v1/hashtags/trending', () => {
    it('returns hashtags ordered by postCount', async () => {
      const app = await getApp();
      const user = await createTestUser(app, {
        email: 'trending1@test.com',
      });

      // Create posts with different hashtags
      await app.inject({
        method: 'POST',
        url: '/api/v1/feed/posts',
        headers: authHeaders(user.accessToken),
        payload: { content: '#popular and #rare' },
      });
      await app.inject({
        method: 'POST',
        url: '/api/v1/feed/posts',
        headers: authHeaders(user.accessToken),
        payload: { content: '#popular again' },
      });

      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/hashtags/trending',
        headers: authHeaders(user.accessToken),
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(body.data.length).toBeGreaterThanOrEqual(2);
      // First should be the most popular
      expect(body.data[0].tag).toBe('popular');
      expect(body.data[0].postCount).toBe(2);
    });

    it('respects limit parameter', async () => {
      const app = await getApp();
      const user = await createTestUser(app, {
        email: 'trendinglimit@test.com',
      });

      await app.inject({
        method: 'POST',
        url: '/api/v1/feed/posts',
        headers: authHeaders(user.accessToken),
        payload: { content: '#one #two #three' },
      });

      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/hashtags/trending?limit=2',
        headers: authHeaders(user.accessToken),
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.data).toHaveLength(2);
    });
  });

  describe('GET /api/v1/hashtags/:tag/posts', () => {
    it('returns posts containing the hashtag', async () => {
      const app = await getApp();
      const user = await createTestUser(app, {
        email: 'hashposts@test.com',
      });

      await app.inject({
        method: 'POST',
        url: '/api/v1/feed/posts',
        headers: authHeaders(user.accessToken),
        payload: { content: 'Post with #nodejs' },
      });
      await app.inject({
        method: 'POST',
        url: '/api/v1/feed/posts',
        headers: authHeaders(user.accessToken),
        payload: { content: 'Another #nodejs post' },
      });
      await app.inject({
        method: 'POST',
        url: '/api/v1/feed/posts',
        headers: authHeaders(user.accessToken),
        payload: { content: 'No hashtag here' },
      });

      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/hashtags/nodejs/posts',
        headers: authHeaders(user.accessToken),
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.data).toHaveLength(2);
    });

    it('returns 200 with empty array for unknown tag', async () => {
      const app = await getApp();
      const user = await createTestUser(app, {
        email: 'hashunknown@test.com',
      });

      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/hashtags/nonexistent/posts',
        headers: authHeaders(user.accessToken),
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.data).toHaveLength(0);
    });
  });

  describe('POST/DELETE /api/v1/hashtags/:tag/follow', () => {
    it('follows a hashtag', async () => {
      const app = await getApp();
      const user = await createTestUser(app, {
        email: 'hashfollow@test.com',
      });

      // Create the hashtag first
      await app.inject({
        method: 'POST',
        url: '/api/v1/feed/posts',
        headers: authHeaders(user.accessToken),
        payload: { content: 'Post with #ai' },
      });

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/hashtags/ai/follow',
        headers: authHeaders(user.accessToken),
      });

      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res.body);
      expect(body.data.following).toBe(true);
    });

    it('is idempotent (following twice returns 201)', async () => {
      const app = await getApp();
      const user = await createTestUser(app, {
        email: 'hashfollowidem@test.com',
      });

      await app.inject({
        method: 'POST',
        url: '/api/v1/feed/posts',
        headers: authHeaders(user.accessToken),
        payload: { content: '#cloud computing' },
      });

      await app.inject({
        method: 'POST',
        url: '/api/v1/hashtags/cloud/follow',
        headers: authHeaders(user.accessToken),
      });

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/hashtags/cloud/follow',
        headers: authHeaders(user.accessToken),
      });

      expect(res.statusCode).toBe(201);
    });

    it('unfollows a hashtag', async () => {
      const app = await getApp();
      const user = await createTestUser(app, {
        email: 'hashunfollow@test.com',
      });

      await app.inject({
        method: 'POST',
        url: '/api/v1/feed/posts',
        headers: authHeaders(user.accessToken),
        payload: { content: '#devops is cool' },
      });

      await app.inject({
        method: 'POST',
        url: '/api/v1/hashtags/devops/follow',
        headers: authHeaders(user.accessToken),
      });

      const res = await app.inject({
        method: 'DELETE',
        url: '/api/v1/hashtags/devops/follow',
        headers: authHeaders(user.accessToken),
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.data.following).toBe(false);
    });
  });
});
