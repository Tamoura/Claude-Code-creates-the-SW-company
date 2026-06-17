'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { useRouter } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import type { Student } from '@/lib/types';

interface AuthState {
  student: Student | null;
  status: 'loading' | 'authenticated' | 'unauthenticated';
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
  setStudent: (s: Student) => void;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [student, setStudent] = useState<Student | null>(null);
  const [status, setStatus] = useState<AuthState['status']>('loading');

  const refresh = useCallback(async () => {
    try {
      const { student } = await api.auth.me();
      setStudent(student);
      setStatus('authenticated');
    } catch (err) {
      if (err instanceof ApiError && err.isUnauthorized) {
        setStudent(null);
        setStatus('unauthenticated');
      } else {
        // Network error — treat as unauthenticated but keep the message surfaced
        // by callers that need it; the guard will redirect to /login.
        setStudent(null);
        setStatus('unauthenticated');
      }
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.auth.logout();
    } finally {
      setStudent(null);
      setStatus('unauthenticated');
      router.push('/login');
    }
  }, [router]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return (
    <AuthContext.Provider
      value={{ student, status, refresh, logout, setStudent }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an <AuthProvider>');
  }
  return ctx;
}
