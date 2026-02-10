import { FastifyInstance } from 'fastify';
import {
  createTestApp,
  setupTestData,
  createTestUser,
  cleanDatabase,
} from '../helpers/test-utils';

describe('Auth Routes', () => {
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

  describe('POST /api/v1/auth/register', () => {
    it('registers a new investor user', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: {
          email: 'investor@test.qa',
          password: 'SecurePass123!',
          role: 'INVESTOR',
          tenantId,
        },
      });

      expect(response.statusCode).toBe(201);
      const body = response.json();
      expect(body.data).toHaveProperty('id');
      expect(body.data.email).toBe('investor@test.qa');
      expect(body.data.role).toBe('INVESTOR');
      expect(body.data).not.toHaveProperty('passwordHash');
    });

    it('registers a new issuer user', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: {
          email: 'issuer@test.qa',
          password: 'SecurePass123!',
          role: 'ISSUER',
          tenantId,
          companyNameEn: 'Qatar Tech Ltd',
        },
      });

      expect(response.statusCode).toBe(201);
      const body = response.json();
      expect(body.data.role).toBe('ISSUER');
    });

    it('returns 400 for invalid email', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: {
          email: 'not-an-email',
          password: 'SecurePass123!',
          role: 'INVESTOR',
          tenantId,
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it('returns 400 for weak password', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: {
          email: 'user@test.qa',
          password: '123',
          role: 'INVESTOR',
          tenantId,
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it('returns 409 for duplicate email', async () => {
      await createTestUser({ tenantId, email: 'existing@test.qa' });

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: {
          email: 'existing@test.qa',
          password: 'SecurePass123!',
          role: 'INVESTOR',
          tenantId,
        },
      });

      expect(response.statusCode).toBe(409);
    });
  });

  describe('POST /api/v1/auth/login', () => {
    beforeEach(async () => {
      await createTestUser({
        tenantId,
        email: 'login@test.qa',
        password: 'SecurePass123!',
      });
    });

    it('returns access and refresh tokens on valid login', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: {
          email: 'login@test.qa',
          password: 'SecurePass123!',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.data).toHaveProperty('accessToken');
      expect(body.data).toHaveProperty('refreshToken');
      expect(typeof body.data.accessToken).toBe('string');
      expect(typeof body.data.refreshToken).toBe('string');
    });

    it('returns 401 for wrong password', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: {
          email: 'login@test.qa',
          password: 'WrongPassword!',
        },
      });

      expect(response.statusCode).toBe(401);
    });

    it('returns 401 for non-existent user', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: {
          email: 'nobody@test.qa',
          password: 'SecurePass123!',
        },
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe('POST /api/v1/auth/refresh', () => {
    it('returns new tokens on valid refresh', async () => {
      await createTestUser({
        tenantId,
        email: 'refresh@test.qa',
        password: 'SecurePass123!',
      });

      const loginRes = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: { email: 'refresh@test.qa', password: 'SecurePass123!' },
      });

      const { refreshToken } = loginRes.json().data;

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/refresh',
        payload: { refreshToken },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.data).toHaveProperty('accessToken');
      expect(body.data).toHaveProperty('refreshToken');
      // New refresh token should be different (rotation)
      expect(body.data.refreshToken).not.toBe(refreshToken);
    });

    it('returns 401 for invalid refresh token', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/refresh',
        payload: { refreshToken: 'invalid-token' },
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe('POST /api/v1/auth/logout', () => {
    it('revokes the refresh token', async () => {
      await createTestUser({
        tenantId,
        email: 'logout@test.qa',
        password: 'SecurePass123!',
      });

      const loginRes = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: { email: 'logout@test.qa', password: 'SecurePass123!' },
      });

      const { accessToken, refreshToken } = loginRes.json().data;

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/logout',
        headers: { authorization: `Bearer ${accessToken}` },
        payload: { refreshToken },
      });

      expect(response.statusCode).toBe(200);

      // Verify refresh token is revoked
      const retryRefresh = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/refresh',
        payload: { refreshToken },
      });

      expect(retryRefresh.statusCode).toBe(401);
    });
  });
});
