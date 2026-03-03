/**
 * tests/integration/auth.test.ts — Authentication integration tests
 *
 * Tests the auth plugin decorators via real HTTP requests.
 * Uses the authenticate decorator on test routes.
 *
 * [BACKEND-01] Auth plugin tests
 */

import { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/app';
import { createTestOrg, cleanupTestOrg, TestContext } from '../helpers/test-org';
import { PrismaClient } from '@prisma/client';

describe('[BACKEND-01] Auth Plugin', () => {
  let app: FastifyInstance;
  let ctx: TestContext;

  beforeAll(async () => {
    app = await buildApp();

    // Register test routes that require authentication
    app.get(
      '/test/protected',
      {
        preHandler: [app.authenticate],
      },
      async (request) => {
        return {
          userId: request.currentUser?.id,
          orgId: request.currentUser?.orgId,
          role: request.currentUser?.role,
        };
      }
    );

    app.get(
      '/test/admin-only',
      {
        preHandler: [app.authenticate, app.requireRole('ADMIN')],
      },
      async (request) => {
        return { userId: request.currentUser?.id };
      }
    );

    await app.ready();
    ctx = await createTestOrg(app);
  });

  afterAll(async () => {
    await cleanupTestOrg(ctx.org.id, app.prisma as PrismaClient);
    await app.close();
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Happy path
  // ─────────────────────────────────────────────────────────────────────────

  test('[BACKEND-01][AC-6] authenticated request succeeds with valid JWT', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/test/protected',
      headers: { authorization: `Bearer ${ctx.token}` },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.userId).toBe(ctx.user.id);
    expect(body.orgId).toBe(ctx.org.id);
  });

  test('[BACKEND-01] ADMIN user passes requireRole(ADMIN)', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/test/admin-only',
      headers: { authorization: `Bearer ${ctx.token}` },
    });

    expect(response.statusCode).toBe(200);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Missing / invalid auth
  // ─────────────────────────────────────────────────────────────────────────

  test('[BACKEND-01] missing Authorization header returns 401', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/test/protected',
    });

    expect(response.statusCode).toBe(401);
    const body = response.json();
    expect(body.type).toContain('https://api.ai-fluency.connectsw.com/errors/');
    expect(body.status).toBe(401);
  });

  test('[BACKEND-01] invalid JWT token returns 401', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/test/protected',
      headers: { authorization: 'Bearer invalid.jwt.token' },
    });

    expect(response.statusCode).toBe(401);
    const body = response.json();
    expect(body.status).toBe(401);
  });

  test('[BACKEND-01] non-Bearer scheme returns 401', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/test/protected',
      headers: { authorization: 'Basic dXNlcjpwYXNz' },
    });

    expect(response.statusCode).toBe(401);
  });

  test('[BACKEND-01] expired JWT token returns 401', async () => {
    // Sign a token that expired in the past by manually setting exp
    const pastTimestamp = Math.floor(Date.now() / 1000) - 3600; // 1 hour ago
    const expiredToken = app.jwt.sign({
      sub: ctx.user.id,
      orgId: ctx.org.id,
      role: ctx.user.role,
      exp: pastTimestamp, // Explicitly set expiry to the past
    });

    const response = await app.inject({
      method: 'GET',
      url: '/test/protected',
      headers: { authorization: `Bearer ${expiredToken}` },
    });

    expect(response.statusCode).toBe(401);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Role enforcement
  // ─────────────────────────────────────────────────────────────────────────

  test('[BACKEND-01] LEARNER role fails requireRole(ADMIN) with 403', async () => {
    // Create a test user with LEARNER role
    const learnerUser = await app.prisma.user.create({
      data: {
        orgId: ctx.org.id,
        email: `learner-${Date.now()}@test.example.com`,
        firstName: 'Test',
        lastName: 'Learner',
        role: 'LEARNER',
        status: 'ACTIVE',
        emailVerifiedAt: new Date(),
      },
    });

    const learnerToken = app.jwt.sign(
      { sub: learnerUser.id, orgId: ctx.org.id, role: 'LEARNER' },
      { expiresIn: '15m' }
    );

    const response = await app.inject({
      method: 'GET',
      url: '/test/admin-only',
      headers: { authorization: `Bearer ${learnerToken}` },
    });

    expect(response.statusCode).toBe(403);
    const body = response.json();
    expect(body.status).toBe(403);

    // Cleanup
    await app.prisma.user.delete({ where: { id: learnerUser.id } });
  });

  test('[BACKEND-01] LOCKED account returns 403', async () => {
    const lockedUser = await app.prisma.user.create({
      data: {
        orgId: ctx.org.id,
        email: `locked-${Date.now()}@test.example.com`,
        firstName: 'Locked',
        lastName: 'User',
        role: 'LEARNER',
        status: 'LOCKED',
        emailVerifiedAt: new Date(),
      },
    });

    const token = app.jwt.sign(
      { sub: lockedUser.id, orgId: ctx.org.id, role: 'LEARNER' },
      { expiresIn: '15m' }
    );

    const response = await app.inject({
      method: 'GET',
      url: '/test/protected',
      headers: { authorization: `Bearer ${token}` },
    });

    expect(response.statusCode).toBe(403);
    const body = response.json();
    expect(body.title).toBe('account-locked');

    await app.prisma.user.delete({ where: { id: lockedUser.id } });
  });

  test('[BACKEND-01] DEACTIVATED account returns 403', async () => {
    const deactivatedUser = await app.prisma.user.create({
      data: {
        orgId: ctx.org.id,
        email: `deactivated-${Date.now()}@test.example.com`,
        firstName: 'Deactivated',
        lastName: 'User',
        role: 'LEARNER',
        status: 'DEACTIVATED',
        emailVerifiedAt: new Date(),
      },
    });

    const token = app.jwt.sign(
      { sub: deactivatedUser.id, orgId: ctx.org.id, role: 'LEARNER' },
      { expiresIn: '15m' }
    );

    const response = await app.inject({
      method: 'GET',
      url: '/test/protected',
      headers: { authorization: `Bearer ${token}` },
    });

    expect(response.statusCode).toBe(403);
    const body = response.json();
    expect(body.title).toBe('account-deactivated');

    await app.prisma.user.delete({ where: { id: deactivatedUser.id } });
  });

  test('[BACKEND-01] token with missing orgId returns 401', async () => {
    const tokenNoOrg = app.jwt.sign(
      { sub: ctx.user.id }, // Missing orgId
      { expiresIn: '15m' }
    );

    const response = await app.inject({
      method: 'GET',
      url: '/test/protected',
      headers: { authorization: `Bearer ${tokenNoOrg}` },
    });

    expect(response.statusCode).toBe(401);
  });

  test('[BACKEND-01] JWT for non-existent user returns 401', async () => {
    const fakeUserId = '00000000-0000-0000-0000-000000000000';
    const token = app.jwt.sign(
      { sub: fakeUserId, orgId: ctx.org.id, role: 'ADMIN' },
      { expiresIn: '15m' }
    );

    const response = await app.inject({
      method: 'GET',
      url: '/test/protected',
      headers: { authorization: `Bearer ${token}` },
    });

    expect(response.statusCode).toBe(401);
    const body = response.json();
    expect(body.status).toBe(401);
  });
});
