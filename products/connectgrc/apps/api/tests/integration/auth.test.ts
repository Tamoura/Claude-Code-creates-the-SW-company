import { FastifyInstance } from 'fastify';
import { createTestApp, cleanDb, setupTestDb, closeDb, prisma } from '../helpers/build-app';
import { generateToken } from '../../src/utils/crypto';

describe('Auth Routes', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    await setupTestDb();
  });

  beforeEach(async () => {
    await cleanDb();
    app = await createTestApp();
  });

  afterEach(async () => {
    await app.close();
  });

  afterAll(async () => {
    await closeDb();
  });

  describe('POST /auth/register', () => {
    it('should register a new user', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: {
          email: 'test@example.com',
          password: 'Test1234',
          name: 'Test User',
          role: 'TALENT',
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.message).toBeDefined();
      expect(body.user).toMatchObject({
        email: 'test@example.com',
        name: 'Test User',
        role: 'TALENT',
      });

      // Verify user in DB
      const user = await prisma.user.findUnique({
        where: { email: 'test@example.com' },
      });
      expect(user).toBeTruthy();
      expect(user?.emailVerified).toBe(false);

      // Verify email verification token created
      const verification = await prisma.emailVerification.findFirst({
        where: { email: 'test@example.com' },
      });
      expect(verification).toBeTruthy();
    });

    it('should reject weak password', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: {
          email: 'test@example.com',
          password: 'weak',
          name: 'Test User',
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should reject duplicate email', async () => {
      await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: {
          email: 'test@example.com',
          password: 'Test1234',
          name: 'Test User',
        },
      });

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: {
          email: 'test@example.com',
          password: 'Test1234',
          name: 'Another User',
        },
      });

      expect(response.statusCode).toBe(409);
      const body = JSON.parse(response.body);
      // Support both error formats (nested and flat)
      const code = body.error?.code || body.code;
      expect(code).toBe('CONFLICT');
    });

    it('should reject invalid email', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: {
          email: 'invalid-email',
          password: 'Test1234',
          name: 'Test User',
        },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('POST /auth/login', () => {
    beforeEach(async () => {
      // Create verified user
      await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: {
          email: 'test@example.com',
          password: 'Test1234',
          name: 'Test User',
        },
      });
      await prisma.user.update({
        where: { email: 'test@example.com' },
        data: { emailVerified: true },
      });
    });

    it('should login with valid credentials', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: {
          email: 'test@example.com',
          password: 'Test1234',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.accessToken).toBeDefined();
      expect(body.refreshToken).toBeDefined();
      expect(body.user).toMatchObject({
        email: 'test@example.com',
        name: 'Test User',
      });

      // Verify session created
      const session = await prisma.session.findFirst({
        where: { userId: body.user.id },
      });
      expect(session).toBeTruthy();
    });

    it('should reject unverified email', async () => {
      await prisma.user.update({
        where: { email: 'test@example.com' },
        data: { emailVerified: false },
      });

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: {
          email: 'test@example.com',
          password: 'Test1234',
        },
      });

      expect(response.statusCode).toBe(401);
      const body = JSON.parse(response.body);
      const message = body.error?.message || body.message;
      expect(message).toContain('verify');
    });

    it('should reject invalid password', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: {
          email: 'test@example.com',
          password: 'WrongPass123',
        },
      });

      expect(response.statusCode).toBe(401);
    });

    it('should reject non-existent user', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: {
          email: 'nonexistent@example.com',
          password: 'Test1234',
        },
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe('POST /auth/refresh', () => {
    let refreshToken: string;
    let userId: string;

    beforeEach(async () => {
      // Register and login
      await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: {
          email: 'test@example.com',
          password: 'Test1234',
          name: 'Test User',
        },
      });
      await prisma.user.update({
        where: { email: 'test@example.com' },
        data: { emailVerified: true },
      });

      const loginResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: {
          email: 'test@example.com',
          password: 'Test1234',
        },
      });

      const body = JSON.parse(loginResponse.body);
      refreshToken = body.refreshToken;
      userId = body.user.id;
    });

    it('should refresh tokens with valid refresh token', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/refresh',
        payload: {
          refreshToken,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.accessToken).toBeDefined();
      expect(body.refreshToken).toBeDefined();
      expect(body.refreshToken).not.toBe(refreshToken); // New token

      // Old session should be deleted
      const oldSession = await prisma.session.findFirst({
        where: { refreshToken },
      });
      expect(oldSession).toBeNull();

      // New session should exist
      const newSession = await prisma.session.findFirst({
        where: { refreshToken: body.refreshToken },
      });
      expect(newSession).toBeTruthy();
    });

    it('should reject invalid refresh token', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/refresh',
        payload: {
          refreshToken: 'invalid-token',
        },
      });

      expect(response.statusCode).toBe(401);
    });

    it('should reject reused refresh token', async () => {
      // Use token once
      await app.inject({
        method: 'POST',
        url: '/api/v1/auth/refresh',
        payload: { refreshToken },
      });

      // Try to reuse
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/refresh',
        payload: { refreshToken },
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe('DELETE /auth/logout', () => {
    let accessToken: string;
    let refreshToken: string;

    beforeEach(async () => {
      await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: {
          email: 'test@example.com',
          password: 'Test1234',
          name: 'Test User',
        },
      });
      await prisma.user.update({
        where: { email: 'test@example.com' },
        data: { emailVerified: true },
      });

      const loginResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: {
          email: 'test@example.com',
          password: 'Test1234',
        },
      });

      const body = JSON.parse(loginResponse.body);
      accessToken = body.accessToken;
      refreshToken = body.refreshToken;
    });

    it('should logout and delete session', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: '/api/v1/auth/logout',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
      });

      expect(response.statusCode).toBe(200);

      // Session should be deleted
      const session = await prisma.session.findFirst({
        where: { refreshToken },
      });
      expect(session).toBeNull();
    });

    it('should require authentication', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: '/api/v1/auth/logout',
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe('POST /auth/verify-email', () => {
    let token: string;

    beforeEach(async () => {
      await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: {
          email: 'test@example.com',
          password: 'Test1234',
          name: 'Test User',
        },
      });

      const verification = await prisma.emailVerification.findFirst({
        where: { email: 'test@example.com' },
      });
      token = verification!.token;
    });

    it('should verify email with valid token', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/verify-email',
        payload: { token },
      });

      expect(response.statusCode).toBe(200);

      const user = await prisma.user.findUnique({
        where: { email: 'test@example.com' },
      });
      expect(user?.emailVerified).toBe(true);
    });

    it('should reject invalid token', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/verify-email',
        payload: { token: 'invalid-token' },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should reject expired token', async () => {
      // Expire the token
      await prisma.emailVerification.update({
        where: { token },
        data: { expiresAt: new Date(Date.now() - 1000) },
      });

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/verify-email',
        payload: { token },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('POST /auth/forgot-password', () => {
    beforeEach(async () => {
      await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: {
          email: 'test@example.com',
          password: 'Test1234',
          name: 'Test User',
        },
      });
    });

    it('should create password reset token', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/forgot-password',
        payload: { email: 'test@example.com' },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.message).toBeDefined();

      const reset = await prisma.passwordReset.findFirst({
        where: { email: 'test@example.com' },
      });
      expect(reset).toBeTruthy();
    });

    it('should not reveal if email does not exist', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/forgot-password',
        payload: { email: 'nonexistent@example.com' },
      });

      expect(response.statusCode).toBe(200);
    });
  });

  describe('POST /auth/reset-password', () => {
    let token: string;

    beforeEach(async () => {
      await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: {
          email: 'test@example.com',
          password: 'Test1234',
          name: 'Test User',
        },
      });

      await app.inject({
        method: 'POST',
        url: '/api/v1/auth/forgot-password',
        payload: { email: 'test@example.com' },
      });

      const reset = await prisma.passwordReset.findFirst({
        where: { email: 'test@example.com' },
      });
      token = reset!.token;
    });

    it('should reset password with valid token', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/reset-password',
        payload: {
          token,
          newPassword: 'NewPass1234',
        },
      });

      expect(response.statusCode).toBe(200);

      // Should be able to login with new password
      await prisma.user.update({
        where: { email: 'test@example.com' },
        data: { emailVerified: true },
      });

      const loginResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: {
          email: 'test@example.com',
          password: 'NewPass1234',
        },
      });

      expect(loginResponse.statusCode).toBe(200);
    });

    it('should reject weak new password', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/reset-password',
        payload: {
          token,
          newPassword: 'weak',
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should reject invalid token', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/reset-password',
        payload: {
          token: 'invalid-token',
          newPassword: 'NewPass1234',
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should reject already used token', async () => {
      await app.inject({
        method: 'POST',
        url: '/api/v1/auth/reset-password',
        payload: {
          token,
          newPassword: 'NewPass1234',
        },
      });

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/reset-password',
        payload: {
          token,
          newPassword: 'AnotherPass1234',
        },
      });

      expect(response.statusCode).toBe(400);
    });
  });
});
