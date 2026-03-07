/**
 * tests/integration/auth-endpoints.test.ts — Auth endpoint integration tests
 *
 * Tests POST /api/v1/auth/register, POST /api/v1/auth/login, GET /api/v1/auth/me
 * with real database — no mocks.
 */

import { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/app';
import { PrismaClient } from '@prisma/client';

describe('Auth Endpoints', () => {
  let app: FastifyInstance;
  let orgId: string;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();

    // Create a default org for registration
    const org = await app.prisma.organization.create({
      data: {
        name: 'Auth Test Org',
        slug: `auth-test-org-${Date.now()}`,
        status: 'ACTIVE',
        plan: 'TRIAL',
      },
    });
    orgId = org.id;
  });

  afterAll(async () => {
    // Cleanup in FK-safe order
    await app.prisma.userSession.deleteMany({ where: { orgId } });
    await app.prisma.user.deleteMany({ where: { orgId } });
    await app.prisma.organization.deleteMany({ where: { id: orgId } });
    await app.close();
  });

  // ─────────────────────────────────────────────────────────
  // POST /api/v1/auth/register
  // ─────────────────────────────────────────────────────────

  describe('POST /api/v1/auth/register', () => {
    test('creates user and returns JWT with valid input', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: {
          email: `reg-${Date.now()}@test.example.com`,
          firstName: 'Test',
          lastName: 'User',
          password: 'SecurePass123!@#',
          orgSlug: (await app.prisma.organization.findUnique({ where: { id: orgId } }))!.slug,
        },
      });

      expect(response.statusCode).toBe(201);
      const body = response.json();
      expect(body.token).toBeDefined();
      expect(typeof body.token).toBe('string');
      expect(body.user).toBeDefined();
      expect(body.user.email).toContain('@test.example.com');
      expect(body.user.firstName).toBe('Test');
      expect(body.user.lastName).toBe('User');
      expect(body.user.role).toBe('LEARNER');
      // Must not leak password hash
      expect(body.user.passwordHash).toBeUndefined();
    });

    test('returns 400 for missing required fields', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: { email: 'no-password@test.example.com' },
      });

      expect(response.statusCode).toBe(400);
    });

    test('returns 400 for invalid email', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: {
          email: 'not-an-email',
          firstName: 'Test',
          lastName: 'User',
          password: 'SecurePass123!@#',
          orgSlug: 'does-not-matter',
        },
      });

      expect(response.statusCode).toBe(400);
    });

    test('returns 400 for weak password', async () => {
      const org = await app.prisma.organization.findUnique({ where: { id: orgId } });
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: {
          email: `weak-${Date.now()}@test.example.com`,
          firstName: 'Test',
          lastName: 'User',
          password: '123',
          orgSlug: org!.slug,
        },
      });

      expect(response.statusCode).toBe(400);
    });

    test('returns 404 for non-existent org slug', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: {
          email: `new-${Date.now()}@test.example.com`,
          firstName: 'Test',
          lastName: 'User',
          password: 'SecurePass123!@#',
          orgSlug: 'non-existent-org-slug-xyz',
        },
      });

      expect(response.statusCode).toBe(404);
    });

    test('returns 409 for duplicate email within same org', async () => {
      const org = await app.prisma.organization.findUnique({ where: { id: orgId } });
      const email = `dup-${Date.now()}@test.example.com`;

      // First registration
      await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: {
          email,
          firstName: 'First',
          lastName: 'User',
          password: 'SecurePass123!@#',
          orgSlug: org!.slug,
        },
      });

      // Second registration with same email
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: {
          email,
          firstName: 'Second',
          lastName: 'User',
          password: 'SecurePass123!@#',
          orgSlug: org!.slug,
        },
      });

      expect(response.statusCode).toBe(409);
    });
  });

  // ─────────────────────────────────────────────────────────
  // POST /api/v1/auth/login
  // ─────────────────────────────────────────────────────────

  describe('POST /api/v1/auth/login', () => {
    let loginEmail: string;
    const loginPassword = 'SecurePass123!@#';

    beforeAll(async () => {
      const org = await app.prisma.organization.findUnique({ where: { id: orgId } });
      loginEmail = `login-${Date.now()}@test.example.com`;

      // Register a user first
      await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: {
          email: loginEmail,
          firstName: 'Login',
          lastName: 'User',
          password: loginPassword,
          orgSlug: org!.slug,
        },
      });
    });

    test('returns JWT with valid credentials', async () => {
      const org = await app.prisma.organization.findUnique({ where: { id: orgId } });
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: {
          email: loginEmail,
          password: loginPassword,
          orgSlug: org!.slug,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.token).toBeDefined();
      expect(typeof body.token).toBe('string');
      expect(body.user).toBeDefined();
      expect(body.user.email).toBe(loginEmail);
    });

    test('returns 401 for wrong password', async () => {
      const org = await app.prisma.organization.findUnique({ where: { id: orgId } });
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: {
          email: loginEmail,
          password: 'WrongPassword123!@#',
          orgSlug: org!.slug,
        },
      });

      expect(response.statusCode).toBe(401);
    });

    test('returns 401 for non-existent email', async () => {
      const org = await app.prisma.organization.findUnique({ where: { id: orgId } });
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: {
          email: 'nonexistent@test.example.com',
          password: loginPassword,
          orgSlug: org!.slug,
        },
      });

      expect(response.statusCode).toBe(401);
    });

    test('returns 400 for missing fields', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: { email: loginEmail },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  // ─────────────────────────────────────────────────────────
  // GET /api/v1/auth/me
  // ─────────────────────────────────────────────────────────

  describe('GET /api/v1/auth/me', () => {
    let meToken: string;
    let meEmail: string;

    beforeAll(async () => {
      const org = await app.prisma.organization.findUnique({ where: { id: orgId } });
      meEmail = `me-${Date.now()}@test.example.com`;

      const regResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: {
          email: meEmail,
          firstName: 'Me',
          lastName: 'Test',
          password: 'SecurePass123!@#',
          orgSlug: org!.slug,
        },
      });

      meToken = regResponse.json().token;
    });

    test('returns current user with valid JWT', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/auth/me',
        headers: { authorization: `Bearer ${meToken}` },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.user.email).toBe(meEmail);
      expect(body.user.firstName).toBe('Me');
      expect(body.user.lastName).toBe('Test');
      expect(body.user.passwordHash).toBeUndefined();
    });

    test('returns 401 without auth header', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/auth/me',
      });

      expect(response.statusCode).toBe(401);
    });
  });
});
