import { renderHook, act, waitFor } from "@testing-library/react";
import { useBookmarks } from "../useBookmarks";
import { apiClient } from "@/lib/api";

jest.mock("@/lib/api", () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
    delete: jest.fn(),
  },
}));

const mockBookmarks = [
  {
    id: "b1",
    userId: "u1",
    targetId: "post-1",
    targetType: "post",
    createdAt: "2026-01-01T00:00:00Z",
    target: {
      id: "post-1",
      content: "Test post",
      author: { userId: "u2", displayName: "Author" },
      textDirection: "ltr",
      createdAt: "2026-01-01",
      likeCount: 0,
      commentCount: 0,
      shareCount: 0,
      isLikedByMe: false,
    },
  },
  {
    id: "b2",
    userId: "u1",
    targetId: "job-1",
    targetType: "job",
    createdAt: "2026-01-02T00:00:00Z",
    target: {
      id: "job-1",
      title: "Dev Job",
      company: "Acme",
      workType: "REMOTE",
      experienceLevel: "MID",
      description: "Desc",
      language: "en",
      status: "OPEN",
      applicantCount: 5,
      createdAt: "2026-01-01",
    },
  },
];

describe("useBookmarks", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("fetches bookmarks on mount", async () => {
    (apiClient.get as jest.Mock).mockResolvedValue({ success: true, data: mockBookmarks });
    const { result } = renderHook(() => useBookmarks());
    expect(result.current.isLoading).toBe(true);
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.bookmarks).toHaveLength(2);
    expect(apiClient.get).toHaveBeenCalledWith("/bookmarks", expect.anything());
  });

  it("filters by type", async () => {
    (apiClient.get as jest.Mock).mockResolvedValue({ success: true, data: mockBookmarks });
    const { result } = renderHook(() => useBookmarks());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.filteredBookmarks("post")).toHaveLength(1);
    expect(result.current.filteredBookmarks("job")).toHaveLength(1);
    expect(result.current.filteredBookmarks("all")).toHaveLength(2);
  });

  it("adds a bookmark optimistically", async () => {
    (apiClient.get as jest.Mock).mockResolvedValue({ success: true, data: [] });
    (apiClient.post as jest.Mock).mockResolvedValue({ success: true, data: mockBookmarks[0] });
    const { result } = renderHook(() => useBookmarks());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    await act(async () => {
      await result.current.addBookmark("post-1", "post");
    });
    expect(apiClient.post).toHaveBeenCalledWith("/bookmarks", { targetId: "post-1", targetType: "post" });
  });

  it("removes a bookmark optimistically", async () => {
    (apiClient.get as jest.Mock).mockResolvedValue({ success: true, data: mockBookmarks });
    (apiClient.delete as jest.Mock).mockResolvedValue({ success: true });
    const { result } = renderHook(() => useBookmarks());
    await waitFor(() => expect(result.current.bookmarks).toHaveLength(2));
    await act(async () => {
      await result.current.removeBookmark("b1");
    });
    expect(apiClient.delete).toHaveBeenCalledWith("/bookmarks/b1");
  });

  it("reverts add on failure", async () => {
    (apiClient.get as jest.Mock).mockResolvedValue({ success: true, data: [] });
    (apiClient.post as jest.Mock).mockResolvedValue({ success: false, error: { code: "ERR", message: "fail" } });
    const { result } = renderHook(() => useBookmarks());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    await act(async () => {
      await result.current.addBookmark("post-1", "post");
    });
    expect(result.current.bookmarks).toHaveLength(0);
  });

  it("reverts remove on failure", async () => {
    (apiClient.get as jest.Mock).mockResolvedValue({ success: true, data: mockBookmarks });
    (apiClient.delete as jest.Mock).mockResolvedValue({ success: false });
    const { result } = renderHook(() => useBookmarks());
    await waitFor(() => expect(result.current.bookmarks).toHaveLength(2));
    await act(async () => {
      await result.current.removeBookmark("b1");
    });
    expect(result.current.bookmarks).toHaveLength(2);
  });

  it("handles network error on fetch", async () => {
    (apiClient.get as jest.Mock).mockRejectedValue(new Error("Network error"));
    const { result } = renderHook(() => useBookmarks());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error).toBeTruthy();
  });

  it("returns empty array initially", () => {
    (apiClient.get as jest.Mock).mockResolvedValue({ success: true, data: [] });
    const { result } = renderHook(() => useBookmarks());
    expect(result.current.bookmarks).toEqual([]);
  });
});
