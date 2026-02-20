"use client";

import { useState, useCallback } from "react";
import { apiClient } from "@/lib/api";
import { setAccessToken, clearAccessToken } from "@/lib/auth";
import type { User } from "@/types";

interface AuthState {
  user: User | null;
  isLoading: boolean;
  error: string | null;
}

/**
 * Authentication hook for ConnectIn.
 * Manages login, logout, registration, and user state.
 */
export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    isLoading: false,
    error: null,
  });

  const login = useCallback(
    async (email: string, password: string): Promise<boolean> => {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));
      try {
        const response = await apiClient.post<{
          user: User;
          accessToken: string;
        }>("/auth/login", { email, password });

        if (response.success && response.data) {
          setAccessToken(response.data.accessToken);
          apiClient.setToken(response.data.accessToken);
          setState({ user: response.data.user, isLoading: false, error: null });
          return true;
        }

        setState({
          user: null,
          isLoading: false,
          error: response.error?.message || "Login failed",
        });
        return false;
      } catch {
        setState({
          user: null,
          isLoading: false,
          error: "Network error. Please try again.",
        });
        return false;
      }
    },
    []
  );

  const register = useCallback(
    async (
      displayName: string,
      email: string,
      password: string
    ): Promise<boolean> => {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));
      try {
        const response = await apiClient.post<{ user: User }>(
          "/auth/register",
          { displayName, email, password }
        );

        if (response.success && response.data) {
          setState({
            user: response.data.user,
            isLoading: false,
            error: null,
          });
          return true;
        }

        setState({
          user: null,
          isLoading: false,
          error: response.error?.message || "Registration failed",
        });
        return false;
      } catch {
        setState({
          user: null,
          isLoading: false,
          error: "Network error. Please try again.",
        });
        return false;
      }
    },
    []
  );

  const logout = useCallback(async (): Promise<void> => {
    try {
      await apiClient.post("/auth/logout");
    } finally {
      clearAccessToken();
      apiClient.setToken(null);
      setState({ user: null, isLoading: false, error: null });
    }
  }, []);

  return {
    ...state,
    login,
    register,
    logout,
    isAuthenticated: state.user !== null,
  };
}
