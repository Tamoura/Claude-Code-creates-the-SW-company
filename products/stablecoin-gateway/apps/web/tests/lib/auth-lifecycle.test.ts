/**
 * Auth Lifecycle Tests
 *
 * Tests the complete authentication lifecycle:
 * - Login with email/password
 * - Token storage
 * - Auto token injection on API calls
 * - Token expiry handling
 * - Logout
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TokenManager } from '../../src/lib/token-manager';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock event-source-polyfill (required by ApiClient import)
vi.mock('event-source-polyfill', () => ({
  EventSourcePolyfill: class MockEventSourcePolyfill {
    constructor() {}
    close() {}
  },
}));

import { ApiClient } from '../../src/lib/api-client';

// Helper to create a mock fetch response with proper Headers
function mockResponse(data: Record<string, unknown>, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: new Headers({ 'content-type': 'application/json' }),
    json: async () => data,
  };
}

describe('Auth Lifecycle', () => {
  let apiClient: ApiClient;
  let uniqueEmail: string;
  const testPassword = 'SecurePass123';
  const mockUserId = 'usr_test123';
  const mockAccessToken = 'mock_access_token_xyz';
  const mockRefreshToken = 'mock_refresh_token_abc';

  beforeEach(() => {
    // Clear any existing tokens
    TokenManager.clearToken();
    localStorage.clear();
    mockFetch.mockReset();

    // Create client pointing to mock backend
    apiClient = new (ApiClient as unknown as new (baseUrl: string, useMock: boolean) => ApiClient)(
      'http://localhost:5001',
      false
    );

    // Create unique email for each test
    uniqueEmail = `test-${Date.now()}-${Math.random().toString(36).substring(7)}@example.com`;

    // Default fetch implementation that handles auth endpoints
    mockFetch.mockImplementation(async (url: string, options?: RequestInit) => {
      const method = options?.method || 'GET';
      const body = options?.body ? JSON.parse(options.body as string) : {};

      // POST /v1/auth/signup
      if (url.includes('/v1/auth/signup') && method === 'POST') {
        return mockResponse({
          id: mockUserId,
          email: body.email,
          role: 'MERCHANT',
          created_at: new Date().toISOString(),
          access_token: mockAccessToken,
          refresh_token: mockRefreshToken,
        });
      }

      // POST /v1/auth/login
      if (url.includes('/v1/auth/login') && method === 'POST') {
        if (body.email === uniqueEmail && body.password === testPassword) {
          return mockResponse({
            id: mockUserId,
            email: body.email,
            role: 'MERCHANT',
            access_token: mockAccessToken,
            refresh_token: mockRefreshToken,
          });
        }
        return mockResponse({
          type: 'about:blank',
          title: 'Unauthorized',
          status: 401,
          detail: 'Invalid email or password',
        }, 401);
      }

      // GET /v1/payment-sessions
      if (url.includes('/v1/payment-sessions') && method === 'GET') {
        const authHeader = (options?.headers as Record<string, string>)?.['Authorization'];
        if (!authHeader) {
          return mockResponse({
            type: 'about:blank',
            title: 'Unauthorized',
            status: 401,
            detail: 'Missing authentication token',
          }, 401);
        }
        if (authHeader === 'Bearer invalid.expired.token') {
          return mockResponse({
            type: 'about:blank',
            title: 'Unauthorized',
            status: 401,
            detail: 'Invalid or expired token',
          }, 401);
        }
        return mockResponse({
          data: [],
          pagination: { total: 0, has_more: false },
        });
      }

      // DELETE /v1/auth/logout
      if (url.includes('/v1/auth/logout') && method === 'DELETE') {
        return {
          ok: true,
          status: 204,
          headers: new Headers({ 'content-length': '0' }),
          json: async () => ({}),
        };
      }

      return mockResponse({
        type: 'about:blank',
        title: 'Not Found',
        status: 404,
        detail: 'Endpoint not found',
      }, 404);
    });
  });

  describe('Login Flow', () => {
    it('should login with valid credentials and store token', async () => {
      // Login with test credentials
      const result = await apiClient.login(uniqueEmail, testPassword);

      // Should return user object with tokens
      expect(result).toMatchObject({
        id: expect.any(String),
        email: uniqueEmail,
      });

      // Access token should be stored in TokenManager
      const storedToken = TokenManager.getToken();
      expect(storedToken).toBeTruthy();
      expect(storedToken).toBe(result.accessToken);
    });

    it('should reject invalid credentials', async () => {
      await expect(
        apiClient.login(uniqueEmail, 'WrongPassword')
      ).rejects.toThrow('Invalid email or password');
    });

    it('should reject non-existent user', async () => {
      const nonExistentEmail = `nonexistent-${Date.now()}@example.com`;
      await expect(
        apiClient.login(nonExistentEmail, 'SomePassword123')
      ).rejects.toThrow('Invalid email or password');
    });

    it('should validate email format', async () => {
      await expect(
        apiClient.login('not-an-email', 'Password123')
      ).rejects.toThrow();
    });

    it('should validate password is not empty', async () => {
      await expect(
        apiClient.login('test@example.com', '')
      ).rejects.toThrow();
    });
  });

  describe('Token Injection', () => {
    it('should automatically inject token in API requests after login', async () => {
      // First login
      await apiClient.login(uniqueEmail, testPassword);

      // Now make an authenticated request (e.g., list payment sessions)
      // This should include the Authorization header automatically
      const result = await apiClient.listPaymentSessions();

      // Should succeed (not throw 401)
      expect(result).toHaveProperty('data');
      expect(Array.isArray(result.data)).toBe(true);
    });

    it('should fail authenticated requests without token', async () => {
      // Don't login - no token
      TokenManager.clearToken();

      // Try to make authenticated request
      await expect(
        apiClient.listPaymentSessions()
      ).rejects.toThrow();
    });
  });

  describe('Token Expiry Handling', () => {
    it('should clear token on 401 Unauthorized response', async () => {
      // Set an invalid/expired token
      TokenManager.setToken('invalid.expired.token');

      // Make request that will fail with 401
      await expect(
        apiClient.listPaymentSessions()
      ).rejects.toThrow();

      // Token should be cleared
      expect(TokenManager.getToken()).toBeNull();
    });
  });

  describe('Logout Flow', () => {
    it('should clear token on logout', async () => {
      // Login first
      await apiClient.login(uniqueEmail, testPassword);
      expect(TokenManager.hasToken()).toBe(true);

      // Logout
      await apiClient.logout();

      // Token should be cleared
      expect(TokenManager.hasToken()).toBe(false);
      expect(TokenManager.getToken()).toBeNull();
    });

    it('should revoke refresh token on logout', async () => {
      // Login first
      const result = await apiClient.login(uniqueEmail, testPassword);

      // Logout (should revoke refresh token on backend)
      await apiClient.logout(result.refreshToken);

      // Token should be cleared
      expect(TokenManager.hasToken()).toBe(false);
    });
  });
});
