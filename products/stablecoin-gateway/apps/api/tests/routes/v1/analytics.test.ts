import { buildApp } from '../../../src/app';
import { FastifyInstance } from 'fastify';
import { prisma } from '../../setup';
import bcrypt from 'bcrypt';
import { Decimal } from '@prisma/client/runtime/library';

describe('Analytics API', () => {
  let app: FastifyInstance;
  let userId: string;
  let authToken: string;

  beforeAll(async () => {
    app = await buildApp();

    const passwordHash = await bcrypt.hash('TestPass123!@#', 10);
    const user = await prisma.user.create({
      data: {
        email: 'analytics-test@example.com',
        passwordHash,
      },
    });
    userId = user.id;
    authToken = app.jwt.sign({ userId: user.id });

    // Create test payment sessions with various statuses
    const sessions = [
      { amount: 100, status: 'COMPLETED' as const, network: 'polygon', token: 'USDC' },
      { amount: 250, status: 'COMPLETED' as const, network: 'polygon', token: 'USDC' },
      { amount: 500, status: 'COMPLETED' as const, network: 'ethereum', token: 'USDT' },
      { amount: 75, status: 'PENDING' as const, network: 'polygon', token: 'USDC' },
      { amount: 200, status: 'FAILED' as const, network: 'ethereum', token: 'USDC' },
    ];

    for (const s of sessions) {
      await prisma.paymentSession.create({
        data: {
          userId,
          amount: new Decimal(s.amount),
          currency: 'USD',
          status: s.status,
          network: s.network,
          token: s.token,
          merchantAddress: '0x1234567890abcdef1234567890abcdef12345678',
          expiresAt: new Date(Date.now() + 3600000),
        },
      });
    }
  });

  afterAll(async () => {
    await prisma.paymentSession.deleteMany({ where: { userId } });
    await prisma.user.deleteMany({ where: { id: userId } });
    await app.close();
  });

  describe('GET /v1/analytics/overview', () => {
    it('returns overview statistics', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/v1/analytics/overview',
        headers: { authorization: `Bearer ${authToken}` },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();

      expect(body.total_payments).toBe(5);
      expect(body.total_volume).toBe(1125);
      expect(body.successful_payments).toBe(3);
      expect(body.success_rate).toBe(0.6);
      expect(body.average_payment).toBe(225);
      expect(body.total_refunds).toBe(0);
      expect(body.refund_rate).toBe(0);
    });

    it('requires authentication', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/v1/analytics/overview',
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe('GET /v1/analytics/volume', () => {
    it('returns volume data with default params', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/v1/analytics/volume',
        headers: { authorization: `Bearer ${authToken}` },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();

      expect(body).toHaveProperty('data');
      expect(body).toHaveProperty('period', 'day');
      expect(body).toHaveProperty('days', 30);
      expect(Array.isArray(body.data)).toBe(true);

      // Should have volume from completed payments only
      const totalVolume = body.data.reduce(
        (sum: number, d: { volume: number }) => sum + d.volume,
        0,
      );
      expect(totalVolume).toBe(850); // 100 + 250 + 500
    });

    it('accepts period and days parameters', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/v1/analytics/volume?period=week&days=90',
        headers: { authorization: `Bearer ${authToken}` },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.period).toBe('week');
      expect(body.days).toBe(90);
    });

    it('rejects invalid period', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/v1/analytics/volume?period=year',
        headers: { authorization: `Bearer ${authToken}` },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('GET /v1/analytics/payments', () => {
    it('returns breakdown by status', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/v1/analytics/payments?group_by=status',
        headers: { authorization: `Bearer ${authToken}` },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();

      expect(body).toHaveProperty('data');
      expect(body).toHaveProperty('group_by', 'status');

      const completed = body.data.find(
        (d: { label: string }) => d.label === 'COMPLETED',
      );
      expect(completed).toBeDefined();
      expect(completed.count).toBe(3);
      expect(completed.volume).toBe(850);

      const pending = body.data.find(
        (d: { label: string }) => d.label === 'PENDING',
      );
      expect(pending).toBeDefined();
      expect(pending.count).toBe(1);
    });

    it('returns breakdown by network', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/v1/analytics/payments?group_by=network',
        headers: { authorization: `Bearer ${authToken}` },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();

      const polygon = body.data.find(
        (d: { label: string }) => d.label === 'polygon',
      );
      expect(polygon).toBeDefined();
      expect(polygon.count).toBe(3); // 2 USDC + 1 USDC pending

      const ethereum = body.data.find(
        (d: { label: string }) => d.label === 'ethereum',
      );
      expect(ethereum).toBeDefined();
      expect(ethereum.count).toBe(2);
    });

    it('returns breakdown by token', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/v1/analytics/payments?group_by=token',
        headers: { authorization: `Bearer ${authToken}` },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();

      const usdc = body.data.find(
        (d: { label: string }) => d.label === 'USDC',
      );
      expect(usdc).toBeDefined();
      expect(usdc.count).toBe(4);

      const usdt = body.data.find(
        (d: { label: string }) => d.label === 'USDT',
      );
      expect(usdt).toBeDefined();
      expect(usdt.count).toBe(1);
    });

    it('defaults to status grouping', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/v1/analytics/payments',
        headers: { authorization: `Bearer ${authToken}` },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.group_by).toBe('status');
    });
  });
});
