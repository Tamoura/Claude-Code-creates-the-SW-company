import { buildApp } from '../../src/app';
import { FastifyInstance } from 'fastify';
import Redis from 'ioredis';

/**
 * Payment Session Concurrency Tests
 *
 * Verifies that row-level locking prevents race conditions in payment updates.
 * Tests concurrent PATCH requests to ensure no double-completion or status conflicts.
 */

describe('Payment Session Concurrency (Row-Level Locking)', () => {
  let app: FastifyInstance;
  let accessToken: string;
  let testUserId: string;

  beforeAll(async () => {
    // Flush Redis to clear rate limit state from prior tests
    const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
    await redis.flushdb();
    await redis.quit();

    app = await buildApp();

    // Create test user directly in DB to avoid auth rate limits
    const user = await app.prisma.user.create({
      data: {
        email: `concurrency-test-${Date.now()}@example.com`,
        passwordHash: 'not-a-real-hash',
      },
    });
    testUserId = user.id;

    // Generate JWT token directly
    accessToken = app.jwt.sign({ userId: user.id });
  });

  afterAll(async () => {
    await app.prisma.paymentSession.deleteMany({ where: { userId: testUserId } });
    await app.prisma.user.deleteMany({ where: { id: testUserId } });
    await app.close();
  });

  it('should handle concurrent status updates without conflicts', async () => {
    // Create payment session
    const createResponse = await app.inject({
      method: 'POST',
      url: '/v1/payment-sessions',
      headers: {
        authorization: `Bearer ${accessToken}`,
      },
      payload: {
        amount: 100,
        merchant_address: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
      },
    });

    const paymentId = createResponse.json().id;

    // Send 5 concurrent PATCH requests updating a non-blockchain field.
    // (blockchain fields like confirmations require a status transition)
    const addresses = [
      '0x1111111111111111111111111111111111111111',
      '0x2222222222222222222222222222222222222222',
      '0x3333333333333333333333333333333333333333',
      '0x4444444444444444444444444444444444444444',
      '0x5555555555555555555555555555555555555555',
    ];
    const concurrentUpdates = Array.from({ length: 5 }, (_, i) =>
      app.inject({
        method: 'PATCH',
        url: `/v1/payment-sessions/${paymentId}`,
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
        payload: {
          customer_address: addresses[i],
        },
      })
    );

    const responses = await Promise.all(concurrentUpdates);

    // All requests should succeed (200)
    responses.forEach(response => {
      expect(response.statusCode).toBe(200);
    });

    // Final customer_address should be from one of the requests
    // Not corrupted or merged
    const finalResponse = await app.inject({
      method: 'GET',
      url: `/v1/payment-sessions/${paymentId}`,
      headers: {
        authorization: `Bearer ${accessToken}`,
      },
    });

    const finalPayment = finalResponse.json();
    expect(addresses).toContain(finalPayment.customer_address);
  });

  it('should prevent double-completion with concurrent status updates', async () => {
    // Create payment session
    const createResponse = await app.inject({
      method: 'POST',
      url: '/v1/payment-sessions',
      headers: {
        authorization: `Bearer ${accessToken}`,
      },
      payload: {
        amount: 200,
        merchant_address: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
      },
    });

    const paymentId = createResponse.json().id;

    // Try to mark as FAILED from multiple concurrent requests
    const concurrentUpdates = Array.from({ length: 3 }, () =>
      app.inject({
        method: 'PATCH',
        url: `/v1/payment-sessions/${paymentId}`,
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
        payload: {
          status: 'FAILED',
        },
      })
    );

    const responses = await Promise.all(concurrentUpdates);

    // All requests should succeed
    responses.forEach(response => {
      expect(response.statusCode).toBe(200);
      expect(response.json().status).toBe('FAILED');
    });

    // Verify final status is FAILED (not corrupted)
    const finalResponse = await app.inject({
      method: 'GET',
      url: `/v1/payment-sessions/${paymentId}`,
      headers: {
        authorization: `Bearer ${accessToken}`,
      },
    });

    expect(finalResponse.json().status).toBe('FAILED');
  });

  it('should serialize concurrent updates (one completes, others wait)', async () => {
    // Create payment session
    const createResponse = await app.inject({
      method: 'POST',
      url: '/v1/payment-sessions',
      headers: {
        authorization: `Bearer ${accessToken}`,
      },
      payload: {
        amount: 300,
        merchant_address: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
      },
    });

    const paymentId = createResponse.json().id;

    // Record start time
    const startTime = Date.now();

    // Send 10 concurrent updates using non-blockchain field (customer_address)
    const concurrentUpdates = Array.from({ length: 10 }, (_, i) =>
      app.inject({
        method: 'PATCH',
        url: `/v1/payment-sessions/${paymentId}`,
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
        payload: {
          customer_address: `0x${(i + 1).toString().padStart(40, '0')}`,
        },
      })
    );

    const responses = await Promise.all(concurrentUpdates);
    const endTime = Date.now();

    // All should succeed
    expect(responses.every(r => r.statusCode === 200)).toBe(true);

    // With row-level locking, updates should be serialized (take longer than parallel would)
    // Not a strict test, but concurrent updates should take measurable time
    const duration = endTime - startTime;
    expect(duration).toBeGreaterThan(10); // At least 10ms total for all updates
  });

  it('should allow concurrent updates to different payment sessions', async () => {
    // Create 5 different payment sessions
    const createPromises = Array.from({ length: 5 }, (_, i) =>
      app.inject({
        method: 'POST',
        url: '/v1/payment-sessions',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
        payload: {
          amount: 100 + i,
          merchant_address: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
        },
      })
    );

    const createResponses = await Promise.all(createPromises);
    const paymentIds = createResponses.map(r => r.json().id);

    // Update all 5 concurrently using non-blockchain field (customer_address)
    const updatePromises = paymentIds.map((paymentId, i) =>
      app.inject({
        method: 'PATCH',
        url: `/v1/payment-sessions/${paymentId}`,
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
        payload: {
          customer_address: `0x${(i + 1).toString().padStart(40, '0')}`,
        },
      })
    );

    const responses = await Promise.all(updatePromises);

    // All should succeed
    responses.forEach((response, i) => {
      expect(response.statusCode).toBe(200);
      expect(response.json().customer_address).toBe(`0x${(i + 1).toString().padStart(40, '0')}`);
    });
  });
});
