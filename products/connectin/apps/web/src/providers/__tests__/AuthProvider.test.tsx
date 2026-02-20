import React from "react";
import { render, screen, act, waitFor } from "@testing-library/react";
import { renderHook } from "@testing-library/react";
import type { User } from "@/types";

// ---------------------------------------------------------------------------
// Mock the useAuth hook so AuthProvider tests are isolated from the hook's
// network calls and internal state machine.  The hook is tested separately.
// ---------------------------------------------------------------------------
const mockLogin = jest.fn();
const mockLogout = jest.fn();
const mockRegister = jest.fn();

const defaultAuthState: {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
  login: jest.Mock;
  logout: jest.Mock;
  register: jest.Mock;
} = {
  user: null,
  isLoading: false,
  isAuthenticated: false,
  error: null,
  login: mockLogin,
  logout: mockLogout,
  register: mockRegister,
};

// Track the mutable auth state so individual tests can override it.
let currentAuthState: typeof defaultAuthState = { ...defaultAuthState };

jest.mock("@/hooks/useAuth", () => ({
  useAuth: () => currentAuthState,
}));

import { AuthProvider, useAuthContext } from "../AuthProvider";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const TEST_USER: User = {
  id: "user-1",
  email: "test@example.com",
  displayName: "Test User",
  role: "user",
  emailVerified: true,
  languagePreference: "en",
  status: "active",
  createdAt: "2024-01-01T00:00:00Z",
};

function TestConsumer() {
  const ctx = useAuthContext();
  return (
    <div>
      <span data-testid="user">{ctx.user?.email ?? "null"}</span>
      <span data-testid="isAuthenticated">{String(ctx.isAuthenticated)}</span>
      <span data-testid="isLoading">{String(ctx.isLoading)}</span>
      <span data-testid="error">{ctx.error ?? "null"}</span>
      <button onClick={() => ctx.login("a@b.com", "pw")}>login</button>
      <button onClick={() => ctx.logout()}>logout</button>
      <button onClick={() => ctx.register("Name", "a@b.com", "pw")}>
        register
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("AuthProvider", () => {
  beforeEach(() => {
    currentAuthState = { ...defaultAuthState };
    jest.clearAllMocks();
  });

  describe("context value propagation", () => {
    it("provides null user when unauthenticated", () => {
      render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      );

      expect(screen.getByTestId("user").textContent).toBe("null");
      expect(screen.getByTestId("isAuthenticated").textContent).toBe("false");
    });

    it("provides authenticated user when logged in", () => {
      currentAuthState = {
        ...defaultAuthState,
        user: TEST_USER,
        isAuthenticated: true,
      };

      render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      );

      expect(screen.getByTestId("user").textContent).toBe("test@example.com");
      expect(screen.getByTestId("isAuthenticated").textContent).toBe("true");
    });

    it("propagates isLoading state", () => {
      currentAuthState = { ...defaultAuthState, isLoading: true };

      render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      );

      expect(screen.getByTestId("isLoading").textContent).toBe("true");
    });

    it("propagates error state", () => {
      currentAuthState = {
        ...defaultAuthState,
        error: "Invalid credentials",
      };

      render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      );

      expect(screen.getByTestId("error").textContent).toBe(
        "Invalid credentials"
      );
    });

    it("renders children", () => {
      render(
        <AuthProvider>
          <p>child content</p>
        </AuthProvider>
      );

      expect(screen.getByText("child content")).toBeInTheDocument();
    });
  });

  describe("login", () => {
    it("calls login with correct arguments", async () => {
      mockLogin.mockResolvedValue(true);

      render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      );

      await act(async () => {
        screen.getByText("login").click();
      });

      expect(mockLogin).toHaveBeenCalledWith("a@b.com", "pw");
    });

    it("returns true on successful login", async () => {
      mockLogin.mockResolvedValue(true);

      const { result } = renderHook(() => useAuthContext(), {
        wrapper: ({ children }) => <AuthProvider>{children}</AuthProvider>,
      });

      let returnValue: boolean | undefined;
      await act(async () => {
        returnValue = await result.current.login("a@b.com", "pw");
      });

      expect(returnValue).toBe(true);
    });

    it("returns false on failed login", async () => {
      mockLogin.mockResolvedValue(false);

      const { result } = renderHook(() => useAuthContext(), {
        wrapper: ({ children }) => <AuthProvider>{children}</AuthProvider>,
      });

      let returnValue: boolean | undefined;
      await act(async () => {
        returnValue = await result.current.login("bad@email.com", "wrong");
      });

      expect(returnValue).toBe(false);
    });
  });

  describe("register", () => {
    it("calls register with correct arguments", async () => {
      mockRegister.mockResolvedValue(true);

      render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      );

      await act(async () => {
        screen.getByText("register").click();
      });

      expect(mockRegister).toHaveBeenCalledWith("Name", "a@b.com", "pw");
    });

    it("returns true on successful registration", async () => {
      mockRegister.mockResolvedValue(true);

      const { result } = renderHook(() => useAuthContext(), {
        wrapper: ({ children }) => <AuthProvider>{children}</AuthProvider>,
      });

      let returnValue: boolean | undefined;
      await act(async () => {
        returnValue = await result.current.register(
          "New User",
          "new@example.com",
          "Secure123!"
        );
      });

      expect(returnValue).toBe(true);
    });

    it("returns false on failed registration", async () => {
      mockRegister.mockResolvedValue(false);

      const { result } = renderHook(() => useAuthContext(), {
        wrapper: ({ children }) => <AuthProvider>{children}</AuthProvider>,
      });

      let returnValue: boolean | undefined;
      await act(async () => {
        returnValue = await result.current.register(
          "New User",
          "taken@example.com",
          "Secure123!"
        );
      });

      expect(returnValue).toBe(false);
    });
  });

  describe("logout", () => {
    it("calls logout", async () => {
      mockLogout.mockResolvedValue(undefined);

      render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      );

      await act(async () => {
        screen.getByText("logout").click();
      });

      expect(mockLogout).toHaveBeenCalledTimes(1);
    });
  });

  describe("useAuthContext hook", () => {
    it("throws when used outside AuthProvider", () => {
      // Suppress the expected React error output in test logs
      const consoleError = jest
        .spyOn(console, "error")
        .mockImplementation(() => {});

      expect(() => {
        renderHook(() => useAuthContext());
      }).toThrow("useAuthContext must be used within an AuthProvider");

      consoleError.mockRestore();
    });

    it("returns the full auth context when used inside AuthProvider", () => {
      currentAuthState = {
        ...defaultAuthState,
        user: TEST_USER,
        isAuthenticated: true,
      };

      const { result } = renderHook(() => useAuthContext(), {
        wrapper: ({ children }) => <AuthProvider>{children}</AuthProvider>,
      });

      expect(result.current.user).toEqual(TEST_USER);
      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(typeof result.current.login).toBe("function");
      expect(typeof result.current.logout).toBe("function");
      expect(typeof result.current.register).toBe("function");
    });

    it("reflects state updates when auth state changes", async () => {
      // Start unauthenticated
      currentAuthState = { ...defaultAuthState };

      const { result, rerender } = renderHook(() => useAuthContext(), {
        wrapper: ({ children }) => <AuthProvider>{children}</AuthProvider>,
      });

      expect(result.current.isAuthenticated).toBe(false);

      // Simulate state update (the hook would update the context value)
      currentAuthState = {
        ...defaultAuthState,
        user: TEST_USER,
        isAuthenticated: true,
      };

      rerender();

      await waitFor(() => {
        expect(result.current.isAuthenticated).toBe(true);
      });
    });
  });
});
