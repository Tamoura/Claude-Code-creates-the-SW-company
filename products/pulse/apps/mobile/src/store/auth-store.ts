import { create } from 'zustand';
import {
  getToken,
  setToken,
  deleteToken,
  getUserData,
  setUserData,
  clearAll,
} from '../lib/secure-store';
import { login as apiLogin, register as apiRegister } from '../lib/api-client';
import type { User, LoginPayload, RegisterPayload } from '../types';

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;

  initialize: () => Promise<void>;
  login: (payload: LoginPayload) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isLoading: true,
  isAuthenticated: false,
  error: null,

  initialize: async () => {
    try {
      const storedToken = await getToken();
      const storedUser = await getUserData();
      if (storedToken && storedUser) {
        const user = JSON.parse(storedUser) as User;
        set({
          token: storedToken,
          user,
          isAuthenticated: true,
          isLoading: false,
        });
      } else {
        set({ isLoading: false });
      }
    } catch {
      set({ isLoading: false });
    }
  },

  login: async (payload: LoginPayload) => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiLogin(payload);
      await setToken(response.token);
      await setUserData(JSON.stringify(response.user));
      set({
        token: response.token,
        user: response.user,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Login failed. Please try again.';
      set({ error: message, isLoading: false });
      throw error;
    }
  },

  register: async (payload: RegisterPayload) => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiRegister(payload);
      await setToken(response.token);
      await setUserData(JSON.stringify(response.user));
      set({
        token: response.token,
        user: response.user,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Registration failed. Please try again.';
      set({ error: message, isLoading: false });
      throw error;
    }
  },

  logout: async () => {
    await clearAll();
    set({
      user: null,
      token: null,
      isAuthenticated: false,
      error: null,
    });
  },

  clearError: () => {
    set({ error: null });
  },
}));
