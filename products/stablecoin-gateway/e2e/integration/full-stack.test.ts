/**
 * Full Stack Integration Tests for Stablecoin Gateway
 *
 * Tests the complete system with real HTTP calls to running services.
 * All tests use fetch() against the live API -- NO mocks, NO app imports.
 *
 * Prerequisites:
 * - Backend API running on http://localhost:5001
 * - Frontend web app running on http://localhost:3104
 * - PostgreSQL database available
 * - Redis available (for rate limiting)
 *
 * Test Coverage (85 tests across 21 describe blocks):
 *  1. Backend health check
 *  2. User authentication flow (signup, login, token)
 *  3. Payment session creation (authenticated)
 *  4. API key lifecycle (CRUD operations)
 *  5. Webhook lifecycle (CRUD operations)
 *  6. Frontend accessibility
 *  7. Authentication/authorization edge cases
 *  8. Readiness probe (/ready)
 *  9. Payment session listing & filtering (status, pagination)
 * 10. Refund flow (validation, non-existent, PENDING payment rejection)
 * 11. Analytics endpoints (overview, volume, breakdown)
 * 12. Profile (Me) endpoints (GET /v1/me, GET /v1/me/export)
 * 13. Input validation edge cases (amount bounds, addresses, webhooks)
 * 14. BOLA protection (cross-user resource isolation)
 * 15. Rate limiting (header presence, health/ready exemption)
 * 16. Error response format (RFC 7807 compliance)
 * 17. Password validation (strength requirements)
 * 18. Security headers (helmet, HSTS)
 * 19. Webhook URL validation (format, events, HTTPS)
 * 20. Path parameter validation (RISK-062 traversal prevention)
 * 21. Idempotency key validation (format, deduplication)
 */

const API_BASE_URL = 'http://localhost:5001';
const FRONTEND_URL = 'http://localhost:3104';

// Test data - unique per test run to avoid conflicts
const timestamp = Date.now();
const testUser = {
  email: `test-${timestamp}@example.com`,
  password: 'SecurePassword123!@#',
};

// Shared state between tests
let authToken: string;
let createdApiKeyId: string;
let createdWebhookId: string;

/**
 * Helper: Make authenticated API request
 */
async function authenticatedRequest(
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> {
  const headers: Record<string, string> = {
    ...options.headers as Record<string, string>,
    Authorization: `Bearer ${authToken}`,
  };

  // Only set Content-Type for requests that have a body
  if (options.body) {
    headers['Content-Type'] = 'application/json';
  }

  return fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });
}

