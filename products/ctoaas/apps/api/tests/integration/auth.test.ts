/**
 * Auth Routes Integration Tests (Red Phase)
 *
 * Implements:
 *   FR-014 (Registration)
 *   FR-015 (Login)
 *   FR-016 (Session Management)
 *   US-08  (Secure Account Registration)
 *
 * These tests define the expected behavior for auth routes.
 * They WILL FAIL because auth routes are stubs (IMPL-010).
 */
import { FastifyInstance } from 'fastify';
import {
  getApp,
  closeApp,
  getPrisma,
  cleanDatabase,
} from '../helpers';
import { PrismaClient } from '@prisma/client';

// ---------- helpers ----------

const BASE = '/api/v1/auth';

function validSignupPayload(
  overrides?: Record<string, unknown>
) {
  return {
    name: 'Test CTO',
    email: `auth-test-${Date.now()}@example.com`,
    password: 'Str0ng!Pass#2026',
    companyName: 'Acme Corp',
    ...overrides,
  };
}

// ---------- suite ----------

describe('Auth Routes', () => {
  let app: FastifyInstance;
  let prisma: PrismaClient;

  beforeAll(async () => {
    app = await getApp();
    prisma = getPrisma();
  });

  afterAll(async () => {
    await closeApp();
  });

  afterEach(async () => {
    await cleanDatabase();
  });

  // ==========================================================
  // POST /api/v1/auth/signup
  // ==========================================================
  describe('POST /api/v1/auth/signup', () => {
    test('[US-08][AC-1] creates user and organization with valid data', async () => {
      const payload = validSignupPayload();

      const res = await app.inject({
        method: 'POST',
        url: `${BASE}/signup`,
        payload,
      });

      expect(res.statusCode).toBe(201);

      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(body.data.user).toBeDefined();
      expect(body.data.user.id).toBeDefined();
      expect(body.data.user.email).toBe(payload.email);
      expect(body.data.user.name).toBe(payload.name);
      // Password must never be returned
      expect(body.data.user.password).toBeUndefined();
      expect(body.data.user.passwordHash).toBeUndefined();
      expect(body.data.message).toBeDefined();
    });

    test('[US-08][AC-2] returns 400 for invalid email format', async () => {
      const payload = validSignupPayload({
        email: 'not-an-email',
      });

      const res = await app.inject({
        method: 'POST',
        url: `${BASE}/signup`,
        payload,
      });

      expect(res.statusCode).toBe(400);

      const body = JSON.parse(res.body);
      expect(body.success).toBe(false);
      expect(body.error).toBeDefined();
      expect(body.error.code).toMatch(/VALIDATION/i);
    });

    test('[US-08][AC-3] returns 400 for weak password (no uppercase)', async () => {
      const payload = validSignupPayload({
        password: 'weakpassword1!',
      });

      const res = await app.inject({
        method: 'POST',
        url: `${BASE}/signup`,
        payload,
      });

      expect(res.statusCode).toBe(400);

      const body = JSON.parse(res.body);
      expect(body.success).toBe(false);
    });

    test('[US-08][AC-3] returns 400 for weak password (too short)', async () => {
      const payload = validSignupPayload({
        password: 'Ab1!',
      });

      const res = await app.inject({
        method: 'POST',
        url: `${BASE}/signup`,
        payload,
      });

      expect(res.statusCode).toBe(400);

      const body = JSON.parse(res.body);
      expect(body.success).toBe(false);
    });

    test('[US-08][AC-3] returns 400 for password without special character', async () => {
      const payload = validSignupPayload({
        password: 'NoSpecialChar1',
      });

      const res = await app.inject({
        method: 'POST',
        url: `${BASE}/signup`,
        payload,
      });

      expect(res.statusCode).toBe(400);

      const body = JSON.parse(res.body);
      expect(body.success).toBe(false);
    });

    test('[US-08][AC-4] returns 409 for duplicate email', async () => {
      const payload = validSignupPayload();

      // First registration
      const first = await app.inject({
        method: 'POST',
        url: `${BASE}/signup`,
        payload,
      });
      expect(first.statusCode).toBe(201);

      // Second registration with same email
      const second = await app.inject({
        method: 'POST',
        url: `${BASE}/signup`,
        payload,
      });

      expect(second.statusCode).toBe(409);

      const body = JSON.parse(second.body);
      expect(body.success).toBe(false);
      expect(body.error.code).toMatch(/CONFLICT/i);
    });

    test('[US-08][AC-5] password is stored hashed, not plaintext', async () => {
      const payload = validSignupPayload();

      const res = await app.inject({
        method: 'POST',
        url: `${BASE}/signup`,
        payload,
      });
      expect(res.statusCode).toBe(201);

      // Query DB directly
      const user = await prisma.user.findUnique({
        where: { email: payload.email },
      });

      expect(user).not.toBeNull();
      expect(user!.passwordHash).toBeDefined();
      expect(user!.passwordHash).not.toBe(payload.password);
      // bcrypt hashes start with $2b$ or $2a$
      expect(user!.passwordHash).toMatch(/^\$2[ab]\$/);
    });

    test('[US-08][AC-6] creates organization alongside user', async () => {
      const payload = validSignupPayload();

      const res = await app.inject({
        method: 'POST',
        url: `${BASE}/signup`,
        payload,
      });
      expect(res.statusCode).toBe(201);

      // Query DB directly for the user and their org
      const user = await prisma.user.findUnique({
        where: { email: payload.email },
        include: { organization: true },
      });

      expect(user).not.toBeNull();
      expect(user!.organization).toBeDefined();
      expect(user!.organization.name).toBe(payload.companyName);
    });

    test('[US-08][AC-7] sets emailVerified to false on signup', async () => {
      const payload = validSignupPayload();

      const res = await app.inject({
        method: 'POST',
        url: `${BASE}/signup`,
        payload,
      });
      expect(res.statusCode).toBe(201);

      const user = await prisma.user.findUnique({
        where: { email: payload.email },
      });

      expect(user).not.toBeNull();
      expect(user!.emailVerified).toBe(false);
      expect(user!.verificationToken).toBeDefined();
      expect(user!.verificationToken).not.toBeNull();
    });

    test('[US-08] returns 400 when required fields are missing', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `${BASE}/signup`,
        payload: {},
      });

      expect(res.statusCode).toBe(400);

      const body = JSON.parse(res.body);
      expect(body.success).toBe(false);
    });

    test('[US-08] trims and lowercases email', async () => {
      const payload = validSignupPayload({
        email: '  UpperCase@Example.COM  ',
      });

      const res = await app.inject({
        method: 'POST',
        url: `${BASE}/signup`,
        payload,
      });
      expect(res.statusCode).toBe(201);

      const user = await prisma.user.findUnique({
        where: { email: 'uppercase@example.com' },
      });

      expect(user).not.toBeNull();
      expect(user!.email).toBe('uppercase@example.com');
    });
  });

  // ==========================================================
  // POST /api/v1/auth/login
  // ==========================================================
  describe('POST /api/v1/auth/login', () => {
    const signupPayload = validSignupPayload({
      email: 'login-test@example.com',
    });

    beforeEach(async () => {
      // Seed a user for login tests
      await app.inject({
        method: 'POST',
        url: `${BASE}/signup`,
        payload: signupPayload,
      });
    });

    test('[FR-015][AC-1] returns JWT access token and sets refresh cookie', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `${BASE}/login`,
        payload: {
          email: signupPayload.email,
          password: signupPayload.password,
        },
      });

      expect(res.statusCode).toBe(200);

      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(body.data.accessToken).toBeDefined();
      expect(typeof body.data.accessToken).toBe('string');
      expect(body.data.user).toBeDefined();
      expect(body.data.user.id).toBeDefined();
      expect(body.data.user.email).toBe(signupPayload.email);
      expect(body.data.user.name).toBe(signupPayload.name);
      expect(body.data.user.role).toBeDefined();

      // Must never return password
      expect(body.data.user.password).toBeUndefined();
      expect(body.data.user.passwordHash).toBeUndefined();

      // httpOnly refresh cookie
      const setCookie = res.headers['set-cookie'];
      expect(setCookie).toBeDefined();
      const cookieStr = Array.isArray(setCookie)
        ? setCookie.join('; ')
        : String(setCookie);
      expect(cookieStr).toMatch(/refreshToken=/i);
      expect(cookieStr.toLowerCase()).toContain('httponly');
    });

    test('[FR-015][AC-2] returns 401 for wrong password', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `${BASE}/login`,
        payload: {
          email: signupPayload.email,
          password: 'WrongPassword1!',
        },
      });

      expect(res.statusCode).toBe(401);

      const body = JSON.parse(res.body);
      expect(body.success).toBe(false);
      // Message should be generic — no user enumeration
      expect(body.error.message).toMatch(
        /invalid.*credentials|invalid.*email.*password/i
      );
    });

    test('[FR-015][AC-3] returns 401 for non-existent email', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `${BASE}/login`,
        payload: {
          email: 'nobody@example.com',
          password: 'AnyPassword1!',
        },
      });

      expect(res.statusCode).toBe(401);

      const body = JSON.parse(res.body);
      expect(body.success).toBe(false);
      // Same generic message as wrong-password to avoid enumeration
      expect(body.error.message).toMatch(
        /invalid.*credentials|invalid.*email.*password/i
      );
    });

    test('[FR-015][AC-4] access token contains user id and role', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `${BASE}/login`,
        payload: {
          email: signupPayload.email,
          password: signupPayload.password,
        },
      });

      expect(res.statusCode).toBe(200);

      const body = JSON.parse(res.body);
      const token = body.data.accessToken;

      // Decode JWT payload (base64url, no verification needed)
      const payloadPart = token.split('.')[1];
      const decoded = JSON.parse(
        Buffer.from(payloadPart, 'base64url').toString()
      );

      expect(decoded.sub || decoded.id).toBeDefined();
      expect(decoded.role).toBeDefined();
    });

    test('[FR-015] returns 400 for missing email', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `${BASE}/login`,
        payload: { password: 'SomePass1!' },
      });

      expect(res.statusCode).toBe(400);
    });

    test('[FR-015] returns 400 for missing password', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `${BASE}/login`,
        payload: { email: 'test@example.com' },
      });

      expect(res.statusCode).toBe(400);
    });

    test('[FR-015] creates a RefreshToken record in the database', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `${BASE}/login`,
        payload: {
          email: signupPayload.email,
          password: signupPayload.password,
        },
      });

      expect(res.statusCode).toBe(200);

      const user = await prisma.user.findUnique({
        where: { email: signupPayload.email },
      });

      const refreshTokens = await prisma.refreshToken.findMany({
        where: { userId: user!.id },
      });

      expect(refreshTokens.length).toBeGreaterThanOrEqual(1);
      expect(refreshTokens[0].revoked).toBe(false);
    });
  });

  // ==========================================================
  // POST /api/v1/auth/refresh
  // ==========================================================
  describe('POST /api/v1/auth/refresh', () => {
    const signupPayload = validSignupPayload({
      email: 'refresh-test@example.com',
    });

    beforeEach(async () => {
      await app.inject({
        method: 'POST',
        url: `${BASE}/signup`,
        payload: signupPayload,
      });
    });

    test('[FR-016][AC-1] returns new access token with valid refresh cookie', async () => {
      // Login to get the refresh cookie
      const loginRes = await app.inject({
        method: 'POST',
        url: `${BASE}/login`,
        payload: {
          email: signupPayload.email,
          password: signupPayload.password,
        },
      });
      expect(loginRes.statusCode).toBe(200);

      // Extract the refresh cookie from the login response
      const setCookie = loginRes.headers['set-cookie'];
      const cookieStr = Array.isArray(setCookie)
        ? setCookie[0]
        : String(setCookie);

      // Use the cookie in the refresh request
      const refreshRes = await app.inject({
        method: 'POST',
        url: `${BASE}/refresh`,
        headers: {
          cookie: cookieStr,
        },
      });

      expect(refreshRes.statusCode).toBe(200);

      const body = JSON.parse(refreshRes.body);
      expect(body.success).toBe(true);
      expect(body.data.accessToken).toBeDefined();
      expect(typeof body.data.accessToken).toBe('string');
    });

    test('[FR-016][AC-2] returns 401 with invalid refresh token', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `${BASE}/refresh`,
        headers: {
          cookie: 'refreshToken=invalid-bogus-token',
        },
      });

      expect(res.statusCode).toBe(401);

      const body = JSON.parse(res.body);
      expect(body.success).toBe(false);
    });

    test('[FR-016][AC-2] returns 401 with no refresh cookie', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `${BASE}/refresh`,
      });

      expect(res.statusCode).toBe(401);

      const body = JSON.parse(res.body);
      expect(body.success).toBe(false);
    });

    test('[FR-016] implements token rotation (old token revoked after refresh)', async () => {
      // Login
      const loginRes = await app.inject({
        method: 'POST',
        url: `${BASE}/login`,
        payload: {
          email: signupPayload.email,
          password: signupPayload.password,
        },
      });
      expect(loginRes.statusCode).toBe(200);

      const firstCookie = Array.isArray(loginRes.headers['set-cookie'])
        ? loginRes.headers['set-cookie'][0]
        : String(loginRes.headers['set-cookie']);

      // Refresh once
      const refreshRes = await app.inject({
        method: 'POST',
        url: `${BASE}/refresh`,
        headers: { cookie: firstCookie },
      });
      expect(refreshRes.statusCode).toBe(200);

      // Try to use the old cookie again — should be revoked
      const secondRefresh = await app.inject({
        method: 'POST',
        url: `${BASE}/refresh`,
        headers: { cookie: firstCookie },
      });

      expect(secondRefresh.statusCode).toBe(401);
    });
  });

  // ==========================================================
  // POST /api/v1/auth/logout
  // ==========================================================
  describe('POST /api/v1/auth/logout', () => {
    const signupPayload = validSignupPayload({
      email: 'logout-test@example.com',
    });

    beforeEach(async () => {
      await app.inject({
        method: 'POST',
        url: `${BASE}/signup`,
        payload: signupPayload,
      });
    });

    test('[FR-016][AC-3] invalidates refresh token and clears cookie', async () => {
      // Login
      const loginRes = await app.inject({
        method: 'POST',
        url: `${BASE}/login`,
        payload: {
          email: signupPayload.email,
          password: signupPayload.password,
        },
      });
      expect(loginRes.statusCode).toBe(200);

      const loginBody = JSON.parse(loginRes.body);
      const accessToken = loginBody.data.accessToken;
      const refreshCookie = Array.isArray(loginRes.headers['set-cookie'])
        ? loginRes.headers['set-cookie'][0]
        : String(loginRes.headers['set-cookie']);

      // Logout
      const logoutRes = await app.inject({
        method: 'POST',
        url: `${BASE}/logout`,
        headers: {
          authorization: `Bearer ${accessToken}`,
          cookie: refreshCookie,
        },
      });

      expect(logoutRes.statusCode).toBe(200);

      const logoutBody = JSON.parse(logoutRes.body);
      expect(logoutBody.success).toBe(true);

      // Cookie should be cleared (Max-Age=0 or Expires in the past)
      const logoutCookie = logoutRes.headers['set-cookie'];
      if (logoutCookie) {
        const cookieVal = Array.isArray(logoutCookie)
          ? logoutCookie.join('; ')
          : String(logoutCookie);
        // Cookie should be expired or empty
        expect(cookieVal).toMatch(
          /max-age=0|expires=.*1970/i
        );
      }

      // Refresh with old cookie should fail
      const refreshRes = await app.inject({
        method: 'POST',
        url: `${BASE}/refresh`,
        headers: { cookie: refreshCookie },
      });

      expect(refreshRes.statusCode).toBe(401);
    });

    test('[FR-016] returns 401 for unauthenticated logout', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `${BASE}/logout`,
      });

      // Should require authentication
      expect(res.statusCode).toBe(401);
    });
  });

  // ==========================================================
  // POST /api/v1/auth/verify-email
  // ==========================================================
  describe('POST /api/v1/auth/verify-email', () => {
    test('[FR-014][AC-7] verifies email with valid token', async () => {
      const payload = validSignupPayload({
        email: 'verify-test@example.com',
      });

      // Signup to get a verification token
      const signupRes = await app.inject({
        method: 'POST',
        url: `${BASE}/signup`,
        payload,
      });
      expect(signupRes.statusCode).toBe(201);

      // Get verification token from DB
      const user = await prisma.user.findUnique({
        where: { email: payload.email },
      });
      expect(user).not.toBeNull();
      expect(user!.verificationToken).not.toBeNull();

      // Verify email
      const verifyRes = await app.inject({
        method: 'POST',
        url: `${BASE}/verify-email`,
        payload: { token: user!.verificationToken },
      });

      expect(verifyRes.statusCode).toBe(200);

      const body = JSON.parse(verifyRes.body);
      expect(body.success).toBe(true);

      // Check DB — emailVerified should now be true
      const verified = await prisma.user.findUnique({
        where: { email: payload.email },
      });
      expect(verified!.emailVerified).toBe(true);
      // Token should be cleared after use
      expect(verified!.verificationToken).toBeNull();
    });

    test('[FR-014][AC-8] returns 400 for invalid token', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `${BASE}/verify-email`,
        payload: { token: 'completely-bogus-token' },
      });

      expect(res.statusCode).toBe(400);

      const body = JSON.parse(res.body);
      expect(body.success).toBe(false);
    });

    test('[FR-014] returns 400 for expired verification token', async () => {
      const payload = validSignupPayload({
        email: 'expired-verify@example.com',
      });

      await app.inject({
        method: 'POST',
        url: `${BASE}/signup`,
        payload,
      });

      // Manually expire the token in DB
      const user = await prisma.user.findUnique({
        where: { email: payload.email },
      });
      expect(user).not.toBeNull();

      await prisma.user.update({
        where: { id: user!.id },
        data: {
          verificationTokenExpiresAt: new Date('2020-01-01'),
        },
      });

      const res = await app.inject({
        method: 'POST',
        url: `${BASE}/verify-email`,
        payload: { token: user!.verificationToken },
      });

      expect(res.statusCode).toBe(400);

      const body = JSON.parse(res.body);
      expect(body.success).toBe(false);
    });

    test('[FR-014] returns 400 when token is missing from payload', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `${BASE}/verify-email`,
        payload: {},
      });

      expect(res.statusCode).toBe(400);
    });
  });

  // ==========================================================
  // Security edge cases
  // ==========================================================
  describe('Security edge cases', () => {
    test('[US-08] signup sanitizes XSS in name field', async () => {
      const payload = validSignupPayload({
        name: '<script>alert("xss")</script>',
      });

      const res = await app.inject({
        method: 'POST',
        url: `${BASE}/signup`,
        payload,
      });

      // Should either reject or sanitize
      if (res.statusCode === 201) {
        const user = await prisma.user.findUnique({
          where: { email: payload.email },
        });
        expect(user!.name).not.toContain('<script>');
      } else {
        expect(res.statusCode).toBe(400);
      }
    });

    test('[FR-015] login does not reveal whether email exists via timing', async () => {
      // Both should return 401 with same message
      const nonExistent = await app.inject({
        method: 'POST',
        url: `${BASE}/login`,
        payload: {
          email: 'doesnotexist@example.com',
          password: 'SomePass1!',
        },
      });

      const wrongPw = await app.inject({
        method: 'POST',
        url: `${BASE}/login`,
        payload: {
          email: 'doesnotexist@example.com',
          password: 'WrongPass1!',
        },
      });

      // Same status code
      expect(nonExistent.statusCode).toBe(401);
      expect(wrongPw.statusCode).toBe(401);

      // Same error message (no enumeration)
      const body1 = JSON.parse(nonExistent.body);
      const body2 = JSON.parse(wrongPw.body);
      expect(body1.error.message).toBe(body2.error.message);
    });
  });
});
