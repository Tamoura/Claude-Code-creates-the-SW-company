import { buildApp } from '../../src/app';
import { FastifyInstance } from 'fastify';

/**
 * Payment Links integration tests
 *
 * Tests the complete payment links API including create, list, get, update,
 * delete, resolve, and QR code generation endpoints.
 *
 * NOTE: Uses unique User-Agent headers and unique emails per test to avoid
 * rate limiting and database conflicts.
 */

// Valid Ethereum address for testing (Vitalik's checksummed address)
const VALID_ETH_ADDRESS = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045';

describe('POST /v1/payment-links', () => {
  let app: FastifyInstance;
  let accessToken: string;
  let userId: string;
  const testUA = `PaymentLinksCreateTest/${Date.now()}`;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();

    // Create a test user via signup
    const signupRes = await app.inject({
      method: 'POST',
      url: '/v1/auth/signup',
      payload: {
        email: `test-pl-create-${Date.now()}@example.com`,
        password: 'SecurePass123!',
      },
      headers: { 'user-agent': testUA },
    });
    const signupBody = signupRes.json();
    accessToken = signupBody.access_token;
    userId = signupBody.id;
  });

  afterAll(async () => {
    await app.close();
  });

  it('should create a payment link with all fields', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/v1/payment-links',
      headers: {
        authorization: `Bearer ${accessToken}`,
      },
      payload: {
        name: 'Test Payment Link',
        amount: 100,
        currency: 'USD',
        network: 'polygon',
        token: 'USDC',
        merchant_address: VALID_ETH_ADDRESS,
        success_url: 'https://example.com/success',
        cancel_url: 'https://example.com/cancel',
        description: 'Test payment link description',
        metadata: { order_id: '12345' },
        max_usages: 10,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      },
    });

    expect(response.statusCode).toBe(201);
    const body = response.json();
    expect(body).toMatchObject({
      name: 'Test Payment Link',
      amount: 100,
      currency: 'USD',
      network: 'polygon',
      token: 'USDC',
      merchant_address: VALID_ETH_ADDRESS,
      success_url: 'https://example.com/success',
      cancel_url: 'https://example.com/cancel',
      description: 'Test payment link description',
      metadata: { order_id: '12345' },
      active: true,
      usage_count: 0,
      max_usages: 10,
    });
    expect(body.id).toBeTruthy();
    expect(typeof body.id).toBe('string');
    expect(body.short_code).toHaveLength(8);
    expect(body.payment_url).toContain(body.short_code);
    expect(body.created_at).toBeTruthy();
    expect(body.updated_at).toBeTruthy();
    expect(body.expires_at).toBeTruthy();
  });

  it('should create a payment link with only required fields (merchant_address)', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/v1/payment-links',
      headers: {
        authorization: `Bearer ${accessToken}`,
      },
      payload: {
        merchant_address: VALID_ETH_ADDRESS,
      },
    });

    expect(response.statusCode).toBe(201);
    const body = response.json();
    expect(body).toMatchObject({
      amount: null, // Customer chooses amount
      currency: 'USD', // Default
      network: 'polygon', // Default
      token: 'USDC', // Default
      merchant_address: VALID_ETH_ADDRESS,
      active: true,
      usage_count: 0,
      max_usages: null, // Unlimited
    });
    expect(body.id).toBeTruthy();
    expect(typeof body.id).toBe('string');
    expect(body.short_code).toHaveLength(8);
  });

  it('should create a payment link with null amount (customer chooses)', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/v1/payment-links',
      headers: {
        authorization: `Bearer ${accessToken}`,
      },
      payload: {
        merchant_address: VALID_ETH_ADDRESS,
        amount: null,
        description: 'Donation link',
      },
    });

    expect(response.statusCode).toBe(201);
    const body = response.json();
    expect(body.amount).toBeNull();
    expect(body.description).toBe('Donation link');
  });

  it('should return 401 without authentication', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/v1/payment-links',
      payload: {
        merchant_address: VALID_ETH_ADDRESS,
      },
    });

    expect(response.statusCode).toBe(401);
  });

  it('should validate merchant_address format', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/v1/payment-links',
      headers: {
        authorization: `Bearer ${accessToken}`,
      },
      payload: {
        merchant_address: 'not-an-ethereum-address',
      },
    });

    expect(response.statusCode).toBe(400);
    const body = response.json();
    expect(body.status).toBe(400);
  });

  it('should validate amount is at least 1 USD', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/v1/payment-links',
      headers: {
        authorization: `Bearer ${accessToken}`,
      },
      payload: {
        merchant_address: VALID_ETH_ADDRESS,
        amount: 0.5,
      },
    });

    expect(response.statusCode).toBe(400);
  });

  it('should validate amount does not exceed 10,000 USD', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/v1/payment-links',
      headers: {
        authorization: `Bearer ${accessToken}`,
      },
      payload: {
        merchant_address: VALID_ETH_ADDRESS,
        amount: 10001,
      },
    });

    expect(response.statusCode).toBe(400);
  });
});

