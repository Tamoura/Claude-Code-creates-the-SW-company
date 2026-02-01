import { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app';
import { setupTestDb, cleanDb, closeDb, prisma } from './setup';

let app: FastifyInstance;

beforeAll(async () => {
  await setupTestDb();
  app = await buildApp({ logger: false });
  await app.ready();
});

afterAll(async () => {
  await app.close();
  await closeDb();
});

beforeEach(async () => {
  await cleanDb();
});

const validUser = {
  email: 'test@example.com',
  password: 'SecurePass123!',
  name: 'Test User',
};

describe('POST /api/auth/register', () => {
  it('should register a new user and return tokens', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: validUser,
    });

    expect(response.statusCode).toBe(201);
    const body = response.json();
    expect(body.user).toBeDefined();
    expect(body.user.email).toBe(validUser.email);
    expect(body.user.name).toBe(validUser.name);
    expect(body.accessToken).toBeDefined();
    // Password hash should not be returned
    expect(body.user.passwordHash).toBeUndefined();
  });

  it('should reject duplicate email', async () => {
    await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: validUser,
    });

    const response = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: validUser,
    });

    expect(response.statusCode).toBe(409);
    const body = response.json();
    expect(body.error).toBe('CONFLICT');
  });

  it('should reject invalid email', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: { ...validUser, email: 'not-an-email' },
    });

    expect(response.statusCode).toBe(400);
  });

  it('should reject short password', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: { ...validUser, password: 'short' },
    });

    expect(response.statusCode).toBe(400);
  });

  it('should create a session in the database', async () => {
    await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: validUser,
    });

    const sessions = await prisma.session.findMany();
    expect(sessions.length).toBe(1);
  });

  it('should set refresh token cookie', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: validUser,
    });

    const setCookie = response.headers['set-cookie'];
    expect(setCookie).toBeDefined();
    expect(String(setCookie)).toContain('refreshToken');
    expect(String(setCookie)).toContain('HttpOnly');
  });
});

describe('POST /api/auth/login', () => {
  beforeEach(async () => {
    await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: validUser,
    });
  });

  it('should login with valid credentials', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: {
        email: validUser.email,
        password: validUser.password,
      },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.user).toBeDefined();
    expect(body.user.email).toBe(validUser.email);
    expect(body.accessToken).toBeDefined();
  });

  it('should reject invalid password', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: {
        email: validUser.email,
        password: 'WrongPassword123!',
      },
    });

    expect(response.statusCode).toBe(401);
    const body = response.json();
    expect(body.error).toBe('UNAUTHORIZED');
  });

  it('should reject non-existent email', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: {
        email: 'nobody@example.com',
        password: 'SomePass123!',
      },
    });

    expect(response.statusCode).toBe(401);
  });
});

describe('POST /api/auth/refresh', () => {
  let refreshToken: string;

  beforeEach(async () => {
    const registerRes = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: validUser,
    });

    // Extract refresh token from cookie
    const setCookie = String(registerRes.headers['set-cookie']);
    const match = setCookie.match(/refreshToken=([^;]+)/);
    refreshToken = match ? match[1] : '';
  });

  it('should issue a new access token with valid refresh token', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/auth/refresh',
      payload: { refreshToken },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.accessToken).toBeDefined();
  });

  it('should reject invalid refresh token', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/auth/refresh',
      payload: { refreshToken: 'invalid-token-value' },
    });

    expect(response.statusCode).toBe(401);
  });

  it('should invalidate old refresh token after use', async () => {
    // Use the refresh token once
    await app.inject({
      method: 'POST',
      url: '/api/auth/refresh',
      payload: { refreshToken },
    });

    // Try to use same refresh token again
    const response = await app.inject({
      method: 'POST',
      url: '/api/auth/refresh',
      payload: { refreshToken },
    });

    expect(response.statusCode).toBe(401);
  });
});

describe('POST /api/auth/logout', () => {
  let refreshToken: string;

  beforeEach(async () => {
    const registerRes = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: validUser,
    });

    const setCookie = String(registerRes.headers['set-cookie']);
    const match = setCookie.match(/refreshToken=([^;]+)/);
    refreshToken = match ? match[1] : '';
  });

  it('should logout successfully', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/auth/logout',
      payload: { refreshToken },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.message).toBe('Logged out successfully');
  });

  it('should invalidate the session after logout', async () => {
    await app.inject({
      method: 'POST',
      url: '/api/auth/logout',
      payload: { refreshToken },
    });

    // Try to refresh after logout
    const response = await app.inject({
      method: 'POST',
      url: '/api/auth/refresh',
      payload: { refreshToken },
    });

    expect(response.statusCode).toBe(401);
  });

  it('should clear the refresh token cookie', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/auth/logout',
      payload: { refreshToken },
    });

    const setCookie = String(response.headers['set-cookie']);
    expect(setCookie).toContain('refreshToken=');
  });
});
