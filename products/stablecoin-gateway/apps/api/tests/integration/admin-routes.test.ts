import { buildApp } from '../../src/app';
import { FastifyInstance } from 'fastify';
import { prisma } from '../setup';
import bcrypt from 'bcrypt';

/**
 * Admin routes integration tests
 *
 * Tests GET /v1/admin/merchants and GET /v1/admin/merchants/:id/payments
 * with auth, role, pagination, and data shape assertions.
 */

describe('Admin routes', () => {
  let app: FastifyInstance;
  const testUA = `AdminRoutesTest/${Date.now()}`;
  let adminToken: string;
  let merchantToken: string;
  let merchantUserId: string;

  beforeAll(async () => {
    app = await buildApp();
    const passwordHash = await bcrypt.hash('Test123!@#', 10);

    // Create admin user
    await prisma.user.upsert({
      where: { email: 'admin-routes@test.com' },
      update: { role: 'ADMIN' },
      create: {
        email: 'admin-routes@test.com',
        passwordHash,
        role: 'ADMIN',
      },
    });

    // Create merchant user with payments
    const merchant = await prisma.user.upsert({
      where: { email: 'merchant-routes@test.com' },
      update: {},
      create: {
        email: 'merchant-routes@test.com',
        passwordHash,
        role: 'MERCHANT',
      },
    });
    merchantUserId = merchant.id;

    // Create some payments for the merchant
    await prisma.paymentSession.createMany({
      data: [
        {
          userId: merchant.id,
          amount: 100.00,
          currency: 'USD',
          status: 'COMPLETED',
          network: 'polygon',
          token: 'USDC',
          merchantAddress: '0x1234567890abcdef1234567890abcdef12345678',
          expiresAt: new Date(Date.now() + 86400000),
        },
        {
          userId: merchant.id,
          amount: 250.50,
          currency: 'USD',
          status: 'PENDING',
          network: 'polygon',
          token: 'USDC',
          merchantAddress: '0x1234567890abcdef1234567890abcdef12345678',
          expiresAt: new Date(Date.now() + 86400000),
        },
        {
          userId: merchant.id,
          amount: 75.00,
          currency: 'USD',
          status: 'FAILED',
          network: 'polygon',
          token: 'USDC',
          merchantAddress: '0x1234567890abcdef1234567890abcdef12345678',
          expiresAt: new Date(Date.now() + 86400000),
        },
      ],
    });

    // Login as admin
    const adminLogin = await app.inject({
      method: 'POST',
      url: '/v1/auth/login',
      payload: { email: 'admin-routes@test.com', password: 'Test123!@#' },
      headers: { 'user-agent': `${testUA}-admin` },
    });
    adminToken = adminLogin.json().access_token;

    // Login as merchant
    const merchantLogin = await app.inject({
      method: 'POST',
      url: '/v1/auth/login',
      payload: { email: 'merchant-routes@test.com', password: 'Test123!@#' },
      headers: { 'user-agent': `${testUA}-merchant` },
    });
    merchantToken = merchantLogin.json().access_token;
  });

  afterAll(async () => {
    await app.close();
  });

  // --- GET /v1/admin/merchants ---

  describe('GET /v1/admin/merchants', () => {
    it('should return 401 without auth', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/v1/admin/merchants',
        headers: { 'user-agent': testUA },
      });
      expect(res.statusCode).toBe(401);
    });

    it('should return 403 for MERCHANT role', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/v1/admin/merchants',
        headers: {
          authorization: `Bearer ${merchantToken}`,
          'user-agent': testUA,
        },
      });
      expect(res.statusCode).toBe(403);
    });

    it('should return 200 with merchant list for ADMIN', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/v1/admin/merchants',
        headers: {
          authorization: `Bearer ${adminToken}`,
          'user-agent': testUA,
        },
      });
      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body).toHaveProperty('data');
      expect(body).toHaveProperty('pagination');
      expect(Array.isArray(body.data)).toBe(true);
      expect(body.data.length).toBeGreaterThan(0);
    });

    it('should include payment_count, total_volume, status_summary per merchant', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/v1/admin/merchants',
        headers: {
          authorization: `Bearer ${adminToken}`,
          'user-agent': testUA,
        },
      });
      const body = res.json();
      const merchant = body.data.find(
        (m: any) => m.id === merchantUserId
      );
      expect(merchant).toBeDefined();
      expect(merchant).toHaveProperty('email', 'merchant-routes@test.com');
      expect(merchant).toHaveProperty('payment_count');
      expect(merchant.payment_count).toBe(3);
      expect(merchant).toHaveProperty('total_volume');
      expect(merchant).toHaveProperty('status_summary');
      expect(merchant.status_summary).toHaveProperty('COMPLETED', 1);
      expect(merchant.status_summary).toHaveProperty('PENDING', 1);
      expect(merchant.status_summary).toHaveProperty('FAILED', 1);
    });

    it('should support pagination (limit/offset)', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/v1/admin/merchants?limit=1&offset=0',
        headers: {
          authorization: `Bearer ${adminToken}`,
          'user-agent': testUA,
        },
      });
      const body = res.json();
      expect(body.data.length).toBe(1);
      expect(body.pagination).toHaveProperty('total');
      expect(body.pagination).toHaveProperty('has_more');
      expect(body.pagination.has_more).toBe(true);
    });

    it('should support search by email', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/v1/admin/merchants?search=merchant-routes',
        headers: {
          authorization: `Bearer ${adminToken}`,
          'user-agent': testUA,
        },
      });
      const body = res.json();
      expect(body.data.length).toBeGreaterThanOrEqual(1);
      expect(
        body.data.some((m: any) => m.email === 'merchant-routes@test.com')
      ).toBe(true);
    });
  });

  // --- GET /v1/admin/merchants/:id/payments ---

  describe('GET /v1/admin/merchants/:id/payments', () => {
    it('should return 403 for MERCHANT role', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/v1/admin/merchants/${merchantUserId}/payments`,
        headers: {
          authorization: `Bearer ${merchantToken}`,
          'user-agent': testUA,
        },
      });
      expect(res.statusCode).toBe(403);
    });

    it('should return 200 with payments for ADMIN', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/v1/admin/merchants/${merchantUserId}/payments`,
        headers: {
          authorization: `Bearer ${adminToken}`,
          'user-agent': testUA,
        },
      });
      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body).toHaveProperty('data');
      expect(body).toHaveProperty('pagination');
      expect(body.data.length).toBe(3);
    });

    it('should return 404 for non-existent merchant', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/v1/admin/merchants/nonexistent123/payments',
        headers: {
          authorization: `Bearer ${adminToken}`,
          'user-agent': testUA,
        },
      });
      expect(res.statusCode).toBe(404);
    });

    it('should support status filter', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/v1/admin/merchants/${merchantUserId}/payments?status=COMPLETED`,
        headers: {
          authorization: `Bearer ${adminToken}`,
          'user-agent': testUA,
        },
      });
      const body = res.json();
      expect(body.data.length).toBe(1);
      expect(body.data[0].status).toBe('COMPLETED');
    });

    it('should support pagination', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/v1/admin/merchants/${merchantUserId}/payments?limit=1&offset=0`,
        headers: {
          authorization: `Bearer ${adminToken}`,
          'user-agent': testUA,
        },
      });
      const body = res.json();
      expect(body.data.length).toBe(1);
      expect(body.pagination.has_more).toBe(true);
    });

    it('should not expose passwordHash in merchant data', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/v1/admin/merchants',
        headers: {
          authorization: `Bearer ${adminToken}`,
          'user-agent': testUA,
        },
      });
      const body = res.json();
      for (const merchant of body.data) {
        expect(merchant).not.toHaveProperty('passwordHash');
        expect(merchant).not.toHaveProperty('password_hash');
      }
    });
  });
});
