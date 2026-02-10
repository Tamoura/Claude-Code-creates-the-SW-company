import { FastifyInstance } from 'fastify';
import {
  createTestApp,
  setupTestData,
  createTestUser,
  loginUser,
} from '../helpers/test-utils';
import { prisma } from '../setup';

describe('Notification Routes', () => {
  let app: FastifyInstance;
  let tenantId: string;

  beforeAll(async () => {
    app = await createTestApp();
  });

  beforeEach(async () => {
    const data = await setupTestData();
    tenantId = data.tenant.id;
  });

  afterAll(async () => {
    await app.close();
  });

  async function createUserWithNotifications() {
    const user = await createTestUser({
      tenantId,
      email: 'user@test.qa',
      password: 'SecurePass123!',
      role: 'INVESTOR',
    });
    const tokens = await loginUser(app, 'user@test.qa', 'SecurePass123!');

    const n1 = await prisma.notification.create({
      data: {
        userId: user.id,
        titleEn: 'New Deal Available',
        bodyEn: 'Qatar Tech IPO is now open for subscription',
        channel: 'IN_APP',
      },
    });

    const n2 = await prisma.notification.create({
      data: {
        userId: user.id,
        titleEn: 'Subscription Confirmed',
        bodyEn: 'Your subscription to QIIB Sukuk has been confirmed',
        channel: 'IN_APP',
      },
    });

    return { user, accessToken: tokens.data.accessToken, notifications: [n1, n2] };
  }

  describe('GET /api/v1/notifications', () => {
    it('lists notifications for current user', async () => {
      const { accessToken } = await createUserWithNotifications();

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/notifications',
        headers: { authorization: `Bearer ${accessToken}` },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.data.length).toBe(2);
      expect(body.meta.total).toBe(2);
      expect(body.meta.unread).toBe(2);
    });

    it('returns 401 without auth', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/notifications',
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe('PATCH /api/v1/notifications/:id/read', () => {
    it('marks notification as read', async () => {
      const { accessToken, notifications } = await createUserWithNotifications();

      const response = await app.inject({
        method: 'PATCH',
        url: `/api/v1/notifications/${notifications[0].id}/read`,
        headers: { authorization: `Bearer ${accessToken}` },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.data.isRead).toBe(true);
      expect(body.data.readAt).not.toBeNull();
    });

    it('returns 404 for other users notification', async () => {
      const { notifications } = await createUserWithNotifications();

      // Create another user
      const other = await createTestUser({
        tenantId,
        email: 'other@test.qa',
        password: 'SecurePass123!',
        role: 'INVESTOR',
      });
      const otherTokens = await loginUser(app, 'other@test.qa', 'SecurePass123!');

      const response = await app.inject({
        method: 'PATCH',
        url: `/api/v1/notifications/${notifications[0].id}/read`,
        headers: { authorization: `Bearer ${otherTokens.data.accessToken}` },
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('PATCH /api/v1/notifications/read-all', () => {
    it('marks all notifications as read', async () => {
      const { accessToken } = await createUserWithNotifications();

      const response = await app.inject({
        method: 'PATCH',
        url: '/api/v1/notifications/read-all',
        headers: { authorization: `Bearer ${accessToken}` },
      });

      expect(response.statusCode).toBe(200);
      expect(response.json().data.count).toBe(2);

      // Verify all are read
      const list = await app.inject({
        method: 'GET',
        url: '/api/v1/notifications',
        headers: { authorization: `Bearer ${accessToken}` },
      });

      expect(list.json().meta.unread).toBe(0);
    });
  });
});
