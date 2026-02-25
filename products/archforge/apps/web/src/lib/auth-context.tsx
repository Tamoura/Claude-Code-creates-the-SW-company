'use client';

// Auth context for ArchForge
// Usage:
//   const { user, login, logout, isAuthenticated } = useAuth();

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import { useRouter } from 'next/navigation';
import { auth, setAccessToken, type User } from '@/lib/api';

// ─── Types ────────────────────────────────────────────────────────────────────

interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, fullName: string) => Promise<void>;
  logout: () => Promise<void>;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // On mount: try to restore session via /auth/me (httpOnly cookie may exist)
  useEffect(() => {
    auth
      .me()
      .then((u) => {
        setUser(u);
      })
      .catch(() => {
        // No active session — that's fine
        setUser(null);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      const { accessToken, user: u } = await auth.login({ email, password });
      setAccessToken(accessToken);
      setUser(u);
      router.push('/dashboard');
    },
    [router],
  );

  const register = useCallback(
    async (email: string, password: string, fullName: string) => {
      await auth.register({ email, password, fullName });
      // After registration navigate to login (user must sign in)
      router.push('/login');
    },
    [router],
  );

  const logout = useCallback(async () => {
    try {
      await auth.logout();
    } catch {
      // Ignore logout errors — clear state regardless
    }
    setAccessToken(null);
    setUser(null);
    router.push('/login');
  }, [router]);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used inside <AuthProvider>');
  }
  return ctx;
}
