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

// Helper: create an accepted connection between two users (direct DB)
async function connectUsers(user1Id: string, user2Id: string) {
  const db = getPrisma();
  await db.connection.create({
    data: {
      senderId: user1Id,
      receiverId: user2Id,
      status: 'ACCEPTED',
    },
  });
}

describe('WebSocket Real-Time Messaging', () => {
  describe('WebSocket Route Auth', () => {
    it('rejects /ws without token (401)', async () => {
      const app = await getApp();

      const res = await app.inject({
        method: 'GET',
        url: '/ws',
      });

      expect(res.statusCode).toBe(401);
    });

    it('rejects /ws with invalid token (401)', async () => {
      const app = await getApp();

      const res = await app.inject({
        method: 'GET',
        url: '/ws?token=invalid-garbage-token',
      });

      expect(res.statusCode).toBe(401);
    });
  });

  describe('Message Broadcasting via API', () => {
    it('sends message and includes conversationId for broadcast', async () => {
      const app = await getApp();
      const user1 = await createTestUser(app);
      const user2 = await createTestUser(app);

      await connectUsers(user1.id, user2.id);

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
        payload: { conversationId: convId, content: 'Hello via WS test' },
      });

      expect(msgRes.statusCode).toBe(201);
      const msgBody = JSON.parse(msgRes.body);
      expect(msgBody.data.content).toBe('Hello via WS test');
      expect(msgBody.data.conversationId).toBe(convId);
    });
  });

  describe('Online Presence API', () => {
    it('GET /api/v1/presence/online returns online user IDs', async () => {
      const app = await getApp();
      const user = await createTestUser(app);

      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/presence/online',
        headers: authHeaders(user.accessToken),
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(Array.isArray(body.data)).toBe(true);
    });
  });

  describe('Typing Indicators', () => {
    it('POST /api/v1/conversations/:id/typing returns 200 for member', async () => {
      const app = await getApp();
      const user1 = await createTestUser(app);
      const user2 = await createTestUser(app);

      await connectUsers(user1.id, user2.id);

      const convRes = await app.inject({
        method: 'POST',
        url: '/api/v1/conversations',
        headers: authHeaders(user1.accessToken),
        payload: { otherUserId: user2.id },
      });
      const convId = JSON.parse(convRes.body).data.id;

      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/conversations/${convId}/typing`,
        headers: authHeaders(user1.accessToken),
        payload: {},
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
    });

    it('rejects typing for non-member (403)', async () => {
      const app = await getApp();
      const user1 = await createTestUser(app);
      const user2 = await createTestUser(app);
      const outsider = await createTestUser(app);

      await connectUsers(user1.id, user2.id);

      const convRes = await app.inject({
        method: 'POST',
        url: '/api/v1/conversations',
        headers: authHeaders(user1.accessToken),
        payload: { otherUserId: user2.id },
      });
      const convId = JSON.parse(convRes.body).data.id;

      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/conversations/${convId}/typing`,
        headers: authHeaders(outsider.accessToken),
        payload: {},
      });

      expect(res.statusCode).toBe(403);
    });

    it('requires authentication for typing (401)', async () => {
      const app = await getApp();

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/conversations/00000000-0000-0000-0000-000000000000/typing',
        payload: {},
      });

      expect(res.statusCode).toBe(401);
    });
  });
});
