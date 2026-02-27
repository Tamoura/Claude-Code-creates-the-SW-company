/**
 * Password Reset — Session Revocation Test
 *
 * Verifies that completing a password reset (POST /v1/auth/reset-password)
 * revokes all existing refresh tokens for the user, preventing session
 * fixation attacks where an attacker holds an older session after a
 * credential compromise.
 *
 * MED-01 remediation: see AUDIT-REPORT.md
 */

import { buildApp } from '../../../src/app';
import { FastifyInstance } from 'fastify';

describe('Password reset — session revocation (MED-01)', () => {
  let app: FastifyInstance;
  const email = `med01-test-${Date.now()}@example.com`;
  const originalPassword = 'OriginalPass123!';
  const newPassword = 'NewSecure456!@';

  beforeAll(async () => {
    app = await buildApp();

    // Sign up
    const res = await app.inject({
      method: 'POST',
      url: '/v1/auth/signup',
      payload: { email, password: originalPassword },
      headers: { 'user-agent': 'MED01Test/1.0' },
    });
    expect(res.statusCode).toBe(201);
  });

  afterAll(async () => {
    // Clean up
    await app.prisma.user.deleteMany({ where: { email } });
    if (app.redis) {
      const keys = await app.redis.keys('reset:*');
      if (keys.length > 0) await app.redis.del(...keys);
    }
    await app.close();
  });

  it('should revoke all active refresh tokens after password reset', async () => {
    if (!app.redis) {
      // Password reset requires Redis — skip gracefully
      return;
    }

    // 1. Login to create a refresh token
    const loginRes = await app.inject({
      method: 'POST',
      url: '/v1/auth/login',
      payload: { email, password: originalPassword },
      headers: { 'user-agent': 'MED01Test/login-1' },
    });
    expect(loginRes.statusCode).toBe(200);

    // Verify a refresh token was created for the user
    const user = await app.prisma.user.findUnique({ where: { email } });
    const tokensBefore = await app.prisma.refreshToken.findMany({
      where: { userId: user!.id, revoked: false },
    });
    expect(tokensBefore.length).toBeGreaterThan(0);

    // 2. Trigger forgot-password
    await app.inject({
      method: 'POST',
      url: '/v1/auth/forgot-password',
      payload: { email },
      headers: { 'user-agent': 'MED01Test/forgot' },
    });

    // 3. Extract reset token from Redis
    const keys = await app.redis.keys('reset:*');
    let resetToken = '';
    for (const key of keys) {
      const raw = await app.redis.get(key);
      if (raw) {
        const data = JSON.parse(raw);
        if (data.email === email) {
          resetToken = key.replace('reset:', '');
          break;
        }
      }
    }
    expect(resetToken).not.toBe('');

    // 4. Complete password reset
    const resetRes = await app.inject({
      method: 'POST',
      url: '/v1/auth/reset-password',
      payload: { token: resetToken, newPassword },
      headers: { 'user-agent': 'MED01Test/reset' },
    });
    expect(resetRes.statusCode).toBe(200);

    // 5. Verify all previous refresh tokens are now revoked
    const tokensAfter = await app.prisma.refreshToken.findMany({
      where: { userId: user!.id, revoked: false },
    });
    expect(tokensAfter.length).toBe(0);
  });
});