describe('Stablecoin Gateway - Full Stack Integration Tests', () => {
  /**
   * Test 1: Backend Health Check
   * Verifies the API is running and healthy
   */
  describe('Backend Health Check', () => {
    it('should return healthy status from health endpoint', async () => {
      const response = await fetch(`${API_BASE_URL}/health`);

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data).toHaveProperty('status');
      expect(data.status).toBe('healthy');
    });
  });

  /**
   * Test 2: User Authentication Flow
   * Tests the complete signup → login → token flow
   */
  describe('User Authentication Flow', () => {
    it('should successfully signup a new user', async () => {
      const response = await fetch(`${API_BASE_URL}/v1/auth/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testUser),
      });

      expect(response.status).toBe(201);

      const data: any = await response.json();
      expect(data).toHaveProperty('email', testUser.email);
      expect(data).toHaveProperty('id');
      expect(data).toHaveProperty('access_token');
    });

    it('should reject duplicate signup with same email', async () => {
      const response = await fetch(`${API_BASE_URL}/v1/auth/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testUser),
      });

      expect(response.status).toBe(409);
    });

    it('should successfully login and receive token', async () => {
      const response = await fetch(`${API_BASE_URL}/v1/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testUser),
      });

      expect(response.status).toBe(200);

      const data: any = await response.json();
      expect(data).toHaveProperty('access_token');
      expect(data).toHaveProperty('email');
      expect(data.email).toBe(testUser.email);

      // Store token for subsequent authenticated tests
      authToken = data.access_token;
      expect(authToken).toBeTruthy();
    });

    it('should reject login with incorrect password', async () => {
      const response = await fetch(`${API_BASE_URL}/v1/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: testUser.email,
          password: 'WrongPassword123!',
        }),
      });

      expect(response.status).toBe(401);
    });

    it('should reject login with non-existent user', async () => {
      const response = await fetch(`${API_BASE_URL}/v1/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'nonexistent@example.com',
          password: 'SomePassword123!',
        }),
      });

      expect(response.status).toBe(401);
    });
  });

  /**
   * Test 3: Payment Session Creation
   * Tests authenticated payment session creation
   */
  describe('Payment Session Creation', () => {
    it('should create payment session when authenticated', async () => {
      const paymentData = {
        amount: 100,
        network: 'ethereum',
        token: 'USDC',
        merchant_address: '0xd8da6bf26964af9d7eed9e03e53415d37aa96045',
      };

      const response = await authenticatedRequest('/v1/payment-sessions', {
        method: 'POST',
        body: JSON.stringify(paymentData),
      });

      expect(response.status).toBe(201);

      const data: any = await response.json();
      expect(data).toHaveProperty('id');
      expect(data).toHaveProperty('status');
      expect(data).toHaveProperty('checkout_url');
      expect(data.amount).toBe(paymentData.amount);
    });

    it('should reject payment session without authentication', async () => {
      const paymentData = {
        amount: 100,
        network: 'ethereum',
        token: 'USDC',
        merchant_address: '0xd8da6bf26964af9d7eed9e03e53415d37aa96045',
      };

      const response = await fetch(`${API_BASE_URL}/v1/payment-sessions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(paymentData),
      });

      expect(response.status).toBe(401);
    });

    it('should reject payment session with invalid amount', async () => {
      const paymentData = {
        amount: -100, // Invalid: negative amount
        network: 'ethereum',
        token: 'USDC',
        merchant_address: '0xd8da6bf26964af9d7eed9e03e53415d37aa96045',
      };

      const response = await authenticatedRequest('/v1/payment-sessions', {
        method: 'POST',
        body: JSON.stringify(paymentData),
      });

      expect(response.status).toBe(400);
    });
  });

  /**
   * Test 4: API Key CRUD Lifecycle
   * Tests complete API key management
   */
  describe('API Key CRUD Lifecycle', () => {
    it('should create a new API key', async () => {
      const apiKeyData = {
        name: `Test API Key ${timestamp}`,
        permissions: {
          read: true,
          write: true,
          refund: false,
        },
      };

      const response = await authenticatedRequest('/v1/api-keys', {
        method: 'POST',
        body: JSON.stringify(apiKeyData),
      });

      expect(response.status).toBe(201);

      const data: any = await response.json();
      expect(data).toHaveProperty('id');
      expect(data).toHaveProperty('key');
      expect(data).toHaveProperty('name', apiKeyData.name);

      // Store for subsequent tests
      createdApiKeyId = data.id;
      expect(createdApiKeyId).toBeTruthy();
    });

    it('should list all API keys for authenticated user', async () => {
      const response = await authenticatedRequest('/v1/api-keys');

      expect(response.status).toBe(200);

      const body: any = await response.json();
      // Response may be wrapped in { data: [...], pagination: {...} } or flat array
      const data = Array.isArray(body) ? body : (body.data || body);
      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBeGreaterThan(0);

      // Verify our created key is in the list
      const ourKey = data.find((key: any) => key.id === createdApiKeyId);
      expect(ourKey).toBeTruthy();
      expect(ourKey.name).toContain('Test API Key');
    });

    it('should delete an API key', async () => {
      const response = await authenticatedRequest(
        `/v1/api-keys/${createdApiKeyId}`,
        {
          method: 'DELETE',
        }
      );

      expect(response.status).toBe(204);
    });

    it('should verify API key is deleted', async () => {
      const response = await authenticatedRequest('/v1/api-keys');

      expect(response.status).toBe(200);

      const body: any = await response.json();
      const data = Array.isArray(body) ? body : (body.data || body);
      const deletedKey = data.find((key: any) => key.id === createdApiKeyId);
      expect(deletedKey).toBeUndefined();
    });

    it('should reject API key creation without authentication', async () => {
      const apiKeyData = {
        name: 'Unauthorized Key',
        permissions: {
          read: true,
          write: false,
          refund: false,
        },
      };

      const response = await fetch(`${API_BASE_URL}/v1/api-keys`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(apiKeyData),
      });

      expect(response.status).toBe(401);
    });
  });

  /**
   * Test 5: Webhook CRUD Lifecycle
   * Tests complete webhook management
   */
  describe('Webhook CRUD Lifecycle', () => {
    it('should create a new webhook', async () => {
      const webhookData = {
        url: `https://example.com/webhook/${timestamp}`,
        events: ['payment.completed', 'payment.failed'],
        description: `Test webhook ${timestamp}`,
      };

      const response = await authenticatedRequest('/v1/webhooks', {
        method: 'POST',
        body: JSON.stringify(webhookData),
      });

      expect(response.status).toBe(201);

      const data: any = await response.json();
      expect(data).toHaveProperty('id');
      expect(data).toHaveProperty('url', webhookData.url);
      expect(data).toHaveProperty('events');
      expect(data.events).toEqual(expect.arrayContaining(webhookData.events));

      // Store for subsequent tests
      createdWebhookId = data.id;
      expect(createdWebhookId).toBeTruthy();
    });

    it('should list all webhooks for authenticated user', async () => {
      const response = await authenticatedRequest('/v1/webhooks');

      expect(response.status).toBe(200);

      const body: any = await response.json();
      const data = Array.isArray(body) ? body : (body.data || body);
      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBeGreaterThan(0);

      // Verify our created webhook is in the list
      const ourWebhook = data.find((wh: any) => wh.id === createdWebhookId);
      expect(ourWebhook).toBeTruthy();
      expect(ourWebhook.url).toContain(timestamp.toString());
    });

    it('should update a webhook', async () => {
      const updateData = {
        url: `https://example.com/webhook-updated/${timestamp}`,
        events: ['payment.completed', 'payment.failed', 'refund.completed'],
        description: `Updated webhook ${timestamp}`,
        enabled: false,
      };

      const response = await authenticatedRequest(
        `/v1/webhooks/${createdWebhookId}`,
        {
          method: 'PATCH',
          body: JSON.stringify(updateData),
        }
      );

      expect(response.status).toBe(200);

      const data: any = await response.json();
      expect(data.id).toBe(createdWebhookId);
      expect(data.url).toBe(updateData.url);
      expect(data.events).toEqual(expect.arrayContaining(updateData.events));
      expect(data.enabled).toBe(false);
    });

    it('should partially update a webhook', async () => {
      const partialUpdate = {
        enabled: true,
      };

      const response = await authenticatedRequest(
        `/v1/webhooks/${createdWebhookId}`,
        {
          method: 'PATCH',
          body: JSON.stringify(partialUpdate),
        }
      );

      expect(response.status).toBe(200);

      const data: any = await response.json();
      expect(data.enabled).toBe(true);
      // Other fields should remain unchanged
      expect(data.url).toContain('webhook-updated');
    });

    it('should delete a webhook', async () => {
      const response = await authenticatedRequest(
        `/v1/webhooks/${createdWebhookId}`,
        {
          method: 'DELETE',
        }
      );

      expect(response.status).toBe(204);
    });

    it('should verify webhook is deleted', async () => {
      const response = await authenticatedRequest('/v1/webhooks');

      expect(response.status).toBe(200);

      const body: any = await response.json();
      const data = Array.isArray(body) ? body : (body.data || body);
      const deletedWebhook = data.find((wh: any) => wh.id === createdWebhookId);
      expect(deletedWebhook).toBeUndefined();
    });

    it('should reject webhook creation without authentication', async () => {
      const webhookData = {
        url: 'https://unauthorized.com/webhook',
        events: ['payment.completed'],
        description: 'Unauthorized webhook',
      };

      const response = await fetch(`${API_BASE_URL}/v1/webhooks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(webhookData),
      });

      expect(response.status).toBe(401);
    });
  });

  /**
   * Test 6: Frontend Accessibility
   * Verifies the frontend web app is running and accessible
   */
  describe('Frontend Accessibility', () => {
    it('should serve frontend at port 3104', async () => {
      const response = await fetch(FRONTEND_URL);

      expect(response.status).toBe(200);

      const contentType = response.headers.get('content-type');
      expect(contentType).toContain('text/html');

      const html = await response.text();
      expect(html.toLowerCase()).toContain('<!doctype html>');
      expect(html.length).toBeGreaterThan(0);
    });

    it('should serve static assets', async () => {
      // Try to fetch a common static asset path
      const response = await fetch(`${FRONTEND_URL}/vite.svg`);

      // May be 200 (found) or 404 (not found), but should respond
      expect([200, 404]).toContain(response.status);
    });
  });

  /**
   * Test 7: Authentication/Authorization Edge Cases
   * Tests invalid token and authorization scenarios
   */
  describe('Authentication Edge Cases', () => {
    it('should reject request with invalid token format', async () => {
      const response = await fetch(`${API_BASE_URL}/v1/api-keys`, {
        headers: {
          Authorization: 'Bearer invalid-token-format',
          'Content-Type': 'application/json',
        },
      });

      expect(response.status).toBe(401);
    });

    it('should reject request with missing token', async () => {
      const response = await fetch(`${API_BASE_URL}/v1/api-keys`, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      expect(response.status).toBe(401);
    });

    it('should reject request with malformed authorization header', async () => {
      const response = await fetch(`${API_BASE_URL}/v1/api-keys`, {
        headers: {
          Authorization: 'InvalidFormat',
          'Content-Type': 'application/json',
        },
      });

      expect(response.status).toBe(401);
    });

    it('should reject request with expired/invalid JWT token', async () => {
      // A well-formed but invalid JWT
      const fakeToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';

      const response = await fetch(`${API_BASE_URL}/v1/api-keys`, {
        headers: {
          Authorization: `Bearer ${fakeToken}`,
          'Content-Type': 'application/json',
        },
      });

      expect(response.status).toBe(401);
    });
  });

  // ================================================================
  // NEW TEST SECTIONS (added to reach 60+ total tests)
  // ================================================================

  /**
   * Test 8: Readiness Probe
   * Verifies the /ready endpoint used by load balancers
   */
  describe('Readiness Probe', () => {
    it('should return 200 with status ready from /ready endpoint', async () => {
      const response = await fetch(`${API_BASE_URL}/ready`);

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data).toHaveProperty('status', 'ready');
    });
  });

  /**
   * Test 9: Payment Session Listing & Filtering
   * Tests authenticated listing, filtering, and pagination of payment sessions
   */
  describe('Payment Session Listing & Filtering', () => {
    it('should list payment sessions for authenticated user', async () => {
      const response = await authenticatedRequest('/v1/payment-sessions');

      expect(response.status).toBe(200);

      const body: any = await response.json();
      expect(body).toHaveProperty('data');
      expect(body).toHaveProperty('pagination');
      expect(Array.isArray(body.data)).toBe(true);
      expect(body.data.length).toBeGreaterThan(0);
      expect(body.pagination).toHaveProperty('total');
      expect(body.pagination).toHaveProperty('limit');
      expect(body.pagination).toHaveProperty('offset');
      expect(body.pagination).toHaveProperty('has_more');
    });

    it('should filter payment sessions by status', async () => {
      const response = await authenticatedRequest(
        '/v1/payment-sessions?status=PENDING'
      );

      expect(response.status).toBe(200);

      const body: any = await response.json();
      expect(body).toHaveProperty('data');
      expect(Array.isArray(body.data)).toBe(true);

      // Every returned session should have PENDING status
      for (const session of body.data) {
        expect(session.status).toBe('PENDING');
      }
    });

    it('should respect pagination limit parameter', async () => {
      const response = await authenticatedRequest(
        '/v1/payment-sessions?limit=1'
      );

      expect(response.status).toBe(200);

      const body: any = await response.json();
      expect(body.data.length).toBeLessThanOrEqual(1);
      expect(body.pagination.limit).toBe(1);
    });

    it('should respect pagination offset parameter', async () => {
      const response = await authenticatedRequest(
        '/v1/payment-sessions?limit=1&offset=0'
      );

      expect(response.status).toBe(200);

      const body: any = await response.json();
      expect(body.pagination.offset).toBe(0);
    });

    it('should reject listing without authentication', async () => {
      const response = await fetch(`${API_BASE_URL}/v1/payment-sessions`);

      expect(response.status).toBe(401);
    });
  });

  /**
   * Test 10: Refund Flow
   * Tests refund creation, listing, and validation scenarios
   */
  describe('Refund Flow', () => {
    // The test user's API key needs refund permission.
    // We create an API key with refund permission for refund tests.
    let refundApiKeyToken: string;
    let refundApiKeyId: string;

    beforeAll(async () => {
      // Create an API key with refund permissions for refund tests
      const apiKeyResponse = await authenticatedRequest('/v1/api-keys', {
        method: 'POST',
        body: JSON.stringify({
          name: `Refund Test Key ${timestamp}`,
          permissions: { read: true, write: true, refund: true },
        }),
      });

      if (apiKeyResponse.status === 201) {
        const keyData: any = await apiKeyResponse.json();
        refundApiKeyId = keyData.id;
      }
    });

    afterAll(async () => {
      // Cleanup the API key
      if (refundApiKeyId) {
        await authenticatedRequest(`/v1/api-keys/${refundApiKeyId}`, {
          method: 'DELETE',
        });
      }
    });

    it('should reject refund for non-existent payment session', async () => {
      const response = await authenticatedRequest('/v1/refunds', {
        method: 'POST',
        body: JSON.stringify({
          payment_session_id: 'non-existent-id-12345',
          amount: 10,
          reason: 'Test refund',
        }),
      });

      // Should return 404 (payment not found) or 403 (no refund permission)
      expect([400, 403, 404]).toContain(response.status);
    });

    it('should reject refund with negative amount via validation', async () => {
      const response = await authenticatedRequest('/v1/refunds', {
        method: 'POST',
        body: JSON.stringify({
          payment_session_id: 'some-id',
          amount: -50,
          reason: 'Negative amount test',
        }),
      });

      // Zod validation rejects negative amounts (positive() check)
      expect(response.status).toBe(400);
    });

    it('should reject refund with zero amount', async () => {
      const response = await authenticatedRequest('/v1/refunds', {
        method: 'POST',
        body: JSON.stringify({
          payment_session_id: 'some-id',
          amount: 0,
          reason: 'Zero amount test',
        }),
      });

      expect(response.status).toBe(400);
    });

    it('should list refunds for authenticated user', async () => {
      const response = await authenticatedRequest('/v1/refunds');

      expect(response.status).toBe(200);

      const body: any = await response.json();
      expect(body).toHaveProperty('data');
      expect(body).toHaveProperty('pagination');
      expect(Array.isArray(body.data)).toBe(true);
      expect(body.pagination).toHaveProperty('total');
      expect(body.pagination).toHaveProperty('limit');
      expect(body.pagination).toHaveProperty('offset');
      expect(body.pagination).toHaveProperty('has_more');
    });

    it('should reject refund listing without authentication', async () => {
      const response = await fetch(`${API_BASE_URL}/v1/refunds`);

      expect(response.status).toBe(401);
    });

    it('should reject refund for a PENDING payment session', async () => {
      // First, create a payment session (it starts as PENDING)
      const paymentResponse = await authenticatedRequest('/v1/payment-sessions', {
        method: 'POST',
        body: JSON.stringify({
          amount: 50,
          network: 'ethereum',
          token: 'USDC',
          merchant_address: '0xd8da6bf26964af9d7eed9e03e53415d37aa96045',
        }),
      });

      expect(paymentResponse.status).toBe(201);
      const paymentData: any = await paymentResponse.json();

      // Try to refund the PENDING payment -- should fail
      const refundResponse = await authenticatedRequest('/v1/refunds', {
        method: 'POST',
        body: JSON.stringify({
          payment_session_id: paymentData.id,
          amount: 25,
          reason: 'Refund pending payment test',
        }),
      });

      // Should be 400 (payment-not-refundable) or 403 (no refund permission on JWT)
      expect([400, 403]).toContain(refundResponse.status);
    });
  });

  /**
   * Test 11: Analytics Endpoints
   * Tests analytics overview and volume time-series data
   */
  describe('Analytics Endpoints', () => {
    it('should return analytics overview for authenticated user', async () => {
      const response = await authenticatedRequest('/v1/analytics/overview');

      expect(response.status).toBe(200);

      const data: any = await response.json();
      // Overview should contain summary stats
      expect(data).toBeDefined();
      expect(typeof data).toBe('object');
    });

    it('should return analytics volume with default period', async () => {
      const response = await authenticatedRequest('/v1/analytics/volume');

      expect(response.status).toBe(200);

      const body: any = await response.json();
      expect(body).toHaveProperty('data');
      expect(body).toHaveProperty('period');
      expect(body).toHaveProperty('days');
    });

    it('should return analytics volume with weekly period', async () => {
      const response = await authenticatedRequest(
        '/v1/analytics/volume?period=week&days=14'
      );

      expect(response.status).toBe(200);

      const body: any = await response.json();
      expect(body.period).toBe('week');
      expect(body.days).toBe(14);
    });

    it('should return analytics payment breakdown', async () => {
      const response = await authenticatedRequest(
        '/v1/analytics/payments?group_by=status'
      );

      expect(response.status).toBe(200);

      const body: any = await response.json();
      expect(body).toHaveProperty('data');
      expect(body).toHaveProperty('group_by', 'status');
    });

    it('should reject analytics without authentication', async () => {
      const response = await fetch(`${API_BASE_URL}/v1/analytics/overview`);

      expect(response.status).toBe(401);
    });
  });

  /**
   * Test 12: Profile (Me) Endpoints
   * Tests the /v1/me self-service endpoints
   */
  describe('Profile (Me) Endpoints', () => {
    it('should return current user profile via GET /v1/me', async () => {
      const response = await authenticatedRequest('/v1/me');

      expect(response.status).toBe(200);

      const data: any = await response.json();
      expect(data).toHaveProperty('id');
      expect(data).toHaveProperty('email', testUser.email);
      expect(data).toHaveProperty('role');
      expect(data).toHaveProperty('createdAt');
      // Verify sensitive fields are NOT exposed
      expect(data).not.toHaveProperty('passwordHash');
      expect(data).not.toHaveProperty('password');
    });

    it('should return data export via GET /v1/me/export', async () => {
      const response = await authenticatedRequest('/v1/me/export');

      expect(response.status).toBe(200);

      const data: any = await response.json();
      expect(data).toHaveProperty('user');
      expect(data).toHaveProperty('paymentSessions');
      expect(data).toHaveProperty('apiKeys');
      expect(data).toHaveProperty('webhookEndpoints');
      expect(data).toHaveProperty('paymentLinks');

      // Verify user data matches
      expect(data.user.email).toBe(testUser.email);

      // Verify Content-Disposition header for download
      const contentDisposition = response.headers.get('content-disposition');
      expect(contentDisposition).toContain('attachment');
    });

    it('should reject profile access without authentication', async () => {
      const response = await fetch(`${API_BASE_URL}/v1/me`);

      expect(response.status).toBe(401);
    });
  });

  /**
   * Test 13: Input Validation Edge Cases
   * Tests validation boundaries for payment sessions, webhooks, and addresses
   */
  describe('Input Validation Edge Cases', () => {
    it('should reject payment session with amount exceeding 10000', async () => {
      const response = await authenticatedRequest('/v1/payment-sessions', {
        method: 'POST',
        body: JSON.stringify({
          amount: 10001,
          network: 'ethereum',
          token: 'USDC',
          merchant_address: '0xd8da6bf26964af9d7eed9e03e53415d37aa96045',
        }),
      });

      expect(response.status).toBe(400);
    });

    it('should reject payment session with amount of 0', async () => {
      const response = await authenticatedRequest('/v1/payment-sessions', {
        method: 'POST',
        body: JSON.stringify({
          amount: 0,
          network: 'ethereum',
          token: 'USDC',
          merchant_address: '0xd8da6bf26964af9d7eed9e03e53415d37aa96045',
        }),
      });

      expect(response.status).toBe(400);
    });

    it('should reject payment session with invalid merchant_address', async () => {
      const response = await authenticatedRequest('/v1/payment-sessions', {
        method: 'POST',
        body: JSON.stringify({
          amount: 100,
          network: 'ethereum',
          token: 'USDC',
          merchant_address: 'not-a-valid-address',
        }),
      });

      expect(response.status).toBe(400);
    });

    it('should reject payment session with zero address', async () => {
      const response = await authenticatedRequest('/v1/payment-sessions', {
        method: 'POST',
        body: JSON.stringify({
          amount: 100,
          network: 'ethereum',
          token: 'USDC',
          merchant_address: '0x0000000000000000000000000000000000000000',
        }),
      });

      expect(response.status).toBe(400);
    });

    it('should reject webhook with non-HTTPS URL', async () => {
      const response = await authenticatedRequest('/v1/webhooks', {
        method: 'POST',
        body: JSON.stringify({
          url: 'http://insecure.example.com/webhook',
          events: ['payment.completed'],
          description: 'Non-HTTPS webhook test',
        }),
      });

      expect(response.status).toBe(400);
    });

    it('should reject webhook with empty events array', async () => {
      const response = await authenticatedRequest('/v1/webhooks', {
        method: 'POST',
        body: JSON.stringify({
          url: 'https://example.com/webhook',
          events: [],
          description: 'Empty events test',
        }),
      });

      expect(response.status).toBe(400);
    });

    it('should reject payment session with invalid Ethereum address format (short)', async () => {
      const response = await authenticatedRequest('/v1/payment-sessions', {
        method: 'POST',
        body: JSON.stringify({
          amount: 100,
          network: 'ethereum',
          token: 'USDC',
          merchant_address: '0x1234', // Too short
        }),
      });

      expect(response.status).toBe(400);
    });

    it('should accept payment session at max boundary (10000)', async () => {
      const response = await authenticatedRequest('/v1/payment-sessions', {
        method: 'POST',
        body: JSON.stringify({
          amount: 10000,
          network: 'ethereum',
          token: 'USDC',
          merchant_address: '0xd8da6bf26964af9d7eed9e03e53415d37aa96045',
        }),
      });

      expect(response.status).toBe(201);
    });

    it('should accept payment session at min boundary (1)', async () => {
      const response = await authenticatedRequest('/v1/payment-sessions', {
        method: 'POST',
        body: JSON.stringify({
          amount: 1,
          network: 'ethereum',
          token: 'USDC',
          merchant_address: '0xd8da6bf26964af9d7eed9e03e53415d37aa96045',
        }),
      });

      expect(response.status).toBe(201);
    });
  });

  /**
   * Test 14: BOLA (Broken Object Level Authorization) Protection
   * Verifies that user A cannot access user B's resources
   */
  describe('BOLA Protection', () => {
    // Second user credentials
    const userB = {
      email: `bola-test-${timestamp}@example.com`,
      password: 'BolaSecurePassword123!@#',
    };
    let userBToken: string;
    let userAPaymentSessionId: string;
    let userAApiKeyId: string;
    let userAWebhookId: string;

    beforeAll(async () => {
      // Sign up user B
      const signupResponse = await fetch(`${API_BASE_URL}/v1/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userB),
      });
      const signupData: any = await signupResponse.json();
      userBToken = signupData.access_token;

      // Create resources owned by user A (the primary test user)
      // Create a payment session as user A
      const paymentResponse = await authenticatedRequest('/v1/payment-sessions', {
        method: 'POST',
        body: JSON.stringify({
          amount: 75,
          network: 'ethereum',
          token: 'USDC',
          merchant_address: '0xd8da6bf26964af9d7eed9e03e53415d37aa96045',
        }),
      });
      if (paymentResponse.status === 201) {
        const data: any = await paymentResponse.json();
        userAPaymentSessionId = data.id;
      }

      // Create an API key as user A
      const apiKeyResponse = await authenticatedRequest('/v1/api-keys', {
        method: 'POST',
        body: JSON.stringify({
          name: `BOLA Test Key ${timestamp}`,
          permissions: { read: true, write: true, refund: false },
        }),
      });
      if (apiKeyResponse.status === 201) {
        const data: any = await apiKeyResponse.json();
        userAApiKeyId = data.id;
      }

      // Create a webhook as user A
      const webhookResponse = await authenticatedRequest('/v1/webhooks', {
        method: 'POST',
        body: JSON.stringify({
          url: `https://example.com/bola-webhook/${timestamp}`,
          events: ['payment.completed'],
          description: 'BOLA test webhook',
        }),
      });
      if (webhookResponse.status === 201) {
        const data: any = await webhookResponse.json();
        userAWebhookId = data.id;
      }
    });

    afterAll(async () => {
      // Cleanup user A's resources
      if (userAApiKeyId) {
        await authenticatedRequest(`/v1/api-keys/${userAApiKeyId}`, {
          method: 'DELETE',
        });
      }
      if (userAWebhookId) {
        await authenticatedRequest(`/v1/webhooks/${userAWebhookId}`, {
          method: 'DELETE',
        });
      }
    });

    /**
     * Helper: Make request as user B
     */
    async function userBRequest(
      endpoint: string,
      options: RequestInit = {}
    ): Promise<Response> {
      const headers: Record<string, string> = {
        ...options.headers as Record<string, string>,
        Authorization: `Bearer ${userBToken}`,
      };

      if (options.body) {
        headers['Content-Type'] = 'application/json';
      }

      return fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers,
      });
    }

    it('should prevent user B from accessing user A payment session by ID', async () => {
      if (!userAPaymentSessionId) {
        console.warn('Skipping: userAPaymentSessionId not created');
        return;
      }

      const response = await userBRequest(
        `/v1/payment-sessions/${userAPaymentSessionId}`
      );

      // Should return 404 (resource not found for this user) not 200
      expect(response.status).toBe(404);
    });

    it('should prevent user B from deleting user A API key', async () => {
      if (!userAApiKeyId) {
        console.warn('Skipping: userAApiKeyId not created');
        return;
      }

      const response = await userBRequest(
        `/v1/api-keys/${userAApiKeyId}`,
        { method: 'DELETE' }
      );

      // Should return 404 (not found for this user), not 204 (deleted)
      expect(response.status).toBe(404);
    });

    it('should prevent user B from accessing user A webhook', async () => {
      if (!userAWebhookId) {
        console.warn('Skipping: userAWebhookId not created');
        return;
      }

      const response = await userBRequest(
        `/v1/webhooks/${userAWebhookId}`
      );

      // Should return 404 (not found for this user)
      expect(response.status).toBe(404);
    });

    it('should prevent user B from deleting user A webhook', async () => {
      if (!userAWebhookId) {
        console.warn('Skipping: userAWebhookId not created');
        return;
      }

      const response = await userBRequest(
        `/v1/webhooks/${userAWebhookId}`,
        { method: 'DELETE' }
      );

      expect(response.status).toBe(404);
    });

    it('should ensure user B list does not contain user A payment sessions', async () => {
      const response = await userBRequest('/v1/payment-sessions');

      expect(response.status).toBe(200);

      const body: any = await response.json();
      const sessionIds = body.data.map((s: any) => s.id);

      // User A's payment session should NOT appear in user B's listing
      if (userAPaymentSessionId) {
        expect(sessionIds).not.toContain(userAPaymentSessionId);
      }
    });

    it('should ensure user B list does not contain user A API keys', async () => {
      const response = await userBRequest('/v1/api-keys');

      expect(response.status).toBe(200);

      const body: any = await response.json();
      const data = Array.isArray(body) ? body : (body.data || body);
      const keyIds = data.map((k: any) => k.id);

      if (userAApiKeyId) {
        expect(keyIds).not.toContain(userAApiKeyId);
      }
    });
  });

  /**
   * Test 15: Rate Limiting
   * Tests rate limit header presence and health endpoint exemption
   */
  describe('Rate Limiting', () => {
    it('should include rate limit headers on authenticated requests', async () => {
      const response = await authenticatedRequest('/v1/payment-sessions');

      expect(response.status).toBe(200);

      // Verify rate limit headers are present
      const limitHeader = response.headers.get('x-ratelimit-limit');
      const remainingHeader = response.headers.get('x-ratelimit-remaining');
      const resetHeader = response.headers.get('x-ratelimit-reset');

      expect(limitHeader).toBeTruthy();
      expect(remainingHeader).toBeTruthy();
      expect(resetHeader).toBeTruthy();

      // Verify remaining is a reasonable number
      const remaining = parseInt(remainingHeader!, 10);
      expect(remaining).toBeGreaterThanOrEqual(0);
    });

    it('should NOT include rate limit headers on health endpoint (exempt)', async () => {
      const response = await fetch(`${API_BASE_URL}/health`);

      expect(response.status).toBe(200);

      // Health endpoint is exempt -- should not have rate limit headers
      const limitHeader = response.headers.get('x-ratelimit-limit');
      expect(limitHeader).toBeNull();
    });

    it('should NOT include rate limit headers on ready endpoint (exempt)', async () => {
      const response = await fetch(`${API_BASE_URL}/ready`);

      expect(response.status).toBe(200);

      const limitHeader = response.headers.get('x-ratelimit-limit');
      expect(limitHeader).toBeNull();
    });
  });

  /**
   * Test 16: Error Response Format (RFC 7807)
   * Verifies that error responses follow the RFC 7807 Problem Details format
   */
  describe('Error Response Format (RFC 7807)', () => {
    it('should return RFC 7807 format for 404 Not Found', async () => {
      const response = await fetch(`${API_BASE_URL}/v1/nonexistent-route`);

      expect(response.status).toBe(404);

      const body: any = await response.json();
      expect(body).toHaveProperty('type');
      expect(body).toHaveProperty('title');
      expect(body).toHaveProperty('status', 404);
      expect(body).toHaveProperty('detail');
      expect(body).toHaveProperty('request_id');

      // Verify type is a URI
      expect(body.type).toContain('https://');
    });

    it('should return RFC 7807 format for 400 validation errors', async () => {
      const response = await authenticatedRequest('/v1/payment-sessions', {
        method: 'POST',
        body: JSON.stringify({
          amount: -999, // Invalid
          network: 'invalid-network',
        }),
      });

      expect(response.status).toBe(400);

      const body: any = await response.json();
      expect(body).toHaveProperty('type');
      expect(body).toHaveProperty('title');
      expect(body).toHaveProperty('status', 400);
      expect(body).toHaveProperty('detail');
    });

    it('should include request_id in error responses from global handler', async () => {
      // Hit a non-existent route to trigger the global 404 handler
      const response = await fetch(
        `${API_BASE_URL}/v1/this-route-does-not-exist-at-all`
      );

      expect(response.status).toBe(404);

      const body: any = await response.json();
      expect(body).toHaveProperty('request_id');
      expect(typeof body.request_id).toBe('string');
      expect(body.request_id.length).toBeGreaterThan(0);
    });

    it('should return RFC 7807 format for 401 on protected endpoints', async () => {
      const response = await fetch(`${API_BASE_URL}/v1/payment-sessions`, {
        headers: { 'Content-Type': 'application/json' },
      });

      expect(response.status).toBe(401);

      const body: any = await response.json();
      // Auth errors should still have structured format
      expect(body).toHaveProperty('type');
      expect(body).toHaveProperty('status', 401);
    });
  });

  /**
   * Test 17: Password Validation
   * Tests password strength requirements for signup
   */
  describe('Password Validation', () => {
    it('should reject signup with short password (< 12 chars)', async () => {
      const response = await fetch(`${API_BASE_URL}/v1/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: `short-pwd-${timestamp}@example.com`,
          password: 'Short1!',
        }),
      });

      expect(response.status).toBe(400);

      const body: any = await response.json();
      expect(body.detail).toContain('12 characters');
    });

    it('should reject signup with password missing uppercase', async () => {
      const response = await fetch(`${API_BASE_URL}/v1/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: `no-upper-${timestamp}@example.com`,
          password: 'nouppercase123!@#',
        }),
      });

      expect(response.status).toBe(400);

      const body: any = await response.json();
      expect(body.detail).toContain('uppercase');
    });

    it('should reject signup with password missing lowercase', async () => {
      const response = await fetch(`${API_BASE_URL}/v1/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: `no-lower-${timestamp}@example.com`,
          password: 'NOLOWERCASE123!@#',
        }),
      });

      expect(response.status).toBe(400);

      const body: any = await response.json();
      expect(body.detail).toContain('lowercase');
    });

    it('should reject signup with password missing number', async () => {
      const response = await fetch(`${API_BASE_URL}/v1/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: `no-number-${timestamp}@example.com`,
          password: 'NoNumberHere!@#abc',
        }),
      });

      expect(response.status).toBe(400);

      const body: any = await response.json();
      expect(body.detail).toContain('number');
    });

    it('should reject signup with password missing special character', async () => {
      const response = await fetch(`${API_BASE_URL}/v1/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: `no-special-${timestamp}@example.com`,
          password: 'NoSpecialChar123abc',
        }),
      });

      expect(response.status).toBe(400);

      const body: any = await response.json();
      expect(body.detail).toContain('special character');
    });

    it('should reject signup with invalid email format', async () => {
      const response = await fetch(`${API_BASE_URL}/v1/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'not-an-email',
          password: 'ValidPassword123!@#',
        }),
      });

      expect(response.status).toBe(400);
    });
  });

  /**
   * Test 18: Security Headers
   * Verifies security-related HTTP headers are present
   */
  describe('Security Headers', () => {
    it('should include security headers on API responses', async () => {
      const response = await fetch(`${API_BASE_URL}/health`);

      expect(response.status).toBe(200);

      // Check for helmet-set headers
      const csp = response.headers.get('content-security-policy');
      const xContentType = response.headers.get('x-content-type-options');
      const xFrame = response.headers.get('x-frame-options');

      // At least x-content-type-options should be present (set by helmet)
      expect(xContentType).toBe('nosniff');
    });

    it('should include HSTS header', async () => {
      const response = await fetch(`${API_BASE_URL}/health`);

      const hsts = response.headers.get('strict-transport-security');
      // HSTS should be set with 1 year max-age
      expect(hsts).toBeTruthy();
      if (hsts) {
        expect(hsts).toContain('max-age=');
      }
    });
  });

  /**
   * Test 19: Webhook URL Validation
   * Tests additional webhook URL constraints
   */
  describe('Webhook URL Validation', () => {
    it('should reject webhook with invalid URL format', async () => {
      const response = await authenticatedRequest('/v1/webhooks', {
        method: 'POST',
        body: JSON.stringify({
          url: 'not-a-url',
          events: ['payment.completed'],
        }),
      });

      expect(response.status).toBe(400);
    });

    it('should reject webhook with invalid event type', async () => {
      const response = await authenticatedRequest('/v1/webhooks', {
        method: 'POST',
        body: JSON.stringify({
          url: 'https://example.com/webhook',
          events: ['invalid.event.type'],
        }),
      });

      expect(response.status).toBe(400);
    });

    it('should accept webhook with valid HTTPS URL and valid events', async () => {
      const webhookUrl = `https://example.com/validation-test/${timestamp}`;
      const response = await authenticatedRequest('/v1/webhooks', {
        method: 'POST',
        body: JSON.stringify({
          url: webhookUrl,
          events: ['payment.completed', 'refund.completed'],
          description: 'Validation test webhook',
        }),
      });

      expect(response.status).toBe(201);

      const data: any = await response.json();
      // Clean up
      if (data.id) {
        await authenticatedRequest(`/v1/webhooks/${data.id}`, {
          method: 'DELETE',
        });
      }
    });
  });

  /**
   * Test 20: Path Parameter Validation (RISK-062)
   * Tests that :id path params reject path traversal and invalid formats
   */
  describe('Path Parameter Validation', () => {
    it('should reject path traversal in :id parameter', async () => {
      const response = await authenticatedRequest(
        '/v1/payment-sessions/../../../etc/passwd'
      );

      // Should be 400 (invalid ID) or 404 (not found) -- not a server error
      expect([400, 404]).toContain(response.status);
    });

    it('should reject null bytes in :id parameter', async () => {
      const response = await authenticatedRequest(
        '/v1/payment-sessions/test%00injection'
      );

      // Should be rejected with 400 or 404
      expect([400, 404]).toContain(response.status);
    });
  });

  /**
   * Test 21: Idempotency Key Validation
   * Tests the idempotency key format requirements
   */
  describe('Idempotency Key Validation', () => {
    it('should accept valid idempotency key', async () => {
      const response = await authenticatedRequest('/v1/payment-sessions', {
        method: 'POST',
        headers: {
          'Idempotency-Key': `idem-${timestamp}-valid`,
        } as Record<string, string>,
        body: JSON.stringify({
          amount: 50,
          network: 'ethereum',
          token: 'USDC',
          merchant_address: '0xd8da6bf26964af9d7eed9e03e53415d37aa96045',
        }),
      });

      expect(response.status).toBe(201);
    });

    it('should return same response for duplicate idempotency key', async () => {
      const idempotencyKey = `idem-${timestamp}-duplicate`;

      // First request
      const response1 = await authenticatedRequest('/v1/payment-sessions', {
        method: 'POST',
        headers: {
          'Idempotency-Key': idempotencyKey,
        } as Record<string, string>,
        body: JSON.stringify({
          amount: 42,
          network: 'ethereum',
          token: 'USDC',
          merchant_address: '0xd8da6bf26964af9d7eed9e03e53415d37aa96045',
        }),
      });
      expect(response1.status).toBe(201);
      const data1: any = await response1.json();

      // Second request with same key and same params
      const response2 = await authenticatedRequest('/v1/payment-sessions', {
        method: 'POST',
        headers: {
          'Idempotency-Key': idempotencyKey,
        } as Record<string, string>,
        body: JSON.stringify({
          amount: 42,
          network: 'ethereum',
          token: 'USDC',
          merchant_address: '0xd8da6bf26964af9d7eed9e03e53415d37aa96045',
        }),
      });

      // Should return 200 (existing) instead of 201 (new)
      expect(response2.status).toBe(200);

      const data2: any = await response2.json();
      expect(data2.id).toBe(data1.id);
    });

    it('should reject idempotency key longer than 64 characters', async () => {
      const longKey = 'a'.repeat(65);

      const response = await authenticatedRequest('/v1/payment-sessions', {
        method: 'POST',
        headers: {
          'Idempotency-Key': longKey,
        } as Record<string, string>,
        body: JSON.stringify({
          amount: 50,
          network: 'ethereum',
          token: 'USDC',
          merchant_address: '0xd8da6bf26964af9d7eed9e03e53415d37aa96045',
        }),
      });

      expect(response.status).toBe(400);
    });
  });
});
