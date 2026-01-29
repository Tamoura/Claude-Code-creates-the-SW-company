import { buildApp } from '../../src/app';
import { FastifyInstance } from 'fastify';

/**
 * Auth integration tests
 *
 * NOTE: Uses unique User-Agent headers per describe block to isolate
 * fingerprinted rate limit buckets (auth endpoints use IP+UA fingerprinting)
 */

describe('POST /v1/auth/signup', () => {
  let app: FastifyInstance;
  // Unique User-Agent to isolate rate limit bucket from other test files
  const testUA = `AuthSignupTest/${Date.now()}`;

  beforeAll(async () => {
    app = await buildApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('should create a new user with valid data', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/v1/auth/signup',
      payload: {
        email: 'test@example.com',
        password: 'SecurePass123!',
      },
      headers: {
        'user-agent': testUA,
      },
    });

    expect(response.statusCode).toBe(201);
    const body = response.json();
    expect(body).toMatchObject({
      email: 'test@example.com',
      access_token: expect.any(String),
      refresh_token: expect.any(String),
    });
    expect(body).toHaveProperty('id');
    expect(body).toHaveProperty('created_at');
  });

  it('should return 400 for invalid email', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/v1/auth/signup',
      payload: {
        email: 'not-an-email',
        password: 'SecurePass123!',
      },
      headers: {
        'user-agent': testUA,
      },
    });

    expect(response.statusCode).toBe(400);
    const body = response.json();
    expect(body.title).toBe('Validation Error');
  });

  it('should return 400 for weak password', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/v1/auth/signup',
      payload: {
        email: 'test@example.com',
        password: 'weak',
      },
      headers: {
        'user-agent': testUA,
      },
    });

    expect(response.statusCode).toBe(400);
  });

  it('should return 409 for duplicate email', async () => {
    // Create first user (may already exist from earlier test)
    await app.inject({
      method: 'POST',
      url: '/v1/auth/signup',
      payload: {
        email: 'test@example.com',
        password: 'SecurePass123!',
      },
      headers: {
        'user-agent': testUA,
      },
    });

    // Try to create duplicate
    const response = await app.inject({
      method: 'POST',
      url: '/v1/auth/signup',
      payload: {
        email: 'test@example.com',
        password: 'SecurePass123!',
      },
      headers: {
        'user-agent': testUA,
      },
    });

    expect(response.statusCode).toBe(409);
    const body = response.json();
    expect(body.detail).toContain('already exists');
  });
});

describe('POST /v1/auth/login', () => {
  let app: FastifyInstance;
  // Unique User-Agent to isolate rate limit bucket from other test files
  const testUA = `AuthLoginTest/${Date.now()}`;

  beforeAll(async () => {
    app = await buildApp();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    // Create a test user using a dedicated UA for setup
    await app.inject({
      method: 'POST',
      url: '/v1/auth/signup',
      payload: {
        email: 'test@example.com',
        password: 'SecurePass123!',
      },
      headers: {
        'user-agent': `AuthLoginSetup/${Date.now()}`,
      },
    });
  });

  it('should login with valid credentials', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/v1/auth/login',
      payload: {
        email: 'test@example.com',
        password: 'SecurePass123!',
      },
      headers: {
        'user-agent': testUA,
      },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body).toMatchObject({
      email: 'test@example.com',
      access_token: expect.any(String),
      refresh_token: expect.any(String),
    });
  });

  it('should return 401 for invalid email', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/v1/auth/login',
      payload: {
        email: 'wrong@example.com',
        password: 'SecurePass123!',
      },
      headers: {
        'user-agent': testUA,
      },
    });

    expect(response.statusCode).toBe(401);
    const body = response.json();
    expect(body.detail).toContain('Invalid email or password');
  });

  it('should return 401 for invalid password', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/v1/auth/login',
      payload: {
        email: 'test@example.com',
        password: 'WrongPassword123!',
      },
      headers: {
        'user-agent': testUA,
      },
    });

    expect(response.statusCode).toBe(401);
  });
});
