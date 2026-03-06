'use client';

import { useState, useCallback, useEffect } from 'react';
import { api, ApiError, setTokens, clearTokens, getAccessToken, getRefreshToken } from '@/lib/api';
import type { User, AuthState } from '@/types/index';

interface LoginCredentials {
  email: string;
  password: string;
  orgId?: string;
}

interface RegisterCredentials {
  name?: string;
  firstName?: string;
  lastName?: string;
  email: string;
  password: string;
  orgId?: string;
}

// Default org for single-tenant demo mode
const DEFAULT_ORG_ID = process.env.NEXT_PUBLIC_DEFAULT_ORG_ID || '';

interface AuthActions {
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (credentials: RegisterCredentials) => Promise<void>;
  logout: () => Promise<void>;
}

interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

type UseAuthReturn = AuthState & AuthActions;

export function useAuth(): UseAuthReturn {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Check session on mount (only if we have a stored token)
  useEffect(() => {
    let mounted = true;
    const checkSession = async () => {
      if (!getAccessToken()) {
        if (mounted) setIsLoading(false);
        return;
      }
      try {
        const data = await api.get<{ user: User }>('/auth/me');
        if (mounted) setUser(data.user);
      } catch {
        if (mounted) {
          setUser(null);
          clearTokens();
        }
      } finally {
        if (mounted) setIsLoading(false);
      }
    };
    void checkSession();
    return () => {
      mounted = false;
    };
  }, []);

  const login = useCallback(async (credentials: LoginCredentials) => {
    setIsLoading(true);
    setError(null);
    try {
      const payload = {
        email: credentials.email,
        password: credentials.password,
        orgId: credentials.orgId || DEFAULT_ORG_ID,
      };
      const data = await api.post<AuthResponse>('/auth/login', payload);
      setTokens(data.accessToken, data.refreshToken);
      setUser(data.user);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('An unexpected error occurred. Please try again.');
      }
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const register = useCallback(async (credentials: RegisterCredentials) => {
    setIsLoading(true);
    setError(null);
    try {
      // Split name into first/last if individual names not provided
      const firstName = credentials.firstName || credentials.name?.split(' ')[0] || '';
      const lastName = credentials.lastName || credentials.name?.split(' ').slice(1).join(' ') || '';
      const payload = {
        firstName,
        lastName,
        email: credentials.email,
        password: credentials.password,
        orgId: credentials.orgId || DEFAULT_ORG_ID,
      };
      const data = await api.post<AuthResponse>('/auth/register', payload);
      setTokens(data.accessToken, data.refreshToken);
      setUser(data.user);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('An unexpected error occurred. Please try again.');
      }
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    setIsLoading(true);
    try {
      const rt = getRefreshToken();
      if (rt) {
        await api.post('/auth/logout', { refreshToken: rt });
      }
    } catch {
      // Ignore logout errors — clear user state regardless
    } finally {
      clearTokens();
      setUser(null);
      setIsLoading(false);
    }
  }, []);

  return {
    user,
    isAuthenticated: user !== null,
    isLoading,
    error,
    login,
    register,
    logout,
  };
}
