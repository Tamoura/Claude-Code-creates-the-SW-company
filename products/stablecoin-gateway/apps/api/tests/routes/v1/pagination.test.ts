import { buildApp } from '../../../src/app';
import { FastifyInstance } from 'fastify';
import { prisma } from '../../setup';
import bcrypt from 'bcrypt';

/**
 * Pagination Tests for API Keys and Webhooks
 *
 * Verifies that GET /v1/api-keys and GET /v1/webhooks support
 * limit/offset pagination with total count in the response.
 */

describe('Pagination: GET /v1/api-keys', () => {
  let app: FastifyInstance;
  let userId: string;
  let authToken: string;

  beforeAll(async () => {
    app = await buildApp();

    const passwordHash = await bcrypt.hash('TestPass123!@#', 10);
    const user = await prisma.user.create({
      data: {
        email: 'pagination-apikeys@example.com',
        passwordHash,
      },
    });
    userId = user.id;
    authToken = app.jwt.sign({ userId: user.id });

    for (let i = 0; i < 5; i++) {
      await prisma.apiKey.create({
        data: {
          userId,
          name: `Pagination Key ${i}`,
          keyHash: `hash_${i}_${Date.now()}`,
          keyPrefix: `sk_live_${i}...`,
          permissions: { read: true, write: true, refund: false },
        },
      });
    }
  });

  afterAll(async () => {
    await prisma.apiKey.deleteMany({ where: { userId } });
    await prisma.user.delete({ where: { id: userId } });
    await app.close();
  });

  it('should return paginated response with default limit=50, offset=0', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/v1/api-keys',
      headers: { authorization: `Bearer ${authToken}` },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();

    expect(body).toHaveProperty('data');
    expect(body).toHaveProperty('pagination');
    expect(body.pagination).toMatchObject({
      limit: 50,
      offset: 0,
      total: 5,
      has_more: false,
    });
    expect(body.data).toHaveLength(5);
  });

  it('should respect custom limit and offset', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/v1/api-keys?limit=2&offset=1',
      headers: { authorization: `Bearer ${authToken}` },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();

    expect(body.data).toHaveLength(2);
    expect(body.pagination).toMatchObject({
      limit: 2,
      offset: 1,
      total: 5,
      has_more: true,
    });
  });

  it('should cap limit at 100', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/v1/api-keys?limit=200',
      headers: { authorization: `Bearer ${authToken}` },
    });

    expect(response.statusCode).toBe(400);
  });

  it('should return 400 for limit=0', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/v1/api-keys?limit=0',
      headers: { authorization: `Bearer ${authToken}` },
    });

    expect(response.statusCode).toBe(400);
  });

  it('should return 400 for negative limit', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/v1/api-keys?limit=-5',
      headers: { authorization: `Bearer ${authToken}` },
    });

    expect(response.statusCode).toBe(400);
  });

  it('should return 400 for non-numeric limit', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/v1/api-keys?limit=abc',
      headers: { authorization: `Bearer ${authToken}` },
    });

    expect(response.statusCode).toBe(400);
  });

  it('should return has_more=false when offset+limit >= total', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/v1/api-keys?limit=10&offset=0',
      headers: { authorization: `Bearer ${authToken}` },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.pagination.has_more).toBe(false);
  });

  it('should return empty data when offset exceeds total', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/v1/api-keys?offset=100',
      headers: { authorization: `Bearer ${authToken}` },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.data).toHaveLength(0);
    expect(body.pagination.total).toBe(5);
  });
});

describe('Pagination: GET /v1/webhooks', () => {
  let app: FastifyInstance;
  let userId: string;
  let authToken: string;

  beforeAll(async () => {
    app = await buildApp();

    const passwordHash = await bcrypt.hash('TestPass123!@#', 10);
    const user = await prisma.user.create({
      data: {
        email: 'pagination-webhooks@example.com',
        passwordHash,
      },
    });
    userId = user.id;
    authToken = app.jwt.sign({ userId: user.id });

    for (let i = 0; i < 5; i++) {
      await prisma.webhookEndpoint.create({
        data: {
          userId,
          url: `https://example.com/webhook-${i}`,
          secret: `whsec_test_${i}_${Date.now()}`,
          events: ['payment.created'],
          description: `Pagination Webhook ${i}`,
        },
      });
    }
  });

  afterAll(async () => {
    await prisma.webhookEndpoint.deleteMany({ where: { userId } });
    await prisma.user.delete({ where: { id: userId } });
    await app.close();
  });

  it('should return paginated response with default limit=50, offset=0', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/v1/webhooks',
      headers: { authorization: `Bearer ${authToken}` },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();

    expect(body).toHaveProperty('data');
    expect(body).toHaveProperty('pagination');
    expect(body.pagination).toMatchObject({
      limit: 50,
      offset: 0,
      total: 5,
      has_more: false,
    });
    expect(body.data).toHaveLength(5);
  });

  it('should respect custom limit and offset', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/v1/webhooks?limit=2&offset=1',
      headers: { authorization: `Bearer ${authToken}` },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();

    expect(body.data).toHaveLength(2);
    expect(body.pagination).toMatchObject({
      limit: 2,
      offset: 1,
      total: 5,
      has_more: true,
    });
  });

  it('should cap limit at 100', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/v1/webhooks?limit=200',
      headers: { authorization: `Bearer ${authToken}` },
    });

    expect(response.statusCode).toBe(400);
  });

  it('should return 400 for limit=0', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/v1/webhooks?limit=0',
      headers: { authorization: `Bearer ${authToken}` },
    });

    expect(response.statusCode).toBe(400);
  });

  it('should return 400 for negative limit', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/v1/webhooks?limit=-5',
      headers: { authorization: `Bearer ${authToken}` },
    });

    expect(response.statusCode).toBe(400);
  });

  it('should return 400 for non-numeric limit', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/v1/webhooks?limit=abc',
      headers: { authorization: `Bearer ${authToken}` },
    });

    expect(response.statusCode).toBe(400);
  });

  it('should return has_more=false when offset+limit >= total', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/v1/webhooks?limit=10&offset=0',
      headers: { authorization: `Bearer ${authToken}` },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.pagination.has_more).toBe(false);
  });

  it('should return empty data when offset exceeds total', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/v1/webhooks?offset=100',
      headers: { authorization: `Bearer ${authToken}` },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.data).toHaveLength(0);
    expect(body.pagination.total).toBe(5);
  });

  it('should not include secret in paginated webhook list', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/v1/webhooks?limit=5',
      headers: { authorization: `Bearer ${authToken}` },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    body.data.forEach((webhook: any) => {
      expect(webhook).not.toHaveProperty('secret');
    });
  });
});
