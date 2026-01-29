/**
 * SSE Token Security Tests
 *
 * These tests verify that SSE tokens are sent via Authorization header,
 * NOT in the URL query string, to prevent token leakage in:
 * - Browser history
 * - Server logs
 * - Proxy logs
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TokenManager } from '../../src/lib/token-manager';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Capture EventSourcePolyfill constructor calls
let capturedUrl: string | undefined;
let capturedOptions: { headers?: Record<string, string> } | undefined;

// Mock the event-source-polyfill module
vi.mock('event-source-polyfill', () => ({
  EventSourcePolyfill: class MockEventSourcePolyfill {
    constructor(url: string, options?: { headers?: Record<string, string> }) {
      capturedUrl = url;
      capturedOptions = options;
    }
    close() {}
  },
}));

// Import after mocking
import { ApiClient } from '../../src/lib/api-client';

// Create test client with mock mode disabled
const testApiClient = new (ApiClient as unknown as new (baseUrl: string, useMock: boolean) => ApiClient)(
  'http://localhost:5001',
  false
);

describe('SSE Token Security - Authorization Header', () => {
  beforeEach(() => {
    localStorage.clear();
    mockFetch.mockReset();
    capturedUrl = undefined;
    capturedOptions = undefined;
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('createEventSource security', () => {
    it('should NOT include token in URL query string', async () => {
      const accessToken = 'test_jwt_access_token_12345';
      const sseToken = 'short_lived_sse_token_67890';
      TokenManager.setToken(accessToken);

      // Mock SSE token request
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          token: sseToken,
          expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
        }),
      });

      await testApiClient.createEventSource('ps_123');

      // CRITICAL SECURITY CHECK: Token MUST NOT be in URL
      expect(capturedUrl).toBeDefined();
      expect(capturedUrl).not.toContain('token=');
      expect(capturedUrl).not.toContain(sseToken);
      expect(capturedUrl).not.toContain('?');
    });

    it('should send SSE token in Authorization header', async () => {
      const accessToken = 'test_jwt_access_token_12345';
      const sseToken = 'short_lived_sse_token_67890';
      TokenManager.setToken(accessToken);

      // Mock SSE token request
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          token: sseToken,
          expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
        }),
      });

      await testApiClient.createEventSource('ps_123');

      // Verify Authorization header is set correctly
      expect(capturedOptions).toBeDefined();
      expect(capturedOptions?.headers).toBeDefined();
      expect(capturedOptions?.headers?.['Authorization']).toBe(`Bearer ${sseToken}`);
    });

    it('should construct correct URL without query parameters', async () => {
      const accessToken = 'test_jwt_access_token_12345';
      const sseToken = 'short_lived_sse_token_67890';
      TokenManager.setToken(accessToken);

      // Mock SSE token request
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          token: sseToken,
          expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
        }),
      });

      await testApiClient.createEventSource('ps_123');

      // Verify URL is clean (no query string)
      expect(capturedUrl).toBe('http://localhost:5001/v1/payment-sessions/ps_123/events');
    });

    it('should still request SSE token via authenticated endpoint', async () => {
      const accessToken = 'test_jwt_access_token_12345';
      const sseToken = 'short_lived_sse_token_67890';
      TokenManager.setToken(accessToken);

      // Mock SSE token request
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          token: sseToken,
          expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
        }),
      });

      await testApiClient.createEventSource('ps_123');

      // Verify SSE token was requested with access token in Authorization header
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

    it('should use Bearer token format in SSE header', async () => {
      const accessToken = 'test_jwt_access_token_12345';
      const sseToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.special+chars';
      TokenManager.setToken(accessToken);

      // Mock SSE token request
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          token: sseToken,
          expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
        }),
      });

      await testApiClient.createEventSource('ps_123');

      // Verify Authorization header uses Bearer format
      expect(capturedOptions?.headers?.['Authorization']).toMatch(/^Bearer /);
      expect(capturedOptions?.headers?.['Authorization']).toBe(`Bearer ${sseToken}`);
    });
  });
});
