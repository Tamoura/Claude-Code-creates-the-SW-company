import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { FastifyInstance } from 'fastify';
import { buildTestServer, createTestUser, createTestTenant } from './test-helpers';

describe('API Key Routes', () => {
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

  describe('POST /api/v1/tenants/:tenantId/api-keys', () => {
    it('should create an API key', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/tenants/${tenantId}/api-keys`,
        headers: { authorization: `Bearer ${token}` },
        payload: { name: 'Production Key', permissions: 'read_write' },
      });

      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res.body);
      expect(body.data.key).toMatch(/^rk_live_/);
      expect(body.data.name).toBe('Production Key');
      expect(body.data.permissions).toBe('read_write');
      expect(body.data.keyPrefix).toBeDefined();
    });

    it('should create a read-only key', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/tenants/${tenantId}/api-keys`,
        headers: { authorization: `Bearer ${token}` },
        payload: { name: 'Read Key', permissions: 'read' },
      });

      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res.body);
      expect(body.data.permissions).toBe('read');
    });

    it('should require authentication', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/tenants/${tenantId}/api-keys`,
        payload: { name: 'No Auth Key', permissions: 'read' },
      });

      expect(res.statusCode).toBe(401);
    });

    it('should reject invalid permissions', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/tenants/${tenantId}/api-keys`,
        headers: { authorization: `Bearer ${token}` },
        payload: { name: 'Bad Key', permissions: 'admin' },
      });

      expect(res.statusCode).toBe(422);
    });
  });

  describe('GET /api/v1/tenants/:tenantId/api-keys', () => {
    it('should list API keys', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/tenants/${tenantId}/api-keys`,
        headers: { authorization: `Bearer ${token}` },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.data.length).toBeGreaterThan(0);
    });

    it('should not return full key in listing', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/tenants/${tenantId}/api-keys`,
        headers: { authorization: `Bearer ${token}` },
      });

      const body = JSON.parse(res.body);
      for (const key of body.data) {
        expect(key.key).toBeUndefined();
        expect(key.keyHash).toBeUndefined();
      }
    });
  });

  describe('DELETE /api/v1/tenants/:tenantId/api-keys/:keyId', () => {
    it('should revoke an API key', async () => {
      // Create a key to revoke
      const createRes = await app.inject({
        method: 'POST',
        url: `/api/v1/tenants/${tenantId}/api-keys`,
        headers: { authorization: `Bearer ${token}` },
        payload: { name: 'To Revoke', permissions: 'read' },
      });
      const keyId = JSON.parse(createRes.body).data.id;

      const res = await app.inject({
        method: 'DELETE',
        url: `/api/v1/tenants/${tenantId}/api-keys/${keyId}`,
        headers: { authorization: `Bearer ${token}` },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.data.message).toContain('revoked');
    });

    it('should return 404 for non-existent key', async () => {
      const res = await app.inject({
        method: 'DELETE',
        url: `/api/v1/tenants/${tenantId}/api-keys/non-existent`,
        headers: { authorization: `Bearer ${token}` },
      });

      expect(res.statusCode).toBe(404);
    });
  });
});
