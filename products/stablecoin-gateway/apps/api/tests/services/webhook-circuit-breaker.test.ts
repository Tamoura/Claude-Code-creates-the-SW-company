import { WebhookDeliveryService } from '../../src/services/webhook-delivery.service';
import { PrismaClient, WebhookStatus } from '@prisma/client';

// Mock URL validator to avoid DNS resolution in tests
jest.mock('../../src/utils/url-validator', () => ({
  validateWebhookUrl: jest.fn().mockResolvedValue(undefined),
}));

/**
 * Mock Redis client for circuit breaker tests.
 *
 * Implements the subset of the ioredis API used by the circuit
 * breaker: get, set, incr, del, expire.
 */
function createMockRedis() {
  const store: Record<string, string> = {};
  const expiries: Record<string, NodeJS.Timeout> = {};

  return {
    store,
    async get(key: string): Promise<string | null> {
      return store[key] ?? null;
    },
    async set(key: string, value: string, ...args: any[]): Promise<string> {
      store[key] = value;
      // Handle 'PX' millisecond expiry
      if (args[0] === 'PX' && typeof args[1] === 'number') {
        clearTimeout(expiries[key]);
        expiries[key] = setTimeout(() => delete store[key], args[1]);
      }
      return 'OK';
    },
    async incr(key: string): Promise<number> {
      const current = parseInt(store[key] || '0', 10);
      const next = current + 1;
      store[key] = String(next);
      return next;
    },
    async del(key: string): Promise<number> {
      const existed = key in store ? 1 : 0;
      delete store[key];
      clearTimeout(expiries[key]);
      return existed;
    },
    async expire(key: string, seconds: number): Promise<number> {
      if (!(key in store)) return 0;
      clearTimeout(expiries[key]);
      expiries[key] = setTimeout(() => delete store[key], seconds * 1000);
      return 1;
    },
    _clearTimers() {
      Object.values(expiries).forEach(clearTimeout);
    },
  };
}

// Mock fetch globally
global.fetch = jest.fn();

