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
    await prisma.webhookEndpoint.delete({
      where: { id: testEndpointId },
    });
    await prisma.user.delete({
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
      await prisma.webhookEndpoint.delete({ where: { id: endpoint2.id } });
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
});
