import { FastifyInstance } from 'fastify';
import { getTestApp, closeTestApp, cleanDatabase } from '../helpers/build-app.js';

describe('Auth Routes', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await getTestApp();
  });

  afterAll(async () => {
    await cleanDatabase(app);
    await closeTestApp();
  });

  beforeEach(async () => {
    await cleanDatabase(app);
  });

  describe('POST /api/v1/auth/register', () => {
    const validUser = {
      email: 'testuser@pulse.dev',
      password: 'SecureP@ss123',
      name: 'Test User',
    };

    it('should register a new user and return 201', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: validUser,
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.payload);
      expect(body.token).toBeDefined();
      expect(body.user.email).toBe(validUser.email);
      expect(body.user.name).toBe(validUser.name);
    });

    it('should return 409 when email already exists', async () => {
      // Register first time
      await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: validUser,
      });

      // Register same email again
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: validUser,
      });

      expect(response.statusCode).toBe(409);
      const body = JSON.parse(response.payload);
      expect(body.detail).toContain('already registered');
    });

    it('should return 422 for invalid email', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: {
          ...validUser,
          email: 'not-an-email',
        },
      });

      expect(response.statusCode).toBe(422);
    });

    it('should return 422 for weak password', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: {
          ...validUser,
          password: '123',
        },
      });

      expect(response.statusCode).toBe(422);
    });

    it('should not return password hash in response', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: validUser,
      });

      const body = JSON.parse(response.payload);
      expect(body.user.passwordHash).toBeUndefined();
      expect(body.user.password).toBeUndefined();
    });
  });

  describe('POST /api/v1/auth/login', () => {
    const testUser = {
      email: 'login-test@pulse.dev',
      password: 'SecureP@ss123',
      name: 'Login Test',
    };

    beforeEach(async () => {
      // Register user for login tests
      await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: testUser,
      });
    });

    it('should login with valid credentials and return 200', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: {
          email: testUser.email,
          password: testUser.password,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body.token).toBeDefined();
      expect(body.user.email).toBe(testUser.email);
    });

    it('should return 401 for wrong password', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: {
          email: testUser.email,
          password: 'WrongP@ss999',
        },
      });

      expect(response.statusCode).toBe(401);
    });

    it('should return 401 for non-existent email', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: {
          email: 'nonexistent@pulse.dev',
          password: 'SecureP@ss123',
        },
      });

      expect(response.statusCode).toBe(401);
    });

    it('should return a valid JWT that can authenticate', async () => {
      const loginResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: {
          email: testUser.email,
          password: testUser.password,
        },
      });

      const { token } = JSON.parse(loginResponse.payload);
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.').length).toBe(3); // JWT format
    });
  });

  describe('GET /api/v1/auth/github/callback', () => {
    it('should return 400 when code is missing', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/auth/github/callback',
      });

      expect(response.statusCode).toBe(400);
    });
  });
});
