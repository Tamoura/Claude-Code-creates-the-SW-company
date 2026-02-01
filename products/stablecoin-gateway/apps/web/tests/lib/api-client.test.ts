/**
 * API Client Authentication Tests
 *
 * Tests to verify Authorization headers are sent correctly
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TokenManager } from '../../src/lib/token-manager';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock the event-source-polyfill module (required by ApiClient)
vi.mock('event-source-polyfill', () => ({
  EventSourcePolyfill: class MockEventSourcePolyfill {
    constructor() {}
    close() {}
  },
}));

// Create a test API client that doesn't use mock mode
import { ApiClient } from '../../src/lib/api-client';

// Create test client with mock mode disabled
const testApiClient = new (ApiClient as any)('http://localhost:5001', false);

// Helper to create a mock fetch response with required properties
function mockResponse(data: Record<string, unknown>, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: new Headers({ 'content-type': 'application/json' }),
    json: async () => data,
  };
}

describe('ApiClient Authentication', () => {
  beforeEach(() => {
    // Clear localStorage and reset mocks
    localStorage.clear();
    mockFetch.mockReset();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('Authorization header injection', () => {
    it('should send Authorization header when token exists', async () => {
      const token = 'test_jwt_token_12345';
      TokenManager.setToken(token);

      mockFetch.mockResolvedValueOnce(mockResponse({
        id: 'ps_123',
        amount: 100,
        currency: 'USD',
        status: 'pending',
        network: 'polygon',
        token: 'USDC',
        merchant_address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
        checkout_url: 'http://localhost:3101/pay/ps_123',
        created_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      }));

      await testApiClient.createPaymentSession({
        amount: 100,
        merchant_address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
      });

      // Verify fetch was called with Authorization header
      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': `Bearer ${token}`,
          }),
        })
      );
    });

    it('should NOT send Authorization header when token does not exist', async () => {
      // Ensure no token
      TokenManager.clearToken();

      mockFetch.mockResolvedValueOnce(mockResponse({
        id: 'ps_123',
        amount: 100,
        currency: 'USD',
        status: 'pending',
        network: 'polygon',
        token: 'USDC',
        merchant_address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
        checkout_url: 'http://localhost:3101/pay/ps_123',
        created_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      }));

      await testApiClient.createPaymentSession({
        amount: 100,
        merchant_address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
      });

      // Verify fetch was called WITHOUT Authorization header
      const callArgs = mockFetch.mock.calls[0][1];
      expect(callArgs.headers).not.toHaveProperty('Authorization');
    });
  });

  describe('401 Unauthorized handling', () => {
    it('should throw error on 401 response', async () => {
      const token = 'invalid_token';
      TokenManager.setToken(token);

      mockFetch.mockResolvedValueOnce(mockResponse({
        type: 'about:blank',
        title: 'Unauthorized',
        status: 401,
        detail: 'Invalid or expired token',
      }, 401));

      // Attempt to create payment session
      await expect(
        testApiClient.createPaymentSession({
          amount: 100,
          merchant_address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
        })
      ).rejects.toThrow('Invalid or expired token');
    });

    it('should clear token on 401 response', async () => {
      const token = 'expired_token';
      TokenManager.setToken(token);

      mockFetch.mockResolvedValueOnce(mockResponse({
        type: 'about:blank',
        title: 'Unauthorized',
        status: 401,
        detail: 'Token expired',
      }, 401));

      // Attempt to create payment session
      try {
        await testApiClient.createPaymentSession({
          amount: 100,
          merchant_address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
        });
      } catch (error) {
        // Expected to throw
      }

      // Token should be cleared after 401
      expect(TokenManager.getToken()).toBeNull();
    });
  });

  describe('All API methods send Authorization header', () => {
    const token = 'test_jwt_token';

    beforeEach(() => {
      TokenManager.setToken(token);
    });

    it('should send auth header on GET payment session', async () => {
      mockFetch.mockResolvedValueOnce(mockResponse({
        id: 'ps_123',
        amount: 100,
        currency: 'USD',
        status: 'pending',
        network: 'polygon',
        token: 'USDC',
        merchant_address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
        checkout_url: 'http://localhost:3101/pay/ps_123',
        created_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      }));

      await testApiClient.getPaymentSession('ps_123');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': `Bearer ${token}`,
          }),
        })
      );
    });

    it('should send auth header on PATCH payment session', async () => {
      mockFetch.mockResolvedValueOnce(mockResponse({
        id: 'ps_123',
        amount: 100,
        currency: 'USD',
        status: 'confirming',
        network: 'polygon',
        token: 'USDC',
        merchant_address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
        checkout_url: 'http://localhost:3101/pay/ps_123',
        created_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        tx_hash: '0xabcdef',
      }));

      await testApiClient.updatePaymentSession('ps_123', {
        status: 'confirming',
        tx_hash: '0xabcdef',
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          method: 'PATCH',
          headers: expect.objectContaining({
            'Authorization': `Bearer ${token}`,
          }),
        })
      );
    });

    it('should send auth header on GET payment sessions list', async () => {
      mockFetch.mockResolvedValueOnce(mockResponse({
        data: [],
        pagination: { total: 0, has_more: false },
      }));

      await testApiClient.listPaymentSessions();

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': `Bearer ${token}`,
          }),
        })
      );
    });
  });

  // Note: SSE security tests (token in Authorization header) are in api-client-sse.test.ts
  describe('SSE createEventSource authentication', () => {
    it('should request SSE token with access token in Authorization header', async () => {
      const accessToken = 'test_jwt_access_token_12345';
      const sseToken = 'short_lived_sse_token_67890';
      TokenManager.setToken(accessToken);

      // Mock SSE token request
      mockFetch.mockResolvedValueOnce(mockResponse({
        token: sseToken,
        expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      }));

      await testApiClient.createEventSource('ps_123');

      // Verify SSE token was requested with access token
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:5001/v1/auth/sse-token',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': `Bearer ${accessToken}`,
          }),
          body: JSON.stringify({ payment_session_id: 'ps_123' }),
        })
      );
    });
  });
});
