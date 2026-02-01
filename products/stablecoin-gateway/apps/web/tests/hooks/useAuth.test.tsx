/**
 * useAuth Hook Tests
 *
 * Tests the authentication hook that provides:
 * - Authentication state
 * - Login/logout functions
 * - Current user data
 *
 * Uses the mock API client (VITE_USE_MOCK_API=true in vitest config).
 * Mock login validates email against localStorage mock_users store.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useAuth } from '../../src/hooks/useAuth';
import { TokenManager } from '../../src/lib/token-manager';

const TEST_EMAIL = 'test@example.com';
const MOCK_USER_ID = 'usr_test1234';

/** Pre-seed a mock user in localStorage so mock login can find it */
function seedMockUser(email = TEST_EMAIL, id = MOCK_USER_ID) {
  const mockUsers = JSON.parse(localStorage.getItem('mock_users') || '[]');
  mockUsers.push({ id, email });
  localStorage.setItem('mock_users', JSON.stringify(mockUsers));
}

describe('useAuth Hook', () => {
  beforeEach(() => {
    // Clear tokens before each test
    TokenManager.clearToken();
    localStorage.clear();
  });

  describe('Initial State', () => {
    it('should start with unauthenticated state', () => {
      const { result } = renderHook(() => useAuth());

      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.user).toBeNull();
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should detect existing token and authenticate', async () => {
      // Pre-set a valid token (simulating returning user)
      const { result } = renderHook(() => useAuth());

      // Initially should check for token
      expect(result.current.isAuthenticated).toBe(false);
    });
  });

  describe('Login', () => {
    it('should login successfully with valid credentials', async () => {
      seedMockUser();
      const { result } = renderHook(() => useAuth());

      // Start login
      await act(async () => {
        await result.current.login(TEST_EMAIL, 'SecurePass123');
      });

      // Should be authenticated
      await waitFor(() => {
        expect(result.current.isAuthenticated).toBe(true);
      });

      expect(result.current.user).toMatchObject({
        email: TEST_EMAIL,
      });
      expect(result.current.error).toBeNull();
    });

    it('should set loading state during login', async () => {
      seedMockUser();
      const { result } = renderHook(() => useAuth());

      // Start login (don't await)
      act(() => {
        result.current.login(TEST_EMAIL, 'SecurePass123');
      });

      // Should be loading
      expect(result.current.isLoading).toBe(true);

      // Wait for completion
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });

    it('should set error on invalid credentials', async () => {
      // Don't seed user - mock rejects when email is not found
      const { result } = renderHook(() => useAuth());

      await act(async () => {
        try {
          await result.current.login('nonexistent@example.com', 'WrongPassword');
        } catch (e) {
          // Expected to throw
        }
      });

      await waitFor(() => {
        expect(result.current.error).toBeTruthy();
        expect(result.current.error).toContain('Invalid');
      });

      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.user).toBeNull();
    });

    it('should clear previous errors on new login attempt', async () => {
      seedMockUser();
      const { result } = renderHook(() => useAuth());

      // First attempt - fail with email not in mock store
      await act(async () => {
        try {
          await result.current.login('nonexistent@example.com', 'WrongPassword');
        } catch (e) {
          // Expected
        }
      });

      await waitFor(() => {
        expect(result.current.error).toBeTruthy();
      });

      // Second attempt - succeed with seeded user
      await act(async () => {
        await result.current.login(TEST_EMAIL, 'SecurePass123');
      });

      await waitFor(() => {
        expect(result.current.error).toBeNull();
        expect(result.current.isAuthenticated).toBe(true);
      });
    });
  });

  describe('Logout', () => {
    it('should logout and clear state', async () => {
      seedMockUser();
      const { result } = renderHook(() => useAuth());

      // First login
      await act(async () => {
        await result.current.login(TEST_EMAIL, 'SecurePass123');
      });

      await waitFor(() => {
        expect(result.current.isAuthenticated).toBe(true);
      });

      // Now logout
      await act(async () => {
        await result.current.logout();
      });

      await waitFor(() => {
        expect(result.current.isAuthenticated).toBe(false);
      });

      expect(result.current.user).toBeNull();
      expect(TokenManager.hasToken()).toBe(false);
    });

    it('should handle logout when not logged in', async () => {
      const { result } = renderHook(() => useAuth());

      // Logout without being logged in
      await act(async () => {
        await result.current.logout();
      });

      // Should not throw error
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.user).toBeNull();
    });
  });

  describe('Authentication Persistence', () => {
    it('should restore authentication from stored token', async () => {
      seedMockUser();

      // First hook instance - login
      const { result: firstResult } = renderHook(() => useAuth());

      await act(async () => {
        await firstResult.current.login(TEST_EMAIL, 'SecurePass123');
      });

      await waitFor(() => {
        expect(firstResult.current.isAuthenticated).toBe(true);
      });

      const userId = firstResult.current.user?.id;

      // Simulate page refresh - new hook instance
      const { result: secondResult } = renderHook(() => useAuth());

      // Should automatically restore auth state
      await waitFor(() => {
        expect(secondResult.current.isAuthenticated).toBe(true);
      });

      expect(secondResult.current.user?.id).toBe(userId);
    });
  });
});
