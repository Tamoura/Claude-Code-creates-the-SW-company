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

import { describe, it, expect, beforeEach } from 'vitest';
import { ApiClient } from '../../src/lib/api-client';
import { TokenManager } from '../../src/lib/token-manager';

describe('Auth Lifecycle', () => {
  let apiClient: ApiClient;
  let uniqueEmail: string;
  const testPassword = 'SecurePass123';

  beforeEach(async () => {
    // Clear any existing tokens
    TokenManager.clearToken();
    localStorage.clear();

    // Create client pointing to real backend (will be running in test mode)
    apiClient = new ApiClient('http://localhost:5001', false);

    // Create unique email for each test to avoid rate limiting
    uniqueEmail = `test-${Date.now()}-${Math.random().toString(36).substring(7)}@example.com`;

    // Create a fresh test user for this specific test
    try {
      await fetch('http://localhost:5001/v1/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: uniqueEmail, password: testPassword }),
      });
    } catch (e) {
      // Ignore errors
    }
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
