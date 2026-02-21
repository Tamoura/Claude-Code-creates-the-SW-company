import { renderHook, act } from "@testing-library/react";
import { useAuth } from "../useAuth";

// Mock the API client
const mockPost = jest.fn();
const mockSetToken = jest.fn();
jest.mock("@/lib/api", () => ({
  apiClient: {
    post: (...args: unknown[]) => mockPost(...args),
    setToken: (...args: unknown[]) => mockSetToken(...args),
  },
}));

// Mock auth utilities
const mockSetAccessToken = jest.fn();
const mockClearAccessToken = jest.fn();
const mockGetAccessToken = jest.fn(() => null);
jest.mock("@/lib/auth", () => ({
  setAccessToken: (...args: unknown[]) => mockSetAccessToken(...args),
  clearAccessToken: () => mockClearAccessToken(),
  getAccessToken: () => mockGetAccessToken(),
  // Pass-through in tests: no singleton deduplication needed for unit tests
  getOrStartRefresh: (doRefresh: () => Promise<unknown>) => doRefresh(),
}));

const mockUser = {
  id: "user-1",
  email: "test@example.com",
  displayName: "Test User",
  role: "user" as const,
  emailVerified: true,
  languagePreference: "en" as const,
  status: "active" as const,
  createdAt: "2026-01-01T00:00:00Z",
};

