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

describe('Block & Report Module', () => {
  describe('POST /api/v1/blocks', () => {
    it('blocks a user', async () => {
      const app = await getApp();
      const user1 = await createTestUser(app, { email: 'blocker@test.com' });
      const user2 = await createTestUser(app, { email: 'blocked@test.com' });

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/blocks',
        headers: authHeaders(user1.accessToken),
        payload: { userId: user2.id },
      });

      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(body.data.blockedId).toBe(user2.id);
    });

    it('prevents blocking yourself', async () => {
      const app = await getApp();
      const user = await createTestUser(app);

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/blocks',
        headers: authHeaders(user.accessToken),
        payload: { userId: user.id },
      });

      expect(res.statusCode).toBe(422);
    });

    it('is idempotent (blocking twice returns success)', async () => {
      const app = await getApp();
      const user1 = await createTestUser(app, { email: 'idempotent1@test.com' });
      const user2 = await createTestUser(app, { email: 'idempotent2@test.com' });

      await app.inject({
        method: 'POST',
        url: '/api/v1/blocks',
        headers: authHeaders(user1.accessToken),
        payload: { userId: user2.id },
      });

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/blocks',
        headers: authHeaders(user1.accessToken),
        payload: { userId: user2.id },
      });

      expect(res.statusCode).toBe(201);
    });

    it('rejects unauthenticated request', async () => {
      const app = await getApp();
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/blocks',
        payload: { userId: '00000000-0000-0000-0000-000000000001' },
      });
      expect(res.statusCode).toBe(401);
    });

    it('removes existing connection when blocking', async () => {
      const app = await getApp();
      const user1 = await createTestUser(app, { email: 'conn-block1@test.com' });
      const user2 = await createTestUser(app, { email: 'conn-block2@test.com' });

      // Create a connection first
      const connRes = await app.inject({
        method: 'POST',
        url: '/api/v1/connections/request',
        headers: authHeaders(user1.accessToken),
        payload: { receiverId: user2.id },
      });
      const connId = JSON.parse(connRes.body).data.connectionId;

      // Accept the connection
      await app.inject({
        method: 'PUT',
        url: `/api/v1/connections/${connId}/accept`,
        headers: authHeaders(user2.accessToken),
      });

      // Now block
      await app.inject({
        method: 'POST',
        url: '/api/v1/blocks',
        headers: authHeaders(user1.accessToken),
        payload: { userId: user2.id },
      });

      // Verify connection is removed
      const db = getPrisma();
      const connections = await db.connection.findMany({
        where: {
          OR: [
            { senderId: user1.id, receiverId: user2.id },
            { senderId: user2.id, receiverId: user1.id },
          ],
        },
      });
      expect(connections).toHaveLength(0);
    });
  });

  describe('DELETE /api/v1/blocks/:userId', () => {
    it('unblocks a user', async () => {
      const app = await getApp();
      const user1 = await createTestUser(app, { email: 'unblocker@test.com' });
      const user2 = await createTestUser(app, { email: 'unblocked@test.com' });

      // Block first
      await app.inject({
        method: 'POST',
        url: '/api/v1/blocks',
        headers: authHeaders(user1.accessToken),
        payload: { userId: user2.id },
      });

      const res = await app.inject({
        method: 'DELETE',
        url: `/api/v1/blocks/${user2.id}`,
        headers: authHeaders(user1.accessToken),
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
    });

    it('returns 200 even if not blocked (idempotent)', async () => {
      const app = await getApp();
      const user1 = await createTestUser(app, { email: 'not-blocked1@test.com' });
      const user2 = await createTestUser(app, { email: 'not-blocked2@test.com' });

      const res = await app.inject({
        method: 'DELETE',
        url: `/api/v1/blocks/${user2.id}`,
        headers: authHeaders(user1.accessToken),
      });

      expect(res.statusCode).toBe(200);
    });
  });

  describe('GET /api/v1/blocks', () => {
    it('lists blocked users', async () => {
      const app = await getApp();
      const user1 = await createTestUser(app, { email: 'lister@test.com' });
      const user2 = await createTestUser(app, { email: 'listed1@test.com' });
      const user3 = await createTestUser(app, { email: 'listed2@test.com' });

      await app.inject({
        method: 'POST',
        url: '/api/v1/blocks',
        headers: authHeaders(user1.accessToken),
        payload: { userId: user2.id },
      });
      await app.inject({
        method: 'POST',
        url: '/api/v1/blocks',
        headers: authHeaders(user1.accessToken),
        payload: { userId: user3.id },
      });

      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/blocks',
        headers: authHeaders(user1.accessToken),
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.data).toHaveLength(2);
    });
  });

  describe('Block effects on other features', () => {
    it('blocked user profile returns 404', async () => {
      const app = await getApp();
      const user1 = await createTestUser(app, { email: 'block-profile1@test.com' });
      const user2 = await createTestUser(app, { email: 'block-profile2@test.com' });

      // user1 blocks user2
      await app.inject({
        method: 'POST',
        url: '/api/v1/blocks',
        headers: authHeaders(user1.accessToken),
        payload: { userId: user2.id },
      });

      // user1 tries to view user2's profile
      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/profiles/${user2.id}`,
        headers: authHeaders(user1.accessToken),
      });

      expect(res.statusCode).toBe(404);
    });

    it('blocked user cannot view blocker profile', async () => {
      const app = await getApp();
      const user1 = await createTestUser(app, { email: 'block-reverse1@test.com' });
      const user2 = await createTestUser(app, { email: 'block-reverse2@test.com' });

      // user1 blocks user2
      await app.inject({
        method: 'POST',
        url: '/api/v1/blocks',
        headers: authHeaders(user1.accessToken),
        payload: { userId: user2.id },
      });

      // user2 tries to view user1's profile (should also be blocked)
      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/profiles/${user1.id}`,
        headers: authHeaders(user2.accessToken),
      });

      expect(res.statusCode).toBe(404);
    });
  });

  describe('Reports', () => {
    describe('POST /api/v1/reports', () => {
      it('reports a user', async () => {
        const app = await getApp();
        const reporter = await createTestUser(app, { email: 'reporter@test.com' });
        const target = await createTestUser(app, { email: 'target@test.com' });

        const res = await app.inject({
          method: 'POST',
          url: '/api/v1/reports',
          headers: authHeaders(reporter.accessToken),
          payload: {
            targetType: 'USER',
            targetId: target.id,
            reason: 'SPAM',
            description: 'This user is spamming',
          },
        });

        expect(res.statusCode).toBe(201);
        const body = JSON.parse(res.body);
        expect(body.data.reason).toBe('SPAM');
        expect(body.data.status).toBe('PENDING');
      });

      it('reports a post', async () => {
        const app = await getApp();
        const reporter = await createTestUser(app, { email: 'post-reporter@test.com' });
        const author = await createTestUser(app, { email: 'post-author@test.com' });

        // Create a post
        const postRes = await app.inject({
          method: 'POST',
          url: '/api/v1/feed/posts',
          headers: authHeaders(author.accessToken),
          payload: { content: 'Reportable content' },
        });
        const postId = JSON.parse(postRes.body).data.id;

        const res = await app.inject({
          method: 'POST',
          url: '/api/v1/reports',
          headers: authHeaders(reporter.accessToken),
          payload: {
            targetType: 'POST',
            targetId: postId,
            reason: 'HATE_SPEECH',
          },
        });

        expect(res.statusCode).toBe(201);
      });

      it('prevents reporting yourself', async () => {
        const app = await getApp();
        const user = await createTestUser(app, { email: 'self-report@test.com' });

        const res = await app.inject({
          method: 'POST',
          url: '/api/v1/reports',
          headers: authHeaders(user.accessToken),
          payload: {
            targetType: 'USER',
            targetId: user.id,
            reason: 'SPAM',
          },
        });

        expect(res.statusCode).toBe(422);
      });

      it('validates reason enum', async () => {
        const app = await getApp();
        const user = await createTestUser(app);

        const res = await app.inject({
          method: 'POST',
          url: '/api/v1/reports',
          headers: authHeaders(user.accessToken),
          payload: {
            targetType: 'USER',
            targetId: 'some-id',
            reason: 'INVALID_REASON',
          },
        });

        expect(res.statusCode).toBe(422);
      });
    });
  });
});
