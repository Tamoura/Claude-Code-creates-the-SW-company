/**
 * useAuth Hook
 *
 * Provides authentication state and methods for the application.
 * Adapted from ConnectSW Component Registry (stablecoin-gateway).
 * User info is stored alongside the token so it persists
 * across component re-renders without needing a /me endpoint.
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { apiClient } from '../lib/api-client';
import type { User } from '../lib/api-client';
import { TokenManager } from '../lib/token-manager';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

export function useAuth() {
  const userRef = useRef<User | null>(null);
  const [state, setState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: false,
    error: null,
  });

  useEffect(() => {
    const token = TokenManager.getToken();
    if (token && userRef.current) {
      setState((prev) => ({
        ...prev,
        isAuthenticated: true,
        user: userRef.current,
      }));
    }
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const result = await apiClient.login(email, password);
      const user = result.user;
      userRef.current = user;

      setState({
        user,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });

      return result;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Login failed';

      setState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: message,
      });

      throw error;
    }
  }, []);

  const signup = useCallback(
    async (name: string, email: string, password: string) => {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      try {
        const result = await apiClient.signup({ name, email, password });
        const user = result.user;
        userRef.current = user;

        setState({
          user,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        });

        return result;
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Registration failed';

        setState({
          user: null,
          isAuthenticated: false,
          isLoading: false,
          error: message,
        });

        throw error;
      }
    },
    []
  );

  const logout = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true }));

    try {
      await apiClient.logout();
    } finally {
      userRef.current = null;
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
    signup,
    logout,
  };
}
