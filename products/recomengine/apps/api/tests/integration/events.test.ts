import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { FastifyInstance } from 'fastify';
import { buildTestServer, createTestUser, createTestTenant } from './test-helpers';
import { generateApiKey, hashApiKey, getKeyPrefix } from '../../src/utils/crypto';

describe('Event Routes', () => {
  let app: FastifyInstance;
  let apiKey: string;

  beforeAll(async () => {
    app = await buildTestServer();
    const user = await createTestUser(app);
    const tenantId = await createTestTenant(app, user.token);

    // Create an API key directly
    const rawKey = generateApiKey('live');
    const keyHash = hashApiKey(rawKey);
    const keyPrefix = getKeyPrefix(rawKey);
    apiKey = rawKey;

    await (app as any).prisma.apiKey.create({
      data: {
        tenantId,
        name: 'Test Event Key',
        keyHash,
        keyPrefix,
        permissions: 'read_write',
      },
    });
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /api/v1/events', () => {
    it('should accept a valid event', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/events',
        headers: { 'x-api-key': apiKey },
        payload: {
          eventType: 'product_viewed',
          userId: 'user-100',
          productId: 'prod-200',
        },
      });

      expect(res.statusCode).toBe(202);
      const body = JSON.parse(res.body);
      expect(body.data.status).toBe('accepted');
      expect(body.data.id).toBeDefined();
    });

    it('should accept event with optional fields', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/events',
        headers: { 'x-api-key': apiKey },
        payload: {
          eventType: 'purchase',
          userId: 'user-100',
          productId: 'prod-300',
          sessionId: 'sess-abc',
          metadata: { price: 29.99, currency: 'USD' },
        },
      });

      expect(res.statusCode).toBe(202);
    });

    it('should reject without API key', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/events',
        payload: {
          eventType: 'product_viewed',
          userId: 'user-100',
          productId: 'prod-200',
        },
      });

      expect(res.statusCode).toBe(401);
    });

    it('should reject invalid event type', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/events',
        headers: { 'x-api-key': apiKey },
        payload: {
          eventType: 'invalid_type',
          userId: 'user-100',
          productId: 'prod-200',
        },
      });

      expect(res.statusCode).toBe(422);
    });

    it('should reject empty userId', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/events',
        headers: { 'x-api-key': apiKey },
        payload: {
          eventType: 'product_viewed',
          userId: '',
          productId: 'prod-200',
        },
      });

      expect(res.statusCode).toBe(422);
    });
  });

  describe('POST /api/v1/events/batch', () => {
    it('should accept a batch of events', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/events/batch',
        headers: { 'x-api-key': apiKey },
        payload: {
          events: [
            { eventType: 'product_viewed', userId: 'user-batch', productId: 'prod-1' },
            { eventType: 'product_clicked', userId: 'user-batch', productId: 'prod-2' },
            { eventType: 'add_to_cart', userId: 'user-batch', productId: 'prod-3' },
          ],
        },
      });

      expect(res.statusCode).toBe(202);
      const body = JSON.parse(res.body);
      expect(body.data.accepted).toBe(3);
      expect(body.data.rejected).toBe(0);
    });

    it('should reject empty batch', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/events/batch',
        headers: { 'x-api-key': apiKey },
        payload: { events: [] },
      });

      expect(res.statusCode).toBe(422);
    });
  });
});
