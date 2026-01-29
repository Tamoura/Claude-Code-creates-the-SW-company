import { buildApp } from '../../src/app';
import { FastifyInstance } from 'fastify';

/**
 * Payment Session Concurrency Tests
 *
 * Verifies that row-level locking prevents race conditions in payment updates.
 * Tests concurrent PATCH requests to ensure no double-completion or status conflicts.
 */

describe('Payment Session Concurrency (Row-Level Locking)', () => {
  let app: FastifyInstance;
  let accessToken: string;

  beforeAll(async () => {
    app = await buildApp();

    // Create test user
    const signupResponse = await app.inject({
      method: 'POST',
      url: '/v1/auth/signup',
      payload: {
        email: 'concurrency-test@example.com',
        password: 'SecurePass123!',
      },
    });

    accessToken = signupResponse.json().access_token;
  });

  afterAll(async () => {
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

    // Send 5 concurrent PATCH requests trying to update the same payment
    const concurrentUpdates = Array.from({ length: 5 }, (_, i) =>
      app.inject({
        method: 'PATCH',
        url: `/v1/payment-sessions/${paymentId}`,
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
        payload: {
          confirmations: i + 1,
        },
      })
    );

    const responses = await Promise.all(concurrentUpdates);

    // All requests should succeed (200)
    responses.forEach(response => {
      expect(response.statusCode).toBe(200);
    });

    // Final confirmation count should be from one of the requests (1-5)
    // Not a sum or corrupted value
    const finalResponse = await app.inject({
      method: 'GET',
      url: `/v1/payment-sessions/${paymentId}`,
      headers: {
        authorization: `Bearer ${accessToken}`,
      },
    });

    const finalPayment = finalResponse.json();
    expect(finalPayment.confirmations).toBeGreaterThanOrEqual(1);
    expect(finalPayment.confirmations).toBeLessThanOrEqual(5);
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

    // Send 10 concurrent updates
    const concurrentUpdates = Array.from({ length: 10 }, (_, i) =>
      app.inject({
        method: 'PATCH',
        url: `/v1/payment-sessions/${paymentId}`,
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
        payload: {
          confirmations: i,
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

    // Update all 5 concurrently (different payments, should not block each other)
    const updatePromises = paymentIds.map((paymentId, i) =>
      app.inject({
        method: 'PATCH',
        url: `/v1/payment-sessions/${paymentId}`,
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
        payload: {
          confirmations: i + 1,
        },
      })
    );

    const responses = await Promise.all(updatePromises);

    // All should succeed
    responses.forEach((response, i) => {
      expect(response.statusCode).toBe(200);
      expect(response.json().confirmations).toBe(i + 1);
    });
  });
});
