'use client';

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from 'react';
import { api, ApiError } from '@/lib/api';
import { setToken, clearToken, getToken } from '@/lib/auth';
import type { User } from '@/types/index';

/** Map API user response to frontend User shape */
function mapUser(apiUser: Record<string, unknown>): User {
  const firstName = (apiUser.firstName as string) || '';
  const lastName = (apiUser.lastName as string) || '';
  return {
    id: apiUser.id as string,
    email: apiUser.email as string,
    name: `${firstName} ${lastName}`.trim() || (apiUser.email as string),
    firstName,
    lastName,
    role: ((apiUser.role as string) || 'learner').toLowerCase() as User['role'],
    orgId: apiUser.orgId as string | undefined,
  };
}

interface LoginCredentials {
  email: string;
  password: string;
}

interface RegisterCredentials {
  name: string;
  email: string;
  password: string;
}

interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (credentials: RegisterCredentials) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Check session on mount if token exists
  useEffect(() => {
    let mounted = true;
    const checkSession = async () => {
      const token = getToken();
      if (!token) {
        if (mounted) setIsLoading(false);
        return;
      }
      try {
        const data = await api.get<{ user: Record<string, unknown> }>('/auth/me');
        if (mounted) setUser(mapUser(data.user));
      } catch {
        // Token expired or invalid — clear it
        clearToken();
        if (mounted) setUser(null);
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
      const data = await api.post<{ token: string; user: Record<string, unknown> }>(
        '/auth/login',
        { ...credentials, orgSlug: 'demo-org' },
      );
      setToken(data.token);
      setUser(mapUser(data.user));
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : 'An unexpected error occurred. Please try again.';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const register = useCallback(async (credentials: RegisterCredentials) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await api.post<{ token: string; user: Record<string, unknown> }>(
        '/auth/register',
        {
          email: credentials.email,
          firstName: credentials.name.split(' ')[0] || credentials.name,
          lastName: credentials.name.split(' ').slice(1).join(' ') || '',
          password: credentials.password,
          orgSlug: 'demo-org',
        },
      );
      setToken(data.token);
      setUser(mapUser(data.user));
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : 'An unexpected error occurred. Please try again.';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    clearToken();
    setUser(null);
    setError(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: user !== null,
        isLoading,
        error,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
}
