import { WebhookDeliveryService } from '../../src/services/webhook-delivery.service';
import { PrismaClient, WebhookStatus } from '@prisma/client';
import { signWebhookPayload } from '../../src/utils/crypto';

// Mock fetch globally
global.fetch = jest.fn();

describe('WebhookDeliveryService', () => {
  let prisma: PrismaClient;
  let service: WebhookDeliveryService;
  let testUserId: string;
  let testEndpointId: string;

  beforeAll(async () => {
    prisma = new PrismaClient();
    service = new WebhookDeliveryService(prisma);

    // Create test user (simplified - just need userId)
    const user = await prisma.user.create({
      data: {
        email: 'webhook-test@example.com',
        passwordHash: 'test',
      },
    });
    testUserId = user.id;

    // Create test webhook endpoint
    const endpoint = await prisma.webhookEndpoint.create({
      data: {
        userId: testUserId,
        url: 'https://example.com/webhook',
        secret: 'whsec_test123',
        events: ['payment.created', 'payment.completed'],
        enabled: true,
      },
    });
    testEndpointId = endpoint.id;
  });

  afterAll(async () => {
    // Cleanup
    await prisma.webhookDelivery.deleteMany({
      where: { endpointId: testEndpointId },
    });
    await prisma.webhookEndpoint.deleteMany({
      where: { id: testEndpointId },
    });
    await prisma.user.deleteMany({
      where: { id: testUserId },
    });
    await prisma.$disconnect();
  });

  afterEach(async () => {
    jest.clearAllMocks();
    // Clean up any pending deliveries from this test
    await prisma.webhookDelivery.deleteMany({
      where: {
        endpointId: testEndpointId,
        status: { in: [WebhookStatus.PENDING, WebhookStatus.FAILED] },
      },
    });
  });

  describe('queueWebhook', () => {
    it('should queue webhook for all subscribed endpoints', async () => {
      const count = await service.queueWebhook(testUserId, 'payment.created', {
        id: 'ps_123',
        amount: 100,
        currency: 'USD',
      });

      expect(count).toBe(1);

      // Verify delivery was created
      const deliveries = await prisma.webhookDelivery.findMany({
        where: {
          endpointId: testEndpointId,
          eventType: 'payment.created',
        },
      });

      expect(deliveries).toHaveLength(1);
      expect(deliveries[0].status).toBe(WebhookStatus.PENDING);
      expect(deliveries[0].attempts).toBe(0);
      expect(deliveries[0].payload).toMatchObject({
        type: 'payment.created',
        data: {
          id: 'ps_123',
          amount: 100,
          currency: 'USD',
        },
      });
    });

    it('should queue webhook to multiple endpoints if subscribed', async () => {
      // Create second endpoint
      const endpoint2 = await prisma.webhookEndpoint.create({
        data: {
          userId: testUserId,
          url: 'https://example.com/webhook2',
          secret: 'whsec_test456',
          events: ['payment.created'],
          enabled: true,
        },
      });

      const count = await service.queueWebhook(testUserId, 'payment.created', {
        id: 'ps_456',
        amount: 200,
      });

      expect(count).toBe(2);

      // Cleanup
      await prisma.webhookDelivery.deleteMany({
        where: { endpointId: endpoint2.id },
      });
      await prisma.webhookEndpoint.deleteMany({ where: { id: endpoint2.id } });
    });

    it('should not queue webhook if no endpoints subscribed to event', async () => {
      const count = await service.queueWebhook(testUserId, 'refund.created', {
        id: 'ref_123',
      });

      expect(count).toBe(0);
    });

    it('should not queue webhook for disabled endpoints', async () => {
      // Disable endpoint
      await prisma.webhookEndpoint.update({
        where: { id: testEndpointId },
        data: { enabled: false },
      });

      const count = await service.queueWebhook(testUserId, 'payment.created', {
        id: 'ps_789',
      });

      expect(count).toBe(0);

      // Re-enable for other tests
      await prisma.webhookEndpoint.update({
        where: { id: testEndpointId },
        data: { enabled: true },
      });
    });
  });

  describe('processQueue and deliverWebhook', () => {
    it('should successfully deliver webhook with correct signature', async () => {
      // Clean up any existing deliveries first
      await prisma.webhookDelivery.deleteMany({
        where: { endpointId: testEndpointId },
      });

      // Queue a webhook
      await service.queueWebhook(testUserId, 'payment.completed', {
        id: 'ps_success',
        amount: 100,
        status: 'COMPLETED',
      });

      // Mock successful HTTP response for ALL fetch calls
      (global.fetch as jest.Mock).mockImplementation(async () => ({
        status: 200,
        statusText: 'OK',
        text: async () => 'OK',
      }));

      // Process queue
      await service.processQueue();

      // Verify fetch was called with correct parameters
      expect(global.fetch).toHaveBeenCalledWith(
        'https://example.com/webhook',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'X-Webhook-Signature': expect.any(String),
            'X-Webhook-Timestamp': expect.any(String),
            'X-Webhook-ID': expect.any(String),
            'User-Agent': 'StablecoinGateway-Webhooks/1.0',
          }),
          body: expect.stringContaining('payment.completed'),
        })
      );

      // Verify delivery succeeded
      const deliveries = await prisma.webhookDelivery.findMany({
        where: {
          endpointId: testEndpointId,
          eventType: 'payment.completed',
        },
      });

      expect(deliveries[0].status).toBe(WebhookStatus.SUCCEEDED);
      expect(deliveries[0].attempts).toBe(1);
      expect(deliveries[0].responseCode).toBe(200);
      expect(deliveries[0].succeededAt).toBeTruthy();
    });

    it('should retry failed delivery with exponential backoff', async () => {
      // Queue a webhook
      await service.queueWebhook(testUserId, 'payment.created', {
        id: 'ps_retry',
        amount: 50,
      });

      // Mock failed HTTP response (500 error)
      (global.fetch as jest.Mock).mockImplementation(async () => ({
        status: 500,
        statusText: 'Internal Server Error',
        text: async () => 'Server Error',
      }));

      // Process queue (first attempt)
      await service.processQueue();

      // Verify delivery failed and retry scheduled
      const deliveries = await prisma.webhookDelivery.findMany({
        where: {
          endpointId: testEndpointId,
          eventType: 'payment.created',
          payload: { path: ['data', 'id'], equals: 'ps_retry' },
        },
      });

      expect(deliveries[0].status).toBe(WebhookStatus.FAILED);
      expect(deliveries[0].attempts).toBe(1);
      expect(deliveries[0].responseCode).toBe(500);
      expect(deliveries[0].nextAttemptAt).toBeTruthy();

      // Verify retry is scheduled about 60 seconds in future (first retry delay)
      const retryDelay =
        (deliveries[0].nextAttemptAt!.getTime() - deliveries[0].lastAttemptAt!.getTime()) / 1000;
      expect(retryDelay).toBeGreaterThan(55);
      expect(retryDelay).toBeLessThan(65);
    });

    it('should handle network errors gracefully', async () => {
      // Queue a webhook
      await service.queueWebhook(testUserId, 'payment.created', {
        id: 'ps_network_error',
        amount: 75,
      });

      // Mock network error
      (global.fetch as jest.Mock).mockImplementation(async () => {
        throw new Error('Network timeout');
      });

      // Process queue
      await service.processQueue();

      // Verify delivery failed with error message
      const deliveries = await prisma.webhookDelivery.findMany({
        where: {
          endpointId: testEndpointId,
          eventType: 'payment.created',
          payload: { path: ['data', 'id'], equals: 'ps_network_error' },
        },
      });

      expect(deliveries[0].status).toBe(WebhookStatus.FAILED);
      expect(deliveries[0].errorMessage).toContain('Network timeout');
      expect(deliveries[0].nextAttemptAt).toBeTruthy(); // Should schedule retry
    });

    it('should mark as permanently failed after max retries', async () => {
      // Create a delivery that has already failed 4 times
      const delivery = await prisma.webhookDelivery.create({
        data: {
          endpointId: testEndpointId,
          eventType: 'payment.created',
          resourceId: 'ps_max_retries',
          payload: {
            id: 'evt_test',
            type: 'payment.created',
            created_at: new Date().toISOString(),
            data: { id: 'ps_max_retries', amount: 25 },
          },
          status: WebhookStatus.FAILED,
          attempts: 4,
          nextAttemptAt: new Date(Date.now() - 1000), // Ready for retry
        },
      });

      // Mock failed HTTP response
      (global.fetch as jest.Mock).mockImplementation(async () => ({
        status: 500,
        statusText: 'Internal Server Error',
        text: async () => 'Error',
      }));

      // Process queue (5th attempt)
      await service.processQueue();

      // Verify delivery permanently failed
      const updated = await prisma.webhookDelivery.findUnique({
        where: { id: delivery.id },
      });

      expect(updated?.status).toBe(WebhookStatus.FAILED);
      expect(updated?.attempts).toBe(5);
      expect(updated?.nextAttemptAt).toBeNull(); // No more retries
      expect(updated?.errorMessage).toContain('Max retries');
    });
  });

  describe('HMAC signature verification', () => {
    it('should generate correct HMAC signature for payload', () => {
      const payload = JSON.stringify({ test: 'data' });
      const secret = 'whsec_test123';
      const timestamp = 1234567890;

      const signature = signWebhookPayload(payload, secret, timestamp);

      // Signature should be a 64-character hex string (SHA-256)
      expect(signature).toMatch(/^[a-f0-9]{64}$/);

      // Same inputs should produce same signature
      const signature2 = signWebhookPayload(payload, secret, timestamp);
      expect(signature).toBe(signature2);

      // Different payload should produce different signature
      const signature3 = signWebhookPayload('different', secret, timestamp);
      expect(signature).not.toBe(signature3);
    });
  });

  describe('Idempotency', () => {
    beforeEach(async () => {
      // Clean up deliveries before each test
      await prisma.webhookDelivery.deleteMany({
        where: { endpointId: testEndpointId },
      });
    });

    it('should prevent duplicate webhook deliveries for same event and resource', async () => {
      const eventData = {
        id: 'payment_123',
        payment_session_id: 'payment_123',
        amount: 100,
        status: 'COMPLETED',
      };

      // Queue webhook first time
      const count1 = await service.queueWebhook(testUserId, 'payment.completed', eventData);
      expect(count1).toBe(1);

      // Queue same webhook again (duplicate)
      const count2 = await service.queueWebhook(testUserId, 'payment.completed', eventData);
      expect(count2).toBe(0); // Should not create duplicate

      // Verify only one delivery exists
      const deliveries = await prisma.webhookDelivery.findMany({
        where: {
          endpointId: testEndpointId,
          eventType: 'payment.completed',
        },
      });

      expect(deliveries).toHaveLength(1);
    });

    it('should allow different events for same resource', async () => {
      const resourceId = 'payment_456';

      // Queue payment.created event
      const count1 = await service.queueWebhook(testUserId, 'payment.created', {
        id: resourceId,
        payment_session_id: resourceId,
        amount: 100,
      });
      expect(count1).toBe(1);

      // Queue payment.completed event for same resource (different event type)
      const count2 = await service.queueWebhook(testUserId, 'payment.completed', {
        id: resourceId,
        payment_session_id: resourceId,
        amount: 100,
        status: 'COMPLETED',
      });
      expect(count2).toBe(1); // Should create new delivery (different event type)

      // Verify two deliveries exist
      const deliveries = await prisma.webhookDelivery.findMany({
        where: {
          endpointId: testEndpointId,
        },
      });

      expect(deliveries).toHaveLength(2);
      expect(deliveries.map(d => d.eventType).sort()).toEqual([
        'payment.completed',
        'payment.created',
      ]);
    });

    it('should allow same event for different resources', async () => {
      // Queue webhook for first payment
      const count1 = await service.queueWebhook(testUserId, 'payment.completed', {
        id: 'payment_789',
        payment_session_id: 'payment_789',
        amount: 100,
      });
      expect(count1).toBe(1);

      // Queue same event for different payment
      const count2 = await service.queueWebhook(testUserId, 'payment.completed', {
        id: 'payment_999',
        payment_session_id: 'payment_999',
        amount: 200,
      });
      expect(count2).toBe(1); // Should create new delivery (different resource)

      // Verify two deliveries exist
      const deliveries = await prisma.webhookDelivery.findMany({
        where: {
          endpointId: testEndpointId,
          eventType: 'payment.completed',
        },
      });

      expect(deliveries).toHaveLength(2);
    });

    it('should throw error if resource ID is missing', async () => {
      await expect(
        service.queueWebhook(testUserId, 'payment.completed', {
          amount: 100,
          // Missing id, payment_session_id, and refund_id
        })
      ).rejects.toThrow('Webhook data must contain id, payment_session_id, or refund_id');
    });

    it('should handle race conditions gracefully', async () => {
      const eventData = {
        id: 'payment_race',
        payment_session_id: 'payment_race',
        amount: 100,
      };

      // Queue same webhook multiple times concurrently
      const results = await Promise.all([
        service.queueWebhook(testUserId, 'payment.created', eventData),
        service.queueWebhook(testUserId, 'payment.created', eventData),
        service.queueWebhook(testUserId, 'payment.created', eventData),
      ]);

      // Only one should succeed, others should return 0
      const totalCreated = results.reduce((sum, count) => sum + count, 0);
      expect(totalCreated).toBe(1);

      // Verify only one delivery exists
      const deliveries = await prisma.webhookDelivery.findMany({
        where: {
          endpointId: testEndpointId,
          eventType: 'payment.created',
        },
      });

      expect(deliveries).toHaveLength(1);
    });

    it('should support refund events with refund_id', async () => {
      // Create endpoint subscribed to refund events
      const refundEndpoint = await prisma.webhookEndpoint.create({
        data: {
          userId: testUserId,
          url: 'https://example.com/webhook-refunds',
          secret: 'whsec_refund123',
          events: ['refund.created', 'refund.completed'],
          enabled: true,
        },
      });

      const refundData = {
        id: 'refund_123',
        refund_id: 'refund_123',
        payment_session_id: 'payment_original',
        amount: 50,
      };

      // Queue refund webhook
      const count = await service.queueWebhook(testUserId, 'refund.created', refundData);
      expect(count).toBe(1);

      // Try to queue duplicate
      const count2 = await service.queueWebhook(testUserId, 'refund.created', refundData);
      expect(count2).toBe(0);

      const deliveries = await prisma.webhookDelivery.findMany({
        where: {
          endpointId: refundEndpoint.id,
          eventType: 'refund.created',
        },
      });

      expect(deliveries).toHaveLength(1);

      // Cleanup
      await prisma.webhookDelivery.deleteMany({
        where: { endpointId: refundEndpoint.id },
      });
      await prisma.webhookEndpoint.deleteMany({ where: { id: refundEndpoint.id } });
    });
  });
});
