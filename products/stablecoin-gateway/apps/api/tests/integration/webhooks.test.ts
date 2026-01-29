import { buildApp } from '../../src/app';
import { FastifyInstance } from 'fastify';
import { prisma } from '../setup';
import bcrypt from 'bcrypt';

describe('Webhook CRUD API', () => {
  let app: FastifyInstance;
  let userId: string;
  let authToken: string;

  beforeAll(async () => {
    app = await buildApp();

    // Create test user
    const passwordHash = await bcrypt.hash('TestPass123', 10);
    const user = await prisma.user.create({
      data: {
        email: 'webhook-test@example.com',
        passwordHash,
      },
    });
    userId = user.id;

    // Generate auth token
    authToken = app.jwt.sign({ userId: user.id });
  });

  afterAll(async () => {
    // Clean up
    await prisma.webhookEndpoint.deleteMany({ where: { userId } });
    await prisma.user.delete({ where: { id: userId } });
    await app.close();
  });

  beforeEach(async () => {
    // Clean webhooks before each test
    await prisma.webhookEndpoint.deleteMany({ where: { userId } });
  });

  describe('POST /v1/webhooks', () => {
    it('should create a webhook with valid data', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/v1/webhooks',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
        payload: {
          url: 'https://example.com/webhook',
          events: ['payment.created', 'payment.completed'],
        },
      });

      expect(response.statusCode).toBe(201);
      const body = response.json();
      expect(body).toMatchObject({
        id: expect.any(String),
        url: 'https://example.com/webhook',
        events: ['payment.created', 'payment.completed'],
        enabled: true,
        created_at: expect.any(String),
      });
      expect(body).toHaveProperty('secret');
      expect(body.secret).toMatch(/^whsec_/);
    });

    it('should create a webhook with optional description', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/v1/webhooks',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
        payload: {
          url: 'https://example.com/webhook',
          events: ['payment.created'],
          description: 'Production webhook',
        },
      });

      expect(response.statusCode).toBe(201);
      const body = response.json();
      expect(body.description).toBe('Production webhook');
    });

    it('should create disabled webhook when enabled is false', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/v1/webhooks',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
        payload: {
          url: 'https://example.com/webhook',
          events: ['payment.created'],
          enabled: false,
        },
      });

      expect(response.statusCode).toBe(201);
      const body = response.json();
      expect(body.enabled).toBe(false);
    });

    it('should return 400 for non-HTTPS URL', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/v1/webhooks',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
        payload: {
          url: 'http://example.com/webhook',
          events: ['payment.created'],
        },
      });

      expect(response.statusCode).toBe(400);
      const body = response.json();
      expect(body.detail).toContain('HTTPS');
    });

    it('should return 400 for invalid URL', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/v1/webhooks',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
        payload: {
          url: 'not-a-url',
          events: ['payment.created'],
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return 400 for empty events array', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/v1/webhooks',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
        payload: {
          url: 'https://example.com/webhook',
          events: [],
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return 400 for invalid event type', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/v1/webhooks',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
        payload: {
          url: 'https://example.com/webhook',
          events: ['invalid.event'],
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return 401 for missing authorization', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/v1/webhooks',
        payload: {
          url: 'https://example.com/webhook',
          events: ['payment.created'],
        },
      });

      expect(response.statusCode).toBe(401);
    });

    it('should store webhook secret in plaintext for HMAC signing', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/v1/webhooks',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
        payload: {
          url: 'https://example.com/webhook',
          events: ['payment.created'],
        },
      });

      expect(response.statusCode).toBe(201);
      const body = response.json();
      const returnedSecret = body.secret;

      // Verify secret is returned
      expect(returnedSecret).toMatch(/^whsec_/);

      // Check database - secret should be stored in PLAINTEXT
      // Unlike passwords/API keys, webhook secrets need to be recoverable
      // for HMAC signing when sending webhooks to merchant endpoints
      const webhook = await prisma.webhookEndpoint.findUnique({
        where: { id: body.id },
      });
      expect(webhook?.secret).toBe(returnedSecret); // Should match exactly (plaintext)
      expect(webhook?.secret).toMatch(/^whsec_[a-f0-9]{64}$/); // whsec_ + 64 hex chars
    });
  });

  describe('GET /v1/webhooks', () => {
    it('should list all user webhooks', async () => {
      // Create two webhooks
      await prisma.webhookEndpoint.createMany({
        data: [
          {
            userId,
            url: 'https://example.com/webhook1',
            secret: 'hashed_secret_1',
            events: ['payment.created'],
          },
          {
            userId,
            url: 'https://example.com/webhook2',
            secret: 'hashed_secret_2',
            events: ['payment.completed'],
          },
        ],
      });

      const response = await app.inject({
        method: 'GET',
        url: '/v1/webhooks',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.data).toHaveLength(2);
      expect(body.data[0]).toMatchObject({
        id: expect.any(String),
        url: expect.any(String),
        events: expect.any(Array),
        enabled: expect.any(Boolean),
      });
      // Secrets should NOT be returned in list
      expect(body.data[0]).not.toHaveProperty('secret');
      expect(body.data[1]).not.toHaveProperty('secret');
    });

    it('should return empty array when user has no webhooks', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/v1/webhooks',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.data).toEqual([]);
    });

    it('should not return other users webhooks', async () => {
      // Create another user
      const otherUser = await prisma.user.create({
        data: {
          email: 'other@example.com',
          passwordHash: await bcrypt.hash('TestPass123', 10),
        },
      });

      // Create webhook for other user
      await prisma.webhookEndpoint.create({
        data: {
          userId: otherUser.id,
          url: 'https://example.com/other-webhook',
          secret: 'hashed_secret',
          events: ['payment.created'],
        },
      });

      // Request with original user token
      const response = await app.inject({
        method: 'GET',
        url: '/v1/webhooks',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.data).toHaveLength(0);

      // Cleanup
      await prisma.webhookEndpoint.deleteMany({ where: { userId: otherUser.id } });
      await prisma.user.delete({ where: { id: otherUser.id } });
    });

    it('should return 401 for missing authorization', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/v1/webhooks',
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe('GET /v1/webhooks/:id', () => {
    it('should get webhook by ID', async () => {
      const webhook = await prisma.webhookEndpoint.create({
        data: {
          userId,
          url: 'https://example.com/webhook',
          secret: 'hashed_secret',
          events: ['payment.created'],
          description: 'Test webhook',
        },
      });

      const response = await app.inject({
        method: 'GET',
        url: `/v1/webhooks/${webhook.id}`,
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body).toMatchObject({
        id: webhook.id,
        url: 'https://example.com/webhook',
        events: ['payment.created'],
        enabled: true,
        description: 'Test webhook',
      });
      // Secret should NOT be returned
      expect(body).not.toHaveProperty('secret');
    });

    it('should return 404 for non-existent webhook', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/v1/webhooks/non-existent-id',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      });

      expect(response.statusCode).toBe(404);
    });

    it('should return 404 for other users webhook', async () => {
      // Create another user with webhook
      const otherUser = await prisma.user.create({
        data: {
          email: 'other@example.com',
          passwordHash: await bcrypt.hash('TestPass123', 10),
        },
      });

      const otherWebhook = await prisma.webhookEndpoint.create({
        data: {
          userId: otherUser.id,
          url: 'https://example.com/other-webhook',
          secret: 'hashed_secret',
          events: ['payment.created'],
        },
      });

      // Try to access with original user token
      const response = await app.inject({
        method: 'GET',
        url: `/v1/webhooks/${otherWebhook.id}`,
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      });

      expect(response.statusCode).toBe(404);

      // Cleanup
      await prisma.webhookEndpoint.delete({ where: { id: otherWebhook.id } });
      await prisma.user.delete({ where: { id: otherUser.id } });
    });

    it('should return 401 for missing authorization', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/v1/webhooks/some-id',
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe('PATCH /v1/webhooks/:id', () => {
    it('should update webhook URL', async () => {
      const webhook = await prisma.webhookEndpoint.create({
        data: {
          userId,
          url: 'https://example.com/old-webhook',
          secret: 'hashed_secret',
          events: ['payment.created'],
        },
      });

      const response = await app.inject({
        method: 'PATCH',
        url: `/v1/webhooks/${webhook.id}`,
        headers: {
          authorization: `Bearer ${authToken}`,
        },
        payload: {
          url: 'https://example.com/new-webhook',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.url).toBe('https://example.com/new-webhook');
      expect(body.events).toEqual(['payment.created']); // Unchanged
    });

    it('should update webhook events', async () => {
      const webhook = await prisma.webhookEndpoint.create({
        data: {
          userId,
          url: 'https://example.com/webhook',
          secret: 'hashed_secret',
          events: ['payment.created'],
        },
      });

      const response = await app.inject({
        method: 'PATCH',
        url: `/v1/webhooks/${webhook.id}`,
        headers: {
          authorization: `Bearer ${authToken}`,
        },
        payload: {
          events: ['payment.created', 'payment.completed', 'payment.failed'],
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.events).toEqual(['payment.created', 'payment.completed', 'payment.failed']);
    });

    it('should disable webhook', async () => {
      const webhook = await prisma.webhookEndpoint.create({
        data: {
          userId,
          url: 'https://example.com/webhook',
          secret: 'hashed_secret',
          events: ['payment.created'],
          enabled: true,
        },
      });

      const response = await app.inject({
        method: 'PATCH',
        url: `/v1/webhooks/${webhook.id}`,
        headers: {
          authorization: `Bearer ${authToken}`,
        },
        payload: {
          enabled: false,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.enabled).toBe(false);
    });

    it('should update description', async () => {
      const webhook = await prisma.webhookEndpoint.create({
        data: {
          userId,
          url: 'https://example.com/webhook',
          secret: 'hashed_secret',
          events: ['payment.created'],
        },
      });

      const response = await app.inject({
        method: 'PATCH',
        url: `/v1/webhooks/${webhook.id}`,
        headers: {
          authorization: `Bearer ${authToken}`,
        },
        payload: {
          description: 'Updated description',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.description).toBe('Updated description');
    });

    it('should return 400 for non-HTTPS URL', async () => {
      const webhook = await prisma.webhookEndpoint.create({
        data: {
          userId,
          url: 'https://example.com/webhook',
          secret: 'hashed_secret',
          events: ['payment.created'],
        },
      });

      const response = await app.inject({
        method: 'PATCH',
        url: `/v1/webhooks/${webhook.id}`,
        headers: {
          authorization: `Bearer ${authToken}`,
        },
        payload: {
          url: 'http://example.com/webhook',
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return 404 for non-existent webhook', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: '/v1/webhooks/non-existent-id',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
        payload: {
          enabled: false,
        },
      });

      expect(response.statusCode).toBe(404);
    });

    it('should return 404 for other users webhook', async () => {
      const otherUser = await prisma.user.create({
        data: {
          email: 'other@example.com',
          passwordHash: await bcrypt.hash('TestPass123', 10),
        },
      });

      const otherWebhook = await prisma.webhookEndpoint.create({
        data: {
          userId: otherUser.id,
          url: 'https://example.com/webhook',
          secret: 'hashed_secret',
          events: ['payment.created'],
        },
      });

      const response = await app.inject({
        method: 'PATCH',
        url: `/v1/webhooks/${otherWebhook.id}`,
        headers: {
          authorization: `Bearer ${authToken}`,
        },
        payload: {
          enabled: false,
        },
      });

      expect(response.statusCode).toBe(404);

      // Cleanup
      await prisma.webhookEndpoint.delete({ where: { id: otherWebhook.id } });
      await prisma.user.delete({ where: { id: otherUser.id } });
    });

    it('should return 401 for missing authorization', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: '/v1/webhooks/some-id',
        payload: {
          enabled: false,
        },
      });

      expect(response.statusCode).toBe(401);
    });

    it('should not allow updating secret', async () => {
      const webhook = await prisma.webhookEndpoint.create({
        data: {
          userId,
          url: 'https://example.com/webhook',
          secret: 'original_hashed_secret',
          events: ['payment.created'],
        },
      });

      const response = await app.inject({
        method: 'PATCH',
        url: `/v1/webhooks/${webhook.id}`,
        headers: {
          authorization: `Bearer ${authToken}`,
        },
        payload: {
          secret: 'new_secret', // This should be ignored
          url: 'https://example.com/new-webhook',
        },
      });

      expect(response.statusCode).toBe(200);

      // Verify secret wasn't changed
      const updatedWebhook = await prisma.webhookEndpoint.findUnique({
        where: { id: webhook.id },
      });
      expect(updatedWebhook?.secret).toBe('original_hashed_secret');
    });
  });

  describe('DELETE /v1/webhooks/:id', () => {
    it('should delete webhook', async () => {
      const webhook = await prisma.webhookEndpoint.create({
        data: {
          userId,
          url: 'https://example.com/webhook',
          secret: 'hashed_secret',
          events: ['payment.created'],
        },
      });

      const response = await app.inject({
        method: 'DELETE',
        url: `/v1/webhooks/${webhook.id}`,
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      });

      expect(response.statusCode).toBe(204);
      expect(response.body).toBe('');

      // Verify deletion
      const deleted = await prisma.webhookEndpoint.findUnique({
        where: { id: webhook.id },
      });
      expect(deleted).toBeNull();
    });

    it('should return 404 for non-existent webhook', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: '/v1/webhooks/non-existent-id',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      });

      expect(response.statusCode).toBe(404);
    });

    it('should return 404 for other users webhook', async () => {
      const otherUser = await prisma.user.create({
        data: {
          email: 'other@example.com',
          passwordHash: await bcrypt.hash('TestPass123', 10),
        },
      });

      const otherWebhook = await prisma.webhookEndpoint.create({
        data: {
          userId: otherUser.id,
          url: 'https://example.com/webhook',
          secret: 'hashed_secret',
          events: ['payment.created'],
        },
      });

      const response = await app.inject({
        method: 'DELETE',
        url: `/v1/webhooks/${otherWebhook.id}`,
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      });

      expect(response.statusCode).toBe(404);

      // Cleanup
      await prisma.webhookEndpoint.delete({ where: { id: otherWebhook.id } });
      await prisma.user.delete({ where: { id: otherUser.id } });
    });

    it('should return 401 for missing authorization', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: '/v1/webhooks/some-id',
      });

      expect(response.statusCode).toBe(401);
    });

    it('should cascade delete webhook deliveries', async () => {
      const webhook = await prisma.webhookEndpoint.create({
        data: {
          userId,
          url: 'https://example.com/webhook',
          secret: 'hashed_secret',
          events: ['payment.created'],
        },
      });

      // Create some deliveries
      await prisma.webhookDelivery.createMany({
        data: [
          {
            endpointId: webhook.id,
            eventType: 'payment.created',
            payload: { test: 'data1' },
          },
          {
            endpointId: webhook.id,
            eventType: 'payment.completed',
            payload: { test: 'data2' },
          },
        ],
      });

      // Delete webhook
      const response = await app.inject({
        method: 'DELETE',
        url: `/v1/webhooks/${webhook.id}`,
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      });

      expect(response.statusCode).toBe(204);

      // Verify deliveries were cascade deleted
      const deliveries = await prisma.webhookDelivery.findMany({
        where: { endpointId: webhook.id },
      });
      expect(deliveries).toHaveLength(0);
    });
  });

  describe('SSRF Protection', () => {
    it('should reject webhook URLs targeting localhost', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/v1/webhooks',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
        payload: {
          url: 'https://localhost/webhook',
          events: ['payment.created'],
        },
      });

      expect(response.statusCode).toBe(400);
      const body = response.json();
      expect(body.type).toBe('https://gateway.io/errors/invalid-webhook-url');
      expect(body.detail).toContain('localhost or internal networks');
    });

    it('should reject webhook URLs targeting 127.0.0.1', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/v1/webhooks',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
        payload: {
          url: 'https://127.0.0.1:8080/webhook',
          events: ['payment.created'],
        },
      });

      expect(response.statusCode).toBe(400);
      const body = response.json();
      expect(body.detail).toContain('localhost or internal networks');
    });

    it('should reject webhook URLs targeting private networks (10.x.x.x)', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/v1/webhooks',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
        payload: {
          url: 'https://10.0.0.1/webhook',
          events: ['payment.created'],
        },
      });

      expect(response.statusCode).toBe(400);
      const body = response.json();
      expect(body.detail).toContain('localhost or internal networks');
    });

    it('should reject webhook URLs targeting private networks (192.168.x.x)', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/v1/webhooks',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
        payload: {
          url: 'https://192.168.1.1/webhook',
          events: ['payment.created'],
        },
      });

      expect(response.statusCode).toBe(400);
      const body = response.json();
      expect(body.detail).toContain('localhost or internal networks');
    });

    it('should reject webhook URLs targeting cloud metadata endpoint', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/v1/webhooks',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
        payload: {
          url: 'https://169.254.169.254/latest/meta-data/',
          events: ['payment.created'],
        },
      });

      expect(response.statusCode).toBe(400);
      const body = response.json();
      expect(body.detail).toContain('cloud metadata endpoints');
    });

    it('should reject HTTP URLs (require HTTPS)', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/v1/webhooks',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
        payload: {
          url: 'http://example.com/webhook',
          events: ['payment.created'],
        },
      });

      expect(response.statusCode).toBe(400);
      const body = response.json();
      // Zod validation catches this before our URL validator
      expect(body.detail).toContain('HTTPS');
    });

    it('should reject URLs with credentials', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/v1/webhooks',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
        payload: {
          url: 'https://user:password@example.com/webhook',
          events: ['payment.created'],
        },
      });

      expect(response.statusCode).toBe(400);
      const body = response.json();
      expect(body.detail).toContain('cannot contain credentials');
    });

    it('should allow valid public HTTPS URLs', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/v1/webhooks',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
        payload: {
          url: 'https://api.example.com/webhooks/payment',
          events: ['payment.created'],
        },
      });

      expect(response.statusCode).toBe(201);
      const body = response.json();
      expect(body.url).toBe('https://api.example.com/webhooks/payment');
    });

    it('should reject internal URLs on update', async () => {
      // Create webhook with valid URL
      const createResponse = await app.inject({
        method: 'POST',
        url: '/v1/webhooks',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
        payload: {
          url: 'https://example.com/webhook',
          events: ['payment.created'],
        },
      });
      const webhook = createResponse.json();

      // Try to update to internal URL
      const updateResponse = await app.inject({
        method: 'PATCH',
        url: `/v1/webhooks/${webhook.id}`,
        headers: {
          authorization: `Bearer ${authToken}`,
        },
        payload: {
          url: 'https://192.168.1.1/malicious',
        },
      });

      expect(updateResponse.statusCode).toBe(400);
      const body = updateResponse.json();
      expect(body.detail).toContain('localhost or internal networks');

      // Verify webhook URL wasn't changed
      const getResponse = await app.inject({
        method: 'GET',
        url: `/v1/webhooks/${webhook.id}`,
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      });
      expect(getResponse.json().url).toBe('https://example.com/webhook');
    });
  });
});