describe('GET /v1/payment-links', () => {
  let app: FastifyInstance;
  let accessToken: string;
  let userId: string;
  const testUA = `PaymentLinksListTest/${Date.now()}`;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();

    // Create a test user
    const signupRes = await app.inject({
      method: 'POST',
      url: '/v1/auth/signup',
      payload: {
        email: `test-pl-list-${Date.now()}@example.com`,
        password: 'SecurePass123!',
      },
      headers: { 'user-agent': testUA },
    });
    const signupBody = signupRes.json();
    accessToken = signupBody.access_token;
    userId = signupBody.id;

    // Create some test payment links
    for (let i = 0; i < 5; i++) {
      await app.inject({
        method: 'POST',
        url: '/v1/payment-links',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
        payload: {
          name: `Test Link ${i}`,
          amount: 100 + i * 10,
          merchant_address: VALID_ETH_ADDRESS,
        },
      });
    }
  });

  afterAll(async () => {
    await app.close();
  });

  it('should list payment links for authenticated user', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/v1/payment-links',
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
    expect(body.data[0]).toMatchObject({
      id: expect.any(String),
      short_code: expect.any(String),
      merchant_address: VALID_ETH_ADDRESS,
      payment_url: expect.stringContaining('/pay/'),
    });
  });

  it('should support pagination (limit/offset)', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/v1/payment-links?limit=2&offset=1',
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

  it('should filter by active status', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/v1/payment-links?active=true',
      headers: {
        authorization: `Bearer ${accessToken}`,
      },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.data.every((link: any) => link.active === true)).toBe(true);
  });

  it('should return 401 without authentication', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/v1/payment-links',
    });

    expect(response.statusCode).toBe(401);
  });
});

describe('GET /v1/payment-links (empty list)', () => {
  let app: FastifyInstance;
  let accessToken: string;
  const testUA = `PaymentLinksEmptyListTest/${Date.now()}`;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();

    // Create a test user with no payment links
    const signupRes = await app.inject({
      method: 'POST',
      url: '/v1/auth/signup',
      payload: {
        email: `test-pl-empty-${Date.now()}@example.com`,
        password: 'SecurePass123!',
      },
      headers: { 'user-agent': testUA },
    });
    const signupBody = signupRes.json();
    accessToken = signupBody.access_token;
  });

  afterAll(async () => {
    await app.close();
  });

  it('should return empty list for user with no links', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/v1/payment-links',
      headers: {
        authorization: `Bearer ${accessToken}`,
      },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.data).toHaveLength(0);
    expect(body.pagination.total).toBe(0);
  });
});

