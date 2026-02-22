"use client";

import { useState, useCallback, useEffect } from "react";
import { apiClient } from "@/lib/api";
import {
  setAccessToken,
  clearAccessToken,
  getAccessToken,
  getOrStartRefresh,
} from "@/lib/auth";
import type { User } from "@/types";

interface AuthState {
  user: User | null;
  isLoading: boolean;
  error: string | null;
}

/**
 * Authentication hook for ConnectIn.
 * Manages login, logout, registration, and user state.
 *
 * On mount, if a "session=1" flag cookie is present but there is no
 * access token in memory (e.g. after a page reload or when Playwright
 * loads saved storageState), the hook calls POST /auth/refresh to
 * restore a valid access token before the rest of the app renders.
 * `isInitializing` is true while this check is in-flight; the
 * AuthGate component uses it to defer page content rendering.
 */
export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    isLoading: false,
    error: null,
  });

  // Start as "initializing" unconditionally; the useEffect below will
  // immediately set it to false when no token-restore is needed.
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    const hasSession =
      typeof document !== "undefined" &&
      document.cookie.includes("session=1");

    // If no session cookie, or if we already have a token in memory
    // (fresh login in the same JS session), skip the refresh call.
    if (!hasSession || getAccessToken() !== null) {
      setIsInitializing(false);
      return;
    }

    let cancelled = false;

    // getOrStartRefresh deduplicates concurrent calls — React Strict Mode
    // fires this effect twice (mount → cleanup → mount). Without the
    // singleton the first call rotates the refresh token, making the second
    // call fail. With the singleton both mounts share one HTTP request.
    getOrStartRefresh(() =>
      // Pass an empty object so the API doesn't reject the request
      // with "Body cannot be empty when content-type is application/json"
      apiClient.post<{ user: User; accessToken: string }>("/auth/refresh", {})
    )
      .then((response) => {
        if (cancelled) return;
        if (response.success && response.data) {
          setAccessToken(response.data.accessToken);
          apiClient.setToken(response.data.accessToken);
          setState({ user: response.data.user, isLoading: false, error: null });
        } else {
          // Refresh failed — clear stale session cookie so middleware
          // redirects to login on the next protected-route navigation.
          document.cookie = "session=; path=/; max-age=0; SameSite=Strict";
        }
      })
      .catch(() => {
        if (cancelled) return;
        document.cookie = "session=; path=/; max-age=0; SameSite=Strict";
      })
      .finally(() => {
        if (cancelled) return;
        setIsInitializing(false);
      });

    return () => {
      cancelled = true;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
          // Set a lightweight session flag cookie that the Next.js middleware
          // can read (the httpOnly refreshToken is scoped to the API origin)
          document.cookie = "session=1; path=/; SameSite=Strict";
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
          document.cookie = "session=1; path=/; SameSite=Strict";
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
      await apiClient.post("/auth/logout", {});
    } finally {
      clearAccessToken();
      apiClient.setToken(null);
      setState({ user: null, isLoading: false, error: null });
      // Clear session flag cookie
      document.cookie = "session=; path=/; max-age=0; SameSite=Strict";
    }
  }, []);

  return {
    ...state,
    login,
    register,
    logout,
    isAuthenticated: state.user !== null,
    isInitializing,
  };
}
