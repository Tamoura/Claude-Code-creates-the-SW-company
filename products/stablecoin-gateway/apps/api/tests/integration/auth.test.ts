import { buildApp } from '../../src/app';
import { FastifyInstance } from 'fastify';

describe('POST /v1/auth/signup', () => {
  let app: FastifyInstance;

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
    });

    expect(response.statusCode).toBe(400);
  });

  it('should return 409 for duplicate email', async () => {
    // Create first user
    await app.inject({
      method: 'POST',
      url: '/v1/auth/signup',
      payload: {
        email: 'test@example.com',
        password: 'SecurePass123!',
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
    });

    expect(response.statusCode).toBe(409);
    const body = response.json();
    expect(body.detail).toContain('already exists');
  });
});

describe('POST /v1/auth/login', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    // Create a test user
    await app.inject({
      method: 'POST',
      url: '/v1/auth/signup',
      payload: {
        email: 'test@example.com',
        password: 'SecurePass123!',
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
    });

    expect(response.statusCode).toBe(401);
  });
});