describe('WebhookDeliveryService - Circuit Breaker', () => {
  let prisma: PrismaClient;
  let testUserId: string;
  let testEndpointId: string;
  let testEndpointId2: string;

  beforeAll(async () => {
    prisma = new PrismaClient();

    const user = await prisma.user.create({
      data: {
        email: 'circuit-breaker-test-' + Date.now() + '@example.com',
        passwordHash: 'test',
      },
    });
    testUserId = user.id;

    const endpoint = await prisma.webhookEndpoint.create({
      data: {
        userId: testUserId,
        url: 'https://broken-endpoint.example.com/webhook',
        secret: 'whsec_circuit_test',
        events: ['payment.created', 'payment.completed'],
        enabled: true,
      },
    });
    testEndpointId = endpoint.id;

    const endpoint2 = await prisma.webhookEndpoint.create({
      data: {
        userId: testUserId,
        url: 'https://healthy-endpoint.example.com/webhook',
        secret: 'whsec_circuit_test2',
        events: ['payment.created', 'payment.completed'],
        enabled: true,
      },
    });
    testEndpointId2 = endpoint2.id;
  });

  afterAll(async () => {
    if (testEndpointId && testEndpointId2) {
      await prisma.webhookDelivery.deleteMany({
        where: {
          endpointId: { in: [testEndpointId, testEndpointId2] },
        },
      });
      await prisma.webhookEndpoint.deleteMany({
        where: { id: { in: [testEndpointId, testEndpointId2] } },
      });
    }
    if (testUserId) {
      await prisma.user.deleteMany({ where: { id: testUserId } });
    }
    await prisma.$disconnect();
  });

  afterEach(async () => {
    jest.clearAllMocks();
    if (testEndpointId && testEndpointId2) {
      await prisma.webhookDelivery.deleteMany({
        where: {
          endpointId: { in: [testEndpointId, testEndpointId2] },
        },
      });
    }
  });

  it('should open circuit after 10 consecutive failures', async () => {
    const redis = createMockRedis();
    const service = new WebhookDeliveryService(prisma, redis as any);

    // Simulate 10 consecutive failures via Redis state
    redis.store['circuit:failures:' + testEndpointId] = '10';
    redis.store['circuit:open:' + testEndpointId] = String(Date.now());

    // Create a pending delivery
    await prisma.webhookDelivery.create({
      data: {
        endpointId: testEndpointId,
        eventType: 'payment.created',
        resourceId: 'ps_circuit_open',
        payload: {
          id: 'evt_test',
          type: 'payment.created',
          created_at: new Date().toISOString(),
          data: { id: 'ps_circuit_open', amount: 100 },
        },
        status: WebhookStatus.PENDING,
        attempts: 0,
        nextAttemptAt: new Date(),
      },
    });

    // Process queue -- circuit is open, so fetch should NOT be called
    await service.processQueue();

    expect(global.fetch).not.toHaveBeenCalled();

    redis._clearTimers();
  });

  it('should skip delivery with logged warning when circuit is open', async () => {
    const redis = createMockRedis();
    const service = new WebhookDeliveryService(prisma, redis as any);

    // Set circuit as open
    redis.store['circuit:failures:' + testEndpointId] = '15';
    redis.store['circuit:open:' + testEndpointId] = String(Date.now());

    const delivery = await prisma.webhookDelivery.create({
      data: {
        endpointId: testEndpointId,
        eventType: 'payment.created',
        resourceId: 'ps_skip_delivery',
        payload: {
          id: 'evt_skip',
          type: 'payment.created',
          created_at: new Date().toISOString(),
          data: { id: 'ps_skip_delivery', amount: 50 },
        },
        status: WebhookStatus.PENDING,
        attempts: 0,
        nextAttemptAt: new Date(),
      },
    });

    await service.processQueue();

    // Fetch must not be called (delivery skipped)
    expect(global.fetch).not.toHaveBeenCalled();

    // The delivery should still be in the database and remain PENDING
    const updated = await prisma.webhookDelivery.findUnique({
      where: { id: delivery.id },
    });
    expect(updated).not.toBeNull();
    expect(updated!.status).toBe(WebhookStatus.PENDING);

    redis._clearTimers();
  });

  it('should reset circuit after 5-minute cooldown', async () => {
    const redis = createMockRedis();
    const service = new WebhookDeliveryService(prisma, redis as any);

    // Set circuit as opened 6 minutes ago (past the 5-minute cooldown)
    const sixMinutesAgo = Date.now() - 6 * 60 * 1000;
    redis.store['circuit:failures:' + testEndpointId] = '10';
    redis.store['circuit:open:' + testEndpointId] = String(sixMinutesAgo);

    // Create a pending delivery
    await prisma.webhookDelivery.create({
      data: {
        endpointId: testEndpointId,
        eventType: 'payment.created',
        resourceId: 'ps_circuit_reset',
        payload: {
          id: 'evt_reset',
          type: 'payment.created',
          created_at: new Date().toISOString(),
          data: { id: 'ps_circuit_reset', amount: 75 },
        },
        status: WebhookStatus.PENDING,
        attempts: 0,
        nextAttemptAt: new Date(),
      },
    });

    // Mock successful response (endpoint recovered)
    (global.fetch as jest.Mock).mockResolvedValue({
      status: 200,
      statusText: 'OK',
      text: async () => 'OK',
    });

    await service.processQueue();

    // Delivery should be attempted since cooldown expired
    expect(global.fetch).toHaveBeenCalled();

    // Circuit state should be cleared after cooldown reset
    expect(redis.store['circuit:open:' + testEndpointId]).toBeUndefined();
    expect(redis.store['circuit:failures:' + testEndpointId]).toBeUndefined();

    redis._clearTimers();
  });

  it('should reset failure counter on successful delivery', async () => {
    const redis = createMockRedis();
    const service = new WebhookDeliveryService(prisma, redis as any);

    // Set some failures (below threshold)
    redis.store['circuit:failures:' + testEndpointId] = '5';

    await prisma.webhookDelivery.create({
      data: {
        endpointId: testEndpointId,
        eventType: 'payment.created',
        resourceId: 'ps_success_reset',
        payload: {
          id: 'evt_success',
          type: 'payment.created',
          created_at: new Date().toISOString(),
          data: { id: 'ps_success_reset', amount: 200 },
        },
        status: WebhookStatus.PENDING,
        attempts: 0,
        nextAttemptAt: new Date(),
      },
    });

    // Mock successful response
    (global.fetch as jest.Mock).mockResolvedValue({
      status: 200,
      statusText: 'OK',
      text: async () => 'OK',
    });

    await service.processQueue();

    expect(global.fetch).toHaveBeenCalled();

    // After success, failure counter and open flag must be cleared
    expect(redis.store['circuit:failures:' + testEndpointId]).toBeUndefined();
    expect(redis.store['circuit:open:' + testEndpointId]).toBeUndefined();

    redis._clearTimers();
  });

  it('should track circuit state per endpoint independently', async () => {
    const redis = createMockRedis();
    const service = new WebhookDeliveryService(prisma, redis as any);

    // Open circuit for endpoint 1 only
    redis.store['circuit:failures:' + testEndpointId] = '10';
    redis.store['circuit:open:' + testEndpointId] = String(Date.now());

    // Endpoint 2 has no failures -- its circuit is closed

    // Create deliveries for both endpoints
    await prisma.webhookDelivery.create({
      data: {
        endpointId: testEndpointId,
        eventType: 'payment.created',
        resourceId: 'ps_per_endpoint',
        payload: {
          id: 'evt_ep1',
          type: 'payment.created',
          created_at: new Date().toISOString(),
          data: { id: 'ps_per_endpoint', amount: 100 },
        },
        status: WebhookStatus.PENDING,
        attempts: 0,
        nextAttemptAt: new Date(),
      },
    });

    await prisma.webhookDelivery.create({
      data: {
        endpointId: testEndpointId2,
        eventType: 'payment.created',
        resourceId: 'ps_per_endpoint',
        payload: {
          id: 'evt_ep2',
          type: 'payment.created',
          created_at: new Date().toISOString(),
          data: { id: 'ps_per_endpoint', amount: 100 },
        },
        status: WebhookStatus.PENDING,
        attempts: 0,
        nextAttemptAt: new Date(),
      },
    });

    // Mock successful response
    (global.fetch as jest.Mock).mockResolvedValue({
      status: 200,
      statusText: 'OK',
      text: async () => 'OK',
    });

    await service.processQueue();

    // Only endpoint 2 should have been called (endpoint 1 circuit is open)
    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(global.fetch).toHaveBeenCalledWith(
      'https://healthy-endpoint.example.com/webhook',
      expect.any(Object)
    );

    redis._clearTimers();
  });

  it('should disable circuit breaker when Redis is unavailable', async () => {
    // Pass null for Redis -- circuit breaker should be disabled
    const service = new WebhookDeliveryService(prisma, null as any);

    await prisma.webhookDelivery.create({
      data: {
        endpointId: testEndpointId,
        eventType: 'payment.created',
        resourceId: 'ps_no_redis',
        payload: {
          id: 'evt_no_redis',
          type: 'payment.created',
          created_at: new Date().toISOString(),
          data: { id: 'ps_no_redis', amount: 300 },
        },
        status: WebhookStatus.PENDING,
        attempts: 0,
        nextAttemptAt: new Date(),
      },
    });

    // Mock successful response
    (global.fetch as jest.Mock).mockResolvedValue({
      status: 200,
      statusText: 'OK',
      text: async () => 'OK',
    });

    await service.processQueue();

    // Without Redis, all deliveries should be attempted regardless
    expect(global.fetch).toHaveBeenCalled();
  });
});
