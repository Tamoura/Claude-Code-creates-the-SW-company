import { buildApp } from '../../../src/app';
import { FastifyInstance } from 'fastify';

/**
 * Development Route Authentication Tests (RISK-001 Remediation)
 *
 * The /v1/dev/* routes are only registered when NODE_ENV !== 'production',
 * but they MUST still require INTERNAL_API_KEY authentication to prevent
 * unauthorized payment simulation on dev/staging environments.
 */
describe('POST /v1/dev/simulate/:id', () => {
  let app: FastifyInstance;

  const TEST_API_KEY = 'test-internal-api-key-for-dev-routes';
  const savedInternalApiKey = process.env.INTERNAL_API_KEY;

  beforeAll(async () => {
    process.env.INTERNAL_API_KEY = TEST_API_KEY;
    app = await buildApp();
  });

  afterAll(async () => {
    if (savedInternalApiKey !== undefined) {
      process.env.INTERNAL_API_KEY = savedInternalApiKey;
    } else {
      delete process.env.INTERNAL_API_KEY;
    }
    await app.close();
  });

  afterEach(() => {
    process.env.INTERNAL_API_KEY = TEST_API_KEY;
  });

  it('returns 401 when no Authorization header is provided', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/v1/dev/simulate/test-session-id',
    });

    expect(response.statusCode).toBe(401);
    const body = response.json();
    expect(body.error).toBe('Unauthorized');
  });

  it('returns 401 when wrong API key is provided', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/v1/dev/simulate/test-session-id',
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
      url: '/v1/dev/simulate/test-session-id',
    });

    expect(response.statusCode).toBe(500);
    const body = response.json();
    expect(body.error).toBe('Internal API key not configured');
  });

  it('returns 401 when bearer token is empty', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/v1/dev/simulate/test-session-id',
      headers: {
        authorization: 'Bearer ',
      },
    });

    expect(response.statusCode).toBe(401);
    const body = response.json();
    expect(body.error).toBe('Unauthorized');
  });

  it('returns 404 for non-existent session when properly authenticated', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/v1/dev/simulate/non-existent-session',
      headers: {
        authorization: `Bearer ${TEST_API_KEY}`,
      },
    });

    expect(response.statusCode).toBe(404);
    const body = response.json();
    expect(body.title).toBe('Payment Not Found');
  });

  it('returns 401 with timing-safe protection for different-length keys', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/v1/dev/simulate/test-session-id',
      headers: {
        authorization: 'Bearer x',
      },
    });

    expect(response.statusCode).toBe(401);
    const body = response.json();
    expect(body.error).toBe('Unauthorized');
  });
});
