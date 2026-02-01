import { buildApp } from '../../src/app';
import { FastifyInstance } from 'fastify';

describe('Notification Preferences API', () => {
  let app: FastifyInstance;
  let accessToken: string;
  const testUA = `NotificationsTest/${Date.now()}`;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();

    const signupRes = await app.inject({
      method: 'POST',
      url: '/v1/auth/signup',
      payload: {
        email: `test-notif-${Date.now()}@example.com`,
        password: 'SecurePass123!',
      },
      headers: { 'user-agent': testUA },
    });
    const signupBody = signupRes.json();
    accessToken = signupBody.access_token;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /v1/notifications/preferences', () => {
    it('should return default preferences for new user', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/v1/notifications/preferences',
        headers: { authorization: `Bearer ${accessToken}` },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body).toMatchObject({
        emailOnPaymentReceived: true,
        emailOnRefundProcessed: true,
        emailOnPaymentFailed: false,
        sendCustomerReceipt: true,
      });
      expect(body.createdAt).toBeTruthy();
      expect(body.updatedAt).toBeTruthy();
    });

    it('should return 401 without authentication', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/v1/notifications/preferences',
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe('PATCH /v1/notifications/preferences', () => {
    it('should update emailOnPaymentReceived', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: '/v1/notifications/preferences',
        headers: { authorization: `Bearer ${accessToken}` },
        payload: { emailOnPaymentReceived: false },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.emailOnPaymentReceived).toBe(false);
    });

    it('should update sendCustomerReceipt', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: '/v1/notifications/preferences',
        headers: { authorization: `Bearer ${accessToken}` },
        payload: { sendCustomerReceipt: false },
      });

      expect(response.statusCode).toBe(200);
      expect(response.json().sendCustomerReceipt).toBe(false);
    });

    it('should handle partial updates', async () => {
      // Reset to known state
      await app.inject({
        method: 'PATCH',
        url: '/v1/notifications/preferences',
        headers: { authorization: `Bearer ${accessToken}` },
        payload: {
          emailOnPaymentReceived: true,
          emailOnRefundProcessed: true,
          emailOnPaymentFailed: false,
          sendCustomerReceipt: true,
        },
      });

      // Update only one field
      const response = await app.inject({
        method: 'PATCH',
        url: '/v1/notifications/preferences',
        headers: { authorization: `Bearer ${accessToken}` },
        payload: { emailOnPaymentFailed: true },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.emailOnPaymentFailed).toBe(true);
      expect(body.emailOnPaymentReceived).toBe(true);
      expect(body.emailOnRefundProcessed).toBe(true);
      expect(body.sendCustomerReceipt).toBe(true);
    });

    it('should return 401 without authentication', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: '/v1/notifications/preferences',
        payload: { emailOnPaymentReceived: false },
      });

      expect(response.statusCode).toBe(401);
    });

    it('should persist updates across GET requests', async () => {
      await app.inject({
        method: 'PATCH',
        url: '/v1/notifications/preferences',
        headers: { authorization: `Bearer ${accessToken}` },
        payload: { emailOnPaymentReceived: false, sendCustomerReceipt: false },
      });

      const response = await app.inject({
        method: 'GET',
        url: '/v1/notifications/preferences',
        headers: { authorization: `Bearer ${accessToken}` },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.emailOnPaymentReceived).toBe(false);
      expect(body.sendCustomerReceipt).toBe(false);
    });
  });
});
