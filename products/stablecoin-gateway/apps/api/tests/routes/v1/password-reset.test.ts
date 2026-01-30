/**
 * Password Reset Flow Tests
 *
 * Verifies the two-endpoint password reset flow:
 *  - POST /v1/auth/forgot-password  (request reset)
 *  - POST /v1/auth/reset-password   (consume token)
 *
 * Tokens are stored in Redis with a 1-hour TTL.
 * The forgot-password endpoint always returns 200 to prevent
 * email enumeration.
 */

import { buildApp } from '../../../src/app';
import { FastifyInstance } from 'fastify';

describe('Password reset flow', () => {
  let app: FastifyInstance;
  const validPassword = 'SecurePass123!';
  const newPassword = 'NewSecure456!@';

  beforeAll(async () => {
    app = await buildApp();
  });

  afterAll(async () => {
    await app.close();
  });

  // Clean up any leftover reset tokens between tests
  beforeEach(async () => {
    if (app.redis) {
      const keys = await app.redis.keys('reset:*');
      if (keys.length > 0) {
        await app.redis.del(...keys);
      }
    }
  });

  let uaCounter = 0;
  function uniqueUA(): string {
    uaCounter += 1;
    return `PwResetBot${uaCounter}-${Math.random().toString(36).slice(2, 14)}`;
  }

  /**
   * Register a user and return their email.
   */
  async function createUser(tag: string): Promise<string> {
    const email = `pwreset-${tag}-${Date.now()}@example.com`;
    const res = await app.inject({
      method: 'POST',
      url: '/v1/auth/signup',
      payload: { email, password: validPassword },
      headers: { 'user-agent': uniqueUA() },
    });
    expect(res.statusCode).toBe(201);
    return email;
  }

  /**
   * Request a password reset and extract the token from Redis.
   */
  async function requestResetAndGetToken(email: string): Promise<string> {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/auth/forgot-password',
      payload: { email },
      headers: { 'user-agent': uniqueUA() },
    });
    expect(res.statusCode).toBe(200);

    // Scan Redis for the token that was just created for this email
    if (!app.redis) throw new Error('Redis not available');

    const keys = await app.redis.keys('reset:*');
    for (const key of keys) {
      const raw = await app.redis.get(key);
      if (raw) {
        const data = JSON.parse(raw);
        if (data.email === email) {
          return key.replace('reset:', '');
        }
      }
    }
    throw new Error(`No reset token found in Redis for ${email}`);
  }

  // ---- POST /v1/auth/forgot-password ---------------------------

  it('should return 200 for a valid email', async () => {
    const email = await createUser('valid');

    const res = await app.inject({
      method: 'POST',
      url: '/v1/auth/forgot-password',
      payload: { email },
      headers: { 'user-agent': uniqueUA() },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.message).toMatch(/reset link/i);
  });

  it('should return 200 for an unknown email (prevent enumeration)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/auth/forgot-password',
      payload: { email: 'nonexistent@example.com' },
      headers: { 'user-agent': uniqueUA() },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.message).toMatch(/reset link/i);
  });

  // ---- POST /v1/auth/reset-password ----------------------------

  it('should update password with a valid token', async () => {
    const email = await createUser('reset-ok');
    const token = await requestResetAndGetToken(email);

    const res = await app.inject({
      method: 'POST',
      url: '/v1/auth/reset-password',
      payload: { token, newPassword },
      headers: { 'user-agent': uniqueUA() },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.message).toMatch(/password updated/i);

    // Verify login works with the new password
    const loginRes = await app.inject({
      method: 'POST',
      url: '/v1/auth/login',
      payload: { email, password: newPassword },
      headers: { 'user-agent': uniqueUA() },
    });
    expect(loginRes.statusCode).toBe(200);
  });

  it('should return 400 for an expired token', async () => {
    const email = await createUser('expired');
    const token = await requestResetAndGetToken(email);

    // Simulate expiry by deleting the token from Redis
    if (app.redis) {
      await app.redis.del(`reset:${token}`);
    }

    const res = await app.inject({
      method: 'POST',
      url: '/v1/auth/reset-password',
      payload: { token, newPassword },
      headers: { 'user-agent': uniqueUA() },
    });

    expect(res.statusCode).toBe(400);
  });

  it('should return 400 for an invalid token', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/auth/reset-password',
      payload: { token: 'totally-bogus-token', newPassword },
      headers: { 'user-agent': uniqueUA() },
    });

    expect(res.statusCode).toBe(400);
  });

  it('should allow a reset token to be used only once', async () => {
    const email = await createUser('once');
    const token = await requestResetAndGetToken(email);

    // First use should succeed
    const first = await app.inject({
      method: 'POST',
      url: '/v1/auth/reset-password',
      payload: { token, newPassword },
      headers: { 'user-agent': uniqueUA() },
    });
    expect(first.statusCode).toBe(200);

    // Second use of the same token should fail
    const second = await app.inject({
      method: 'POST',
      url: '/v1/auth/reset-password',
      payload: { token, newPassword: 'AnotherPass789!@' },
      headers: { 'user-agent': uniqueUA() },
    });
    expect(second.statusCode).toBe(400);
  });

  it('should reject a new password that does not meet complexity requirements', async () => {
    const email = await createUser('weak');
    const token = await requestResetAndGetToken(email);

    // Too short (less than 12 characters)
    const res = await app.inject({
      method: 'POST',
      url: '/v1/auth/reset-password',
      payload: { token, newPassword: 'Short1!' },
      headers: { 'user-agent': uniqueUA() },
    });

    expect(res.statusCode).toBe(400);

    // Token should NOT be consumed on validation failure, so verify
    // it is still usable
    const retryRes = await app.inject({
      method: 'POST',
      url: '/v1/auth/reset-password',
      payload: { token, newPassword },
      headers: { 'user-agent': uniqueUA() },
    });
    expect(retryRes.statusCode).toBe(200);
  });
});
