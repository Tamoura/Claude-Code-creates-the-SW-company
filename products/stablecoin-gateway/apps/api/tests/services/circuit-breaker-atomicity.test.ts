import { WebhookDeliveryService } from '../../src/services/webhook-delivery.service';
import { PrismaClient, WebhookStatus } from '@prisma/client';

// Mock URL validator to avoid DNS resolution in tests
jest.mock('../../src/utils/url-validator', () => ({
  validateWebhookUrl: jest.fn().mockResolvedValue(undefined),
}));

// Mock fetch globally
global.fetch = jest.fn();

/**
 * Creates a mock Redis client that supports `eval` and tracks all
 * calls for assertion purposes.
 *
 * The `eval` implementation simulates the Lua script behaviour:
 * it atomically increments, sets expiry, and opens the circuit
 * when the threshold is reached.
 */
function createMockRedisWithEval() {
  const store: Record<string, string> = {};
  const expiries: Record<string, NodeJS.Timeout> = {};
  const calls: { method: string; args: any[] }[] = [];

  return {
    store,
    calls,
    async get(key: string): Promise<string | null> {
      calls.push({ method: 'get', args: [key] });
      return store[key] ?? null;
    },
    async set(key: string, value: string, ...args: any[]): Promise<string> {
      calls.push({ method: 'set', args: [key, value, ...args] });
      store[key] = value;
      if (args[0] === 'PX' && typeof args[1] === 'number') {
        clearTimeout(expiries[key]);
        expiries[key] = setTimeout(() => delete store[key], args[1]);
      }
      return 'OK';
    },
    async incr(key: string): Promise<number> {
      calls.push({ method: 'incr', args: [key] });
      const current = parseInt(store[key] || '0', 10);
      const next = current + 1;
      store[key] = String(next);
      return next;
    },
    async del(key: string): Promise<number> {
      calls.push({ method: 'del', args: [key] });
      const existed = key in store ? 1 : 0;
      delete store[key];
      clearTimeout(expiries[key]);
      return existed;
    },
    async expire(key: string, seconds: number): Promise<number> {
      calls.push({ method: 'expire', args: [key, seconds] });
      if (!(key in store)) return 0;
      clearTimeout(expiries[key]);
      expiries[key] = setTimeout(() => delete store[key], seconds * 1000);
      return 1;
    },
    async eval(script: string, numkeys: number, ...args: (string | number)[]): Promise<any> {
      calls.push({ method: 'eval', args: [script, numkeys, ...args] });
      // Simulate the Lua script:
      // KEYS[1] = failures key, KEYS[2] = open key
      // ARGV[1] = expire seconds, ARGV[2] = threshold, ARGV[3] = timestamp, ARGV[4] = reset ms
      const failKey = args[0] as string;
      const openKey = args[1] as string;
      const expireSec = Number(args[2]);
      const threshold = Number(args[3]);
      const timestamp = String(args[4]);
      const resetMs = Number(args[5]);

      // INCR
      const current = parseInt(store[failKey] || '0', 10);
      const failures = current + 1;
      store[failKey] = String(failures);

      // EXPIRE
      clearTimeout(expiries[failKey]);
      expiries[failKey] = setTimeout(() => delete store[failKey], expireSec * 1000);

      // Conditional SET
      if (failures >= threshold) {
        store[openKey] = timestamp;
        clearTimeout(expiries[openKey]);
        expiries[openKey] = setTimeout(() => delete store[openKey], resetMs);
      }

      return failures;
    },
    _clearTimers() {
      Object.values(expiries).forEach(clearTimeout);
    },
  };
}

/**
 * Creates a mock Redis that throws when `eval` is called, forcing the
 * service to fall back to the non-atomic incr+check+set pattern.
 */
function createMockRedisWithoutEval() {
  const store: Record<string, string> = {};
  const expiries: Record<string, NodeJS.Timeout> = {};
  const calls: { method: string; args: any[] }[] = [];

  return {
    store,
    calls,
    async get(key: string): Promise<string | null> {
      calls.push({ method: 'get', args: [key] });
      return store[key] ?? null;
    },
    async set(key: string, value: string, ...args: any[]): Promise<string> {
      calls.push({ method: 'set', args: [key, value, ...args] });
      store[key] = value;
      if (args[0] === 'PX' && typeof args[1] === 'number') {
        clearTimeout(expiries[key]);
        expiries[key] = setTimeout(() => delete store[key], args[1]);
      }
      return 'OK';
    },
    async incr(key: string): Promise<number> {
      calls.push({ method: 'incr', args: [key] });
      const current = parseInt(store[key] || '0', 10);
      const next = current + 1;
      store[key] = String(next);
      return next;
    },
    async del(key: string): Promise<number> {
      calls.push({ method: 'del', args: [key] });
      const existed = key in store ? 1 : 0;
      delete store[key];
      clearTimeout(expiries[key]);
      return existed;
    },
    async expire(key: string, seconds: number): Promise<number> {
      calls.push({ method: 'expire', args: [key, seconds] });
      if (!(key in store)) return 0;
      clearTimeout(expiries[key]);
      expiries[key] = setTimeout(() => delete store[key], seconds * 1000);
      return 1;
    },
    async eval(_script: string, _numkeys: number, ..._args: (string | number)[]): Promise<any> {
      calls.push({ method: 'eval', args: [_script, _numkeys, ..._args] });
      throw new Error('ERR unknown command `EVAL`');
    },
    _clearTimers() {
      Object.values(expiries).forEach(clearTimeout);
    },
  };
}

