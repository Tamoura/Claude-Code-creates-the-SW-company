import { buildApp } from '../../src/app';
import { FastifyInstance } from 'fastify';

/**
 * Merchant Payment Flow via API Key
 *
 * Tests the scenario where a merchant creates a payment using an API key
 * (not JWT), which is how the merchant-demo app works. Verifies:
 * - API key with write permission can create payment sessions
 * - Payment status is returned as uppercase PENDING
 * - Payments are listable via the same API key
 */

describe('Merchant Payment Flow (API Key)', () => {
  let app: FastifyInstance;
  let accessToken: string;
  let apiKey: string;

  beforeAll(async () => {
    app = await buildApp();

    // Step 1: Signup a merchant user
    const signupResponse = await app.inject({
      method: 'POST',
      url: '/v1/auth/signup',
      payload: {
        email: `merchant-flow-${Date.now()}@example.com`,
        password: 'SecurePass123!',
      },
    });

    expect(signupResponse.statusCode).toBe(201);
    accessToken = signupResponse.json().access_token;

    // Step 2: Create an API key with read + write permissions
    const keyResponse = await app.inject({
      method: 'POST',
      url: '/v1/api-keys',
      headers: { authorization: `Bearer ${accessToken}` },
      payload: {
        name: 'Merchant Demo Key',
        permissions: { read: true, write: true, refund: false },
      },
    });

    expect(keyResponse.statusCode).toBe(201);
    const keyBody = keyResponse.json();
    expect(keyBody.key).toMatch(/^sk_live_/);
    apiKey = keyBody.key;
  });

  afterAll(async () => {
    await app.close();
  });

  it('should create a payment session using API key', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/v1/payment-sessions',
      headers: {
        authorization: `Bearer ${apiKey}`,
      },
      payload: {
        amount: 50.00,
        currency: 'USD',
        description: 'Demo product purchase',
        network: 'polygon',
        token: 'USDC',
        merchant_address: '0x742D35CC6634c0532925A3b844BC9E7595F0BEb0',
      },
    });

    expect(response.statusCode).toBe(201);
    const body = response.json();

    expect(body.id).toMatch(/^ps_/);
    expect(body.status).toBe('PENDING');
    expect(body.amount).toBe(50);
    expect(body.description).toBe('Demo product purchase');
    expect(body.checkout_url).toContain(body.id);
  });

  it('should list payments via API key and show PENDING status', async () => {
    // Create a payment first
    const createResponse = await app.inject({
      method: 'POST',
      url: '/v1/payment-sessions',
      headers: { authorization: `Bearer ${apiKey}` },
      payload: {
        amount: 25.00,
        merchant_address: '0x742D35CC6634c0532925A3b844BC9E7595F0BEb0',
      },
    });
    expect(createResponse.statusCode).toBe(201);
    const paymentId = createResponse.json().id;

    // List payments using same API key
    const listResponse = await app.inject({
      method: 'GET',
      url: '/v1/payment-sessions',
      headers: { authorization: `Bearer ${apiKey}` },
    });

    expect(listResponse.statusCode).toBe(200);
    const body = listResponse.json();

    expect(body.data.length).toBeGreaterThanOrEqual(1);
    const payment = body.data.find((p: { id: string }) => p.id === paymentId);
    expect(payment).toBeDefined();
    expect(payment.status).toBe('PENDING');
  });

  it('should reject payment creation with read-only API key', async () => {
    // Create a read-only key
    const readOnlyKeyResponse = await app.inject({
      method: 'POST',
      url: '/v1/api-keys',
      headers: { authorization: `Bearer ${accessToken}` },
      payload: {
        name: 'Read-Only Key',
        permissions: { read: true, write: false, refund: false },
      },
    });
    const readOnlyKey = readOnlyKeyResponse.json().key;

    // Attempt to create payment with read-only key
    const response = await app.inject({
      method: 'POST',
      url: '/v1/payment-sessions',
      headers: { authorization: `Bearer ${readOnlyKey}` },
      payload: {
        amount: 100,
        merchant_address: '0x742D35CC6634c0532925A3b844BC9E7595F0BEb0',
      },
    });

    expect(response.statusCode).toBe(403);
  });
});
