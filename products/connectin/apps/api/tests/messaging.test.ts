import {
  getApp,
  closeApp,
  createTestUser,
  cleanDatabase,
  getPrisma,
  authHeaders,
} from './helpers';

afterAll(async () => {
  await closeApp();
});

beforeEach(async () => {
  await cleanDatabase();
});

describe('Messaging', () => {
  describe('POST /api/v1/conversations', () => {
    it('creates a conversation between two connected users', async () => {
      const app = await getApp();
      const user1 = await createTestUser(app);
      const user2 = await createTestUser(app);

      await getPrisma().connection.create({
        data: { senderId: user1.id, receiverId: user2.id, status: 'ACCEPTED' },
      });

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/conversations',
        headers: authHeaders(user1.accessToken),
        payload: { otherUserId: user2.id },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(body.data.contact.userId).toBe(user2.id);
      expect(body.data.id).toBeDefined();
      expect(body.data.lastMessage).toBeNull();
    });

    it('returns same conversation on repeated calls (idempotent)', async () => {
      const app = await getApp();
      const user1 = await createTestUser(app);
      const user2 = await createTestUser(app);

      await getPrisma().connection.create({
        data: { senderId: user1.id, receiverId: user2.id, status: 'ACCEPTED' },
      });

      const res1 = await app.inject({
        method: 'POST',
        url: '/api/v1/conversations',
        headers: authHeaders(user1.accessToken),
        payload: { otherUserId: user2.id },
      });

      const res2 = await app.inject({
        method: 'POST',
        url: '/api/v1/conversations',
        headers: authHeaders(user1.accessToken),
        payload: { otherUserId: user2.id },
      });

      const body1 = JSON.parse(res1.body);
      const body2 = JSON.parse(res2.body);
      expect(body1.data.id).toBe(body2.data.id);
    });

    it('returns 403 when users are not connected', async () => {
      const app = await getApp();
      const user1 = await createTestUser(app);
      const user2 = await createTestUser(app);

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/conversations',
        headers: authHeaders(user1.accessToken),
        payload: { otherUserId: user2.id },
      });

      expect(res.statusCode).toBe(403);
    });

    it('returns 400 when messaging yourself', async () => {
      const app = await getApp();
      const user1 = await createTestUser(app);

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/conversations',
        headers: authHeaders(user1.accessToken),
        payload: { otherUserId: user1.id },
      });

      expect(res.statusCode).toBe(400);
    });

    it('returns 404 for non-existent user', async () => {
      const app = await getApp();
      const user1 = await createTestUser(app);

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/conversations',
        headers: authHeaders(user1.accessToken),
        payload: { otherUserId: '00000000-0000-0000-0000-000000000000' },
      });

      expect(res.statusCode).toBe(404);
    });

    it('returns 401 without auth token', async () => {
      const app = await getApp();
      const user2 = await createTestUser(app);

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/conversations',
        payload: { otherUserId: user2.id },
      });

      expect(res.statusCode).toBe(401);
    });
  });

  describe('GET /api/v1/conversations', () => {
    it('returns empty list when no conversations have messages', async () => {
      const app = await getApp();
      const user1 = await createTestUser(app);

      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/conversations',
        headers: authHeaders(user1.accessToken),
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(body.data).toEqual([]);
    });

    it('returns conversations with last message after sending', async () => {
      const app = await getApp();
      const user1 = await createTestUser(app);
      const user2 = await createTestUser(app);

      await getPrisma().connection.create({
        data: { senderId: user1.id, receiverId: user2.id, status: 'ACCEPTED' },
      });

      // Create conversation
      const convRes = await app.inject({
        method: 'POST',
        url: '/api/v1/conversations',
        headers: authHeaders(user1.accessToken),
        payload: { otherUserId: user2.id },
      });
      const convId = JSON.parse(convRes.body).data.id;

      // Send a message
      await app.inject({
        method: 'POST',
        url: '/api/v1/conversations/messages',
        headers: authHeaders(user1.accessToken),
        payload: { conversationId: convId, content: 'Hello!' },
      });

      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/conversations',
        headers: authHeaders(user1.accessToken),
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.data.length).toBe(1);
      expect(body.data[0].lastMessage.content).toBe('Hello!');
    });
  });

  describe('POST /api/v1/conversations/messages', () => {
    it('sends a message and returns 201', async () => {
      const app = await getApp();
      const user1 = await createTestUser(app);
      const user2 = await createTestUser(app);

      await getPrisma().connection.create({
        data: { senderId: user1.id, receiverId: user2.id, status: 'ACCEPTED' },
      });

      const convRes = await app.inject({
        method: 'POST',
        url: '/api/v1/conversations',
        headers: authHeaders(user1.accessToken),
        payload: { otherUserId: user2.id },
      });
      const convId = JSON.parse(convRes.body).data.id;

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/conversations/messages',
        headers: authHeaders(user1.accessToken),
        payload: { conversationId: convId, content: 'Hello!' },
      });

      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(body.data.content).toBe('Hello!');
      expect(body.data.senderId).toBe(user1.id);
      expect(body.data.conversationId).toBe(convId);
    });

    it('returns 403 when sender is not a conversation member', async () => {
      const app = await getApp();
      const user1 = await createTestUser(app);
      const user2 = await createTestUser(app);
      const user3 = await createTestUser(app);

      await getPrisma().connection.create({
        data: { senderId: user1.id, receiverId: user2.id, status: 'ACCEPTED' },
      });

      const convRes = await app.inject({
        method: 'POST',
        url: '/api/v1/conversations',
        headers: authHeaders(user1.accessToken),
        payload: { otherUserId: user2.id },
      });
      const convId = JSON.parse(convRes.body).data.id;

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/conversations/messages',
        headers: authHeaders(user3.accessToken),
        payload: { conversationId: convId, content: 'Intruder!' },
      });

      expect(res.statusCode).toBe(403);
    });

    it('returns 400 for empty message content', async () => {
      const app = await getApp();
      const user1 = await createTestUser(app);
      const user2 = await createTestUser(app);

      await getPrisma().connection.create({
        data: { senderId: user1.id, receiverId: user2.id, status: 'ACCEPTED' },
      });

      const convRes = await app.inject({
        method: 'POST',
        url: '/api/v1/conversations',
        headers: authHeaders(user1.accessToken),
        payload: { otherUserId: user2.id },
      });
      const convId = JSON.parse(convRes.body).data.id;

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/conversations/messages',
        headers: authHeaders(user1.accessToken),
        payload: { conversationId: convId, content: '' },
      });

      // Schema validation (minLength: 1) returns 422
      expect(res.statusCode).toBe(422);
    });
  });

  describe('GET /api/v1/conversations/:id/messages', () => {
    it('returns messages for a conversation member', async () => {
      const app = await getApp();
      const user1 = await createTestUser(app);
      const user2 = await createTestUser(app);

      await getPrisma().connection.create({
        data: { senderId: user1.id, receiverId: user2.id, status: 'ACCEPTED' },
      });

      const convRes = await app.inject({
        method: 'POST',
        url: '/api/v1/conversations',
        headers: authHeaders(user1.accessToken),
        payload: { otherUserId: user2.id },
      });
      const convId = JSON.parse(convRes.body).data.id;

      await app.inject({
        method: 'POST',
        url: '/api/v1/conversations/messages',
        headers: authHeaders(user1.accessToken),
        payload: { conversationId: convId, content: 'First message' },
      });

      await app.inject({
        method: 'POST',
        url: '/api/v1/conversations/messages',
        headers: authHeaders(user2.accessToken),
        payload: { conversationId: convId, content: 'Second message' },
      });

      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/conversations/${convId}/messages`,
        headers: authHeaders(user1.accessToken),
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(body.data.length).toBe(2);
      // Chronological order
      expect(body.data[0].content).toBe('First message');
      expect(body.data[1].content).toBe('Second message');
    });

    it('returns 403 for non-member', async () => {
      const app = await getApp();
      const user1 = await createTestUser(app);
      const user2 = await createTestUser(app);
      const user3 = await createTestUser(app);

      await getPrisma().connection.create({
        data: { senderId: user1.id, receiverId: user2.id, status: 'ACCEPTED' },
      });

      const convRes = await app.inject({
        method: 'POST',
        url: '/api/v1/conversations',
        headers: authHeaders(user1.accessToken),
        payload: { otherUserId: user2.id },
      });
      const convId = JSON.parse(convRes.body).data.id;

      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/conversations/${convId}/messages`,
        headers: authHeaders(user3.accessToken),
      });

      expect(res.statusCode).toBe(403);
    });

    it('supports pagination meta', async () => {
      const app = await getApp();
      const user1 = await createTestUser(app);
      const user2 = await createTestUser(app);

      await getPrisma().connection.create({
        data: { senderId: user1.id, receiverId: user2.id, status: 'ACCEPTED' },
      });

      const convRes = await app.inject({
        method: 'POST',
        url: '/api/v1/conversations',
        headers: authHeaders(user1.accessToken),
        payload: { otherUserId: user2.id },
      });
      const convId = JSON.parse(convRes.body).data.id;

      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/conversations/${convId}/messages`,
        headers: authHeaders(user1.accessToken),
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.meta).toBeDefined();
      expect(typeof body.meta.hasMore).toBe('boolean');
      expect(typeof body.meta.count).toBe('number');
    });
  });

  describe('PATCH /api/v1/conversations/messages/:id/read', () => {
    it('marks a message as read', async () => {
      const app = await getApp();
      const user1 = await createTestUser(app);
      const user2 = await createTestUser(app);

      await getPrisma().connection.create({
        data: { senderId: user1.id, receiverId: user2.id, status: 'ACCEPTED' },
      });

      const convRes = await app.inject({
        method: 'POST',
        url: '/api/v1/conversations',
        headers: authHeaders(user1.accessToken),
        payload: { otherUserId: user2.id },
      });
      const convId = JSON.parse(convRes.body).data.id;

      const msgRes = await app.inject({
        method: 'POST',
        url: '/api/v1/conversations/messages',
        headers: authHeaders(user1.accessToken),
        payload: { conversationId: convId, content: 'Read me' },
      });
      const msgId = JSON.parse(msgRes.body).data.id;

      const res = await app.inject({
        method: 'PATCH',
        url: `/api/v1/conversations/messages/${msgId}/read`,
        headers: authHeaders(user2.accessToken),
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(body.data.readAt).not.toBeNull();
    });

    it('returns 403 for non-member trying to mark a message read', async () => {
      const app = await getApp();
      const user1 = await createTestUser(app);
      const user2 = await createTestUser(app);
      const user3 = await createTestUser(app);

      await getPrisma().connection.create({
        data: { senderId: user1.id, receiverId: user2.id, status: 'ACCEPTED' },
      });

      const convRes = await app.inject({
        method: 'POST',
        url: '/api/v1/conversations',
        headers: authHeaders(user1.accessToken),
        payload: { otherUserId: user2.id },
      });
      const convId = JSON.parse(convRes.body).data.id;

      const msgRes = await app.inject({
        method: 'POST',
        url: '/api/v1/conversations/messages',
        headers: authHeaders(user1.accessToken),
        payload: { conversationId: convId, content: 'Read me' },
      });
      const msgId = JSON.parse(msgRes.body).data.id;

      const res = await app.inject({
        method: 'PATCH',
        url: `/api/v1/conversations/messages/${msgId}/read`,
        headers: authHeaders(user3.accessToken),
      });

      expect(res.statusCode).toBe(403);
    });

    it('returns 404 for non-existent message', async () => {
      const app = await getApp();
      const user1 = await createTestUser(app);

      const res = await app.inject({
        method: 'PATCH',
        url: '/api/v1/conversations/messages/00000000-0000-0000-0000-000000000000/read',
        headers: authHeaders(user1.accessToken),
      });

      expect(res.statusCode).toBe(404);
    });
  });
});