describe('WebhookDeliveryService - Circuit Breaker Atomicity', () => {
  let prisma: PrismaClient;
  let testUserId: string;
  let testEndpointId: string;

  beforeAll(async () => {
    prisma = new PrismaClient();

    const user = await prisma.user.create({
      data: {
        email: 'cb-atomicity-test-' + Date.now() + '@example.com',
        passwordHash: 'test',
      },
    });
    testUserId = user.id;

    const endpoint = await prisma.webhookEndpoint.create({
      data: {
        userId: testUserId,
        url: 'https://atomicity-test.example.com/webhook',
        secret: 'whsec_atomicity_test',
        events: ['payment.created', 'payment.completed'],
        enabled: true,
      },
    });
    testEndpointId = endpoint.id;
  });

  afterAll(async () => {
    if (testEndpointId) {
      await prisma.webhookDelivery.deleteMany({
        where: { endpointId: testEndpointId },
      });
      await prisma.webhookEndpoint.deleteMany({
        where: { id: testEndpointId },
      });
    }
    if (testUserId) {
      await prisma.user.delete({ where: { id: testUserId } }).catch(() => {});
    }
    await prisma.$disconnect();
  });

  afterEach(async () => {
    jest.clearAllMocks();
    if (testEndpointId) {
      await prisma.webhookDelivery.deleteMany({
        where: { endpointId: testEndpointId },
      });
    }
  });

  // -----------------------------------------------------------------------
  // Test 1: eval is called with the Lua script when recording failure
  // -----------------------------------------------------------------------
  it('should call redis.eval with the Lua script when a delivery fails', async () => {
    const redis = createMockRedisWithEval();
    const service = new WebhookDeliveryService(prisma, redis as any);

    // Create a pending delivery
    await prisma.webhookDelivery.create({
      data: {
        endpointId: testEndpointId,
        eventType: 'payment.created',
        resourceId: 'ps_eval_check',
        payload: {
          id: 'evt_eval_check',
          type: 'payment.created',
          created_at: new Date().toISOString(),
          data: { id: 'ps_eval_check', amount: 100 },
        },
        status: WebhookStatus.PENDING,
        attempts: 0,
        nextAttemptAt: new Date(),
      },
    });

    // Mock a failed HTTP response so recordFailure is triggered
    (global.fetch as jest.Mock).mockResolvedValue({
      status: 500,
      statusText: 'Internal Server Error',
      text: async () => 'Server Error',
    });

    await service.processQueue();

    // Verify eval was called (not incr + expire + set separately)
    const evalCalls = redis.calls.filter((c) => c.method === 'eval');
    expect(evalCalls.length).toBeGreaterThanOrEqual(1);

    // The script string should contain INCR, EXPIRE, and SET commands
    const scriptArg = evalCalls[0].args[0] as string;
    expect(scriptArg).toContain('INCR');
    expect(scriptArg).toContain('EXPIRE');
    expect(scriptArg).toContain('SET');

    redis._clearTimers();
  });

  // -----------------------------------------------------------------------
  // Test 2: Lua script receives correct keys and arguments
  // -----------------------------------------------------------------------
  it('should pass correct keys and args to the Lua script', async () => {
    const redis = createMockRedisWithEval();
    const service = new WebhookDeliveryService(prisma, redis as any);

    await prisma.webhookDelivery.create({
      data: {
        endpointId: testEndpointId,
        eventType: 'payment.created',
        resourceId: 'ps_args_check',
        payload: {
          id: 'evt_args_check',
          type: 'payment.created',
          created_at: new Date().toISOString(),
          data: { id: 'ps_args_check', amount: 50 },
        },
        status: WebhookStatus.PENDING,
        attempts: 0,
        nextAttemptAt: new Date(),
      },
    });

    (global.fetch as jest.Mock).mockResolvedValue({
      status: 500,
      statusText: 'Internal Server Error',
      text: async () => 'Error',
    });

    await service.processQueue();

    const evalCalls = redis.calls.filter((c) => c.method === 'eval');
    expect(evalCalls.length).toBeGreaterThanOrEqual(1);

    const evalArgs = evalCalls[0].args;

    // numkeys = 2
    expect(evalArgs[1]).toBe(2);

    // KEYS[1] = failure key, KEYS[2] = open key
    expect(evalArgs[2]).toBe('circuit:failures:' + testEndpointId);
    expect(evalArgs[3]).toBe('circuit:open:' + testEndpointId);

    // ARGV[1] = expire seconds (600)
    expect(evalArgs[4]).toBe(600);

    // ARGV[2] = threshold (10)
    expect(evalArgs[5]).toBe(10);

    // ARGV[3] = timestamp string (numeric)
    expect(typeof evalArgs[6]).toBe('string');
    expect(Number(evalArgs[6])).toBeGreaterThan(0);

    // ARGV[4] = reset MS (300000 = 5 minutes)
    expect(evalArgs[7]).toBe(300000);

    redis._clearTimers();
  });

  // -----------------------------------------------------------------------
  // Test 3: Circuit opens after exactly CIRCUIT_THRESHOLD (10) failures
  // -----------------------------------------------------------------------
  it('should open the circuit after exactly 10 failures via the Lua script', async () => {
    const redis = createMockRedisWithEval();
    const service = new WebhookDeliveryService(prisma, redis as any);

    (global.fetch as jest.Mock).mockResolvedValue({
      status: 500,
      statusText: 'Internal Server Error',
      text: async () => 'Error',
    });

    // Simulate 10 consecutive failed deliveries
    for (let i = 0; i < 10; i++) {
      await prisma.webhookDelivery.create({
        data: {
          endpointId: testEndpointId,
          eventType: 'payment.created',
          resourceId: `ps_threshold_${i}`,
          payload: {
            id: `evt_threshold_${i}`,
            type: 'payment.created',
            created_at: new Date().toISOString(),
            data: { id: `ps_threshold_${i}`, amount: 10 },
          },
          status: WebhookStatus.PENDING,
          attempts: 0,
          nextAttemptAt: new Date(),
        },
      });

      await service.processQueue();
    }

    // After 10 failures the failures counter should be '10'
    expect(redis.store['circuit:failures:' + testEndpointId]).toBe('10');

    // The circuit:open key should exist (circuit is open)
    expect(redis.store['circuit:open:' + testEndpointId]).toBeDefined();

    // Verify eval was called 10 times
    const evalCalls = redis.calls.filter((c) => c.method === 'eval');
    expect(evalCalls.length).toBe(10);

    redis._clearTimers();
  });

  // -----------------------------------------------------------------------
  // Test 4: Falls back to non-atomic approach if eval throws
  // -----------------------------------------------------------------------
  it('should fall back to incr+expire+set when eval throws', async () => {
    const redis = createMockRedisWithoutEval();
    const service = new WebhookDeliveryService(prisma, redis as any);

    await prisma.webhookDelivery.create({
      data: {
        endpointId: testEndpointId,
        eventType: 'payment.created',
        resourceId: 'ps_fallback',
        payload: {
          id: 'evt_fallback',
          type: 'payment.created',
          created_at: new Date().toISOString(),
          data: { id: 'ps_fallback', amount: 200 },
        },
        status: WebhookStatus.PENDING,
        attempts: 0,
        nextAttemptAt: new Date(),
      },
    });

    (global.fetch as jest.Mock).mockResolvedValue({
      status: 500,
      statusText: 'Internal Server Error',
      text: async () => 'Error',
    });

    await service.processQueue();

    // eval was attempted
    const evalCalls = redis.calls.filter((c) => c.method === 'eval');
    expect(evalCalls.length).toBe(1);

    // Fallback: incr and expire were called after eval failed
    const incrCalls = redis.calls.filter((c) => c.method === 'incr');
    const expireCalls = redis.calls.filter((c) => c.method === 'expire');
    expect(incrCalls.length).toBeGreaterThanOrEqual(1);
    expect(expireCalls.length).toBeGreaterThanOrEqual(1);

    // The failure counter should still be incremented
    expect(redis.store['circuit:failures:' + testEndpointId]).toBe('1');

    redis._clearTimers();
  });

  // -----------------------------------------------------------------------
  // Test 5: RedisLike interface includes eval method
  // -----------------------------------------------------------------------
  it('should accept a Redis client with eval in the constructor', () => {
    const redis = createMockRedisWithEval();

    // This must compile and not throw -- verifies the interface accepts eval
    const service = new WebhookDeliveryService(prisma, redis as any);
    expect(service).toBeDefined();

    redis._clearTimers();
  });
});
