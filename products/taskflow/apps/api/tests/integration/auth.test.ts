import { FastifyInstance } from 'fastify';
import { buildTestApp, resetDatabase } from '../setup';

describe('Auth Routes', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildTestApp();
  });

  beforeEach(async () => {
    await resetDatabase(app);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /api/v1/auth/register', () => {
    it('should register a new user and return 201 with JWT and user data (no passwordHash)', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: {
          email: 'newuser@example.com',
          password: 'securepassword123',
        },
      });

      expect(response.statusCode).toBe(201);

      const body = JSON.parse(response.body);
      expect(body.token).toBeDefined();
      expect(typeof body.token).toBe('string');
      expect(body.token.length).toBeGreaterThan(0);

      expect(body.user).toBeDefined();
      expect(body.user.id).toBeDefined();
      expect(body.user.email).toBe('newuser@example.com');
      expect(body.user.createdAt).toBeDefined();
      expect(body.user.updatedAt).toBeDefined();

      // Must NOT contain passwordHash
      expect(body.user.passwordHash).toBeUndefined();
      expect(body.user.password_hash).toBeUndefined();
      expect(body.user.password).toBeUndefined();
    });

    it('should return 409 when registering with a duplicate email', async () => {
      // First registration
      await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: {
          email: 'duplicate@example.com',
          password: 'password123',
        },
      });

      // Second registration with same email
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: {
          email: 'duplicate@example.com',
          password: 'differentpassword',
        },
      });

      expect(response.statusCode).toBe(409);

      const body = JSON.parse(response.body);
      expect(body.error).toBeDefined();
    });
  });

  describe('POST /api/v1/auth/login', () => {
    beforeEach(async () => {
      // Register a user first
      await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: {
          email: 'loginuser@example.com',
          password: 'password123',
        },
      });
    });

    it('should login successfully and return 200 with JWT and user data', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: {
          email: 'loginuser@example.com',
          password: 'password123',
        },
      });

      expect(response.statusCode).toBe(200);

      const body = JSON.parse(response.body);
      expect(body.token).toBeDefined();
      expect(typeof body.token).toBe('string');
      expect(body.token.length).toBeGreaterThan(0);

      expect(body.user).toBeDefined();
      expect(body.user.id).toBeDefined();
      expect(body.user.email).toBe('loginuser@example.com');

      // Must NOT contain passwordHash
      expect(body.user.passwordHash).toBeUndefined();
      expect(body.user.password_hash).toBeUndefined();
    });

    it('should return 401 for wrong password', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: {
          email: 'loginuser@example.com',
          password: 'wrongpassword',
        },
      });

      expect(response.statusCode).toBe(401);

      const body = JSON.parse(response.body);
      expect(body.error).toBeDefined();
    });

    it('should return 401 for non-existent email', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: {
          email: 'nonexistent@example.com',
          password: 'password123',
        },
      });

      expect(response.statusCode).toBe(401);

      const body = JSON.parse(response.body);
      expect(body.error).toBeDefined();
    });
  });
});
