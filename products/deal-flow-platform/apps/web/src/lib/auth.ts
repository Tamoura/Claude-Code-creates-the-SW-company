'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from 'react';
import { apiClient } from './api-client';
import {
  User,
  AuthState,
  LoginCredentials,
  RegisterData,
  AuthTokens,
} from '@/types';

interface AuthContextType extends AuthState {
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  refreshAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // Try to restore session on mount
    refreshAuth();
  }, []);

  const login = async (credentials: LoginCredentials) => {
    try {
      const response = await apiClient.post<AuthTokens>('/auth/login', credentials);
      const { accessToken: token } = response.data;

      setAccessToken(token);
      apiClient.setAccessToken(token);

      // Fetch user profile
      await fetchUserProfile();
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  };

  const register = async (data: RegisterData) => {
    try {
      const response = await apiClient.post<AuthTokens>('/auth/register', data);
      const { accessToken: token } = response.data;

      setAccessToken(token);
      apiClient.setAccessToken(token);

      // Fetch user profile
      await fetchUserProfile();
    } catch (error) {
      console.error('Registration failed:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await apiClient.post('/auth/logout');
    } catch (error) {
      console.error('Logout failed:', error);
    } finally {
      setUser(null);
      setAccessToken(null);
      setIsAuthenticated(false);
      apiClient.setAccessToken(null);
    }
  };

  const refreshAuth = async () => {
    try {
      const response = await apiClient.post<AuthTokens>('/auth/refresh');
      const { accessToken: token } = response.data;

      setAccessToken(token);
      apiClient.setAccessToken(token);

      await fetchUserProfile();
    } catch (error) {
      // Silent fail - user is not authenticated
      setUser(null);
      setAccessToken(null);
      setIsAuthenticated(false);
    }
  };

  const fetchUserProfile = async () => {
    try {
      const response = await apiClient.get<User>('/auth/me');
      setUser(response.data);
      setIsAuthenticated(true);
    } catch (error) {
      console.error('Failed to fetch user profile:', error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        accessToken,
        isAuthenticated,
        login,
        register,
        logout,
        refreshAuth,
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
