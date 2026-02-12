'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { api } from '../lib/api-client';

interface User {
  id: string;
  email: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('recomengine_token');
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        if (payload.exp * 1000 > Date.now()) {
          setUser({ id: payload.id, email: payload.email, role: payload.role });
        } else {
          localStorage.removeItem('recomengine_token');
        }
      } catch {
        localStorage.removeItem('recomengine_token');
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    const response = await api.post<{ data: { token: string; user: User } }>(
      '/api/v1/auth/login',
      { email, password }
    );
    localStorage.setItem('recomengine_token', response.data.token);
    setUser(response.data.user);
  };

  const signup = async (email: string, password: string) => {
    const response = await api.post<{ data: { token: string; user: User } }>(
      '/api/v1/auth/signup',
      { email, password }
    );
    localStorage.setItem('recomengine_token', response.data.token);
    setUser(response.data.user);
  };

  const logout = async () => {
    try {
      await api.post('/api/v1/auth/logout', {});
    } catch {}
    localStorage.removeItem('recomengine_token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
