import { renderHook, act, waitFor } from "@testing-library/react";
import { useProfile } from "../useProfile";

// Mock the API client
const mockGet = jest.fn();
jest.mock("@/lib/api", () => ({
  apiClient: {
    get: (...args: unknown[]) => mockGet(...args),
  },
}));

const mockProfile = {
  id: "profile-1",
  userId: "user-1",
  headlineEn: "Software Engineer",
  headlineAr: "مهندس برمجيات",
  summaryEn: "Experienced developer",
  summaryAr: "مطور متمرس",
  avatarUrl: "https://example.com/avatar.jpg",
  location: "Riyadh, Saudi Arabia",
  website: "https://example.com",
  completenessScore: 80,
  experiences: [],
  education: [],
  skills: [],
};

describe("useProfile", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("initial state", () => {
    it("starts with null profile", async () => {
      mockGet.mockResolvedValueOnce({ success: true, data: mockProfile });

      const { result } = renderHook(() => useProfile());
      // Before the fetch resolves, profile should be null
      expect(result.current.profile).toBeNull();

      await waitFor(() => expect(result.current.isLoading).toBe(false));
    });

    it("starts with isLoading true while fetching", () => {
      let resolve!: (v: unknown) => void;
      mockGet.mockReturnValueOnce(new Promise((r) => (resolve = r)));

      const { result } = renderHook(() => useProfile());
      expect(result.current.isLoading).toBe(true);

      act(() => {
        resolve({ success: true, data: mockProfile });
      });
    });

    it("exposes a refetch function", async () => {
      mockGet.mockResolvedValue({ success: true, data: mockProfile });

      const { result } = renderHook(() => useProfile());
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(typeof result.current.refetch).toBe("function");
    });
  });

  describe("fetching own profile (no userId)", () => {
    it("calls /profiles/me when no userId is provided", async () => {
      mockGet.mockResolvedValueOnce({ success: true, data: mockProfile });

      const { result } = renderHook(() => useProfile());
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(mockGet).toHaveBeenCalledWith("/profiles/me");
    });

    it("sets profile data on successful fetch", async () => {
      mockGet.mockResolvedValueOnce({ success: true, data: mockProfile });

      const { result } = renderHook(() => useProfile());
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.profile).toEqual(mockProfile);
      expect(result.current.error).toBeNull();
    });

    it("sets isLoading to false after successful fetch", async () => {
      mockGet.mockResolvedValueOnce({ success: true, data: mockProfile });

      const { result } = renderHook(() => useProfile());
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.isLoading).toBe(false);
    });
  });

  describe("fetching another user's profile (with userId)", () => {
    it("calls /profiles/:userId when userId is provided", async () => {
      mockGet.mockResolvedValueOnce({ success: true, data: mockProfile });

      const { result } = renderHook(() => useProfile("user-42"));
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(mockGet).toHaveBeenCalledWith("/profiles/user-42");
    });

    it("sets profile data for the specified user", async () => {
      mockGet.mockResolvedValueOnce({ success: true, data: mockProfile });

      const { result } = renderHook(() => useProfile("user-42"));
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.profile).toEqual(mockProfile);
    });
  });

  describe("error handling", () => {
    it("sets error message when API returns failure", async () => {
      mockGet.mockResolvedValueOnce({
        success: false,
        error: { code: "NOT_FOUND", message: "Profile not found" },
      });

      const { result } = renderHook(() => useProfile());
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.profile).toBeNull();
      expect(result.current.error).toBe("Profile not found");
    });

    it("uses fallback error when API error has no message", async () => {
      mockGet.mockResolvedValueOnce({
        success: false,
        error: {},
      });

      const { result } = renderHook(() => useProfile());
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.error).toBe("Failed to load profile");
    });

    it("sets network error message on thrown exception", async () => {
      mockGet.mockRejectedValueOnce(new Error("fetch failed"));

      const { result } = renderHook(() => useProfile());
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.profile).toBeNull();
      expect(result.current.error).toBe("Network error. Please try again.");
    });

    it("sets isLoading to false after an error", async () => {
      mockGet.mockRejectedValueOnce(new Error("fetch failed"));

      const { result } = renderHook(() => useProfile());
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.isLoading).toBe(false);
    });
  });

  describe("refetch", () => {
    it("re-fetches profile data when refetch is called", async () => {
      mockGet.mockResolvedValue({ success: true, data: mockProfile });

      const { result } = renderHook(() => useProfile());
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(mockGet).toHaveBeenCalledTimes(1);

      await act(async () => {
        await result.current.refetch();
      });

      expect(mockGet).toHaveBeenCalledTimes(2);
    });

    it("clears previous error when refetch succeeds", async () => {
      // First call fails
      mockGet.mockResolvedValueOnce({
        success: false,
        error: { code: "ERROR", message: "Server error" },
      });

      const { result } = renderHook(() => useProfile());
      await waitFor(() => expect(result.current.error).toBe("Server error"));

      // Second call succeeds
      mockGet.mockResolvedValueOnce({ success: true, data: mockProfile });

      await act(async () => {
        await result.current.refetch();
      });

      expect(result.current.error).toBeNull();
      expect(result.current.profile).toEqual(mockProfile);
    });
  });

  describe("userId change", () => {
    it("re-fetches when userId prop changes", async () => {
      mockGet.mockResolvedValue({ success: true, data: mockProfile });

      const { result, rerender } = renderHook(
        ({ userId }: { userId?: string }) => useProfile(userId),
        { initialProps: { userId: "user-1" } }
      );

      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(mockGet).toHaveBeenCalledWith("/profiles/user-1");

      rerender({ userId: "user-2" });

      await waitFor(() => expect(mockGet).toHaveBeenCalledWith("/profiles/user-2"));
    });
  });
});
