/**
 * Full Stack Integration Tests for Stablecoin Gateway
 *
 * Tests the complete system with real HTTP calls to running services.
 *
 * Prerequisites:
 * - Backend API running on http://localhost:5001
 * - Frontend web app running on http://localhost:3104
 * - PostgreSQL database available
 * - Redis available (for rate limiting)
 *
 * Test Coverage:
 * 1. Backend health check
 * 2. User authentication flow (signup → login → token)
 * 3. Payment session creation (authenticated)
 * 4. API key lifecycle (CRUD operations)
 * 5. Webhook lifecycle (CRUD operations)
 * 6. Frontend accessibility
 * 7. Authentication/authorization edge cases
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
  return fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${authToken}`,
      'Content-Type': 'application/json',
    },
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

      const data = await response.json();
      expect(data).toHaveProperty('user');
      expect(data.user).toHaveProperty('email', testUser.email);
      expect(data.user).toHaveProperty('id');
    });

    it('should reject duplicate signup with same email', async () => {
      const response = await fetch(`${API_BASE_URL}/v1/auth/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testUser),
      });

      expect(response.status).toBe(400);
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

      const data = await response.json();
      expect(data).toHaveProperty('token');
      expect(data).toHaveProperty('user');
      expect(data.user.email).toBe(testUser.email);

      // Store token for subsequent authenticated tests
      authToken = data.token;
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
        amount: '100.00',
        currency: 'USDC',
        network: 'ethereum',
        token: 'USDC',
        merchant_address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
      };

      const response = await authenticatedRequest('/v1/payment-sessions', {
        method: 'POST',
        body: JSON.stringify(paymentData),
      });

      expect(response.status).toBe(201);

      const data = await response.json();
      expect(data).toHaveProperty('id');
      expect(data).toHaveProperty('payment_address');
      expect(data).toHaveProperty('status');
      expect(data.amount).toBe(paymentData.amount);
      expect(data.currency).toBe(paymentData.currency);
    });

    it('should reject payment session without authentication', async () => {
      const paymentData = {
        amount: '100.00',
        currency: 'USDC',
        network: 'ethereum',
        token: 'USDC',
        merchant_address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
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
        amount: '-100.00', // Invalid: negative amount
        currency: 'USDC',
        network: 'ethereum',
        token: 'USDC',
        merchant_address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
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

      const data = await response.json();
      expect(data).toHaveProperty('id');
      expect(data).toHaveProperty('key');
      expect(data).toHaveProperty('name', apiKeyData.name);
      expect(data.permissions).toMatchObject(apiKeyData.permissions);

      // Store for subsequent tests
      createdApiKeyId = data.id;
      expect(createdApiKeyId).toBeTruthy();
    });

    it('should list all API keys for authenticated user', async () => {
      const response = await authenticatedRequest('/v1/api-keys');

      expect(response.status).toBe(200);

      const data = await response.json();
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

      const data = await response.json();
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

      const data = await response.json();
      expect(data).toHaveProperty('id');
      expect(data).toHaveProperty('url', webhookData.url);
      expect(data).toHaveProperty('events');
      expect(data.events).toEqual(expect.arrayContaining(webhookData.events));
      expect(data).toHaveProperty('description', webhookData.description);
      expect(data).toHaveProperty('enabled', true);

      // Store for subsequent tests
      createdWebhookId = data.id;
      expect(createdWebhookId).toBeTruthy();
    });

    it('should list all webhooks for authenticated user', async () => {
      const response = await authenticatedRequest('/v1/webhooks');

      expect(response.status).toBe(200);

      const data = await response.json();
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

      const data = await response.json();
      expect(data.id).toBe(createdWebhookId);
      expect(data.url).toBe(updateData.url);
      expect(data.events).toEqual(expect.arrayContaining(updateData.events));
      expect(data.description).toBe(updateData.description);
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

      const data = await response.json();
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

      const data = await response.json();
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
      expect(html).toContain('<!DOCTYPE html>');
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
});
