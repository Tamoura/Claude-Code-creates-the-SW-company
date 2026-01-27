'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';
import {
  User,
  AuthState,
  LoginCredentials,
  RegisterData,
  AuthResponse,
} from '@/types/auth';
import { apiClient } from '@/lib/api-client';

interface AuthContextType extends AuthState {
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = 'auth_token';
const TOKEN_EXPIRY_DAYS = 7;

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    token: null,
    isAuthenticated: false,
    isLoading: true,
  });

  const router = useRouter();

  // Load user from token on mount
  useEffect(() => {
    const loadUser = async () => {
      const token = Cookies.get(TOKEN_KEY);

      if (!token) {
        setState({
          user: null,
          token: null,
          isAuthenticated: false,
          isLoading: false,
        });
        return;
      }

      try {
        // Fetch current user profile
        const response = await apiClient.get<{ user: User }>('/api/v1/me');

        setState({
          user: response.user,
          token,
          isAuthenticated: true,
          isLoading: false,
        });
      } catch (error) {
        // Token is invalid or expired
        Cookies.remove(TOKEN_KEY);
        setState({
          user: null,
          token: null,
          isAuthenticated: false,
          isLoading: false,
        });
      }
    };

    loadUser();
  }, []);

  const login = async (credentials: LoginCredentials) => {
    try {
      const response = await apiClient.post<AuthResponse>(
        '/api/v1/auth/login',
        credentials
      );

      // Store token in cookie
      Cookies.set(TOKEN_KEY, response.token, {
        expires: TOKEN_EXPIRY_DAYS,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
      });

      setState({
        user: response.user,
        token: response.token,
        isAuthenticated: true,
        isLoading: false,
      });

      // Redirect to dashboard
      router.push('/');
    } catch (error) {
      throw error;
    }
  };

  const register = async (data: RegisterData) => {
    try {
      const response = await apiClient.post<AuthResponse>(
        '/api/v1/auth/register',
        data
      );

      // Store token in cookie
      Cookies.set(TOKEN_KEY, response.token, {
        expires: TOKEN_EXPIRY_DAYS,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
      });

      setState({
        user: response.user,
        token: response.token,
        isAuthenticated: true,
        isLoading: false,
      });

      // Redirect to dashboard
      router.push('/');
    } catch (error) {
      throw error;
    }
  };

  const logout = () => {
    // Remove token from cookie
    Cookies.remove(TOKEN_KEY);

    setState({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
    });

    // Redirect to login
    router.push('/login');
  };

  const refreshUser = async () => {
    const token = Cookies.get(TOKEN_KEY);

    if (!token) {
      return;
    }

    try {
      const response = await apiClient.get<{ user: User }>('/api/v1/me');

      setState((prev) => ({
        ...prev,
        user: response.user,
      }));
    } catch (error) {
      // Token is invalid, logout
      logout();
    }
  };

  return (
    <AuthContext.Provider
      value={{
        ...state,
        login,
        register,
        logout,
        refreshUser,
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
