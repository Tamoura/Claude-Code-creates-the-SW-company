import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app.js';
import { prisma } from '../src/lib/prisma.js';

describe('Authentication Endpoints', () => {
  let app: FastifyInstance;

  const TEST_ORG_ID = '550e8400-e29b-41d4-a716-446655440000';

  beforeAll(async () => {
    app = await buildApp({ logger: false });

    // Create test organization
    await prisma.organization.create({
      data: {
        id: TEST_ORG_ID,
        name: 'Test Organization',
        slug: 'test-org',
      },
    });
  });

  afterAll(async () => {
    // Cleanup
    await prisma.user.deleteMany({ where: { organizationId: TEST_ORG_ID } });
    await prisma.organization.delete({ where: { id: TEST_ORG_ID } });
    await prisma.$disconnect();
    await app.close();
  });

  beforeEach(async () => {
    // Clean up users before each test
    await prisma.user.deleteMany({ where: { organizationId: TEST_ORG_ID } });
  });

  describe('POST /api/v1/auth/register', () => {
    it('should register a new user successfully', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: {
          email: 'test@example.com',
          password: 'SecurePass123!',
          name: 'Test User',
          organizationId: TEST_ORG_ID,
        },
      });

      expect(response.statusCode).toBe(201);
      const body = response.json();
      expect(body.token).toBeDefined();
      expect(typeof body.token).toBe('string');
      expect(body.user).toBeDefined();
      expect(body.user.email).toBe('test@example.com');
      expect(body.user.name).toBe('Test User');
      expect(body.user.role).toBe('VIEWER');
      expect(body.user.passwordHash).toBeUndefined(); // Should not return password
    });

    it('should reject registration with missing email', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: {
          password: 'SecurePass123!',
          name: 'Test User',
          organizationId: TEST_ORG_ID,
        },
      });

      expect(response.statusCode).toBe(400);
      const body = response.json();
      expect(body.error).toBeDefined();
    });

    it('should reject registration with invalid email format', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: {
          email: 'invalid-email',
          password: 'SecurePass123!',
          name: 'Test User',
          organizationId: TEST_ORG_ID,
        },
      });

      expect(response.statusCode).toBe(400);
      const body = response.json();
      expect(body.error).toBeDefined();
    });

    it('should reject registration with weak password', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: {
          email: 'test@example.com',
          password: '123',
          name: 'Test User',
          organizationId: TEST_ORG_ID,
        },
      });

      expect(response.statusCode).toBe(400);
      const body = response.json();
      expect(body.error).toBeDefined();
    });

    it('should reject registration with duplicate email', async () => {
      // First registration
      await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: {
          email: 'duplicate@example.com',
          password: 'SecurePass123!',
          name: 'First User',
          organizationId: TEST_ORG_ID,
        },
      });

      // Attempt duplicate registration
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: {
          email: 'duplicate@example.com',
          password: 'SecurePass123!',
          name: 'Second User',
          organizationId: TEST_ORG_ID,
        },
      });

      expect(response.statusCode).toBe(409);
      const body = response.json();
      expect(body.error).toBeDefined();
      expect(body.message).toContain('already exists');
    });

    it('should reject registration with missing name', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: {
          email: 'test@example.com',
          password: 'SecurePass123!',
          organizationId: TEST_ORG_ID,
        },
      });

      expect(response.statusCode).toBe(400);
      const body = response.json();
      expect(body.error).toBeDefined();
    });

    it('should hash the password before storing', async () => {
      const plainPassword = 'SecurePass123!';
      await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: {
          email: 'hashtest@example.com',
          password: plainPassword,
          name: 'Hash Test',
          organizationId: TEST_ORG_ID,
        },
      });

      const user = await prisma.user.findUnique({
        where: { email: 'hashtest@example.com' },
      });

      expect(user).toBeDefined();
      expect(user!.passwordHash).toBeDefined();
      expect(user!.passwordHash).not.toBe(plainPassword);
      expect(user!.passwordHash.length).toBeGreaterThan(50); // bcrypt hashes are ~60 chars
    });
  });

  describe('POST /api/v1/auth/login', () => {
    beforeEach(async () => {
      // Create a test user for login tests
      await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: {
          email: 'logintest@example.com',
          password: 'SecurePass123!',
          name: 'Login Test User',
          organizationId: TEST_ORG_ID,
        },
      });
    });

    it('should login successfully with valid credentials', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: {
          email: 'logintest@example.com',
          password: 'SecurePass123!',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.token).toBeDefined();
      expect(typeof body.token).toBe('string');
      expect(body.user).toBeDefined();
      expect(body.user.email).toBe('logintest@example.com');
      expect(body.user.name).toBe('Login Test User');
      expect(body.user.role).toBe('VIEWER');
      expect(body.user.passwordHash).toBeUndefined();
    });

    it('should reject login with invalid email', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: {
          email: 'nonexistent@example.com',
          password: 'SecurePass123!',
        },
      });

      expect(response.statusCode).toBe(401);
      const body = response.json();
      expect(body.error).toBeDefined();
      expect(body.message).toContain('Invalid credentials');
    });

    it('should reject login with invalid password', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: {
          email: 'logintest@example.com',
          password: 'WrongPassword123!',
        },
      });

      expect(response.statusCode).toBe(401);
      const body = response.json();
      expect(body.error).toBeDefined();
      expect(body.message).toContain('Invalid credentials');
    });

    it('should reject login with missing email', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: {
          password: 'SecurePass123!',
        },
      });

      expect(response.statusCode).toBe(400);
      const body = response.json();
      expect(body.error).toBeDefined();
    });

    it('should reject login with missing password', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: {
          email: 'logintest@example.com',
        },
      });

      expect(response.statusCode).toBe(400);
      const body = response.json();
      expect(body.error).toBeDefined();
    });

    it('should reject login for inactive users', async () => {
      // Deactivate the user
      await prisma.user.update({
        where: { email: 'logintest@example.com' },
        data: { isActive: false },
      });

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: {
          email: 'logintest@example.com',
          password: 'SecurePass123!',
        },
      });

      expect(response.statusCode).toBe(403);
      const body = response.json();
      expect(body.error).toBeDefined();
      expect(body.message).toContain('deactivated');
    });

    it('should create a session on successful login', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: {
          email: 'logintest@example.com',
          password: 'SecurePass123!',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();

      // Verify session was created in database
      const user = await prisma.user.findUnique({
        where: { email: 'logintest@example.com' },
        include: { sessions: true },
      });

      expect(user?.sessions.length).toBeGreaterThan(0);
      const session = user?.sessions[0];
      expect(session?.token).toBe(body.token);
      expect(session?.expiresAt).toBeDefined();
    });
  });
});
