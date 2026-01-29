import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app.js';
import { prisma } from '../src/lib/prisma.js';
import { generateToken } from '../src/lib/jwt.js';

describe('Authentication Middleware', () => {
  let app: FastifyInstance;
  const TEST_ORG_ID = '550e8400-e29b-41d4-a716-446655440001';
  let testUserId: string;
  let validToken: string;

  beforeAll(async () => {
    app = await buildApp({ logger: false });

    // Create test organization
    await prisma.organization.create({
      data: {
        id: TEST_ORG_ID,
        name: 'Test Organization',
        slug: 'test-org-middleware',
      },
    });

    // Register a test user
    const registerResponse = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: {
        email: 'middleware-test@example.com',
        password: 'SecurePass123!',
        name: 'Middleware Test User',
        organizationId: TEST_ORG_ID,
      },
    });

    const body = registerResponse.json();
    testUserId = body.user.id;
    validToken = body.token;
  });

  afterAll(async () => {
    await prisma.session.deleteMany({ where: { userId: testUserId } });
    await prisma.user.deleteMany({ where: { organizationId: TEST_ORG_ID } });
    await prisma.organization.delete({ where: { id: TEST_ORG_ID } });
    await prisma.$disconnect();
    await app.close();
  });

  describe('Protected Routes', () => {
    it('should allow access with valid token in Authorization header', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/me',
        headers: {
          authorization: `Bearer ${validToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.user.id).toBe(testUserId);
      expect(body.user.email).toBe('middleware-test@example.com');
    });

    it('should reject request without Authorization header', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/me',
      });

      expect(response.statusCode).toBe(401);
      const body = response.json();
      expect(body.error).toBeDefined();
      expect(body.message).toContain('token');
    });

    it('should reject request with invalid token format', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/me',
        headers: {
          authorization: 'InvalidFormat',
        },
      });

      expect(response.statusCode).toBe(401);
      const body = response.json();
      expect(body.error).toBeDefined();
    });

    it('should reject request with malformed JWT token', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/me',
        headers: {
          authorization: 'Bearer invalid.jwt.token',
        },
      });

      expect(response.statusCode).toBe(401);
      const body = response.json();
      expect(body.error).toBeDefined();
      expect(body.message).toContain('Invalid');
    });

    it('should reject request with expired token', async () => {
      // Generate an expired token (using -1 second expiry)
      const expiredToken = generateToken({
        userId: testUserId,
        email: 'middleware-test@example.com',
        role: 'VIEWER',
        organizationId: TEST_ORG_ID,
      });

      // Manually create expired token with jwt
      const jwt = await import('jsonwebtoken');
      const expiredTokenManual = jwt.sign(
        {
          userId: testUserId,
          email: 'middleware-test@example.com',
          role: 'VIEWER',
          organizationId: TEST_ORG_ID,
        },
        process.env.JWT_SECRET || 'development-secret-key',
        { expiresIn: '-1s' } // Already expired
      );

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/me',
        headers: {
          authorization: `Bearer ${expiredTokenManual}`,
        },
      });

      expect(response.statusCode).toBe(401);
      const body = response.json();
      expect(body.error).toBeDefined();
      expect(body.message).toContain('expired');
    });

    it('should reject request with token signed with wrong secret', async () => {
      const jwt = await import('jsonwebtoken');
      const wrongSecretToken = jwt.sign(
        {
          userId: testUserId,
          email: 'middleware-test@example.com',
          role: 'VIEWER',
          organizationId: TEST_ORG_ID,
        },
        'wrong-secret-key',
        { expiresIn: '7d' }
      );

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/me',
        headers: {
          authorization: `Bearer ${wrongSecretToken}`,
        },
      });

      expect(response.statusCode).toBe(401);
      const body = response.json();
      expect(body.error).toBeDefined();
    });

    it('should reject request when user does not exist', async () => {
      const nonExistentUserId = '550e8400-e29b-41d4-a716-999999999999';
      const tokenForNonExistentUser = generateToken({
        userId: nonExistentUserId,
        email: 'nonexistent@example.com',
        role: 'VIEWER',
        organizationId: TEST_ORG_ID,
      });

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/me',
        headers: {
          authorization: `Bearer ${tokenForNonExistentUser}`,
        },
      });

      expect(response.statusCode).toBe(401);
      const body = response.json();
      expect(body.error).toBeDefined();
      expect(body.message).toContain('User not found');
    });

    it('should reject request when user is inactive', async () => {
      // Deactivate user
      await prisma.user.update({
        where: { id: testUserId },
        data: { isActive: false },
      });

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/me',
        headers: {
          authorization: `Bearer ${validToken}`,
        },
      });

      expect(response.statusCode).toBe(403);
      const body = response.json();
      expect(body.error).toBeDefined();
      expect(body.message).toContain('inactive');

      // Reactivate user for other tests
      await prisma.user.update({
        where: { id: testUserId },
        data: { isActive: true },
      });
    });

    it('should attach user object to request for downstream handlers', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/me',
        headers: {
          authorization: `Bearer ${validToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();

      // Verify user data is available
      expect(body.user).toBeDefined();
      expect(body.user.id).toBe(testUserId);
      expect(body.user.email).toBe('middleware-test@example.com');
      expect(body.user.role).toBe('VIEWER');
      expect(body.user.organizationId).toBe(TEST_ORG_ID);

      // Verify sensitive data is not exposed
      expect(body.user.passwordHash).toBeUndefined();
    });
  });
});
