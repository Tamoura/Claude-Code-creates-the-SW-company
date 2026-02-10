import { FastifyInstance } from 'fastify';
import {
  setupTestDb,
  cleanDb,
  closeDb,
  createTestApp,
  prisma,
} from '../helpers/build-app';

let app: FastifyInstance;

beforeAll(async () => {
  await setupTestDb();
  app = await createTestApp();
});

afterAll(async () => {
  await app.close();
  await closeDb();
});

beforeEach(async () => {
  await cleanDb();
});

const validRegistration = {
  name: 'Fatima Ahmed',
  email: 'fatima@example.com',
  password: 'SecurePass1',
};

describe('POST /api/auth/register', () => {
  it('should create a new parent and return 201', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: validRegistration,
    });

    expect(response.statusCode).toBe(201);
    const body = response.json();
    expect(body.user).toBeDefined();
    expect(body.user.id).toBeDefined();
    expect(body.user.email).toBe('fatima@example.com');
    expect(body.user.name).toBe('Fatima Ahmed');
    expect(body.accessToken).toBeDefined();
  });

  it('should not expose password hash in response', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: validRegistration,
    });

    const body = response.json();
    expect(body.user.passwordHash).toBeUndefined();
    expect(body.user.password_hash).toBeUndefined();
    expect(body.user.password).toBeUndefined();
  });

  it('should store hashed password in database', async () => {
    await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: validRegistration,
    });

    const parent = await prisma.parent.findUnique({
      where: { email: 'fatima@example.com' },
    });

    expect(parent).not.toBeNull();
    expect(parent!.passwordHash).not.toBe('SecurePass1');
    expect(parent!.passwordHash.startsWith('$2')).toBe(true); // bcrypt
  });

  it('should set refresh token as HttpOnly cookie', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: validRegistration,
    });

    const cookies = response.cookies;
    const refreshCookie = cookies.find(
      (c: any) => c.name === 'refreshToken'
    );
    expect(refreshCookie).toBeDefined();
    expect(refreshCookie!.httpOnly).toBe(true);
  });

  it('should create a session record in the database', async () => {
    await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: validRegistration,
    });

    const sessions = await prisma.session.findMany();
    expect(sessions.length).toBe(1);
    expect(sessions[0].token).toBeDefined();
  });

  it('should reject duplicate email with 409', async () => {
    await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: validRegistration,
    });

    const response = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: validRegistration,
    });

    expect(response.statusCode).toBe(409);
  });

  it('should reject weak password (no uppercase)', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: {
        ...validRegistration,
        password: 'weakpass1',
      },
    });

    expect(response.statusCode).toBe(422);
  });

  it('should reject weak password (no number)', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: {
        ...validRegistration,
        password: 'WeakPasss',
      },
    });

    expect(response.statusCode).toBe(422);
  });

  it('should reject password shorter than 8 chars', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: {
        ...validRegistration,
        password: 'Short1',
      },
    });

    expect(response.statusCode).toBe(422);
  });

  it('should reject missing email', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: {
        name: 'Fatima',
        password: 'SecurePass1',
      },
    });

    expect(response.statusCode).toBe(422);
  });

  it('should reject invalid email format', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: {
        ...validRegistration,
        email: 'not-an-email',
      },
    });

    expect(response.statusCode).toBe(422);
  });
});

describe('POST /api/auth/login', () => {
  beforeEach(async () => {
    // Register a user first
    await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: validRegistration,
    });
  });

  it('should return 200 with tokens on valid credentials', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: {
        email: 'fatima@example.com',
        password: 'SecurePass1',
      },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.user).toBeDefined();
    expect(body.user.email).toBe('fatima@example.com');
    expect(body.accessToken).toBeDefined();
  });

  it('should set refresh token cookie on login', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: {
        email: 'fatima@example.com',
        password: 'SecurePass1',
      },
    });

    const cookies = response.cookies;
    const refreshCookie = cookies.find(
      (c: any) => c.name === 'refreshToken'
    );
    expect(refreshCookie).toBeDefined();
  });

  it('should reject wrong password with 401', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: {
        email: 'fatima@example.com',
        password: 'WrongPass1',
      },
    });

    expect(response.statusCode).toBe(401);
    const body = response.json();
    expect(body.detail).toBe('Invalid email or password');
  });

  it('should reject nonexistent email with 401', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: {
        email: 'noone@example.com',
        password: 'SecurePass1',
      },
    });

    expect(response.statusCode).toBe(401);
    const body = response.json();
    expect(body.detail).toBe('Invalid email or password');
  });

  it('should not reveal which field is wrong', async () => {
    const wrongEmail = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: {
        email: 'noone@example.com',
        password: 'SecurePass1',
      },
    });

    const wrongPassword = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: {
        email: 'fatima@example.com',
        password: 'WrongPass1',
      },
    });

    // Both should give identical error messages
    expect(wrongEmail.json().detail).toBe(wrongPassword.json().detail);
  });
});

describe('POST /api/auth/logout', () => {
  let accessToken: string;
  let refreshCookieValue: string;

  beforeEach(async () => {
    const registerRes = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: validRegistration,
    });
    accessToken = registerRes.json().accessToken;
    const cookie = registerRes.cookies.find(
      (c: any) => c.name === 'refreshToken'
    );
    refreshCookieValue = cookie!.value;
  });

  it('should return 200 on successful logout', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/auth/logout',
      headers: {
        authorization: `Bearer ${accessToken}`,
      },
      cookies: {
        refreshToken: refreshCookieValue,
      },
    });

    expect(response.statusCode).toBe(200);
  });

  it('should remove session from database', async () => {
    const sessionsBefore = await prisma.session.findMany();
    expect(sessionsBefore.length).toBe(1);

    await app.inject({
      method: 'POST',
      url: '/api/auth/logout',
      headers: {
        authorization: `Bearer ${accessToken}`,
      },
      cookies: {
        refreshToken: refreshCookieValue,
      },
    });

    const sessionsAfter = await prisma.session.findMany();
    expect(sessionsAfter.length).toBe(0);
  });

  it('should reject unauthenticated logout with 401', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/auth/logout',
    });

    expect(response.statusCode).toBe(401);
  });
});

describe('POST /api/auth/refresh', () => {
  let refreshCookieValue: string;

  beforeEach(async () => {
    const registerRes = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: validRegistration,
    });
    const cookie = registerRes.cookies.find(
      (c: any) => c.name === 'refreshToken'
    );
    refreshCookieValue = cookie!.value;
  });

  it('should return new access token with valid refresh token', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/auth/refresh',
      cookies: {
        refreshToken: refreshCookieValue,
      },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.accessToken).toBeDefined();
  });

  it('should rotate refresh token (new cookie)', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/auth/refresh',
      cookies: {
        refreshToken: refreshCookieValue,
      },
    });

    const newCookie = response.cookies.find(
      (c: any) => c.name === 'refreshToken'
    );
    expect(newCookie).toBeDefined();
    expect(newCookie!.value).not.toBe(refreshCookieValue);
  });

  it('should invalidate old refresh token after rotation', async () => {
    // First refresh succeeds
    await app.inject({
      method: 'POST',
      url: '/api/auth/refresh',
      cookies: {
        refreshToken: refreshCookieValue,
      },
    });

    // Second refresh with same token should fail
    const response = await app.inject({
      method: 'POST',
      url: '/api/auth/refresh',
      cookies: {
        refreshToken: refreshCookieValue,
      },
    });

    expect(response.statusCode).toBe(401);
  });

  it('should reject missing refresh token with 401', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/auth/refresh',
    });

    expect(response.statusCode).toBe(401);
  });
});
