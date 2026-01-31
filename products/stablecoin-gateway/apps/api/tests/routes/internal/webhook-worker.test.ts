import { buildApp } from '../../../src/app';
import { FastifyInstance } from 'fastify';
import { WebhookDeliveryService } from '../../../src/services/webhook-delivery.service';

/**
 * Internal Webhook Worker Endpoint Tests
 *
 * Validates authentication via INTERNAL_API_KEY (timing-safe)
 * and successful queue processing through POST /internal/webhook-worker.
 */
describe('POST /internal/webhook-worker', () => {
  let app: FastifyInstance;

  const TEST_API_KEY = 'test-internal-api-key-for-webhook-worker';
  const savedInternalApiKey = process.env.INTERNAL_API_KEY;

  beforeAll(async () => {
    process.env.INTERNAL_API_KEY = TEST_API_KEY;
    app = await buildApp();
  });

  afterAll(async () => {
    // Restore original env
    if (savedInternalApiKey !== undefined) {
      process.env.INTERNAL_API_KEY = savedInternalApiKey;
    } else {
      delete process.env.INTERNAL_API_KEY;
    }
    await app.close();
  });

  afterEach(() => {
    // Restore key after tests that modify it
    process.env.INTERNAL_API_KEY = TEST_API_KEY;
    jest.restoreAllMocks();
  });

  it('returns 401 when no Authorization header is provided', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/internal/webhook-worker',
    });

    expect(response.statusCode).toBe(401);
    const body = response.json();
    expect(body.error).toBe('Unauthorized');
  });

  it('returns 401 when wrong API key is provided', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/internal/webhook-worker',
      headers: {
        authorization: 'Bearer wrong-api-key',
      },
    });

    expect(response.statusCode).toBe(401);
    const body = response.json();
    expect(body.error).toBe('Unauthorized');
  });

  it('returns 500 when INTERNAL_API_KEY is not configured', async () => {
    delete process.env.INTERNAL_API_KEY;

    const response = await app.inject({
      method: 'POST',
      url: '/internal/webhook-worker',
    });

    expect(response.statusCode).toBe(500);
    const body = response.json();
    expect(body.error).toBe('Internal API key not configured');
  });

  it('returns 200 with correct API key', async () => {
    jest.spyOn(WebhookDeliveryService.prototype, 'processQueue')
      .mockResolvedValue(undefined);

    const response = await app.inject({
      method: 'POST',
      url: '/internal/webhook-worker',
      headers: {
        authorization: `Bearer ${TEST_API_KEY}`,
      },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.success).toBe(true);
  });

  it('returns success with processing metadata (processed_at, duration_ms)', async () => {
    jest.spyOn(WebhookDeliveryService.prototype, 'processQueue')
      .mockResolvedValue(undefined);

    const beforeRequest = new Date().toISOString();

    const response = await app.inject({
      method: 'POST',
      url: '/internal/webhook-worker',
      headers: {
        authorization: `Bearer ${TEST_API_KEY}`,
      },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();

    expect(body).toHaveProperty('processed_at');
    expect(body).toHaveProperty('duration_ms');
    expect(typeof body.duration_ms).toBe('number');
    expect(body.duration_ms).toBeGreaterThanOrEqual(0);

    // processed_at should be a valid ISO timestamp at or after the request
    const processedAt = new Date(body.processed_at);
    expect(processedAt.getTime()).toBeGreaterThanOrEqual(
      new Date(beforeRequest).getTime(),
    );
  });

  it('returns 401 when key has wrong length (timing-safe guard)', async () => {
    // A key of different length should still return 401,
    // exercising the length check before timingSafeEqual
    const response = await app.inject({
      method: 'POST',
      url: '/internal/webhook-worker',
      headers: {
        authorization: 'Bearer x',
      },
    });

    expect(response.statusCode).toBe(401);
    const body = response.json();
    expect(body.error).toBe('Unauthorized');
  });

  it('returns 401 when bearer token is empty', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/internal/webhook-worker',
      headers: {
        authorization: 'Bearer ',
      },
    });

    expect(response.statusCode).toBe(401);
    const body = response.json();
    expect(body.error).toBe('Unauthorized');
  });

  it('calls WebhookDeliveryService.processQueue(20) with correct key', async () => {
    const processQueueSpy = jest.spyOn(
      WebhookDeliveryService.prototype,
      'processQueue',
    ).mockResolvedValue(undefined);

    const response = await app.inject({
      method: 'POST',
      url: '/internal/webhook-worker',
      headers: {
        authorization: `Bearer ${TEST_API_KEY}`,
      },
    });

    expect(response.statusCode).toBe(200);
    expect(processQueueSpy).toHaveBeenCalledTimes(1);
    expect(processQueueSpy).toHaveBeenCalledWith(20);
  });
});
