import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { FastifyInstance } from 'fastify';
import { buildTestServer, createTestUser, createTestTenant } from './test-helpers';
import { generateApiKey, hashApiKey, getKeyPrefix } from '../../src/utils/crypto';

describe('Catalog Routes', () => {
  let app: FastifyInstance;
  let apiKeyReadWrite: string;

  beforeAll(async () => {
    app = await buildTestServer();
    const user = await createTestUser(app);
    const tenantId = await createTestTenant(app, user.token);

    // Create read_write API key
    const rwKey = generateApiKey('live');
    apiKeyReadWrite = rwKey;
    await (app as any).prisma.apiKey.create({
      data: {
        tenantId,
        name: 'Catalog RW Key',
        keyHash: hashApiKey(rwKey),
        keyPrefix: getKeyPrefix(rwKey),
        permissions: 'read_write',
      },
    });
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /api/v1/catalog', () => {
    it('should create a catalog item', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/catalog',
        headers: { 'x-api-key': apiKeyReadWrite },
        payload: {
          productId: 'sku-001',
          name: 'Widget Alpha',
          category: 'Electronics',
          price: 29.99,
        },
      });

      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res.body);
      expect(body.data.name).toBe('Widget Alpha');
      expect(body.data.productId).toBe('sku-001');
    });

    it('should create item with all optional fields', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/catalog',
        headers: { 'x-api-key': apiKeyReadWrite },
        payload: {
          productId: 'sku-002',
          name: 'Widget Beta',
          description: 'A great widget',
          category: 'Electronics',
          price: 49.99,
          imageUrl: 'https://example.com/img.png',
          attributes: { color: 'blue', size: 'L' },
        },
      });

      expect(res.statusCode).toBe(201);
    });

    it('should reject without API key', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/catalog',
        payload: { productId: 'sku-noauth', name: 'No Auth' },
      });

      expect(res.statusCode).toBe(401);
    });

    it('should reject missing required fields', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/catalog',
        headers: { 'x-api-key': apiKeyReadWrite },
        payload: { name: 'Missing ProductId' },
      });

      expect(res.statusCode).toBe(422);
    });
  });

  describe('GET /api/v1/catalog', () => {
    it('should list catalog items', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/catalog',
        headers: { 'x-api-key': apiKeyReadWrite },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.data.length).toBeGreaterThan(0);
      expect(body.meta.pagination).toBeDefined();
    });

    it('should support pagination', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/catalog?limit=1',
        headers: { 'x-api-key': apiKeyReadWrite },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.data.length).toBeLessThanOrEqual(1);
    });
  });

  describe('POST /api/v1/catalog/batch', () => {
    it('should batch create catalog items', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/catalog/batch',
        headers: { 'x-api-key': apiKeyReadWrite },
        payload: {
          items: [
            { productId: 'batch-1', name: 'Batch Item 1', category: 'Toys', price: 9.99 },
            { productId: 'batch-2', name: 'Batch Item 2', category: 'Toys', price: 14.99 },
          ],
        },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.data.created).toBe(2);
      expect(body.data.rejected).toBe(0);
    });
  });
});