describe('GET /v1/payment-links/:id', () => {
  let app: FastifyInstance;
  let accessToken: string;
  let otherUserToken: string;
  let paymentLinkId: string;
  const testUA = `PaymentLinksGetTest/${Date.now()}`;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();

    // Create first user and payment link
    const signupRes = await app.inject({
      method: 'POST',
      url: '/v1/auth/signup',
      payload: {
        email: `test-pl-get-${Date.now()}@example.com`,
        password: 'SecurePass123!',
      },
      headers: { 'user-agent': testUA },
    });
    const signupBody = signupRes.json();
    accessToken = signupBody.access_token;

    const createRes = await app.inject({
      method: 'POST',
      url: '/v1/payment-links',
      headers: {
        authorization: `Bearer ${accessToken}`,
      },
      payload: {
        name: 'Test Link for Get',
        amount: 150,
        merchant_address: VALID_ETH_ADDRESS,
      },
    });
    paymentLinkId = createRes.json().id;

    // Create second user (for testing access control)
    const otherSignupRes = await app.inject({
      method: 'POST',
      url: '/v1/auth/signup',
      payload: {
        email: `test-pl-other-${Date.now()}@example.com`,
        password: 'SecurePass123!',
      },
      headers: { 'user-agent': testUA },
    });
    otherUserToken = otherSignupRes.json().access_token;
  });

  afterAll(async () => {
    await app.close();
  });

  it('should get payment link by ID', async () => {
    const response = await app.inject({
      method: 'GET',
      url: `/v1/payment-links/${paymentLinkId}`,
      headers: {
        authorization: `Bearer ${accessToken}`,
      },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.id).toBe(paymentLinkId);
    expect(body.name).toBe('Test Link for Get');
    expect(body.amount).toBe(150);
  });

  it('should return 404 for non-existent ID', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/v1/payment-links/nonexistent123abc',
      headers: {
        authorization: `Bearer ${accessToken}`,
      },
    });

    expect(response.statusCode).toBe(404);
    const body = response.json();
    expect(body.status).toBe(404);
  });

  it('should not return other user\'s payment links', async () => {
    const response = await app.inject({
      method: 'GET',
      url: `/v1/payment-links/${paymentLinkId}`,
      headers: {
        authorization: `Bearer ${otherUserToken}`,
      },
    });

    expect(response.statusCode).toBe(404);
  });

  it('should return 401 without authentication', async () => {
    const response = await app.inject({
      method: 'GET',
      url: `/v1/payment-links/${paymentLinkId}`,
    });

    expect(response.statusCode).toBe(401);
  });
});

describe('PATCH /v1/payment-links/:id', () => {
  let app: FastifyInstance;
  let accessToken: string;
  let paymentLinkId: string;
  const testUA = `PaymentLinksUpdateTest/${Date.now()}`;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();

    // Create user and payment link
    const signupRes = await app.inject({
      method: 'POST',
      url: '/v1/auth/signup',
      payload: {
        email: `test-pl-update-${Date.now()}@example.com`,
        password: 'SecurePass123!',
      },
      headers: { 'user-agent': testUA },
    });
    const signupBody = signupRes.json();
    accessToken = signupBody.access_token;

    const createRes = await app.inject({
      method: 'POST',
      url: '/v1/payment-links',
      headers: {
        authorization: `Bearer ${accessToken}`,
      },
      payload: {
        name: 'Original Name',
        amount: 100,
        merchant_address: VALID_ETH_ADDRESS,
        description: 'Original description',
      },
    });
    paymentLinkId = createRes.json().id;
  });

  afterAll(async () => {
    await app.close();
  });

  it('should update mutable fields (name, description, active)', async () => {
    const response = await app.inject({
      method: 'PATCH',
      url: `/v1/payment-links/${paymentLinkId}`,
      headers: {
        authorization: `Bearer ${accessToken}`,
      },
      payload: {
        name: 'Updated Name',
        description: 'Updated description',
        active: false,
      },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.name).toBe('Updated Name');
    expect(body.description).toBe('Updated description');
    expect(body.active).toBe(false);
  });

  it('should update success_url and cancel_url', async () => {
    const response = await app.inject({
      method: 'PATCH',
      url: `/v1/payment-links/${paymentLinkId}`,
      headers: {
        authorization: `Bearer ${accessToken}`,
      },
      payload: {
        success_url: 'https://example.com/new-success',
        cancel_url: 'https://example.com/new-cancel',
      },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.success_url).toBe('https://example.com/new-success');
    expect(body.cancel_url).toBe('https://example.com/new-cancel');
  });

  it('should update metadata', async () => {
    const response = await app.inject({
      method: 'PATCH',
      url: `/v1/payment-links/${paymentLinkId}`,
      headers: {
        authorization: `Bearer ${accessToken}`,
      },
      payload: {
        metadata: { updated: true, version: 2 },
      },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.metadata).toEqual({ updated: true, version: 2 });
  });

  it('should return 404 for non-existent link', async () => {
    const response = await app.inject({
      method: 'PATCH',
      url: '/v1/payment-links/nonexistent123abc',
      headers: {
        authorization: `Bearer ${accessToken}`,
      },
      payload: {
        name: 'New Name',
      },
    });

    expect(response.statusCode).toBe(404);
  });

  it('should return 401 without authentication', async () => {
    const response = await app.inject({
      method: 'PATCH',
      url: `/v1/payment-links/${paymentLinkId}`,
      payload: {
        name: 'New Name',
      },
    });

    expect(response.statusCode).toBe(401);
  });
});

describe('DELETE /v1/payment-links/:id', () => {
  let app: FastifyInstance;
  let accessToken: string;
  let paymentLinkId: string;
  const testUA = `PaymentLinksDeleteTest/${Date.now()}`;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();

    // Create user and payment link
    const signupRes = await app.inject({
      method: 'POST',
      url: '/v1/auth/signup',
      payload: {
        email: `test-pl-delete-${Date.now()}@example.com`,
        password: 'SecurePass123!',
      },
      headers: { 'user-agent': testUA },
    });
    const signupBody = signupRes.json();
    accessToken = signupBody.access_token;

    const createRes = await app.inject({
      method: 'POST',
      url: '/v1/payment-links',
      headers: {
        authorization: `Bearer ${accessToken}`,
      },
      payload: {
        name: 'Link to Delete',
        merchant_address: VALID_ETH_ADDRESS,
      },
    });
    paymentLinkId = createRes.json().id;
  });

  afterAll(async () => {
    await app.close();
  });

  it('should deactivate payment link', async () => {
    const response = await app.inject({
      method: 'DELETE',
      url: `/v1/payment-links/${paymentLinkId}`,
      headers: {
        authorization: `Bearer ${accessToken}`,
      },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.active).toBe(false);
  });

  it('link should be inactive after deletion', async () => {
    const getResponse = await app.inject({
      method: 'GET',
      url: `/v1/payment-links/${paymentLinkId}`,
      headers: {
        authorization: `Bearer ${accessToken}`,
      },
    });

    expect(getResponse.statusCode).toBe(200);
    const body = getResponse.json();
    expect(body.active).toBe(false);
  });

  it('should return 404 for non-existent link', async () => {
    const response = await app.inject({
      method: 'DELETE',
      url: '/v1/payment-links/nonexistent123abc',
      headers: {
        authorization: `Bearer ${accessToken}`,
      },
    });

    expect(response.statusCode).toBe(404);
  });

  it('should return 401 without authentication', async () => {
    const response = await app.inject({
      method: 'DELETE',
      url: `/v1/payment-links/${paymentLinkId}`,
    });

    expect(response.statusCode).toBe(401);
  });
});

