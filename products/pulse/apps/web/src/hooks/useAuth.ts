'use client';

import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '../lib/api-client';
import { TokenManager } from '../lib/token-manager';

export interface User {
  id: string;
  email: string;
  name?: string;
  githubUsername?: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

let storedUser: User | null = null;

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: storedUser,
    isAuthenticated: false,
    isLoading: false,
    error: null,
  });

  useEffect(() => {
    const token = TokenManager.getToken();
    if (token) {
      setState((prev) => ({
        ...prev,
        isAuthenticated: true,
        user: storedUser,
      }));
    }
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const result = await apiClient.login(email, password);
      const user: User = {
        id: result.user.id,
        email: result.user.email,
        name: result.user.name ?? undefined,
        githubUsername: result.user.githubUsername ?? undefined,
      };
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

  const signup = useCallback(async (name: string, email: string, password: string) => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const result = await apiClient.signup(name, email, password);
      const user: User = {
        id: result.user.id,
        email: result.user.email,
        name: result.user.name ?? undefined,
        githubUsername: result.user.githubUsername ?? undefined,
      };
      storedUser = user;

      setState({
        user,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });

      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Registration failed';
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
    setState((prev) => ({ ...prev, isLoading: true }));
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
    signup,
    logout,
  };
}
