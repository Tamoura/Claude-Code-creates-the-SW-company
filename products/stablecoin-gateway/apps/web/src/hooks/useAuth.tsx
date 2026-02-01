/**
 * useAuth Hook
 *
 * Provides authentication state and methods for the application.
 * User info (email) is stored alongside the token so it persists
 * across component re-renders without needing a /me endpoint.
 */

import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '../lib/api-client';
import { TokenManager } from '../lib/token-manager';
import type { User } from '../lib/api-client';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

// Store minimal user info in memory alongside token
let storedUser: User | null = null;

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: storedUser,
    isAuthenticated: false,
    isLoading: false,
    error: null,
  });

  // Check for existing token on mount
  useEffect(() => {
    const token = TokenManager.getToken();
    if (token) {
      setState(prev => ({
        ...prev,
        isAuthenticated: true,
        user: storedUser,
      }));
    }
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const result = await apiClient.login(email, password);

      const user = { id: result.id, email: result.email };
      storedUser = user;

      setState({
        user,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });

      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Login failed';

      setState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: message,
      });

      throw error;
    }
  }, []);

  const logout = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true }));

    try {
      await apiClient.logout();
    } finally {
      storedUser = null;
      setState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      });
    }
  }, []);

  return {
    ...state,
    login,
    logout,
  };
}
