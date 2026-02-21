import {
  getApp,
  closeApp,
  cleanDatabase,
  createTestUser,
  authHeaders,
} from './helpers';

beforeEach(async () => {
  await cleanDatabase();
});

afterAll(async () => {
  await cleanDatabase();
  await closeApp();
});

describe('Connection Module', () => {
  describe('POST /api/v1/connections/request', () => {
    it('sends a connection request', async () => {
      const app = await getApp();
      const user1 = await createTestUser(app, {
        email: 'sender@example.com',
        displayName: 'Sender',
      });
      const user2 = await createTestUser(app, {
        email: 'receiver@example.com',
        displayName: 'Receiver',
      });

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/connections/request',
        headers: authHeaders(user1.accessToken),
        payload: {
          receiverId: user2.id,
          message: 'Hello, would love to connect!',
        },
      });

      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(body.data.connectionId).toBeDefined();
      expect(body.data.status).toBe('PENDING');
      expect(body.data.expiresAt).toBeDefined();
    });

    it('rejects self-connection', async () => {
      const app = await getApp();
      const user = await createTestUser(app);

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/connections/request',
        headers: authHeaders(user.accessToken),
        payload: { receiverId: user.id },
      });

      expect(res.statusCode).toBe(400);
    });

    it('rejects duplicate request', async () => {
      const app = await getApp();
      const user1 = await createTestUser(app, {
        email: 'dup-sender@example.com',
      });
      const user2 = await createTestUser(app, {
        email: 'dup-receiver@example.com',
      });

      await app.inject({
        method: 'POST',
        url: '/api/v1/connections/request',
        headers: authHeaders(user1.accessToken),
        payload: { receiverId: user2.id },
      });

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/connections/request',
        headers: authHeaders(user1.accessToken),
        payload: { receiverId: user2.id },
      });

      expect(res.statusCode).toBe(409);
    });
  });

  describe('PUT /api/v1/connections/:id/accept', () => {
    it('accepts a pending connection request',
      async () => {
        const app = await getApp();
        const sender = await createTestUser(app, {
          email: 'accept-sender@example.com',
        });
        const receiver = await createTestUser(app, {
          email: 'accept-receiver@example.com',
        });

        const sendRes = await app.inject({
          method: 'POST',
          url: '/api/v1/connections/request',
          headers: authHeaders(sender.accessToken),
          payload: { receiverId: receiver.id },
        });

        const { connectionId } = JSON.parse(
          sendRes.body
        ).data;

        const res = await app.inject({
          method: 'PUT',
          url: `/api/v1/connections/${connectionId}/accept`,
          headers: authHeaders(receiver.accessToken),
        });

        expect(res.statusCode).toBe(200);
        const body = JSON.parse(res.body);
        expect(body.data.status).toBe('ACCEPTED');
        expect(body.data.respondedAt).toBeDefined();
      }
    );

    it('rejects accept from non-recipient', async () => {
      const app = await getApp();
      const sender = await createTestUser(app, {
        email: 'wrong-accept-s@example.com',
      });
      const receiver = await createTestUser(app, {
        email: 'wrong-accept-r@example.com',
      });

      const sendRes = await app.inject({
        method: 'POST',
        url: '/api/v1/connections/request',
        headers: authHeaders(sender.accessToken),
        payload: { receiverId: receiver.id },
      });

      const { connectionId } = JSON.parse(
        sendRes.body
      ).data;

      // Sender tries to accept (should fail)
      const res = await app.inject({
        method: 'PUT',
        url: `/api/v1/connections/${connectionId}/accept`,
        headers: authHeaders(sender.accessToken),
      });

      expect(res.statusCode).toBe(403);
    });
  });

  describe('PUT /api/v1/connections/:id/reject', () => {
    it('rejects a connection and sets cooldown',
      async () => {
        const app = await getApp();
        const sender = await createTestUser(app, {
          email: 'reject-sender@example.com',
        });
        const receiver = await createTestUser(app, {
          email: 'reject-receiver@example.com',
        });

        const sendRes = await app.inject({
          method: 'POST',
          url: '/api/v1/connections/request',
          headers: authHeaders(sender.accessToken),
          payload: { receiverId: receiver.id },
        });

        const { connectionId } = JSON.parse(
          sendRes.body
        ).data;

        const res = await app.inject({
          method: 'PUT',
          url: `/api/v1/connections/${connectionId}/reject`,
          headers: authHeaders(receiver.accessToken),
        });

        expect(res.statusCode).toBe(200);
        const body = JSON.parse(res.body);
        expect(body.data.status).toBe('REJECTED');
        expect(body.data.cooldownUntil).toBeDefined();
      }
    );
  });

  describe('GET /api/v1/connections', () => {
    it('lists accepted connections', async () => {
      const app = await getApp();
      const user1 = await createTestUser(app, {
        email: 'list-u1@example.com',
      });
      const user2 = await createTestUser(app, {
        email: 'list-u2@example.com',
      });

      // Create and accept connection
      const sendRes = await app.inject({
        method: 'POST',
        url: '/api/v1/connections/request',
        headers: authHeaders(user1.accessToken),
        payload: { receiverId: user2.id },
      });

      const { connectionId } = JSON.parse(
        sendRes.body
      ).data;

      await app.inject({
        method: 'PUT',
        url: `/api/v1/connections/${connectionId}/accept`,
        headers: authHeaders(user2.accessToken),
      });

      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/connections',
        headers: authHeaders(user1.accessToken),
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.data).toHaveLength(1);
      expect(body.data[0].user.id).toBe(user2.id);
      expect(body.meta).toBeDefined();
    });
  });

  describe('GET /api/v1/connections/pending', () => {
    it('lists pending requests', async () => {
      const app = await getApp();
      const sender = await createTestUser(app, {
        email: 'pending-sender@example.com',
      });
      const receiver = await createTestUser(app, {
        email: 'pending-receiver@example.com',
      });

      await app.inject({
        method: 'POST',
        url: '/api/v1/connections/request',
        headers: authHeaders(sender.accessToken),
        payload: { receiverId: receiver.id },
      });

      // Check receiver's pending
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/connections/pending',
        headers: authHeaders(receiver.accessToken),
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.data.incoming).toHaveLength(1);
      expect(body.data.incoming[0].user.id).toBe(
        sender.id
      );
    });
  });

  describe('POST /api/v1/connections/request — validation', () => {
    it('rejects missing receiverId', async () => {
      const app = await getApp();
      const user = await createTestUser(app);

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/connections/request',
        headers: authHeaders(user.accessToken),
        payload: {},
      });

      expect(res.statusCode).toBe(422);
    });
  });
});
