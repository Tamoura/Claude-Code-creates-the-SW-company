import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { FastifyInstance } from 'fastify';
import { buildTestServer, createTestUser, createTestTenant } from './test-helpers';

describe('Widget Routes', () => {
  let app: FastifyInstance;
  let token: string;
  let tenantId: string;

  beforeAll(async () => {
    app = await buildTestServer();
    const user = await createTestUser(app);
    token = user.token;
    tenantId = await createTestTenant(app, token);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /api/v1/tenants/:tenantId/widgets', () => {
    it('should create a widget config', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/tenants/${tenantId}/widgets`,
        headers: { authorization: `Bearer ${token}` },
        payload: {
          placementId: 'homepage-recs',
          layout: 'grid',
          columns: 4,
          maxItems: 8,
          showPrice: true,
          ctaText: 'View Product',
        },
      });

      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res.body);
      expect(body.data.placementId).toBe('homepage-recs');
      expect(body.data.layout).toBe('grid');
    });

    it('should create carousel widget', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/tenants/${tenantId}/widgets`,
        headers: { authorization: `Bearer ${token}` },
        payload: {
          placementId: 'product-page-similar',
          layout: 'carousel',
          columns: 3,
          maxItems: 12,
        },
      });

      expect(res.statusCode).toBe(201);
    });

    it('should require authentication', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/tenants/${tenantId}/widgets`,
        payload: { placementId: 'no-auth', layout: 'grid' },
      });

      expect(res.statusCode).toBe(401);
    });

    it('should reject invalid layout', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/tenants/${tenantId}/widgets`,
        headers: { authorization: `Bearer ${token}` },
        payload: { placementId: 'bad-layout', layout: 'floating' },
      });

      expect(res.statusCode).toBe(422);
    });
  });

  describe('GET /api/v1/tenants/:tenantId/widgets', () => {
    it('should list widget configs', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/tenants/${tenantId}/widgets`,
        headers: { authorization: `Bearer ${token}` },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.data.length).toBeGreaterThan(0);
    });
  });

  describe('PUT /api/v1/tenants/:tenantId/widgets/:widgetId', () => {
    it('should update widget config', async () => {
      // Create first
      const createRes = await app.inject({
        method: 'POST',
        url: `/api/v1/tenants/${tenantId}/widgets`,
        headers: { authorization: `Bearer ${token}` },
        payload: { placementId: 'update-target', layout: 'list', columns: 2, maxItems: 6 },
      });
      const widgetId = JSON.parse(createRes.body).data.id;

      const res = await app.inject({
        method: 'PUT',
        url: `/api/v1/tenants/${tenantId}/widgets/${widgetId}`,
        headers: { authorization: `Bearer ${token}` },
        payload: { layout: 'carousel', maxItems: 10 },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.data.layout).toBe('carousel');
      expect(body.data.maxItems).toBe(10);
    });
  });
});
