/**
 * Auth JTI Cryptographic Randomness Tests
 *
 * Verifies that JWT refresh tokens use crypto.randomUUID()
 * instead of Math.random().toString(36) for JTI generation.
 *
 * Math.random() is not cryptographically secure and produces
 * predictable output. UUIDs from crypto.randomUUID() provide
 * 122 bits of cryptographic randomness.
 */

import { buildApp } from '../../../src/app';
import { FastifyInstance } from 'fastify';

// UUID v4 regex: 8-4-4-4-12 hex characters with version 4 marker
const UUID_V4_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

describe('Auth JTI cryptographic randomness', () => {
  let app: FastifyInstance;
  const testUA = `AuthJTITest/${Date.now()}`;

  beforeAll(async () => {
    app = await buildApp();
  });

  afterAll(async () => {
    await app.close();
  });

  /**
   * Helper: sign up a user and return the decoded refresh token
   */
  async function signupAndGetRefreshToken(
    email: string
  ): Promise<{ jti: string; userId: string; type: string }> {
    const response = await app.inject({
      method: 'POST',
      url: '/v1/auth/signup',
      payload: {
        email,
        password: 'SecurePass123!',
      },
      headers: {
        'user-agent': testUA,
      },
    });

    const body = response.json();
    // Decode the JWT refresh token to inspect its jti claim
    const decoded = app.jwt.decode(body.refresh_token) as {
      jti: string;
      userId: string;
      type: string;
    };
    return decoded;
  }

  it('should generate JTI in UUID v4 format for signup', async () => {
    const decoded = await signupAndGetRefreshToken(
      `jti-uuid-test-${Date.now()}@example.com`
    );

    expect(decoded.jti).toBeDefined();
    expect(decoded.jti).toMatch(UUID_V4_REGEX);
  });

  it('should generate JTI in UUID v4 format for login', async () => {
    const email = `jti-login-test-${Date.now()}@example.com`;

    // First sign up
    await app.inject({
      method: 'POST',
      url: '/v1/auth/signup',
      payload: { email, password: 'SecurePass123!' },
      headers: { 'user-agent': `${testUA}-setup` },
    });

    // Then login
    const loginResponse = await app.inject({
      method: 'POST',
      url: '/v1/auth/login',
      payload: { email, password: 'SecurePass123!' },
      headers: { 'user-agent': testUA },
    });

    const loginBody = loginResponse.json();
    const decoded = app.jwt.decode(loginBody.refresh_token) as {
      jti: string;
    };

    expect(decoded.jti).toBeDefined();
    expect(decoded.jti).toMatch(UUID_V4_REGEX);
  });

  it('should generate unique JTIs across different tokens', async () => {
    const email1 = `jti-unique-1-${Date.now()}@example.com`;
    const email2 = `jti-unique-2-${Date.now()}@example.com`;

    const decoded1 = await signupAndGetRefreshToken(email1);
    const decoded2 = await signupAndGetRefreshToken(email2);

    expect(decoded1.jti).not.toBe(decoded2.jti);
  });
});
