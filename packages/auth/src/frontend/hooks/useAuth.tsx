import { useState, useEffect, useCallback } from 'react';
import { TokenManager } from '../lib/token-manager.js';

export interface AuthUser {
  id: string;
  email: string;
  role: string;
}

interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

interface UseAuthOptions {
  /** Login function that calls the API. Must return user info + set token via TokenManager */
  loginFn: (email: string, password: string) => Promise<AuthUser>;
  /** Logout function that calls the API */
  logoutFn: () => Promise<void>;
  /** Optional signup function */
  signupFn?: (email: string, password: string) => Promise<AuthUser>;
}

// Store minimal user info in memory alongside token
let storedUser: AuthUser | null = null;

export function useAuth(options: UseAuthOptions) {
  const { loginFn, logoutFn, signupFn } = options;

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

  const login = useCallback(
    async (email: string, password: string) => {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));
      try {
        const user = await loginFn(email, password);
        storedUser = user;
        setState({ user, isAuthenticated: true, isLoading: false, error: null });
        return user;
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Login failed';
        setState({ user: null, isAuthenticated: false, isLoading: false, error: message });
        throw error;
      }
    },
    [loginFn]
  );

  const logout = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true }));
    try {
      await logoutFn();
    } finally {
      storedUser = null;
      setState({ user: null, isAuthenticated: false, isLoading: false, error: null });
    }
  }, [logoutFn]);

  const signup = useCallback(
    async (email: string, password: string) => {
      if (!signupFn) throw new Error('Signup not configured');
      setState((prev) => ({ ...prev, isLoading: true, error: null }));
      try {
        const user = await signupFn(email, password);
        storedUser = user;
        setState({ user, isAuthenticated: true, isLoading: false, error: null });
        return user;
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Signup failed';
        setState({ user: null, isAuthenticated: false, isLoading: false, error: message });
        throw error;
      }
    },
    [signupFn]
  );

  return { ...state, login, logout, signup };
}
