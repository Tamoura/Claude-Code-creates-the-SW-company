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

describe('Follow Module', () => {
  describe('POST /api/v1/follows', () => {
    it('follows a user and returns 201', async () => {
      const app = await getApp();
      const user1 = await createTestUser(app, {
        email: 'follower@test.com',
      });
      const user2 = await createTestUser(app, {
        email: 'following@test.com',
      });

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/follows',
        headers: authHeaders(user1.accessToken),
        payload: { userId: user2.id },
      });

      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(body.data.following).toBe(true);
    });

    it('prevents self-follow with 422', async () => {
      const app = await getApp();
      const user = await createTestUser(app, {
        email: 'selffollow@test.com',
      });

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/follows',
        headers: authHeaders(user.accessToken),
        payload: { userId: user.id },
      });

      expect(res.statusCode).toBe(422);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(false);
    });

    it('is idempotent (following twice returns 201)', async () => {
      const app = await getApp();
      const user1 = await createTestUser(app, {
        email: 'idem1@test.com',
      });
      const user2 = await createTestUser(app, {
        email: 'idem2@test.com',
      });

      // Follow first time
      await app.inject({
        method: 'POST',
        url: '/api/v1/follows',
        headers: authHeaders(user1.accessToken),
        payload: { userId: user2.id },
      });

      // Follow second time
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/follows',
        headers: authHeaders(user1.accessToken),
        payload: { userId: user2.id },
      });

      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res.body);
      expect(body.data.following).toBe(true);

      // Verify only one follow record exists
      const db = getPrisma();
      const follows = await db.follow.findMany({
        where: {
          followerId: user1.id,
          followingId: user2.id,
        },
      });
      expect(follows).toHaveLength(1);
    });

    it('rejects unauthenticated request with 401', async () => {
      const app = await getApp();

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/follows',
        payload: { userId: '00000000-0000-0000-0000-000000000001' },
      });

      expect(res.statusCode).toBe(401);
    });
  });

  describe('DELETE /api/v1/follows/:userId', () => {
    it('unfollows a user and returns 200', async () => {
      const app = await getApp();
      const user1 = await createTestUser(app, {
        email: 'unfollower@test.com',
      });
      const user2 = await createTestUser(app, {
        email: 'unfollowed@test.com',
      });

      // Follow first
      await app.inject({
        method: 'POST',
        url: '/api/v1/follows',
        headers: authHeaders(user1.accessToken),
        payload: { userId: user2.id },
      });

      // Unfollow
      const res = await app.inject({
        method: 'DELETE',
        url: `/api/v1/follows/${user2.id}`,
        headers: authHeaders(user1.accessToken),
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(body.data.following).toBe(false);

      // Verify follow record is removed
      const db = getPrisma();
      const follows = await db.follow.findMany({
        where: {
          followerId: user1.id,
          followingId: user2.id,
        },
      });
      expect(follows).toHaveLength(0);
    });

    it('is idempotent (unfollowing non-followed returns 200)', async () => {
      const app = await getApp();
      const user1 = await createTestUser(app, {
        email: 'notidem1@test.com',
      });
      const user2 = await createTestUser(app, {
        email: 'notidem2@test.com',
      });

      const res = await app.inject({
        method: 'DELETE',
        url: `/api/v1/follows/${user2.id}`,
        headers: authHeaders(user1.accessToken),
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.data.following).toBe(false);
    });
  });

  describe('GET /api/v1/follows/followers', () => {
    it('lists followers of the current user', async () => {
      const app = await getApp();
      const user1 = await createTestUser(app, {
        email: 'target@test.com',
        displayName: 'Target User',
      });
      const user2 = await createTestUser(app, {
        email: 'fan1@test.com',
        displayName: 'Fan One',
      });
      const user3 = await createTestUser(app, {
        email: 'fan2@test.com',
        displayName: 'Fan Two',
      });

      // user2 and user3 follow user1
      await app.inject({
        method: 'POST',
        url: '/api/v1/follows',
        headers: authHeaders(user2.accessToken),
        payload: { userId: user1.id },
      });
      await app.inject({
        method: 'POST',
        url: '/api/v1/follows',
        headers: authHeaders(user3.accessToken),
        payload: { userId: user1.id },
      });

      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/follows/followers',
        headers: authHeaders(user1.accessToken),
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(body.data).toHaveLength(2);
      // Each follower should have displayName
      expect(body.data[0].displayName).toBeDefined();
    });

    it('supports pagination with limit and offset', async () => {
      const app = await getApp();
      const target = await createTestUser(app, {
        email: 'pagetarget@test.com',
      });
      const fan1 = await createTestUser(app, {
        email: 'pagefan1@test.com',
      });
      const fan2 = await createTestUser(app, {
        email: 'pagefan2@test.com',
      });

      await app.inject({
        method: 'POST',
        url: '/api/v1/follows',
        headers: authHeaders(fan1.accessToken),
        payload: { userId: target.id },
      });
      await app.inject({
        method: 'POST',
        url: '/api/v1/follows',
        headers: authHeaders(fan2.accessToken),
        payload: { userId: target.id },
      });

      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/follows/followers?limit=1&offset=0',
        headers: authHeaders(target.accessToken),
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.data).toHaveLength(1);
    });
  });

  describe('GET /api/v1/follows/following', () => {
    it('lists users the current user follows', async () => {
      const app = await getApp();
      const user1 = await createTestUser(app, {
        email: 'followsmaker@test.com',
      });
      const user2 = await createTestUser(app, {
        email: 'celeb1@test.com',
        displayName: 'Celebrity One',
      });
      const user3 = await createTestUser(app, {
        email: 'celeb2@test.com',
        displayName: 'Celebrity Two',
      });

      // user1 follows user2 and user3
      await app.inject({
        method: 'POST',
        url: '/api/v1/follows',
        headers: authHeaders(user1.accessToken),
        payload: { userId: user2.id },
      });
      await app.inject({
        method: 'POST',
        url: '/api/v1/follows',
        headers: authHeaders(user1.accessToken),
        payload: { userId: user3.id },
      });

      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/follows/following',
        headers: authHeaders(user1.accessToken),
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(body.data).toHaveLength(2);
      expect(body.data[0].displayName).toBeDefined();
    });
  });

  describe('GET /api/v1/follows/:userId/status', () => {
    it('returns true when following the user', async () => {
      const app = await getApp();
      const user1 = await createTestUser(app, {
        email: 'checker1@test.com',
      });
      const user2 = await createTestUser(app, {
        email: 'checker2@test.com',
      });

      await app.inject({
        method: 'POST',
        url: '/api/v1/follows',
        headers: authHeaders(user1.accessToken),
        payload: { userId: user2.id },
      });

      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/follows/${user2.id}/status`,
        headers: authHeaders(user1.accessToken),
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.data.following).toBe(true);
    });

    it('returns false when not following the user', async () => {
      const app = await getApp();
      const user1 = await createTestUser(app, {
        email: 'notchecker1@test.com',
      });
      const user2 = await createTestUser(app, {
        email: 'notchecker2@test.com',
      });

      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/follows/${user2.id}/status`,
        headers: authHeaders(user1.accessToken),
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.data.following).toBe(false);
    });
  });

  describe('GET /api/v1/follows/:userId/counts', () => {
    it('returns follower and following counts', async () => {
      const app = await getApp();
      const user1 = await createTestUser(app, {
        email: 'counter1@test.com',
      });
      const user2 = await createTestUser(app, {
        email: 'counter2@test.com',
      });
      const user3 = await createTestUser(app, {
        email: 'counter3@test.com',
      });

      // user2 and user3 follow user1
      await app.inject({
        method: 'POST',
        url: '/api/v1/follows',
        headers: authHeaders(user2.accessToken),
        payload: { userId: user1.id },
      });
      await app.inject({
        method: 'POST',
        url: '/api/v1/follows',
        headers: authHeaders(user3.accessToken),
        payload: { userId: user1.id },
      });

      // user1 follows user2
      await app.inject({
        method: 'POST',
        url: '/api/v1/follows',
        headers: authHeaders(user1.accessToken),
        payload: { userId: user2.id },
      });

      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/follows/${user1.id}/counts`,
        headers: authHeaders(user1.accessToken),
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.data.followers).toBe(2);
      expect(body.data.following).toBe(1);
    });

    it('returns zero counts for a user with no follows', async () => {
      const app = await getApp();
      const user = await createTestUser(app, {
        email: 'lonely@test.com',
      });

      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/follows/${user.id}/counts`,
        headers: authHeaders(user.accessToken),
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.data.followers).toBe(0);
      expect(body.data.following).toBe(0);
    });
  });
});
