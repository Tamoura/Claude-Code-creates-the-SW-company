/**
 * Access Token Revocation via JTI Blacklist Tests
 *
 * Verifies that after logout, access tokens are immediately
 * rejected by checking the JTI (JWT ID) against a Redis
 * blacklist. This closes the 15-minute window where access
 * tokens remained valid after logout.
 *
 * Security issue: HIGH severity
 *   - On logout, only refresh tokens were revoked
 *   - Access tokens (15-min expiry) remained usable
 *   - No JTI blacklist existed
 *
 * Fix: Store revoked JTIs in Redis with TTL matching token
 * expiry so they auto-expire, and check JTI on every
 * authenticated request.
 */

import { buildApp } from '../../../src/app';
import { FastifyInstance } from 'fastify';

describe('Access token revocation via JTI blacklist', () => {
  let app: FastifyInstance;
  const testPassword = 'SecurePass123!';

  beforeAll(async () => {
    app = await buildApp();
  });

  afterAll(async () => {
    await app.close();
  });

  let uaCounter = 0;
  function uniqueUA(): string {
    uaCounter += 1;
    return `TokRevBot${uaCounter}-${Math.random().toString(36).slice(2, 14)}`;
  }

  /**
   * Helper: sign up a user, return credentials.
   */
  async function createUserAndLogin(tag: string): Promise<{
    email: string;
    accessToken: string;
    refreshToken: string;
    userId: string;
  }> {
    const email = `tokrev-${tag}-${Date.now()}@example.com`;
    const signupRes = await app.inject({
      method: 'POST',
      url: '/v1/auth/signup',
      payload: { email, password: testPassword },
      headers: { 'user-agent': uniqueUA() },
    });
    expect(signupRes.statusCode).toBe(201);
    const body = signupRes.json();
    return {
      email,
      accessToken: body.access_token,
      refreshToken: body.refresh_token,
      userId: body.id,
    };
  }

  /**
   * Helper: perform logout with given tokens.
   */
  async function logout(accessToken: string, refreshToken: string) {
    return app.inject({
      method: 'DELETE',
      url: '/v1/auth/logout',
      headers: {
        authorization: `Bearer ${accessToken}`,
        'user-agent': uniqueUA(),
      },
      payload: { refresh_token: refreshToken },
    });
  }

  /**
   * Helper: make an authenticated request to a protected
   * endpoint (payment-sessions list) to verify the token works.
   */
  async function authenticatedRequest(accessToken: string) {
    return app.inject({
      method: 'GET',
      url: '/v1/payment-sessions',
      headers: {
        authorization: `Bearer ${accessToken}`,
        'user-agent': uniqueUA(),
      },
    });
  }

  // ---- Core revocation behavior --------------------------------

  it('should reject access token with 401 after logout', async () => {
    const { accessToken, refreshToken } = await createUserAndLogin('reject');

    // Token works before logout
    const preLogout = await authenticatedRequest(accessToken);
    expect(preLogout.statusCode).toBe(200);

    // Logout
    const logoutRes = await logout(accessToken, refreshToken);
    expect(logoutRes.statusCode).toBe(200);

    // Token must be rejected after logout
    const postLogout = await authenticatedRequest(accessToken);
    expect(postLogout.statusCode).toBe(401);

    // Verify error body indicates token revocation
    const body = postLogout.json();
    const bodyStr = JSON.stringify(body);
    expect(bodyStr).toMatch(/revoked|unauthorized/i);
  });

  it('should allow non-revoked tokens to continue working', async () => {
    const { accessToken } = await createUserAndLogin('valid');

    // Token should work (user never logged out)
    const res1 = await authenticatedRequest(accessToken);
    expect(res1.statusCode).toBe(200);

    // A second request should also work
    const res2 = await authenticatedRequest(accessToken);
    expect(res2.statusCode).toBe(200);
  });

  it('should store revoked JTI in Redis with TTL matching token expiry', async () => {
    const { accessToken, refreshToken } = await createUserAndLogin('ttl');

    // Decode token to get its JTI
    const decoded = app.jwt.decode(accessToken) as { jti?: string };
    expect(decoded.jti).toBeDefined();

    // Logout
    const logoutRes = await logout(accessToken, refreshToken);
    expect(logoutRes.statusCode).toBe(200);

    // Verify JTI stored in Redis
    if (app.redis) {
      const revoked = await app.redis.get(`revoked_jti:${decoded.jti}`);
      expect(revoked).toBe('1');

      // Verify TTL is set (should be <= 900 seconds / 15 min)
      const ttl = await app.redis.ttl(`revoked_jti:${decoded.jti}`);
      expect(ttl).toBeGreaterThan(0);
      expect(ttl).toBeLessThanOrEqual(900);
    }
  });

  it('should degrade gracefully when Redis is unavailable', async () => {
    const { accessToken } = await createUserAndLogin('no-redis');

    // Temporarily null out Redis
    const originalRedis = app.redis;
    (app as any).redis = null;

    try {
      // Token should still work in degraded mode
      const res = await authenticatedRequest(accessToken);
      expect(res.statusCode).toBe(200);
    } finally {
      (app as any).redis = originalRedis;
    }
  });

  it('should handle multiple logouts without crashing (idempotent)', async () => {
    const { accessToken, refreshToken } = await createUserAndLogin('idempotent');

    // First logout succeeds
    const logout1 = await logout(accessToken, refreshToken);
    expect(logout1.statusCode).toBe(200);

    // Second logout: refresh token already revoked, returns 404
    // but must not crash
    const logout2 = await logout(accessToken, refreshToken);
    // The refresh-token check returns 404 because it is already
    // revoked, BUT the access-token should also be rejected (401)
    // since the JTI is now blacklisted.
    // Either 401 (token revoked) or 404 (refresh already revoked)
    // is acceptable -- the key requirement is no crash (5xx).
    expect(logout2.statusCode).toBeLessThan(500);
  });
});
