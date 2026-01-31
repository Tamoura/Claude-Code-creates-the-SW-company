import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { buildApp } from '../../src/app.js';
import { FastifyInstance } from 'fastify';
import { hashApiKey } from '../../src/utils/crypto.js';

describe('Auth Plugin - Permission Enforcement', () => {
  let app: FastifyInstance;
  let testUserId: string;
  let readOnlyApiKey: string;
  let writeApiKey: string;
  let fullAccessApiKey: string;
  let jwtToken: string;

  beforeAll(async () => {
    app = await buildApp();

    // Create test user
    const user = await app.prisma.user.create({
      data: {
        email: 'permission-test@example.com',
        passwordHash: 'test',
      },
    });
    testUserId = user.id;

    // Generate JWT token for user
    jwtToken = app.jwt.sign({ userId: testUserId });

    // Create API keys with different permissions
    // Read-only key
    readOnlyApiKey = 'sk_test_read_only_' + Math.random().toString(36).substring(2);
    await app.prisma.apiKey.create({
      data: {
        name: 'Read Only Key',
        keyHash: hashApiKey(readOnlyApiKey),
        keyPrefix: readOnlyApiKey.substring(0, 12),
        userId: testUserId,
        permissions: { read: true, write: false, refund: false },
      },
    });

    // Write key (read + write)
    writeApiKey = 'sk_test_write_' + Math.random().toString(36).substring(2);
    await app.prisma.apiKey.create({
      data: {
        name: 'Write Key',
        keyHash: hashApiKey(writeApiKey),
        keyPrefix: writeApiKey.substring(0, 12),
        userId: testUserId,
        permissions: { read: true, write: true, refund: false },
      },
    });

    // Full access key (read + write + refund)
    fullAccessApiKey = 'sk_test_full_' + Math.random().toString(36).substring(2);
    await app.prisma.apiKey.create({
      data: {
        name: 'Full Access Key',
        keyHash: hashApiKey(fullAccessApiKey),
        keyPrefix: fullAccessApiKey.substring(0, 12),
        userId: testUserId,
        permissions: { read: true, write: true, refund: true },
      },
    });
  });

  afterAll(async () => {
    // Clean up
    await app.prisma.apiKey.deleteMany({
      where: { userId: testUserId },
    });
    await app.prisma.user.deleteMany({
      where: { id: testUserId },
    });
    await app.close();
  });

  describe('requirePermission decorator', () => {
    it('should be available on fastify instance', () => {
      expect(app.requirePermission).toBeDefined();
      expect(typeof app.requirePermission).toBe('function');
    });

    it('should allow JWT users full permissions (bypass permission check)', async () => {
      // JWT users should have all permissions
      const request = {
        currentUser: { id: testUserId },
        apiKey: undefined,
      } as any;

      const readCheck = app.requirePermission('read');
      await expect(readCheck(request)).resolves.not.toThrow();

      const writeCheck = app.requirePermission('write');
      await expect(writeCheck(request)).resolves.not.toThrow();

      const refundCheck = app.requirePermission('refund');
      await expect(refundCheck(request)).resolves.not.toThrow();
    });

    it('should allow API key with required permission', async () => {
      const apiKey = await app.prisma.apiKey.findFirst({
        where: { keyHash: hashApiKey(writeApiKey) },
      });

      const request = {
        currentUser: { id: testUserId },
        apiKey,
      } as any;

      const writeCheck = app.requirePermission('write');
      await expect(writeCheck(request)).resolves.not.toThrow();
    });

    it('should reject API key without required permission', async () => {
      const apiKey = await app.prisma.apiKey.findFirst({
        where: { keyHash: hashApiKey(readOnlyApiKey) },
      });

      const request = {
        currentUser: { id: testUserId },
        apiKey,
      } as any;

      const writeCheck = app.requirePermission('write');
      await expect(writeCheck(request)).rejects.toThrow(
        "This API key does not have 'write' permission"
      );
    });

    it('should reject API key without refund permission', async () => {
      const apiKey = await app.prisma.apiKey.findFirst({
        where: { keyHash: hashApiKey(writeApiKey) },
      });

      const request = {
        currentUser: { id: testUserId },
        apiKey,
      } as any;

      const refundCheck = app.requirePermission('refund');
      await expect(refundCheck(request)).rejects.toThrow(
        "This API key does not have 'refund' permission"
      );
    });
  });

  describe('POST /v1/payment-sessions (requires write)', () => {
    it('should reject read-only API key', async () => {
      const response = await app.inject({
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

      expect(response.statusCode).toBe(403);
      const body = JSON.parse(response.body);
      expect(body.code).toBe('insufficient-permissions');
      expect(body.message).toContain("'write' permission");
    });

    it('should allow write API key', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/v1/payment-sessions',
        headers: {
          authorization: `Bearer ${writeApiKey}`,
        },
        payload: {
          amount: 100,
          merchant_address: '0x742D35CC6634c0532925A3b844BC9E7595F0BEb0',
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.id).toBeDefined();
    });

    it('should allow full access API key', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/v1/payment-sessions',
        headers: {
          authorization: `Bearer ${fullAccessApiKey}`,
        },
        payload: {
          amount: 100,
          merchant_address: '0x742D35CC6634c0532925A3b844BC9E7595F0BEb0',
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.id).toBeDefined();
    });

    it('should allow JWT token (full permissions)', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/v1/payment-sessions',
        headers: {
          authorization: `Bearer ${jwtToken}`,
        },
        payload: {
          amount: 100,
          merchant_address: '0x742D35CC6634c0532925A3b844BC9E7595F0BEb0',
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.id).toBeDefined();
    });
  });

  describe('GET /v1/payment-sessions (requires read)', () => {
    it('should allow read-only API key', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/v1/payment-sessions',
        headers: {
          authorization: `Bearer ${readOnlyApiKey}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data).toBeDefined();
      expect(Array.isArray(body.data)).toBe(true);
    });

    it('should allow write API key (has read)', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/v1/payment-sessions',
        headers: {
          authorization: `Bearer ${writeApiKey}`,
        },
      });

      expect(response.statusCode).toBe(200);
    });

    it('should allow JWT token', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/v1/payment-sessions',
        headers: {
          authorization: `Bearer ${jwtToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
    });
  });

  describe('GET /v1/payment-sessions/:id (requires read)', () => {
    let paymentSessionId: string;

    beforeAll(async () => {
      // Create a payment session for testing
      const session = await app.prisma.paymentSession.create({
        data: {
          userId: testUserId,
          amount: 100,
          currency: 'USD',
          network: 'polygon',
          token: 'USDC',
          merchantAddress: '0x742D35CC6634c0532925A3b844BC9E7595F0BEb0',
          status: 'PENDING',
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      });
      paymentSessionId = session.id;
    });

    afterAll(async () => {
      await app.prisma.paymentSession.deleteMany({
        where: { id: paymentSessionId },
      });
    });

    it('should allow read-only API key', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/v1/payment-sessions/${paymentSessionId}`,
        headers: {
          authorization: `Bearer ${readOnlyApiKey}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.id).toBe(paymentSessionId);
    });

    it('should allow write API key (has read)', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/v1/payment-sessions/${paymentSessionId}`,
        headers: {
          authorization: `Bearer ${writeApiKey}`,
        },
      });

      expect(response.statusCode).toBe(200);
    });
  });

  describe('PATCH /v1/payment-sessions/:id (requires write)', () => {
    let paymentSessionId: string;

    beforeAll(async () => {
      // Create a payment session for testing
      const session = await app.prisma.paymentSession.create({
        data: {
          userId: testUserId,
          amount: 100,
          currency: 'USD',
          network: 'polygon',
          token: 'USDC',
          merchantAddress: '0x742D35CC6634c0532925A3b844BC9E7595F0BEb0',
          status: 'PENDING',
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      });
      paymentSessionId = session.id;
    });

    afterAll(async () => {
      await app.prisma.paymentSession.deleteMany({
        where: { id: paymentSessionId },
      });
    });

    it('should reject read-only API key', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: `/v1/payment-sessions/${paymentSessionId}`,
        headers: {
          authorization: `Bearer ${readOnlyApiKey}`,
        },
        payload: {
          status: 'CONFIRMING',
        },
      });

      expect(response.statusCode).toBe(403);
      const body = JSON.parse(response.body);
      expect(body.code).toBe('insufficient-permissions');
      expect(body.message).toContain("'write' permission");
    });

    it('should allow write API key', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: `/v1/payment-sessions/${paymentSessionId}`,
        headers: {
          authorization: `Bearer ${writeApiKey}`,
        },
        payload: {
          customer_address: '0x742d35cC6634c0532925A3b844bc9E7595F0beB1',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.customer_address).toBe('0x742d35cC6634c0532925A3b844bc9E7595F0beB1');
    });

    it('should allow JWT token', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: `/v1/payment-sessions/${paymentSessionId}`,
        headers: {
          authorization: `Bearer ${jwtToken}`,
        },
        payload: {
          confirmations: 5,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.confirmations).toBe(5);
    });
  });

  describe('Permission matrix validation', () => {
    it('read-only key should only access read operations', async () => {
      // Can read
      const readListResponse = await app.inject({
        method: 'GET',
        url: '/v1/payment-sessions',
        headers: { authorization: `Bearer ${readOnlyApiKey}` },
      });
      expect(readListResponse.statusCode).toBe(200);

      // Cannot write
      const writeResponse = await app.inject({
        method: 'POST',
        url: '/v1/payment-sessions',
        headers: { authorization: `Bearer ${readOnlyApiKey}` },
        payload: {
          amount: 100,
          merchant_address: '0x742D35CC6634c0532925A3b844BC9E7595F0BEb0',
        },
      });
      expect(writeResponse.statusCode).toBe(403);
    });

    it('write key should access read and write but not refund', async () => {
      // Can read
      const readResponse = await app.inject({
        method: 'GET',
        url: '/v1/payment-sessions',
        headers: { authorization: `Bearer ${writeApiKey}` },
      });
      expect(readResponse.statusCode).toBe(200);

      // Can write
      const writeResponse = await app.inject({
        method: 'POST',
        url: '/v1/payment-sessions',
        headers: { authorization: `Bearer ${writeApiKey}` },
        payload: {
          amount: 100,
          merchant_address: '0x742D35CC6634c0532925A3b844BC9E7595F0BEb0',
        },
      });
      expect(writeResponse.statusCode).toBe(201);

      // Note: Refund endpoint doesn't exist yet, but permission check should be ready
    });

    it('full access key should access all operations', async () => {
      // Can read
      const readResponse = await app.inject({
        method: 'GET',
        url: '/v1/payment-sessions',
        headers: { authorization: `Bearer ${fullAccessApiKey}` },
      });
      expect(readResponse.statusCode).toBe(200);

      // Can write
      const writeResponse = await app.inject({
        method: 'POST',
        url: '/v1/payment-sessions',
        headers: { authorization: `Bearer ${fullAccessApiKey}` },
        payload: {
          amount: 100,
          merchant_address: '0x742D35CC6634c0532925A3b844BC9E7595F0BEb0',
        },
      });
      expect(writeResponse.statusCode).toBe(201);
    });
  });
});
