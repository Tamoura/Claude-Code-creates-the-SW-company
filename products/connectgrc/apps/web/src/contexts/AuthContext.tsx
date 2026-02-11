/**
 * AuthContext - Global authentication state management
 *
 * Provides user authentication state, login/logout/register methods,
 * and automatic token refresh on app load. Handles redirects for
 * protected routes.
 */

'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { apiClient, type User } from '../lib/api-client';
import { TokenManager } from '../lib/token-manager';

interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string, role: 'TALENT' | 'EMPLOYER') => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const REFRESH_TOKEN_KEY = 'grc_refresh_token';

// Public routes that don't require authentication
const PUBLIC_ROUTES = ['/', '/login', '/register', '/forgot-password', '/reset-password', '/verify-email'];

// Auth routes that authenticated users shouldn't access
const AUTH_ROUTES = ['/login', '/register', '/forgot-password', '/reset-password'];

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  const isAuthenticated = !!user;

  // Try to restore session on mount
  useEffect(() => {
    const restoreSession = async () => {
      try {
        const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);

        if (refreshToken) {
          // Try to refresh the access token
          const response = await apiClient.refreshToken(refreshToken);
          localStorage.setItem(REFRESH_TOKEN_KEY, response.refreshToken);

          // Fetch user profile
          const profileResponse = await apiClient.getProfile();
          if (profileResponse.profile) {
            // User is authenticated, but we need the full user object
            // The profile endpoint might not return the full user, so we'll construct it
            // In a real scenario, you might have a /me endpoint
            const currentUser: User = {
              id: profileResponse.profile.userId,
              email: '', // Would come from a /me endpoint
              name: '', // Would come from a /me endpoint
              role: 'TALENT', // Would come from a /me endpoint
              emailVerified: true,
            };
            setUser(currentUser);
          }
        }
      } catch (err) {
        // Session restoration failed, clear tokens
        localStorage.removeItem(REFRESH_TOKEN_KEY);
        TokenManager.clearToken();
      } finally {
        setIsLoading(false);
      }
    };

    restoreSession();
  }, []);

  // Handle route protection
  useEffect(() => {
    if (isLoading) return;

    const isPublicRoute = PUBLIC_ROUTES.includes(pathname);
    const isAuthRoute = AUTH_ROUTES.includes(pathname);

    if (!isAuthenticated && !isPublicRoute) {
      // Redirect to login if trying to access protected route
      router.push('/login');
    } else if (isAuthenticated && isAuthRoute) {
      // Redirect to dashboard if already authenticated and on auth page
      router.push('/dashboard');
    }
  }, [isAuthenticated, isLoading, pathname, router]);

  const login = useCallback(async (email: string, password: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await apiClient.login(email, password);

      // Store refresh token in localStorage
      localStorage.setItem(REFRESH_TOKEN_KEY, response.refreshToken);

      // Access token is already stored in TokenManager by apiClient.login
      setUser(response.user);

      // Redirect to dashboard
      router.push('/dashboard');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Login failed';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  const register = useCallback(async (
    name: string,
    email: string,
    password: string,
    role: 'TALENT' | 'EMPLOYER'
  ) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await apiClient.register(name, email, password, role);

      // Registration successful, but user needs to verify email
      // Don't log them in automatically
      setUser(null);

      // Show success message (handled by the register page)
      return;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Registration failed';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    setIsLoading(true);

    try {
      await apiClient.logout();
    } catch (err) {
      // Even if logout fails on the server, clear local state
      console.error('Logout error:', err);
    } finally {
      localStorage.removeItem(REFRESH_TOKEN_KEY);
      TokenManager.clearToken();
      setUser(null);
      setIsLoading(false);
      router.push('/login');
    }
  }, [router]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isLoading,
        error,
        login,
        register,
        logout,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
