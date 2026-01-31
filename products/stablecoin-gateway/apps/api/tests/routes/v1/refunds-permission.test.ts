import { FastifyInstance } from 'fastify';
import { buildApp } from '../../../src/app.js';
import { hashApiKey } from '../../../src/utils/crypto.js';
import { randomBytes } from 'crypto';

describe('Refund endpoint permissions', () => {
  let app: FastifyInstance;
  let testUserId: string;
  let readOnlyApiKey: string;
  let refundApiKey: string;
  let jwtToken: string;

  beforeAll(async () => {
    app = await buildApp();

    const user = await app.prisma.user.create({
      data: {
        email: `refund-perm-${Date.now()}@test.com`,
        passwordHash: 'not-a-real-hash',
      },
    });
    testUserId = user.id;

    jwtToken = app.jwt.sign({ userId: testUserId });

    // API key with read-only permissions (no refund)
    readOnlyApiKey = 'sk_test_' + randomBytes(32).toString('hex');
    await app.prisma.apiKey.create({
      data: {
        name: 'Read Only Key',
        keyHash: hashApiKey(readOnlyApiKey),
        keyPrefix: readOnlyApiKey.substring(0, 12),
        userId: testUserId,
        permissions: { read: true, write: false, refund: false },
      },
    });

    // API key with refund permission
    refundApiKey = 'sk_test_' + randomBytes(32).toString('hex');
    await app.prisma.apiKey.create({
      data: {
        name: 'Refund Key',
        keyHash: hashApiKey(refundApiKey),
        keyPrefix: refundApiKey.substring(0, 12),
        userId: testUserId,
        permissions: { read: true, write: true, refund: true },
      },
    });
  });

  afterAll(async () => {
    await app.prisma.apiKey.deleteMany({ where: { userId: testUserId } });
    await app.prisma.user.delete({ where: { id: testUserId } });
    await app.close();
  });

  it('should reject read-only API key on GET /v1/refunds', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/v1/refunds',
      headers: { authorization: `Bearer ${readOnlyApiKey}` },
    });

    expect(response.statusCode).toBe(403);
    const body = response.json();
    expect(body.code).toBe('insufficient-permissions');
    expect(body.message).toContain("'refund'");
  });

  it('should allow refund API key on GET /v1/refunds', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/v1/refunds',
      headers: { authorization: `Bearer ${refundApiKey}` },
    });

    expect(response.statusCode).toBe(200);
  });

  it('should allow refund API key on GET /v1/refunds/:id', async () => {
    // Use a non-existent ID — we only care about the permission
    // gate, not finding the refund. A 404 means permission passed.
    const response = await app.inject({
      method: 'GET',
      url: '/v1/refunds/non-existent-id',
      headers: { authorization: `Bearer ${refundApiKey}` },
    });

    // 404 = passed permission check, refund not found
    expect([200, 404]).toContain(response.statusCode);
    expect(response.statusCode).not.toBe(403);
  });

  it('should allow JWT user on GET /v1/refunds (regression guard)', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/v1/refunds',
      headers: { authorization: `Bearer ${jwtToken}` },
    });

    expect(response.statusCode).toBe(200);
  });

  it('should reject read-only API key on GET /v1/refunds/:id', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/v1/refunds/some-id',
      headers: { authorization: `Bearer ${readOnlyApiKey}` },
    });

    expect(response.statusCode).toBe(403);
    const body = response.json();
    expect(body.code).toBe('insufficient-permissions');
  });
});
