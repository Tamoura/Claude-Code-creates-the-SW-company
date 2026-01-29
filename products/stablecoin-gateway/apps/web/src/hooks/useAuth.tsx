/**
 * useAuth Hook
 *
 * Provides authentication state and methods for the application
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

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: false,
    error: null,
  });

  // Check for existing token on mount
  useEffect(() => {
    const token = TokenManager.getToken();
    if (token) {
      // Token exists, consider user authenticated
      // In a full implementation, we'd validate the token with the backend
      setState(prev => ({ ...prev, isAuthenticated: true }));
    }
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const result = await apiClient.login(email, password);

      setState({
        user: { id: result.id, email: result.email },
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
