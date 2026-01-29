import { buildApp } from '../../src/app';
import { FastifyInstance } from 'fastify';

/**
 * Auth Cookie Security Tests
 *
 * Verifies that refresh tokens are delivered via httpOnly cookies
 * and that the auth plugin can read tokens from cookies as a
 * fallback when no Authorization header is present.
 *
 * Each test uses a unique User-Agent to avoid auth rate limit
 * collisions (auth endpoints use IP+UA fingerprinting).
 */

describe('Auth HttpOnly Cookie Security', () => {
  let app: FastifyInstance;
  let testCounter = 0;

  /** Generate a unique User-Agent per call to avoid rate limit collisions */
  function uniqueUA(label: string): string {
    testCounter++;
    return `AuthCookieTest-${label}-${Date.now()}-${testCounter}`;
  }

  beforeAll(async () => {
    app = await buildApp();
    // Clear any stale rate limit keys from prior test runs
    if (app.redis) {
      const keys = await app.redis.keys('ratelimit:*');
      if (keys.length > 0) {
        await app.redis.del(...keys);
      }
    }
  });

  beforeEach(async () => {
    // Clear stale rate limit counters from Redis between tests
    if (app.redis) {
      const keys = await app.redis.keys('ratelimit:*');
      if (keys.length > 0) {
        await app.redis.del(...keys);
      }
    }
    await app.prisma.refreshToken.deleteMany();
    await app.prisma.apiKey.deleteMany();
    await app.prisma.paymentSession.deleteMany();
    await app.prisma.user.deleteMany();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Login sets httpOnly refresh token cookie', () => {
    it('should set a refresh_token httpOnly cookie on successful login', async () => {
      // Signup first (uses unique UA to avoid rate limit)
      await app.inject({
        method: 'POST',
        url: '/v1/auth/signup',
        payload: {
          email: 'cookie-login@example.com',
          password: 'SecurePass123!',
        },
        headers: { 'user-agent': uniqueUA('login-setup') },
      });

      const response = await app.inject({
        method: 'POST',
        url: '/v1/auth/login',
        payload: {
          email: 'cookie-login@example.com',
          password: 'SecurePass123!',
        },
        headers: { 'user-agent': uniqueUA('login') },
      });

      expect(response.statusCode).toBe(200);

      // Verify Set-Cookie header is present with httpOnly
      const setCookieHeaders = response.headers['set-cookie'];
      expect(setCookieHeaders).toBeDefined();

      const cookieStr = Array.isArray(setCookieHeaders)
        ? setCookieHeaders.find((c: string) => c.includes('refresh_token'))
        : setCookieHeaders;

      expect(cookieStr).toBeDefined();
      expect(cookieStr).toMatch(/refresh_token=/);
      expect(cookieStr).toMatch(/HttpOnly/i);
      expect(cookieStr).toMatch(/SameSite=Strict/i);
      expect(cookieStr).toMatch(/Path=\/v1\/auth/i);
    });
  });

  describe('Signup sets httpOnly refresh token cookie', () => {
    it('should set a refresh_token httpOnly cookie on successful signup', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/v1/auth/signup',
        payload: {
          email: 'cookie-signup@example.com',
          password: 'SecurePass123!',
        },
        headers: { 'user-agent': uniqueUA('signup') },
      });

      expect(response.statusCode).toBe(201);

      const setCookieHeaders = response.headers['set-cookie'];
      expect(setCookieHeaders).toBeDefined();

      const cookieStr = Array.isArray(setCookieHeaders)
        ? setCookieHeaders.find((c: string) => c.includes('refresh_token'))
        : setCookieHeaders;

      expect(cookieStr).toBeDefined();
      expect(cookieStr).toMatch(/refresh_token=/);
      expect(cookieStr).toMatch(/HttpOnly/i);
    });
  });

  describe('Refresh reads token from cookie', () => {
    it('should accept refresh token from httpOnly cookie when no body token', async () => {
      // Signup to get tokens
      const signupResponse = await app.inject({
        method: 'POST',
        url: '/v1/auth/signup',
        payload: {
          email: 'cookie-refresh@example.com',
          password: 'SecurePass123!',
        },
        headers: { 'user-agent': uniqueUA('refresh-setup') },
      });

      expect(signupResponse.statusCode).toBe(201);
      const refreshToken = signupResponse.json().refresh_token;

      // Call refresh with the cookie (not body)
      const response = await app.inject({
        method: 'POST',
        url: '/v1/auth/refresh',
        headers: {
          'user-agent': uniqueUA('refresh'),
          cookie: `refresh_token=${refreshToken}`,
        },
        payload: {},
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body).toHaveProperty('access_token');
      expect(body).toHaveProperty('refresh_token');
    });
  });

  describe('Logout clears refresh token cookie', () => {
    it('should clear the refresh_token cookie on logout', async () => {
      // Signup to get tokens
      const signupResponse = await app.inject({
        method: 'POST',
        url: '/v1/auth/signup',
        payload: {
          email: 'cookie-logout@example.com',
          password: 'SecurePass123!',
        },
        headers: { 'user-agent': uniqueUA('logout-setup') },
      });

      const { access_token, refresh_token } = signupResponse.json();

      const response = await app.inject({
        method: 'DELETE',
        url: '/v1/auth/logout',
        headers: {
          authorization: `Bearer ${access_token}`,
          cookie: `refresh_token=${refresh_token}`,
        },
        payload: {
          refresh_token,
        },
      });

      expect(response.statusCode).toBe(200);

      // Verify the cookie is cleared (max-age=0 or expires in past)
      const setCookieHeaders = response.headers['set-cookie'];
      expect(setCookieHeaders).toBeDefined();

      const cookieStr = Array.isArray(setCookieHeaders)
        ? setCookieHeaders.find((c: string) => c.includes('refresh_token'))
        : setCookieHeaders;

      expect(cookieStr).toBeDefined();
      // Cookie cleared means Max-Age=0 or Expires in the past
      expect(cookieStr).toMatch(/refresh_token=/);
      // clearCookie sets the value to empty and expires immediately
      expect(cookieStr).toMatch(/Max-Age=0|Expires=Thu, 01 Jan 1970/i);
    });
  });

  describe('Logout reads refresh token from cookie', () => {
    it('should accept refresh token from cookie when body has no refresh_token', async () => {
      // Signup to get tokens
      const signupResponse = await app.inject({
        method: 'POST',
        url: '/v1/auth/signup',
        payload: {
          email: 'cookie-logout-fb@example.com',
          password: 'SecurePass123!',
        },
        headers: { 'user-agent': uniqueUA('logout-fb-setup') },
      });

      const { access_token, refresh_token } = signupResponse.json();

      // Call logout with token in cookie only (no body.refresh_token)
      const response = await app.inject({
        method: 'DELETE',
        url: '/v1/auth/logout',
        headers: {
          authorization: `Bearer ${access_token}`,
          cookie: `refresh_token=${refresh_token}`,
        },
        payload: {},
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toMatchObject({
        message: 'Logged out successfully',
      });
    });
  });

  describe('Cookie security attributes', () => {
    it('should not set Secure flag in non-production env', async () => {
      // In test env (not production), secure should be false.
      const response = await app.inject({
        method: 'POST',
        url: '/v1/auth/signup',
        payload: {
          email: 'cookie-secure@example.com',
          password: 'SecurePass123!',
        },
        headers: { 'user-agent': uniqueUA('secure') },
      });

      expect(response.statusCode).toBe(201);

      const setCookieHeaders = response.headers['set-cookie'];
      expect(setCookieHeaders).toBeDefined();

      const cookieStr = Array.isArray(setCookieHeaders)
        ? setCookieHeaders.find((c: string) => c.includes('refresh_token'))
        : setCookieHeaders;

      // In non-production env, Secure flag should NOT be set
      // (This proves the conditional logic works)
      expect(cookieStr).toBeDefined();
      expect(cookieStr).not.toMatch(/; Secure/i);
    });
  });

  describe('Refresh sets new httpOnly cookie', () => {
    it('should set a new refresh_token cookie after token refresh', async () => {
      // Signup first
      const signupResponse = await app.inject({
        method: 'POST',
        url: '/v1/auth/signup',
        payload: {
          email: 'cookie-refresh-new@example.com',
          password: 'SecurePass123!',
        },
        headers: { 'user-agent': uniqueUA('refresh-new-setup') },
      });

      const refreshToken = signupResponse.json().refresh_token;

      // Refresh
      const response = await app.inject({
        method: 'POST',
        url: '/v1/auth/refresh',
        payload: {
          refresh_token: refreshToken,
        },
        headers: { 'user-agent': uniqueUA('refresh-new') },
      });

      expect(response.statusCode).toBe(200);

      // The refresh response should also set a new httpOnly cookie
      const setCookieHeaders = response.headers['set-cookie'];
      expect(setCookieHeaders).toBeDefined();

      const cookieStr = Array.isArray(setCookieHeaders)
        ? setCookieHeaders.find((c: string) => c.includes('refresh_token'))
        : setCookieHeaders;

      expect(cookieStr).toBeDefined();
      expect(cookieStr).toMatch(/refresh_token=/);
      expect(cookieStr).toMatch(/HttpOnly/i);
      expect(cookieStr).toMatch(/SameSite=Strict/i);
      expect(cookieStr).toMatch(/Path=\/v1\/auth/i);
    });
  });
});
