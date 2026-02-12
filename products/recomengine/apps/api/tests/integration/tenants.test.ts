import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { FastifyInstance } from 'fastify';
import { buildTestServer, createTestUser } from './test-helpers';

describe('Tenant Routes', () => {
  let app: FastifyInstance;
  let token: string;

  beforeAll(async () => {
    app = await buildTestServer();
    const user = await createTestUser(app);
    token = user.token;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /api/v1/tenants', () => {
    it('should create a tenant', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/tenants',
        headers: { authorization: `Bearer ${token}` },
        payload: { name: 'Acme Store' },
      });

      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res.body);
      expect(body.data.name).toBe('Acme Store');
      expect(body.data.status).toBe('active');
      expect(body.data.id).toBeDefined();
    });

    it('should create tenant with config', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/tenants',
        headers: { authorization: `Bearer ${token}` },
        payload: {
          name: 'Configured Store',
          config: { defaultStrategy: 'trending', excludePurchased: true },
        },
      });

      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res.body);
      expect(body.data.config.defaultStrategy).toBe('trending');
    });

    it('should reject empty name', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/tenants',
        headers: { authorization: `Bearer ${token}` },
        payload: { name: '' },
      });

      expect(res.statusCode).toBe(422);
    });

    it('should require authentication', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/tenants',
        payload: { name: 'No Auth' },
      });

      expect(res.statusCode).toBe(401);
    });
  });

  describe('GET /api/v1/tenants', () => {
    it('should list tenants for authenticated user', async () => {
      // Create a tenant first
      await app.inject({
        method: 'POST',
        url: '/api/v1/tenants',
        headers: { authorization: `Bearer ${token}` },
        payload: { name: 'Listed Tenant' },
      });

      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/tenants',
        headers: { authorization: `Bearer ${token}` },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.data.length).toBeGreaterThan(0);
      expect(body.meta.pagination).toBeDefined();
      expect(body.meta.pagination.total).toBeGreaterThan(0);
    });

    it('should support pagination', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/tenants?limit=1&offset=0',
        headers: { authorization: `Bearer ${token}` },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.data.length).toBeLessThanOrEqual(1);
      expect(body.meta.pagination.limit).toBe(1);
    });
  });

  describe('GET /api/v1/tenants/:tenantId', () => {
    it('should get a specific tenant', async () => {
      const createRes = await app.inject({
        method: 'POST',
        url: '/api/v1/tenants',
        headers: { authorization: `Bearer ${token}` },
        payload: { name: 'Specific Tenant' },
      });
      const tenantId = JSON.parse(createRes.body).data.id;

      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/tenants/${tenantId}`,
        headers: { authorization: `Bearer ${token}` },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.data.name).toBe('Specific Tenant');
    });

    it('should return 404 for non-existent tenant', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/tenants/non-existent-id',
        headers: { authorization: `Bearer ${token}` },
      });

      expect(res.statusCode).toBe(404);
    });
  });

  describe('PUT /api/v1/tenants/:tenantId', () => {
    it('should update tenant name', async () => {
      const createRes = await app.inject({
        method: 'POST',
        url: '/api/v1/tenants',
        headers: { authorization: `Bearer ${token}` },
        payload: { name: 'Old Name' },
      });
      const tenantId = JSON.parse(createRes.body).data.id;

      const res = await app.inject({
        method: 'PUT',
        url: `/api/v1/tenants/${tenantId}`,
        headers: { authorization: `Bearer ${token}` },
        payload: { name: 'New Name' },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.data.name).toBe('New Name');
    });
  });

  describe('DELETE /api/v1/tenants/:tenantId', () => {
    it('should soft-delete tenant', async () => {
      const createRes = await app.inject({
        method: 'POST',
        url: '/api/v1/tenants',
        headers: { authorization: `Bearer ${token}` },
        payload: { name: 'Delete Me' },
      });
      const tenantId = JSON.parse(createRes.body).data.id;

      const res = await app.inject({
        method: 'DELETE',
        url: `/api/v1/tenants/${tenantId}`,
        headers: { authorization: `Bearer ${token}` },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.data.message).toContain('deleted');
    });
  });
});
