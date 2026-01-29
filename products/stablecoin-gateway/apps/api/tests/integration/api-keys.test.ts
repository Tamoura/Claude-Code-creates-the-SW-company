import { buildApp } from '../../src/app';
import { FastifyInstance } from 'fastify';

/**
 * API Key CRUD Tests
 *
 * Tests creation, listing, retrieval, and deletion of API keys.
 * Verifies security (key only shown on creation) and permissions enforcement.
 */

describe('API Keys CRUD', () => {
  let app: FastifyInstance;
  let accessToken: string;

  beforeAll(async () => {
    app = await buildApp();

    // Create test user
    const signupResponse = await app.inject({
      method: 'POST',
      url: '/v1/auth/signup',
      payload: {
        email: 'apikey-test@example.com',
        password: 'SecurePass123!',
      },
    });

    const body = signupResponse.json();
    accessToken = body.access_token;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /v1/api-keys', () => {
    it('should require authentication', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/v1/api-keys',
        payload: {
          name: 'Test Key',
        },
      });

      expect(response.statusCode).toBe(401);
    });

    it('should create API key with default permissions', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/v1/api-keys',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
        payload: {
          name: 'My First API Key',
        },
      });

      expect(response.statusCode).toBe(201);
      const body = response.json();

      expect(body).toHaveProperty('id');
      expect(body).toHaveProperty('key'); // Only shown on creation
      expect(body.key).toMatch(/^sk_live_[a-f0-9]{64}$/); // Format: sk_live_<64 hex chars>
      expect(body.name).toBe('My First API Key');
      expect(body.key_prefix).toMatch(/^sk_live_[a-f0-9]{8}\.\.\.$/); // First 16 chars + "..."
      expect(body.permissions).toEqual({
        read: true,
        write: true,
        refund: false,
      });
      expect(body.last_used_at).toBeNull();
      expect(body).toHaveProperty('created_at');
    });

    it('should create API key with custom permissions', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/v1/api-keys',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
        payload: {
          name: 'Read-Only Key',
          permissions: {
            read: true,
            write: false,
            refund: false,
          },
        },
      });

      expect(response.statusCode).toBe(201);
      const body = response.json();

      expect(body.permissions).toEqual({
        read: true,
        write: false,
        refund: false,
      });
    });

    it('should reject invalid name', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/v1/api-keys',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
        payload: {
          name: '', // Empty name
        },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('GET /v1/api-keys', () => {
    it('should require authentication', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/v1/api-keys',
      });

      expect(response.statusCode).toBe(401);
    });

    it('should list user API keys (without full keys)', async () => {
      // Create 2 keys
      await app.inject({
        method: 'POST',
        url: '/v1/api-keys',
        headers: { authorization: `Bearer ${accessToken}` },
        payload: { name: 'Key 1' },
      });

      await app.inject({
        method: 'POST',
        url: '/v1/api-keys',
        headers: { authorization: `Bearer ${accessToken}` },
        payload: { name: 'Key 2' },
      });

      // List keys
      const response = await app.inject({
        method: 'GET',
        url: '/v1/api-keys',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();

      expect(body).toHaveProperty('data');
      expect(Array.isArray(body.data)).toBe(true);
      expect(body.data.length).toBeGreaterThanOrEqual(2);

      // Keys should NOT be returned (security)
      body.data.forEach((key: any) => {
        expect(key).not.toHaveProperty('key');
        expect(key).toHaveProperty('key_prefix');
        expect(key).toHaveProperty('name');
        expect(key).toHaveProperty('permissions');
      });
    });

    it('should only list keys owned by current user', async () => {
      // Create second user
      const user2Signup = await app.inject({
        method: 'POST',
        url: '/v1/auth/signup',
        payload: {
          email: 'apikey-test-2@example.com',
          password: 'SecurePass123!',
        },
      });

      const user2Token = user2Signup.json().access_token;

      // User 2 creates a key
      await app.inject({
        method: 'POST',
        url: '/v1/api-keys',
        headers: { authorization: `Bearer ${user2Token}` },
        payload: { name: 'User 2 Key' },
      });

      // User 1 lists keys - should not see User 2's key
      const response = await app.inject({
        method: 'GET',
        url: '/v1/api-keys',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
      });

      const body = response.json();
      const user2KeyInList = body.data.some((k: any) => k.name === 'User 2 Key');
      expect(user2KeyInList).toBe(false);
    });
  });

  describe('GET /v1/api-keys/:id', () => {
    let testKeyId: string;

    beforeAll(async () => {
      const createResponse = await app.inject({
        method: 'POST',
        url: '/v1/api-keys',
        headers: { authorization: `Bearer ${accessToken}` },
        payload: { name: 'Get Test Key' },
      });
      testKeyId = createResponse.json().id;
    });

    it('should require authentication', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/v1/api-keys/${testKeyId}`,
      });

      expect(response.statusCode).toBe(401);
    });

    it('should get specific API key (without full key)', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/v1/api-keys/${testKeyId}`,
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();

      expect(body.id).toBe(testKeyId);
      expect(body.name).toBe('Get Test Key');
      expect(body).not.toHaveProperty('key'); // Security: never return full key after creation
      expect(body).toHaveProperty('key_prefix');
    });

    it('should return 404 for non-existent key', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/v1/api-keys/non-existent-id',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
      });

      expect(response.statusCode).toBe(404);
    });

    it('should return 404 for key owned by another user', async () => {
      // Create second user with a key
      const user2Signup = await app.inject({
        method: 'POST',
        url: '/v1/auth/signup',
        payload: {
          email: 'apikey-test-3@example.com',
          password: 'SecurePass123!',
        },
      });

      const user2Token = user2Signup.json().access_token;

      const user2KeyResponse = await app.inject({
        method: 'POST',
        url: '/v1/api-keys',
        headers: { authorization: `Bearer ${user2Token}` },
        payload: { name: 'User 2 Private Key' },
      });

      const user2KeyId = user2KeyResponse.json().id;

      // User 1 tries to access User 2's key
      const response = await app.inject({
        method: 'GET',
        url: `/v1/api-keys/${user2KeyId}`,
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
      });

      expect(response.statusCode).toBe(404); // Not found (security: don't reveal existence)
    });
  });

  describe('DELETE /v1/api-keys/:id', () => {
    let deleteKeyId: string;

    beforeEach(async () => {
      const createResponse = await app.inject({
        method: 'POST',
        url: '/v1/api-keys',
        headers: { authorization: `Bearer ${accessToken}` },
        payload: { name: 'Key to Delete' },
      });
      deleteKeyId = createResponse.json().id;
    });

    it('should require authentication', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: `/v1/api-keys/${deleteKeyId}`,
      });

      expect(response.statusCode).toBe(401);
    });

    it('should delete API key', async () => {
      const deleteResponse = await app.inject({
        method: 'DELETE',
        url: `/v1/api-keys/${deleteKeyId}`,
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
      });

      expect(deleteResponse.statusCode).toBe(204);

      // Verify key is deleted
      const getResponse = await app.inject({
        method: 'GET',
        url: `/v1/api-keys/${deleteKeyId}`,
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
      });

      expect(getResponse.statusCode).toBe(404);
    });

    it('should return 404 for non-existent key', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: '/v1/api-keys/non-existent-id',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
      });

      expect(response.statusCode).toBe(404);
    });

    it('should return 404 when trying to delete another user key', async () => {
      // Create second user with a key
      const user2Signup = await app.inject({
        method: 'POST',
        url: '/v1/auth/signup',
        payload: {
          email: 'apikey-test-4@example.com',
          password: 'SecurePass123!',
        },
      });

      const user2Token = user2Signup.json().access_token;

      const user2KeyResponse = await app.inject({
        method: 'POST',
        url: '/v1/api-keys',
        headers: { authorization: `Bearer ${user2Token}` },
        payload: { name: 'User 2 Protected Key' },
      });

      const user2KeyId = user2KeyResponse.json().id;

      // User 1 tries to delete User 2's key
      const response = await app.inject({
        method: 'DELETE',
        url: `/v1/api-keys/${user2KeyId}`,
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
      });

      expect(response.statusCode).toBe(404); // Not found (security)
    });
  });
});
