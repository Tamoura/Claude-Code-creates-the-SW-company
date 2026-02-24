import { renderHook, waitFor } from "@testing-library/react";
import { useProfileViews } from "../useProfileViews";
import { apiClient } from "@/lib/api";

jest.mock("@/lib/api", () => ({
  apiClient: { get: jest.fn() },
}));

const mockViewers = [
  {
    id: "v1",
    viewerId: "u2",
    viewerName: "Alice",
    viewerAvatar: "https://img/a.jpg",
    viewerHeadline: "Designer",
    viewedAt: "2026-02-20T10:00:00Z",
  },
  {
    id: "v2",
    viewerId: "u3",
    viewerName: "Bob",
    viewerHeadline: "Manager",
    viewedAt: "2026-02-19T10:00:00Z",
  },
];

describe("useProfileViews", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("fetches viewers on mount", async () => {
    (apiClient.get as jest.Mock).mockImplementation((url: string) => {
      if (url.includes("count")) {
        return Promise.resolve({ success: true, data: { count: 2 } });
      }
      return Promise.resolve({ success: true, data: mockViewers });
    });
    const { result } = renderHook(() => useProfileViews());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.viewers).toHaveLength(2);
  });

  it("fetches view count", async () => {
    (apiClient.get as jest.Mock).mockImplementation((url: string) => {
      if (url.includes("count")) {
        return Promise.resolve({ success: true, data: { count: 42 } });
      }
      return Promise.resolve({ success: true, data: mockViewers });
    });
    const { result } = renderHook(() => useProfileViews());
    await waitFor(() => expect(result.current.count).toBe(42));
  });

  it("handles empty viewers", async () => {
    (apiClient.get as jest.Mock).mockImplementation((url: string) => {
      if (url.includes("count")) {
        return Promise.resolve({ success: true, data: { count: 0 } });
      }
      return Promise.resolve({ success: true, data: [] });
    });
    const { result } = renderHook(() => useProfileViews());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.viewers).toEqual([]);
    expect(result.current.count).toBe(0);
  });

  it("sets loading state", () => {
    (apiClient.get as jest.Mock).mockImplementation(() => new Promise(() => {}));
    const { result } = renderHook(() => useProfileViews());
    expect(result.current.isLoading).toBe(true);
  });

  it("handles error", async () => {
    (apiClient.get as jest.Mock).mockRejectedValue(new Error("Network error"));
    const { result } = renderHook(() => useProfileViews());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error).toBeTruthy();
  });

  it("calls correct API endpoints", async () => {
    (apiClient.get as jest.Mock).mockResolvedValue({ success: true, data: [] });
    renderHook(() => useProfileViews());
    await waitFor(() =>
      expect(apiClient.get).toHaveBeenCalledWith("/profiles/me/views")
    );
    expect(apiClient.get).toHaveBeenCalledWith("/profiles/me/views/count");
  });
});
