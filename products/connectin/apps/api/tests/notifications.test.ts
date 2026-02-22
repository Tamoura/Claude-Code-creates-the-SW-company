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

describe('Notifications', () => {
  describe('GET /api/v1/notifications', () => {
    it('returns empty list when user has no notifications', async () => {
      const app = await getApp();
      const user = await createTestUser(app);

      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/notifications',
        headers: authHeaders(user.accessToken),
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(body.data).toEqual([]);
      expect(body.meta.count).toBe(0);
    });

    it('returns notifications for the authenticated user', async () => {
      const app = await getApp();
      const user = await createTestUser(app);

      await getPrisma().notification.create({
        data: {
          userId: user.id,
          type: 'SYSTEM',
          title: 'Welcome to ConnectIn!',
          message: 'Your account is ready.',
        },
      });

      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/notifications',
        headers: authHeaders(user.accessToken),
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.data.length).toBe(1);
      expect(body.data[0].title).toBe('Welcome to ConnectIn!');
      expect(body.data[0].isRead).toBe(false);
    });

    it('filters unread notifications with unreadOnly=true', async () => {
      const app = await getApp();
      const user = await createTestUser(app);

      await getPrisma().notification.create({
        data: {
          userId: user.id,
          type: 'SYSTEM',
          title: 'Unread notification',
          isRead: false,
        },
      });

      await getPrisma().notification.create({
        data: {
          userId: user.id,
          type: 'SYSTEM',
          title: 'Read notification',
          isRead: true,
          readAt: new Date(),
        },
      });

      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/notifications?unreadOnly=true',
        headers: authHeaders(user.accessToken),
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.data.length).toBe(1);
      expect(body.data[0].title).toBe('Unread notification');
    });

    it('does not return another user\'s notifications', async () => {
      const app = await getApp();
      const user1 = await createTestUser(app);
      const user2 = await createTestUser(app);

      await getPrisma().notification.create({
        data: {
          userId: user2.id,
          type: 'SYSTEM',
          title: 'User2 notification',
        },
      });

      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/notifications',
        headers: authHeaders(user1.accessToken),
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.data).toEqual([]);
    });

    it('returns 401 without auth token', async () => {
      const app = await getApp();
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/notifications',
      });
      expect(res.statusCode).toBe(401);
    });
  });

  describe('GET /api/v1/notifications/unread-count', () => {
    it('returns 0 when user has no notifications', async () => {
      const app = await getApp();
      const user = await createTestUser(app);

      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/notifications/unread-count',
        headers: authHeaders(user.accessToken),
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(body.data.count).toBe(0);
    });

    it('returns correct unread count', async () => {
      const app = await getApp();
      const user = await createTestUser(app);

      await getPrisma().notification.createMany({
        data: [
          { userId: user.id, type: 'SYSTEM', title: 'Notif 1', isRead: false },
          { userId: user.id, type: 'SYSTEM', title: 'Notif 2', isRead: false },
          { userId: user.id, type: 'SYSTEM', title: 'Notif 3', isRead: true, readAt: new Date() },
        ],
      });

      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/notifications/unread-count',
        headers: authHeaders(user.accessToken),
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.data.count).toBe(2);
    });
  });

  describe('PATCH /api/v1/notifications/:id/read', () => {
    it('marks a notification as read', async () => {
      const app = await getApp();
      const user = await createTestUser(app);

      const notif = await getPrisma().notification.create({
        data: {
          userId: user.id,
          type: 'CONNECTION_REQUEST',
          title: 'New connection request',
          isRead: false,
        },
      });

      const res = await app.inject({
        method: 'PATCH',
        url: `/api/v1/notifications/${notif.id}/read`,
        headers: authHeaders(user.accessToken),
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(body.data.isRead).toBe(true);
      expect(body.data.readAt).not.toBeNull();
    });

    it('returns 403 when marking another user\'s notification as read', async () => {
      const app = await getApp();
      const user1 = await createTestUser(app);
      const user2 = await createTestUser(app);

      const notif = await getPrisma().notification.create({
        data: {
          userId: user2.id,
          type: 'SYSTEM',
          title: 'User2 notification',
        },
      });

      const res = await app.inject({
        method: 'PATCH',
        url: `/api/v1/notifications/${notif.id}/read`,
        headers: authHeaders(user1.accessToken),
      });

      expect(res.statusCode).toBe(403);
    });

    it('returns 404 for non-existent notification', async () => {
      const app = await getApp();
      const user = await createTestUser(app);

      const res = await app.inject({
        method: 'PATCH',
        url: '/api/v1/notifications/00000000-0000-0000-0000-000000000000/read',
        headers: authHeaders(user.accessToken),
      });

      expect(res.statusCode).toBe(404);
    });
  });

  describe('PATCH /api/v1/notifications/read-all', () => {
    it('marks all unread notifications as read', async () => {
      const app = await getApp();
      const user = await createTestUser(app);

      await getPrisma().notification.createMany({
        data: [
          { userId: user.id, type: 'SYSTEM', title: 'Notif 1', isRead: false },
          { userId: user.id, type: 'SYSTEM', title: 'Notif 2', isRead: false },
          { userId: user.id, type: 'SYSTEM', title: 'Notif 3', isRead: true, readAt: new Date() },
        ],
      });

      const res = await app.inject({
        method: 'PATCH',
        url: '/api/v1/notifications/read-all',
        headers: authHeaders(user.accessToken),
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(body.data.updated).toBe(2);

      // Verify count is now 0
      const countRes = await app.inject({
        method: 'GET',
        url: '/api/v1/notifications/unread-count',
        headers: authHeaders(user.accessToken),
      });
      expect(JSON.parse(countRes.body).data.count).toBe(0);
    });

    it('returns 0 updated when no unread notifications exist', async () => {
      const app = await getApp();
      const user = await createTestUser(app);

      const res = await app.inject({
        method: 'PATCH',
        url: '/api/v1/notifications/read-all',
        headers: authHeaders(user.accessToken),
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.data.updated).toBe(0);
    });
  });

  describe('GET /api/v1/notifications/preferences', () => {
    it('returns default preferences when none exist', async () => {
      const app = await getApp();
      const user = await createTestUser(app);

      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/notifications/preferences',
        headers: authHeaders(user.accessToken),
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(body.data.connectionRequests).toBe(true);
      expect(body.data.messages).toBe(true);
      expect(body.data.emailDigest).toBe('WEEKLY');
    });

    it('returns existing preferences', async () => {
      const app = await getApp();
      const user = await createTestUser(app);

      await getPrisma().notificationPreference.create({
        data: {
          userId: user.id,
          emailDigest: 'DAILY',
          messages: false,
        },
      });

      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/notifications/preferences',
        headers: authHeaders(user.accessToken),
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.data.emailDigest).toBe('DAILY');
      expect(body.data.messages).toBe(false);
    });
  });

  describe('PUT /api/v1/notifications/preferences', () => {
    it('creates preferences when none exist', async () => {
      const app = await getApp();
      const user = await createTestUser(app);

      const res = await app.inject({
        method: 'PUT',
        url: '/api/v1/notifications/preferences',
        headers: authHeaders(user.accessToken),
        payload: {
          emailDigest: 'DAILY',
          messages: false,
          postLikes: false,
        },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(body.data.emailDigest).toBe('DAILY');
      expect(body.data.messages).toBe(false);
      expect(body.data.postLikes).toBe(false);
    });

    it('updates existing preferences', async () => {
      const app = await getApp();
      const user = await createTestUser(app);

      await app.inject({
        method: 'PUT',
        url: '/api/v1/notifications/preferences',
        headers: authHeaders(user.accessToken),
        payload: { emailDigest: 'DAILY' },
      });

      const res = await app.inject({
        method: 'PUT',
        url: '/api/v1/notifications/preferences',
        headers: authHeaders(user.accessToken),
        payload: { emailDigest: 'OFF' },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.data.emailDigest).toBe('OFF');
    });

    it('rejects invalid emailDigest value', async () => {
      const app = await getApp();
      const user = await createTestUser(app);

      const res = await app.inject({
        method: 'PUT',
        url: '/api/v1/notifications/preferences',
        headers: authHeaders(user.accessToken),
        payload: { emailDigest: 'MONTHLY' },
      });

      expect(res.statusCode).toBe(422);
    });

    it('returns 401 without auth token', async () => {
      const app = await getApp();

      const res = await app.inject({
        method: 'PUT',
        url: '/api/v1/notifications/preferences',
        payload: { emailDigest: 'OFF' },
      });

      expect(res.statusCode).toBe(401);
    });
  });
});
