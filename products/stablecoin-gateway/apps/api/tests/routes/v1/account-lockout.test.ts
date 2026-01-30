/**
 * Account Lockout Tests
 *
 * Verifies Redis-based account lockout after repeated failed
 * login attempts. Prevents distributed brute-force attacks
 * that rotate IPs but target the same account.
 *
 * Lockout policy:
 *  - 5 failed attempts triggers a 15-minute lock
 *  - Successful login resets the counter
 *  - Lock expires after 15 minutes
 *  - Graceful degradation when Redis is unavailable
 */

import { buildApp } from '../../../src/app';
import { FastifyInstance } from 'fastify';

describe('Account lockout after failed logins', () => {
  let app: FastifyInstance;
  const testPassword = 'SecurePass123!';

  beforeAll(async () => {
    app = await buildApp();
  });

  afterAll(async () => {
    await app.close();
  });

  /**
   * Counter to guarantee globally unique User-Agent strings.
   * The auth route rate-limits by IP + truncated UA, so every
   * request in the suite must have a distinct UA to avoid
   * collisions with the IP-based limiter.
   */
  let uaCounter = 0;
  function uniqueUA(): string {
    uaCounter += 1;
    return `LkBot${uaCounter}-${Math.random().toString(36).slice(2, 14)}`;
  }

  /**
   * Helper: register a user and return their email.
   */
  async function createUser(tag: string): Promise<string> {
    const email = `lockout-${tag}-${Date.now()}@example.com`;
    const res = await app.inject({
      method: 'POST',
      url: '/v1/auth/signup',
      payload: { email, password: testPassword },
      headers: { 'user-agent': uniqueUA() },
    });
    expect(res.statusCode).toBe(201);
    return email;
  }

  /**
   * Helper: attempt a login with a unique User-Agent per call
   * so the IP+UA rate limiter treats each as a separate client.
   */
  async function attemptLogin(email: string, password: string) {
    return app.inject({
      method: 'POST',
      url: '/v1/auth/login',
      payload: { email, password },
      headers: { 'user-agent': uniqueUA() },
    });
  }

  /**
   * Helper: force lockout state in Redis for a given email.
   * More reliable than sending 5 failed attempts (which can
   * be affected by rate-limiter timing).
   */
  async function forceLockout(email: string) {
    if (app.redis) {
      const lockKey = `lockout:${email}`;
      const failKey = `failed:${email}`;
      await app.redis.set(lockKey, String(Date.now() + 900000), 'PX', 900000);
      await app.redis.set(failKey, '5');
      await app.redis.expire(failKey, 900);
    }
  }

  /**
   * Clean up lockout/failed Redis keys for a given email.
   */
  async function cleanLockoutKeys(email: string) {
    if (app.redis) {
      await app.redis.del(`lockout:${email}`);
      await app.redis.del(`failed:${email}`);
    }
  }

  // ---- Core lockout behavior -----------------------------------

  it('should lock account after 5 failed login attempts', async () => {
    const email = await createUser('lock5');

    // 5 failed attempts with wrong password
    for (let i = 0; i < 5; i++) {
      const r = await attemptLogin(email, 'WrongPassword!1');
      // First 4 should be 401, 5th triggers lockout (429)
      if (i < 4) {
        expect(r.statusCode).toBe(401);
      } else {
        expect(r.statusCode).toBe(429);
      }
    }

    // 6th attempt should be locked even with correct password
    const res = await attemptLogin(email, testPassword);

    expect(res.statusCode).toBe(429);
    const body = res.json();
    expect(body.detail).toMatch(/account temporarily locked/i);
  });

  it('should return 429 with descriptive message when locked', async () => {
    const email = await createUser('lock429');

    // Force lockout via Redis (avoids rate-limiter interactions)
    await forceLockout(email);

    const res = await attemptLogin(email, testPassword);

    expect(res.statusCode).toBe(429);
    const body = res.json();
    expect(body.status).toBe(429);
    expect(body.type).toContain('account-locked');
    expect(body.detail).toMatch(/too many failed login attempts/i);
    expect(body.detail).toMatch(/15 minutes/i);
  });

  it('should reset failed attempt counter on successful login', async () => {
    const email = await createUser('reset');

    // 3 failed attempts (below threshold)
    for (let i = 0; i < 3; i++) {
      const r = await attemptLogin(email, 'WrongPassword!1');
      expect(r.statusCode).toBe(401);
    }

    // Successful login should reset counter
    const successRes = await attemptLogin(email, testPassword);
    expect(successRes.statusCode).toBe(200);

    // Verify counter was cleared
    if (app.redis) {
      const count = await app.redis.get(`failed:${email}`);
      expect(count).toBeNull();
    }

    // Now 4 more failures should not trigger lockout (counter
    // was reset, so we need 5 fresh failures to lock again).
    for (let i = 0; i < 4; i++) {
      const r = await attemptLogin(email, 'WrongPassword!1');
      expect(r.statusCode).toBe(401);
    }

    // Correct password should succeed: only 4 fresh failures
    // after the reset, which is below the threshold of 5.
    const res = await attemptLogin(email, testPassword);
    expect(res.statusCode).toBe(200);
  });

  it('should allow login after lock expires (15 min TTL)', async () => {
    const email = await createUser('expire');

    // Force lockout via Redis
    await forceLockout(email);

    // Confirm locked
    const lockedRes = await attemptLogin(email, testPassword);
    expect(lockedRes.statusCode).toBe(429);

    // Simulate expiry by deleting the Redis keys directly
    await cleanLockoutKeys(email);

    // Should now succeed
    const res = await attemptLogin(email, testPassword);
    expect(res.statusCode).toBe(200);
  });

  it('should increment failed attempt counter on each bad password', async () => {
    const email = await createUser('incr');

    // 1st failed attempt -- should NOT lock
    const res1 = await attemptLogin(email, 'WrongPassword!1');
    expect(res1.statusCode).toBe(401);

    // 2nd failed attempt -- should NOT lock
    const res2 = await attemptLogin(email, 'WrongPassword!1');
    expect(res2.statusCode).toBe(401);

    // Verify counter value in Redis
    if (app.redis) {
      const count = await app.redis.get(`failed:${email}`);
      expect(parseInt(count || '0')).toBe(2);
    }
  });

  // ---- Graceful degradation ------------------------------------

  it('should degrade gracefully when Redis is unavailable', async () => {
    const email = await createUser('no-redis');

    // Temporarily null out Redis to simulate unavailability
    const originalRedis = app.redis;
    (app as any).redis = null;

    try {
      // Login should still work (degraded mode)
      const res = await attemptLogin(email, testPassword);
      expect(res.statusCode).toBe(200);
    } finally {
      // Restore Redis so afterAll cleanup works
      (app as any).redis = originalRedis;
    }
  });
});