describe('GET /v1/payment-links/resolve/:shortCode', () => {
  let app: FastifyInstance;
  let accessToken: string;
  let shortCode: string;
  let expiredShortCode: string;
  let inactiveShortCode: string;
  const testUA = `PaymentLinksResolveTest/${Date.now()}`;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();

    // Create user and payment links
    const signupRes = await app.inject({
      method: 'POST',
      url: '/v1/auth/signup',
      payload: {
        email: `test-pl-resolve-${Date.now()}@example.com`,
        password: 'SecurePass123!',
      },
      headers: { 'user-agent': testUA },
    });
    const signupBody = signupRes.json();
    accessToken = signupBody.access_token;

    // Create active link
    const createRes = await app.inject({
      method: 'POST',
      url: '/v1/payment-links',
      headers: {
        authorization: `Bearer ${accessToken}`,
      },
      payload: {
        name: 'Active Link',
        amount: 100,
        merchant_address: VALID_ETH_ADDRESS,
      },
    });
    shortCode = createRes.json().short_code;

    // Create expired link
    const expiredRes = await app.inject({
      method: 'POST',
      url: '/v1/payment-links',
      headers: {
        authorization: `Bearer ${accessToken}`,
      },
      payload: {
        name: 'Expired Link',
        merchant_address: VALID_ETH_ADDRESS,
        expires_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // Yesterday
      },
    });
    expiredShortCode = expiredRes.json().short_code;

    // Create inactive link
    const inactiveRes = await app.inject({
      method: 'POST',
      url: '/v1/payment-links',
      headers: {
        authorization: `Bearer ${accessToken}`,
      },
      payload: {
        name: 'Inactive Link',
        merchant_address: VALID_ETH_ADDRESS,
      },
    });
    const inactiveLinkId = inactiveRes.json().id;
    inactiveShortCode = inactiveRes.json().short_code;

    // Deactivate the link
    await app.inject({
      method: 'DELETE',
      url: `/v1/payment-links/${inactiveLinkId}`,
      headers: {
        authorization: `Bearer ${accessToken}`,
      },
    });
  });

  afterAll(async () => {
    await app.close();
  });

  it('should resolve a valid short code without auth', async () => {
    const response = await app.inject({
      method: 'GET',
      url: `/v1/payment-links/resolve/${shortCode}`,
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.short_code).toBe(shortCode);
    expect(body.name).toBe('Active Link');
    expect(body.amount).toBe(100);
    expect(body.active).toBe(true);
  });

  it('should return 404 for invalid short code', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/v1/payment-links/resolve/invalid123',
    });

    expect(response.statusCode).toBe(404);
  });

  it('should return 400 for inactive link', async () => {
    const response = await app.inject({
      method: 'GET',
      url: `/v1/payment-links/resolve/${inactiveShortCode}`,
    });

    expect(response.statusCode).toBe(400);
    const body = response.json();
    expect(body.detail).toContain('no longer active');
  });

  it('should return 400 for expired link', async () => {
    const response = await app.inject({
      method: 'GET',
      url: `/v1/payment-links/resolve/${expiredShortCode}`,
    });

    expect(response.statusCode).toBe(400);
    const body = response.json();
    expect(body.detail).toContain('expired');
  });
});

