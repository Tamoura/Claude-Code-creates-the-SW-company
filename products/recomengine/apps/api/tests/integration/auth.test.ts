import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { FastifyInstance } from 'fastify';
import { buildTestServer } from './test-helpers';

describe('Auth Routes', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildTestServer();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /api/v1/auth/signup', () => {
    it('should create a new account and return token', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/signup',
        payload: { email: 'signup@example.com', password: 'securepass123' },
      });

      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res.body);
      expect(body.data.token).toBeDefined();
      expect(body.data.user.email).toBe('signup@example.com');
      expect(body.data.user.id).toBeDefined();
    });

    it('should reject duplicate email', async () => {
      // First signup
      await app.inject({
        method: 'POST',
        url: '/api/v1/auth/signup',
        payload: { email: 'dup@example.com', password: 'securepass123' },
      });

      // Second signup with same email
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/signup',
        payload: { email: 'dup@example.com', password: 'otherpass123' },
      });

      expect(res.statusCode).toBe(409);
    });

    it('should reject invalid email', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/signup',
        payload: { email: 'not-email', password: 'securepass123' },
      });

      expect(res.statusCode).toBe(422);
    });

    it('should reject short password', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/signup',
        payload: { email: 'valid@example.com', password: 'short' },
      });

      expect(res.statusCode).toBe(422);
    });
  });

  describe('POST /api/v1/auth/login', () => {
    it('should login with valid credentials', async () => {
      // First create user
      await app.inject({
        method: 'POST',
        url: '/api/v1/auth/signup',
        payload: { email: 'login@example.com', password: 'securepass123' },
      });

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: { email: 'login@example.com', password: 'securepass123' },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.data.token).toBeDefined();
      expect(body.data.user.email).toBe('login@example.com');
    });

    it('should reject wrong password', async () => {
      await app.inject({
        method: 'POST',
        url: '/api/v1/auth/signup',
        payload: { email: 'wrongpw@example.com', password: 'securepass123' },
      });

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: { email: 'wrongpw@example.com', password: 'wrongpassword' },
      });

      expect(res.statusCode).toBe(401);
    });

    it('should reject non-existent user', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: { email: 'noone@example.com', password: 'securepass123' },
      });

      expect(res.statusCode).toBe(401);
    });
  });

  describe('POST /api/v1/auth/logout', () => {
    it('should require authentication', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/logout',
      });

      expect(res.statusCode).toBe(401);
    });

    it('should logout authenticated user', async () => {
      const signupRes = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/signup',
        payload: { email: 'logout@example.com', password: 'securepass123' },
      });
      const token = JSON.parse(signupRes.body).data.token;

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/logout',
        headers: { authorization: `Bearer ${token}` },
      });

      expect(res.statusCode).toBe(200);
    });
  });

  describe('POST /api/v1/auth/forgot-password', () => {
    it('should always return success (anti-enumeration)', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/forgot-password',
        payload: { email: 'noexist@example.com' },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.data.message).toContain('reset link');
    });
  });

  describe('POST /api/v1/auth/reset-password', () => {
    it('should reject missing fields', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/reset-password',
        payload: {},
      });

      expect(res.statusCode).toBe(400);
    });

    it('should reject short password', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/reset-password',
        payload: { token: 'some-token', password: 'short' },
      });

      expect(res.statusCode).toBe(400);
    });
  });
});
