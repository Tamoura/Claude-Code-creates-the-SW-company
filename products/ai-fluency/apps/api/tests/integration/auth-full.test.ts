/**
 * tests/integration/auth-full.test.ts — Full auth routes integration tests
 *
 * TDD RED phase: Tests written FIRST.
 * Implementation in src/routes/auth.ts + src/services/auth.service.ts
 *
 * Covers:
 * - POST /api/v1/auth/register
 * - POST /api/v1/auth/login
 * - POST /api/v1/auth/refresh
 * - POST /api/v1/auth/logout
 */

import { FastifyInstance } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { buildApp } from '../../src/app';
import { createTestOrg, cleanupTestOrg, TestContext } from '../helpers/test-org';

describe('[AUTH] Full Auth Routes', () => {
  let app: FastifyInstance;
  let ctx: TestContext;
  let prisma: PrismaClient;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
    prisma = app.prisma as PrismaClient;
    ctx = await createTestOrg(app);
  });

  afterAll(async () => {
    await cleanupTestOrg(ctx.org.id, prisma);
    await app.close();
  });

  // ─────────────────────────────────────────────────────────────────────────
  // POST /api/v1/auth/register
  // ─────────────────────────────────────────────────────────────────────────

  describe('POST /api/v1/auth/register', () => {
    const uniqueEmail = () => `reg-${Date.now()}-${Math.random().toString(36).slice(2)}@test.example.com`;

    test('creates user and returns JWT tokens with 201', async () => {
      const email = uniqueEmail();
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: {
          email,
          password: 'SecurePass123!@#',
          firstName: 'Test',
          lastName: 'User',
          orgId: ctx.org.id,
        },
      });

      expect(response.statusCode).toBe(201);
      const body = response.json();
      expect(body).toHaveProperty('accessToken');
      expect(body).toHaveProperty('refreshToken');
      expect(body).toHaveProperty('user');
      expect(body.user.email).toBe(email);
      expect(body.user.firstName).toBe('Test');
      expect(body.user.lastName).toBe('User');
      expect(body.user).not.toHaveProperty('passwordHash');

      // Cleanup
      await prisma.userSession.deleteMany({ where: { userId: body.user.id } });
      await prisma.user.delete({ where: { id: body.user.id } });
    });

    test('stores argon2 password hash in DB', async () => {
      const email = uniqueEmail();
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: {
          email,
          password: 'SecurePass123!@#',
          firstName: 'Hash',
          lastName: 'Test',
          orgId: ctx.org.id,
        },
      });

      const body = response.json();
      const user = await prisma.user.findUnique({ where: { id: body.user.id } });
      expect(user?.passwordHash).toBeTruthy();
      expect(user?.passwordHash).toMatch(/^\$argon2/);

      // Cleanup
      await prisma.userSession.deleteMany({ where: { userId: body.user.id } });
      await prisma.user.delete({ where: { id: body.user.id } });
    });

    test('stores refresh token hash (SHA-256) in UserSession', async () => {
      const email = uniqueEmail();
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: {
          email,
          password: 'SecurePass123!@#',
          firstName: 'Session',
          lastName: 'Test',
          orgId: ctx.org.id,
        },
      });

      const body = response.json();
      const sessions = await prisma.userSession.findMany({
        where: { userId: body.user.id },
      });
      expect(sessions).toHaveLength(1);
      expect(sessions[0].refreshTokenHash).toHaveLength(64); // SHA-256 hex

      // Cleanup
      await prisma.userSession.deleteMany({ where: { userId: body.user.id } });
      await prisma.user.delete({ where: { id: body.user.id } });
    });

    test('returns 400 for missing required fields', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: { email: 'test@example.com' }, // Missing password, names, orgId
      });

      expect(response.statusCode).toBe(400);
      const body = response.json();
      expect(body).toHaveProperty('type');
      expect(body).toHaveProperty('status', 400);
    });

    test('returns 400 for invalid email format', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: {
          email: 'not-an-email',
          password: 'SecurePass123!@#',
          firstName: 'Test',
          lastName: 'User',
          orgId: ctx.org.id,
        },
      });

      expect(response.statusCode).toBe(400);
    });

    test('returns 400 for weak password (too short)', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: {
          email: uniqueEmail(),
          password: 'Ab1!',
          firstName: 'Test',
          lastName: 'User',
          orgId: ctx.org.id,
        },
      });

      expect(response.statusCode).toBe(400);
    });

    test('returns 409 for duplicate email within same org', async () => {
      const email = uniqueEmail();

      // Register first
      const first = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: {
          email,
          password: 'SecurePass123!@#',
          firstName: 'First',
          lastName: 'User',
          orgId: ctx.org.id,
        },
      });
      const firstBody = first.json();

      // Register again with same email
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: {
          email,
          password: 'SecurePass123!@#',
          firstName: 'Second',
          lastName: 'User',
          orgId: ctx.org.id,
        },
      });

      expect(response.statusCode).toBe(409);
      const body = response.json();
      expect(body).toHaveProperty('status', 409);

      // Cleanup
      await prisma.userSession.deleteMany({ where: { userId: firstBody.user.id } });
      await prisma.user.delete({ where: { id: firstBody.user.id } });
    });

    test('user default role is LEARNER', async () => {
      const email = uniqueEmail();
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: {
          email,
          password: 'SecurePass123!@#',
          firstName: 'Role',
          lastName: 'Test',
          orgId: ctx.org.id,
        },
      });

      const body = response.json();
      expect(body.user.role).toBe('LEARNER');

      // Cleanup
      await prisma.userSession.deleteMany({ where: { userId: body.user.id } });
      await prisma.user.delete({ where: { id: body.user.id } });
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // POST /api/v1/auth/login
  // ─────────────────────────────────────────────────────────────────────────

  describe('POST /api/v1/auth/login', () => {
    let loginUserEmail: string;
    let loginUserId: string;

    beforeAll(async () => {
      loginUserEmail = `login-${Date.now()}@test.example.com`;
      // Register a user to test login
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: {
          email: loginUserEmail,
          password: 'LoginPass123!@#',
          firstName: 'Login',
          lastName: 'Tester',
          orgId: ctx.org.id,
        },
      });
      loginUserId = response.json().user.id;
    });

    afterAll(async () => {
      await prisma.userSession.deleteMany({ where: { userId: loginUserId } });
      await prisma.user.delete({ where: { id: loginUserId } });
    });

    test('returns JWT tokens with valid credentials', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: {
          email: loginUserEmail,
          password: 'LoginPass123!@#',
          orgId: ctx.org.id,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body).toHaveProperty('accessToken');
      expect(body).toHaveProperty('refreshToken');
      expect(body).toHaveProperty('user');
      expect(body.user.email).toBe(loginUserEmail);
    });

    test('returns 401 for wrong password', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: {
          email: loginUserEmail,
          password: 'WrongPassword!@#',
          orgId: ctx.org.id,
        },
      });

      expect(response.statusCode).toBe(401);
      const body = response.json();
      expect(body).toHaveProperty('status', 401);
    });

    test('returns 401 for non-existent email', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: {
          email: 'nonexistent@test.example.com',
          password: 'AnyPass123!@#',
          orgId: ctx.org.id,
        },
      });

      expect(response.statusCode).toBe(401);
    });

    test('returns 400 for missing fields', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: { email: loginUserEmail },
      });

      expect(response.statusCode).toBe(400);
    });

    test('updates lastLoginAt on successful login', async () => {
      await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: {
          email: loginUserEmail,
          password: 'LoginPass123!@#',
          orgId: ctx.org.id,
        },
      });

      const user = await prisma.user.findUnique({ where: { id: loginUserId } });
      expect(user?.lastLoginAt).not.toBeNull();
    });

    test('generic error message prevents user enumeration', async () => {
      const wrongEmailRes = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: {
          email: 'nonexistent@test.example.com',
          password: 'AnyPass123!@#',
          orgId: ctx.org.id,
        },
      });

      const wrongPassRes = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: {
          email: loginUserEmail,
          password: 'WrongPassword!@#',
          orgId: ctx.org.id,
        },
      });

      // Both should return the same error message
      expect(wrongEmailRes.json().detail).toBe(wrongPassRes.json().detail);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // POST /api/v1/auth/refresh
  // ─────────────────────────────────────────────────────────────────────────

  describe('POST /api/v1/auth/refresh', () => {
    let refreshUserEmail: string;
    let refreshUserId: string;
    let refreshToken: string;

    beforeAll(async () => {
      refreshUserEmail = `refresh-${Date.now()}@test.example.com`;
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: {
          email: refreshUserEmail,
          password: 'RefreshPass123!@#',
          firstName: 'Refresh',
          lastName: 'Tester',
          orgId: ctx.org.id,
        },
      });
      const body = response.json();
      refreshUserId = body.user.id;
      refreshToken = body.refreshToken;
    });

    afterAll(async () => {
      await prisma.userSession.deleteMany({ where: { userId: refreshUserId } });
      await prisma.user.delete({ where: { id: refreshUserId } });
    });

    test('returns new access token with valid refresh token', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/refresh',
        payload: { refreshToken },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body).toHaveProperty('accessToken');
      expect(typeof body.accessToken).toBe('string');
    });

    test('returns 401 for invalid refresh token', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/refresh',
        payload: { refreshToken: 'invalid-token' },
      });

      expect(response.statusCode).toBe(401);
    });

    test('returns 400 for missing refreshToken', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/refresh',
        payload: {},
      });

      expect(response.statusCode).toBe(400);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // POST /api/v1/auth/logout
  // ─────────────────────────────────────────────────────────────────────────

  describe('POST /api/v1/auth/logout', () => {
    test('invalidates refresh token and returns 200', async () => {
      // Register a fresh user for this test
      const email = `logout-${Date.now()}@test.example.com`;
      const regRes = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: {
          email,
          password: 'LogoutPass123!@#',
          firstName: 'Logout',
          lastName: 'Tester',
          orgId: ctx.org.id,
        },
      });
      const regBody = regRes.json();
      const userId = regBody.user.id;
      const refreshToken = regBody.refreshToken;
      const accessToken = regBody.accessToken;

      // Logout
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/logout',
        headers: { authorization: `Bearer ${accessToken}` },
        payload: { refreshToken },
      });

      expect(response.statusCode).toBe(200);

      // Verify refresh token is invalidated
      const refreshRes = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/refresh',
        payload: { refreshToken },
      });
      expect(refreshRes.statusCode).toBe(401);

      // Cleanup
      await prisma.userSession.deleteMany({ where: { userId } });
      await prisma.user.delete({ where: { id: userId } });
    });

    test('returns 401 without authentication', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/logout',
        payload: { refreshToken: 'some-token' },
      });

      expect(response.statusCode).toBe(401);
    });
  });
});