describe("useAuth", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Clear the session flag cookie so the auto-refresh useEffect doesn't
    // interfere between tests (JSDOM persists document.cookie).
    document.cookie = "session=; max-age=0; path=/";
  });

  describe("initial state", () => {
    it("starts with null user", () => {
      const { result } = renderHook(() => useAuth());
      expect(result.current.user).toBeNull();
    });

    it("starts with isLoading false", () => {
      const { result } = renderHook(() => useAuth());
      expect(result.current.isLoading).toBe(false);
    });

    it("starts with null error", () => {
      const { result } = renderHook(() => useAuth());
      expect(result.current.error).toBeNull();
    });

    it("starts as not authenticated", () => {
      const { result } = renderHook(() => useAuth());
      expect(result.current.isAuthenticated).toBe(false);
    });

    it("exposes login, register, and logout functions", () => {
      const { result } = renderHook(() => useAuth());
      expect(typeof result.current.login).toBe("function");
      expect(typeof result.current.register).toBe("function");
      expect(typeof result.current.logout).toBe("function");
    });

    it("resolves isInitializing to false quickly when no session cookie", async () => {
      // JSDOM does not set session=1, so the effect immediately sets isInitializing=false
      const { result } = renderHook(() => useAuth());
      await act(async () => {
        // Let useEffect flush
        await Promise.resolve();
      });
      expect(result.current.isInitializing).toBe(false);
    });
  });

  describe("login", () => {
    it("returns true and sets user on successful login", async () => {
      mockPost.mockResolvedValueOnce({
        success: true,
        data: { user: mockUser, accessToken: "token-abc" },
      });

      const { result } = renderHook(() => useAuth());
      let success: boolean;

      await act(async () => {
        success = await result.current.login("test@example.com", "Password1!");
      });

      expect(success!).toBe(true);
      expect(result.current.user).toEqual(mockUser);
      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it("stores the access token on successful login", async () => {
      mockPost.mockResolvedValueOnce({
        success: true,
        data: { user: mockUser, accessToken: "token-abc" },
      });

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.login("test@example.com", "Password1!");
      });

      expect(mockSetAccessToken).toHaveBeenCalledWith("token-abc");
      expect(mockSetToken).toHaveBeenCalledWith("token-abc");
    });

    it("calls the correct API endpoint with credentials", async () => {
      mockPost.mockResolvedValueOnce({
        success: true,
        data: { user: mockUser, accessToken: "token-abc" },
      });

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.login("test@example.com", "Password1!");
      });

      expect(mockPost).toHaveBeenCalledWith("/auth/login", {
        email: "test@example.com",
        password: "Password1!",
      });
    });

    it("returns false and sets error when API returns failure", async () => {
      mockPost.mockResolvedValueOnce({
        success: false,
        error: { code: "INVALID_CREDENTIALS", message: "Invalid email or password" },
      });

      const { result } = renderHook(() => useAuth());
      let success: boolean;

      await act(async () => {
        success = await result.current.login("test@example.com", "wrongpass");
      });

      expect(success!).toBe(false);
      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.error).toBe("Invalid email or password");
    });

    it("uses fallback error message when API error has no message", async () => {
      mockPost.mockResolvedValueOnce({
        success: false,
        error: {},
      });

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.login("test@example.com", "wrongpass");
      });

      expect(result.current.error).toBe("Login failed");
    });

    it("returns false and sets network error message on thrown exception", async () => {
      mockPost.mockRejectedValueOnce(new Error("fetch failed"));

      const { result } = renderHook(() => useAuth());
      let success: boolean;

      await act(async () => {
        success = await result.current.login("test@example.com", "Password1!");
      });

      expect(success!).toBe(false);
      expect(result.current.error).toBe("Network error. Please try again.");
      expect(result.current.isLoading).toBe(false);
    });

    it("sets isLoading to true during the request", async () => {
      let resolvePost!: (value: unknown) => void;
      const postPromise = new Promise((resolve) => {
        resolvePost = resolve;
      });
      mockPost.mockReturnValueOnce(postPromise);

      const { result } = renderHook(() => useAuth());

      act(() => {
        result.current.login("test@example.com", "Password1!");
      });

      expect(result.current.isLoading).toBe(true);

      await act(async () => {
        resolvePost({
          success: true,
          data: { user: mockUser, accessToken: "token-abc" },
        });
        await postPromise;
      });

      expect(result.current.isLoading).toBe(false);
    });
  });

  describe("register", () => {
    it("returns true and sets user on successful registration", async () => {
      mockPost.mockResolvedValueOnce({
        success: true,
        data: { user: mockUser },
      });

      const { result } = renderHook(() => useAuth());
      let success: boolean;

      await act(async () => {
        success = await result.current.register(
          "Test User",
          "test@example.com",
          "Password1!"
        );
      });

      expect(success!).toBe(true);
      expect(result.current.user).toEqual(mockUser);
      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.error).toBeNull();
    });

    it("calls the correct API endpoint with registration data", async () => {
      mockPost.mockResolvedValueOnce({
        success: true,
        data: { user: mockUser },
      });

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.register(
          "Test User",
          "test@example.com",
          "Password1!"
        );
      });

      expect(mockPost).toHaveBeenCalledWith("/auth/register", {
        displayName: "Test User",
        email: "test@example.com",
        password: "Password1!",
      });
    });

    it("returns false and sets error when API returns failure", async () => {
      mockPost.mockResolvedValueOnce({
        success: false,
        error: { code: "EMAIL_TAKEN", message: "Email already in use" },
      });

      const { result } = renderHook(() => useAuth());
      let success: boolean;

      await act(async () => {
        success = await result.current.register(
          "Test User",
          "taken@example.com",
          "Password1!"
        );
      });

      expect(success!).toBe(false);
      expect(result.current.user).toBeNull();
      expect(result.current.error).toBe("Email already in use");
    });

    it("uses fallback error message when API error has no message", async () => {
      mockPost.mockResolvedValueOnce({
        success: false,
        error: {},
      });

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.register("Test User", "test@example.com", "Password1!");
      });

      expect(result.current.error).toBe("Registration failed");
    });

    it("returns false and sets network error on thrown exception", async () => {
      mockPost.mockRejectedValueOnce(new Error("Network down"));

      const { result } = renderHook(() => useAuth());
      let success: boolean;

      await act(async () => {
        success = await result.current.register(
          "Test User",
          "test@example.com",
          "Password1!"
        );
      });

      expect(success!).toBe(false);
      expect(result.current.error).toBe("Network error. Please try again.");
    });
  });

  describe("logout", () => {
    it("clears user and token on successful logout", async () => {
      // First log in
      mockPost.mockResolvedValueOnce({
        success: true,
        data: { user: mockUser, accessToken: "token-abc" },
      });

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.login("test@example.com", "Password1!");
      });

      expect(result.current.user).toEqual(mockUser);

      // Now log out
      mockPost.mockResolvedValueOnce({ success: true });

      await act(async () => {
        await result.current.logout();
      });

      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
      expect(mockClearAccessToken).toHaveBeenCalled();
      expect(mockSetToken).toHaveBeenCalledWith(null);
    });

    it("calls the logout API endpoint", async () => {
      mockPost.mockResolvedValueOnce({ success: true });

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.logout();
      });

      expect(mockPost).toHaveBeenCalledWith("/auth/logout");
    });

    it("clears user even when logout API call fails", async () => {
      // First log in
      mockPost.mockResolvedValueOnce({
        success: true,
        data: { user: mockUser, accessToken: "token-abc" },
      });

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.login("test@example.com", "Password1!");
      });

      // Logout API rejects — the finally block still runs, so user is cleared.
      // The error propagates out of logout(), so we must catch it.
      mockPost.mockRejectedValueOnce(new Error("Server error"));

      await act(async () => {
        try {
          await result.current.logout();
        } catch {
          // expected — logout rethrows when the API call rejects
        }
      });

      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
      expect(mockClearAccessToken).toHaveBeenCalled();
    });
  });
});
