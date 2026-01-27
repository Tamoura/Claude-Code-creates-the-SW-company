import { buildApp } from '../../src/app';
import { FastifyInstance } from 'fastify';

describe('POST /v1/payment-sessions', () => {
  let app: FastifyInstance;
  let accessToken: string;

  beforeAll(async () => {
    app = await buildApp();

    // Create and login user
    const signupResponse = await app.inject({
      method: 'POST',
      url: '/v1/auth/signup',
      payload: {
        email: 'merchant@example.com',
        password: 'SecurePass123',
      },
    });
    accessToken = signupResponse.json().access_token;
  });

  afterAll(async () => {
    await app.close();
  });

  it('should create a payment session with valid data', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/v1/payment-sessions',
      headers: {
        authorization: `Bearer ${accessToken}`,
      },
      payload: {
        amount: 100.0,
        currency: 'USD',
        description: 'Test payment',
        network: 'polygon',
        token: 'USDC',
        merchant_address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
      },
    });

    expect(response.statusCode).toBe(201);
    const body = response.json();
    expect(body).toMatchObject({
      amount: 100,
      currency: 'USD',
      description: 'Test payment',
      status: 'PENDING',
      network: 'polygon',
      token: 'USDC',
      merchant_address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
    });
    expect(body.id).toMatch(/^ps_/);
    expect(body.checkout_url).toContain(body.id);
  });

  it('should return 401 without authentication', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/v1/payment-sessions',
      payload: {
        amount: 100,
        merchant_address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
      },
    });

    expect(response.statusCode).toBe(401);
  });

  it('should return 400 for invalid amount', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/v1/payment-sessions',
      headers: {
        authorization: `Bearer ${accessToken}`,
      },
      payload: {
        amount: 0.5,
        merchant_address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
      },
    });

    expect(response.statusCode).toBe(400);
  });

  it('should return 400 for invalid merchant address', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/v1/payment-sessions',
      headers: {
        authorization: `Bearer ${accessToken}`,
      },
      payload: {
        amount: 100,
        merchant_address: 'not-an-address',
      },
    });

    expect(response.statusCode).toBe(400);
  });

  it('should support optional success_url and cancel_url', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/v1/payment-sessions',
      headers: {
        authorization: `Bearer ${accessToken}`,
      },
      payload: {
        amount: 100,
        merchant_address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
        success_url: 'https://example.com/success',
        cancel_url: 'https://example.com/cancel',
      },
    });

    expect(response.statusCode).toBe(201);
    const body = response.json();
    expect(body.success_url).toBe('https://example.com/success');
    expect(body.cancel_url).toBe('https://example.com/cancel');
  });
});

describe('GET /v1/payment-sessions', () => {
  let app: FastifyInstance;
  let accessToken: string;

  beforeAll(async () => {
    app = await buildApp();

    // Create and login user
    const signupResponse = await app.inject({
      method: 'POST',
      url: '/v1/auth/signup',
      payload: {
        email: 'merchant@example.com',
        password: 'SecurePass123',
      },
    });
    accessToken = signupResponse.json().access_token;

    // Create some test payment sessions
    for (let i = 0; i < 5; i++) {
      await app.inject({
        method: 'POST',
        url: '/v1/payment-sessions',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
        payload: {
          amount: 100 + i * 10,
          merchant_address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
        },
      });
    }
  });

  afterAll(async () => {
    await app.close();
  });

  it('should list payment sessions', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/v1/payment-sessions',
      headers: {
        authorization: `Bearer ${accessToken}`,
      },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.data).toHaveLength(5);
    expect(body.pagination).toMatchObject({
      limit: 50,
      offset: 0,
      total: 5,
      has_more: false,
    });
  });

  it('should support pagination', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/v1/payment-sessions?limit=2&offset=1',
      headers: {
        authorization: `Bearer ${accessToken}`,
      },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.data).toHaveLength(2);
    expect(body.pagination).toMatchObject({
      limit: 2,
      offset: 1,
      total: 5,
      has_more: true,
    });
  });

  it('should filter by status', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/v1/payment-sessions?status=PENDING',
      headers: {
        authorization: `Bearer ${accessToken}`,
      },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.data.every((p: any) => p.status === 'PENDING')).toBe(true);
  });
});

describe('GET /v1/payment-sessions/:id', () => {
  let app: FastifyInstance;
  let accessToken: string;
  let paymentId: string;

  beforeAll(async () => {
    app = await buildApp();

    // Create and login user
    const signupResponse = await app.inject({
      method: 'POST',
      url: '/v1/auth/signup',
      payload: {
        email: 'merchant@example.com',
        password: 'SecurePass123',
      },
    });
    accessToken = signupResponse.json().access_token;

    // Create a payment session
    const createResponse = await app.inject({
      method: 'POST',
      url: '/v1/payment-sessions',
      headers: {
        authorization: `Bearer ${accessToken}`,
      },
      payload: {
        amount: 100,
        merchant_address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
      },
    });
    paymentId = createResponse.json().id;
  });

  afterAll(async () => {
    await app.close();
  });

  it('should get payment session by id', async () => {
    const response = await app.inject({
      method: 'GET',
      url: `/v1/payment-sessions/${paymentId}`,
      headers: {
        authorization: `Bearer ${accessToken}`,
      },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.id).toBe(paymentId);
    expect(body.amount).toBe(100);
  });

  it('should return 404 for non-existent payment', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/v1/payment-sessions/ps_nonexistent',
      headers: {
        authorization: `Bearer ${accessToken}`,
      },
    });

    expect(response.statusCode).toBe(404);
  });
});