describe('GET /v1/payment-links/:id/qr', () => {
  let app: FastifyInstance;
  let accessToken: string;
  let paymentLinkId: string;
  let shortCode: string;
  let inactiveLinkId: string;
  let expiredLinkId: string;
  const testUA = `PaymentLinksQRTest/${Date.now()}`;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();

    // Create user and payment links
    const signupRes = await app.inject({
      method: 'POST',
      url: '/v1/auth/signup',
      payload: {
        email: `test-pl-qr-${Date.now()}@example.com`,
        password: 'SecurePass123!',
      },
      headers: { 'user-agent': testUA },
    });
    const signupBody = signupRes.json();
    accessToken = signupBody.access_token;

    // Create active link
    const createRes = await app.inject({
      method: 'POST',
      url: '/v1/payment-links',
      headers: {
        authorization: `Bearer ${accessToken}`,
      },
      payload: {
        name: 'QR Link',
        amount: 100,
        merchant_address: VALID_ETH_ADDRESS,
      },
    });
    const createBody = createRes.json();
    paymentLinkId = createBody.id;
    shortCode = createBody.short_code;

    // Create inactive link
    const inactiveRes = await app.inject({
      method: 'POST',
      url: '/v1/payment-links',
      headers: {
        authorization: `Bearer ${accessToken}`,
      },
      payload: {
        name: 'Inactive QR Link',
        merchant_address: VALID_ETH_ADDRESS,
      },
    });
    inactiveLinkId = inactiveRes.json().id;

    // Deactivate it
    await app.inject({
      method: 'DELETE',
      url: `/v1/payment-links/${inactiveLinkId}`,
      headers: {
        authorization: `Bearer ${accessToken}`,
      },
    });

    // Create expired link
    const expiredRes = await app.inject({
      method: 'POST',
      url: '/v1/payment-links',
      headers: {
        authorization: `Bearer ${accessToken}`,
      },
      payload: {
        name: 'Expired QR Link',
        merchant_address: VALID_ETH_ADDRESS,
        expires_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      },
    });
    expiredLinkId = expiredRes.json().id;
  });

  afterAll(async () => {
    await app.close();
  });

  it('should generate a QR code for a valid link by ID', async () => {
    const response = await app.inject({
      method: 'GET',
      url: `/v1/payment-links/${paymentLinkId}/qr`,
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.qr_code).toMatch(/^data:image\/png;base64,/);
    expect(body.payment_url).toContain(shortCode);
    expect(body.payment_url).toContain('/pay/');
  });

  it('should generate a QR code for a valid link by short code', async () => {
    const response = await app.inject({
      method: 'GET',
      url: `/v1/payment-links/${shortCode}/qr`,
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.qr_code).toMatch(/^data:image\/png;base64,/);
    expect(body.payment_url).toContain(shortCode);
  });

  it('should return 404 for non-existent link', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/v1/payment-links/nonexistent123abc/qr',
    });

    expect(response.statusCode).toBe(404);
  });

  it('should return 400 for inactive link', async () => {
    const response = await app.inject({
      method: 'GET',
      url: `/v1/payment-links/${inactiveLinkId}/qr`,
    });

    expect(response.statusCode).toBe(400);
    const body = response.json();
    expect(body.detail).toContain('no longer active');
  });

  it('should return 400 for expired link', async () => {
    const response = await app.inject({
      method: 'GET',
      url: `/v1/payment-links/${expiredLinkId}/qr`,
    });

    expect(response.statusCode).toBe(400);
    const body = response.json();
    expect(body.detail).toContain('expired');
  });
});
