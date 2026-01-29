import { PrismaClient } from '@prisma/client';
import { PaymentExpirationWorker } from '../../src/workers/payment-expiration.worker';
import { WebhookDeliveryService } from '../../src/services/webhook-delivery.service';

describe('PaymentExpirationWorker', () => {
  let prisma: PrismaClient;
  let worker: PaymentExpirationWorker;
  let webhookService: WebhookDeliveryService;
  let testUserId: string;

  beforeAll(async () => {
    prisma = new PrismaClient();
    webhookService = new WebhookDeliveryService(prisma);
    worker = new PaymentExpirationWorker(prisma, webhookService, 1);

    // Create test user
    const user = await prisma.user.create({
      data: {
        email: `expiration-worker-${Date.now()}@test.com`,
        passwordHash: 'test-hash',
      },
    });
    testUserId = user.id;
  });

  afterAll(async () => {
    worker.stop();

    // Cleanup: delete payment sessions and user
    await prisma.paymentSession.deleteMany({
      where: { userId: testUserId },
    });
    await prisma.user.delete({
      where: { id: testUserId },
    });
    await prisma.$disconnect();
  });

  afterEach(async () => {
    worker.stop();
    // Clean up payment sessions between tests
    await prisma.paymentSession.deleteMany({
      where: { userId: testUserId },
    });
  });

  describe('processExpiredPayments', () => {
    it('should expire PENDING payments past their expiresAt', async () => {
      // Create a payment that expired 1 hour ago
      const expiredAt = new Date(Date.now() - 60 * 60 * 1000);
      await prisma.paymentSession.create({
        data: {
          id: `ps_expired_${Date.now()}`,
          userId: testUserId,
          amount: 100.00,
          currency: 'USD',
          network: 'polygon',
          token: 'USDC',
          merchantAddress: '0x1234567890abcdef1234567890abcdef12345678',
          status: 'PENDING',
          expiresAt: expiredAt,
        },
      });

      const count = await worker.processExpiredPayments();

      expect(count).toBe(1);

      // Verify the payment is now FAILED
      const sessions = await prisma.paymentSession.findMany({
        where: { userId: testUserId },
      });
      expect(sessions).toHaveLength(1);
      expect(sessions[0].status).toBe('FAILED');
    });

    it('should not expire PENDING payments that are not yet past expiresAt', async () => {
      // Create a payment that expires in 1 hour
      const futureExpiry = new Date(Date.now() + 60 * 60 * 1000);
      await prisma.paymentSession.create({
        data: {
          id: `ps_not_expired_${Date.now()}`,
          userId: testUserId,
          amount: 50.00,
          currency: 'USD',
          network: 'polygon',
          token: 'USDC',
          merchantAddress: '0x1234567890abcdef1234567890abcdef12345678',
          status: 'PENDING',
          expiresAt: futureExpiry,
        },
      });

      const count = await worker.processExpiredPayments();

      expect(count).toBe(0);

      // Verify the payment is still PENDING
      const sessions = await prisma.paymentSession.findMany({
        where: { userId: testUserId },
      });
      expect(sessions).toHaveLength(1);
      expect(sessions[0].status).toBe('PENDING');
    });

    it('should not expire non-PENDING payments even if past expiresAt', async () => {
      const expiredAt = new Date(Date.now() - 60 * 60 * 1000);

      // Create COMPLETED payment past expiry
      await prisma.paymentSession.create({
        data: {
          id: `ps_completed_${Date.now()}`,
          userId: testUserId,
          amount: 200.00,
          currency: 'USD',
          network: 'polygon',
          token: 'USDC',
          merchantAddress: '0x1234567890abcdef1234567890abcdef12345678',
          status: 'COMPLETED',
          expiresAt: expiredAt,
          completedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
        },
      });

      // Create FAILED payment past expiry
      await prisma.paymentSession.create({
        data: {
          id: `ps_failed_${Date.now()}`,
          userId: testUserId,
          amount: 75.00,
          currency: 'USD',
          network: 'polygon',
          token: 'USDC',
          merchantAddress: '0x1234567890abcdef1234567890abcdef12345678',
          status: 'FAILED',
          expiresAt: expiredAt,
        },
      });

      const count = await worker.processExpiredPayments();

      expect(count).toBe(0);

      // Verify statuses are unchanged
      const sessions = await prisma.paymentSession.findMany({
        where: { userId: testUserId },
        orderBy: { createdAt: 'asc' },
      });
      expect(sessions).toHaveLength(2);
      expect(sessions[0].status).toBe('COMPLETED');
      expect(sessions[1].status).toBe('FAILED');
    });

    it('should expire multiple PENDING payments in a single run', async () => {
      const expiredAt = new Date(Date.now() - 60 * 60 * 1000);

      // Create 3 expired PENDING payments
      for (let i = 0; i < 3; i++) {
        await prisma.paymentSession.create({
          data: {
            id: `ps_multi_${Date.now()}_${i}`,
            userId: testUserId,
            amount: 10.00 * (i + 1),
            currency: 'USD',
            network: 'polygon',
            token: 'USDC',
            merchantAddress: '0x1234567890abcdef1234567890abcdef12345678',
            status: 'PENDING',
            expiresAt: expiredAt,
          },
        });
      }

      const count = await worker.processExpiredPayments();

      expect(count).toBe(3);

      // Verify all are now FAILED
      const sessions = await prisma.paymentSession.findMany({
        where: { userId: testUserId },
      });
      expect(sessions).toHaveLength(3);
      sessions.forEach((s) => {
        expect(s.status).toBe('FAILED');
      });
    });

    it('should return 0 when no payments are expired', async () => {
      const count = await worker.processExpiredPayments();
      expect(count).toBe(0);
    });

    it('should queue payment.failed webhooks for expired sessions', async () => {
      const expiredAt = new Date(Date.now() - 60 * 60 * 1000);
      const sessionId = `ps_webhook_${Date.now()}`;

      // Create a webhook endpoint for the test user
      const endpoint = await prisma.webhookEndpoint.create({
        data: {
          userId: testUserId,
          url: 'https://example.com/expiration-webhook',
          secret: 'whsec_expiration_test',
          events: ['payment.failed'],
          enabled: true,
        },
      });

      // Create an expired PENDING payment
      await prisma.paymentSession.create({
        data: {
          id: sessionId,
          userId: testUserId,
          amount: 100.00,
          currency: 'USD',
          network: 'polygon',
          token: 'USDC',
          merchantAddress: '0x1234567890abcdef1234567890abcdef12345678',
          status: 'PENDING',
          expiresAt: expiredAt,
        },
      });

      const count = await worker.processExpiredPayments();
      expect(count).toBe(1);

      // Verify a webhook delivery was queued
      const deliveries = await prisma.webhookDelivery.findMany({
        where: {
          endpointId: endpoint.id,
          eventType: 'payment.failed',
        },
      });

      expect(deliveries.length).toBeGreaterThanOrEqual(1);
      const delivery = deliveries.find(
        (d) => (d.payload as any).data?.id === sessionId
      );
      expect(delivery).toBeDefined();
      expect(delivery!.status).toBe('PENDING');

      // Cleanup
      await prisma.webhookDelivery.deleteMany({
        where: { endpointId: endpoint.id },
      });
      await prisma.webhookEndpoint.delete({
        where: { id: endpoint.id },
      });
    });

    it('should not crash when webhook queuing fails', async () => {
      const expiredAt = new Date(Date.now() - 60 * 60 * 1000);

      // Create worker with a broken webhook service
      const brokenWebhookService = {
        queueWebhook: jest.fn().mockRejectedValue(
          new Error('Webhook service unavailable')
        ),
      } as unknown as WebhookDeliveryService;

      const workerWithBrokenWebhooks = new PaymentExpirationWorker(
        prisma,
        brokenWebhookService,
        1
      );

      await prisma.paymentSession.create({
        data: {
          id: `ps_broken_webhook_${Date.now()}`,
          userId: testUserId,
          amount: 100.00,
          currency: 'USD',
          network: 'polygon',
          token: 'USDC',
          merchantAddress: '0x1234567890abcdef1234567890abcdef12345678',
          status: 'PENDING',
          expiresAt: expiredAt,
        },
      });

      // Should not throw despite webhook failure
      const count = await workerWithBrokenWebhooks.processExpiredPayments();
      expect(count).toBe(1);

      // Payment should still be marked as FAILED
      const sessions = await prisma.paymentSession.findMany({
        where: { userId: testUserId, status: 'FAILED' },
      });
      expect(sessions).toHaveLength(1);
    });

    it('should only expire PENDING payments, leaving CONFIRMING untouched', async () => {
      const expiredAt = new Date(Date.now() - 60 * 60 * 1000);

      // Create CONFIRMING payment past expiry (should NOT be expired)
      await prisma.paymentSession.create({
        data: {
          id: `ps_confirming_${Date.now()}`,
          userId: testUserId,
          amount: 150.00,
          currency: 'USD',
          network: 'polygon',
          token: 'USDC',
          merchantAddress: '0x1234567890abcdef1234567890abcdef12345678',
          status: 'CONFIRMING',
          expiresAt: expiredAt,
          txHash: `0x${Date.now().toString(16).padStart(64, '0')}`,
        },
      });

      const count = await worker.processExpiredPayments();
      expect(count).toBe(0);

      // Verify status unchanged
      const sessions = await prisma.paymentSession.findMany({
        where: { userId: testUserId },
      });
      expect(sessions).toHaveLength(1);
      expect(sessions[0].status).toBe('CONFIRMING');
    });
  });

  describe('start/stop lifecycle', () => {
    it('should start and stop the worker interval', () => {
      const lifecycleWorker = new PaymentExpirationWorker(prisma, undefined, 1);

      // Worker should not be running initially
      expect(lifecycleWorker.isRunning()).toBe(false);

      lifecycleWorker.start();
      expect(lifecycleWorker.isRunning()).toBe(true);

      lifecycleWorker.stop();
      expect(lifecycleWorker.isRunning()).toBe(false);
    });

    it('should handle multiple stop calls gracefully', () => {
      const lifecycleWorker = new PaymentExpirationWorker(prisma, undefined, 1);

      lifecycleWorker.start();
      lifecycleWorker.stop();
      lifecycleWorker.stop(); // Second stop should not throw
      expect(lifecycleWorker.isRunning()).toBe(false);
    });

    it('should use configurable interval', () => {
      const worker5min = new PaymentExpirationWorker(prisma, undefined, 5);
      expect(worker5min.getIntervalMs()).toBe(5 * 60 * 1000);

      const worker10min = new PaymentExpirationWorker(prisma, undefined, 10);
      expect(worker10min.getIntervalMs()).toBe(10 * 60 * 1000);
    });
  });
});
