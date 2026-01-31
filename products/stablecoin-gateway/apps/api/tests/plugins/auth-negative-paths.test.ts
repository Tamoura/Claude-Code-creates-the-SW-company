/**
 * Auth Plugin - Negative Path Tests
 *
 * Verifies that the auth plugin correctly rejects all flavours
 * of invalid credentials with the appropriate HTTP status codes.
 *
 * Covers:
 *  1. Missing Authorization header           -> 401
 *  2. Malformed bearer (no "Bearer " prefix) -> 401
 *  3. Expired JWT                            -> 401
 *  4. JWT with nonexistent userId            -> 401
 *  5. Invalid / random token string          -> 401
 *  6. API key with insufficient permissions  -> 403
 *  7. Nonexistent API key hash               -> 401
 *  8. Revoked JTI (Redis blacklist)          -> 401
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/app';
import { hashApiKey } from '../../src/utils/crypto';

describe('Auth Plugin - Negative Paths', () => {
  let app: FastifyInstance;
  let testUserId: string;
  let readOnlyApiKey: string;
  let jwtToken: string;

  beforeAll(async () => {
    app = await buildApp();

    // Create a test user for scenarios that need a valid user
    const user = await app.prisma.user.create({
      data: {
        email: `auth-neg-${Date.now()}@example.com`,
        passwordHash: 'test-hash',
      },
    });
    testUserId = user.id;

    // Sign a valid JWT for baseline comparisons
    jwtToken = app.jwt.sign({ userId: testUserId, jti: `neg-valid-${Date.now()}` });

    // Create a read-only API key (no write permission)
    readOnlyApiKey = 'sk_test_neg_readonly_' + Math.random().toString(36).substring(2);
    await app.prisma.apiKey.create({
      data: {
        name: 'Read Only (neg-path test)',
        keyHash: hashApiKey(readOnlyApiKey),
        keyPrefix: readOnlyApiKey.substring(0, 12),
        userId: testUserId,
        permissions: { read: true, write: false, refund: false },
      },
    });
  });

  afterAll(async () => {
    await app.prisma.apiKey.deleteMany({ where: { userId: testUserId } });
    await app.prisma.user.deleteMany({ where: { id: testUserId } });
    await app.close();
  });

  // ------------------------------------------------------------------
  // 1. Missing Authorization header
  // ------------------------------------------------------------------
  it('should return 401 when Authorization header is missing', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/v1/payment-sessions',
    });

    expect(res.statusCode).toBe(401);
    const body = res.json();
    expect(body.code).toBe('unauthorized');
    expect(body.message).toMatch(/missing authorization/i);
  });

  // ------------------------------------------------------------------
  // 2. Malformed bearer (no "Bearer " prefix)
  // ------------------------------------------------------------------
  it('should return 401 when Authorization header lacks Bearer prefix', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/v1/payment-sessions',
      headers: {
        authorization: `Token ${jwtToken}`,
      },
    });

    expect(res.statusCode).toBe(401);
    const body = res.json();
    expect(body.code).toBe('unauthorized');
    expect(body.message).toMatch(/invalid authorization/i);
  });

  // ------------------------------------------------------------------
  // 3. Expired JWT
  // ------------------------------------------------------------------
  it('should return 401 for an expired JWT', async () => {
    // Sign a JWT that expired 1 hour ago
    const expiredToken = app.jwt.sign(
      { userId: testUserId },
      { expiresIn: -3600 },
    );

    const res = await app.inject({
      method: 'GET',
      url: '/v1/payment-sessions',
      headers: {
        authorization: `Bearer ${expiredToken}`,
      },
    });

    expect(res.statusCode).toBe(401);
  });

  // ------------------------------------------------------------------
  // 4. JWT with nonexistent userId
  // ------------------------------------------------------------------
  it('should return 401 when JWT references a nonexistent user', async () => {
    // The auth plugin tries JWT verification first.  When the userId
    // lookup fails, it falls through to the API key code path (which
    // also fails), ultimately returning 401 "Invalid API key".
    const ghostToken = app.jwt.sign({
      userId: '00000000-0000-4000-a000-000000000000',
    });

    const res = await app.inject({
      method: 'GET',
      url: '/v1/payment-sessions',
      headers: {
        authorization: `Bearer ${ghostToken}`,
      },
    });

    expect(res.statusCode).toBe(401);
    const body = res.json();
    expect(body.code).toBe('unauthorized');
  });

  // ------------------------------------------------------------------
  // 5. Invalid / random token string
  // ------------------------------------------------------------------
  it('should return 401 for a random garbage token', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/v1/payment-sessions',
      headers: {
        authorization: 'Bearer this.is.not.a.valid.token',
      },
    });

    expect(res.statusCode).toBe(401);
  });

  // ------------------------------------------------------------------
  // 6. API key with insufficient permissions (read-only -> write)
  // ------------------------------------------------------------------
  it('should return 403 for an API key without write permission', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/payment-sessions',
      headers: {
        authorization: `Bearer ${readOnlyApiKey}`,
      },
      payload: {
        amount: 100,
        merchant_address: '0x742D35CC6634c0532925A3b844BC9E7595F0BEb0',
      },
    });

    expect(res.statusCode).toBe(403);
    const body = res.json();
    expect(body.code).toBe('insufficient-permissions');
    expect(body.message).toContain("'write' permission");
  });

  // ------------------------------------------------------------------
  // 7. Nonexistent API key hash
  // ------------------------------------------------------------------
  it('should return 401 for a nonexistent API key', async () => {
    const fakeKey = 'sk_test_doesnotexist_' + Math.random().toString(36).substring(2);

    const res = await app.inject({
      method: 'GET',
      url: '/v1/payment-sessions',
      headers: {
        authorization: `Bearer ${fakeKey}`,
      },
    });

    expect(res.statusCode).toBe(401);
  });

  // ------------------------------------------------------------------
  // 8. Revoked JTI (Redis blacklist)
  // ------------------------------------------------------------------
  it('should return 401 when the JWT JTI has been revoked via Redis', async () => {
    const jti = `neg-revoked-${Date.now()}`;
    const revokedToken = app.jwt.sign({ userId: testUserId, jti });

    // Pre-check: token should work before revocation
    const preRes = await app.inject({
      method: 'GET',
      url: '/v1/payment-sessions',
      headers: {
        authorization: `Bearer ${revokedToken}`,
      },
    });
    expect(preRes.statusCode).toBe(200);

    // Revoke the JTI via Redis
    if (app.redis) {
      await app.redis.set(`revoked_jti:${jti}`, '1', 'EX', 900);
    }

    // Post-revocation: token must now be rejected
    const postRes = await app.inject({
      method: 'GET',
      url: '/v1/payment-sessions',
      headers: {
        authorization: `Bearer ${revokedToken}`,
      },
    });

    expect(postRes.statusCode).toBe(401);
    const body = postRes.json();
    expect(body.code).toBe('token-revoked');
    expect(body.message).toMatch(/revoked/i);
  });
});
