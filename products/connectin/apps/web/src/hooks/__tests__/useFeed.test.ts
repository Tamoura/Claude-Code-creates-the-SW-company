"use client";

import { renderHook, act, waitFor } from "@testing-library/react";
import { useFeed } from "../useFeed";

// Mock the API client
const mockGet = jest.fn();
const mockPost = jest.fn();
const mockDelete = jest.fn();

jest.mock("@/lib/api", () => ({
  apiClient: {
    get: (...args: unknown[]) => mockGet(...args),
    post: (...args: unknown[]) => mockPost(...args),
    delete: (...args: unknown[]) => mockDelete(...args),
  },
}));

const mockPost1 = {
  id: "post-1",
  author: {
    userId: "user-1",
    displayName: "Alice Smith",
    avatarUrl: undefined,
    headline: "Software Engineer",
  },
  content: "Hello world!",
  textDirection: "ltr" as const,
  createdAt: new Date().toISOString(),
  likeCount: 5,
  commentCount: 2,
  shareCount: 0,
  isLikedByMe: false,
};

const mockPost2 = {
  id: "post-2",
  author: {
    userId: "user-2",
    displayName: "Bob Jones",
    avatarUrl: undefined,
    headline: "Product Manager",
  },
  content: "Another post",
  textDirection: "ltr" as const,
  createdAt: new Date().toISOString(),
  likeCount: 0,
  commentCount: 0,
  shareCount: 0,
  isLikedByMe: false,
};

describe("useFeed", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("initial state", () => {
    it("starts with empty posts array", async () => {
      mockGet.mockResolvedValueOnce({
        success: true,
        data: [mockPost1],
        meta: { cursor: null, hasMore: false, count: 1 },
      });

      const { result } = renderHook(() => useFeed());
      expect(result.current.posts).toEqual([]);

      await waitFor(() => expect(result.current.isLoading).toBe(false));
    });

    it("starts with isLoading true while fetching", () => {
      let resolve!: (v: unknown) => void;
      mockGet.mockReturnValueOnce(new Promise((r) => (resolve = r)));

      const { result } = renderHook(() => useFeed());
      expect(result.current.isLoading).toBe(true);

      act(() => {
        resolve({
          success: true,
          data: [],
          meta: { cursor: null, hasMore: false, count: 0 },
        });
      });
    });

    it("starts with hasMore false", async () => {
      mockGet.mockResolvedValueOnce({
        success: true,
        data: [],
        meta: { cursor: null, hasMore: false, count: 0 },
      });

      const { result } = renderHook(() => useFeed());
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.hasMore).toBe(false);
    });

    it("starts with null error", async () => {
      mockGet.mockResolvedValueOnce({
        success: true,
        data: [],
        meta: { cursor: null, hasMore: false, count: 0 },
      });

      const { result } = renderHook(() => useFeed());
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.error).toBeNull();
    });
  });

  describe("fetching feed", () => {
    it("calls /feed on mount", async () => {
      mockGet.mockResolvedValueOnce({
        success: true,
        data: [mockPost1],
        meta: { cursor: "cursor-1", hasMore: true, count: 1 },
      });

      const { result } = renderHook(() => useFeed());
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(mockGet).toHaveBeenCalledWith("/feed", expect.objectContaining({ params: expect.any(Object) }));
    });

    it("sets posts on successful fetch", async () => {
      mockGet.mockResolvedValueOnce({
        success: true,
        data: [mockPost1, mockPost2],
        meta: { cursor: null, hasMore: false, count: 2 },
      });

      const { result } = renderHook(() => useFeed());
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.posts).toHaveLength(2);
      expect(result.current.posts[0].id).toBe("post-1");
    });

    it("sets hasMore from meta response", async () => {
      mockGet.mockResolvedValueOnce({
        success: true,
        data: [mockPost1],
        meta: { cursor: "cursor-1", hasMore: true, count: 1 },
      });

      const { result } = renderHook(() => useFeed());
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.hasMore).toBe(true);
    });

    it("sets error on API failure", async () => {
      mockGet.mockResolvedValueOnce({
        success: false,
        error: { code: "SERVER_ERROR", message: "Something went wrong" },
      });

      const { result } = renderHook(() => useFeed());
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.error).toBe("Something went wrong");
      expect(result.current.posts).toEqual([]);
    });

    it("sets error on network failure", async () => {
      mockGet.mockRejectedValueOnce(new Error("Network down"));

      const { result } = renderHook(() => useFeed());
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.error).toBe("Network error. Please try again.");
    });
  });

  describe("loadMore", () => {
    it("appends posts when loadMore is called", async () => {
      mockGet
        .mockResolvedValueOnce({
          success: true,
          data: [mockPost1],
          meta: { cursor: "cursor-1", hasMore: true, count: 1 },
        })
        .mockResolvedValueOnce({
          success: true,
          data: [mockPost2],
          meta: { cursor: null, hasMore: false, count: 1 },
        });

      const { result } = renderHook(() => useFeed());
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.posts).toHaveLength(1);

      await act(async () => {
        await result.current.loadMore();
      });

      expect(result.current.posts).toHaveLength(2);
      expect(result.current.posts[1].id).toBe("post-2");
    });

    it("does not load more when hasMore is false", async () => {
      mockGet.mockResolvedValueOnce({
        success: true,
        data: [mockPost1],
        meta: { cursor: null, hasMore: false, count: 1 },
      });

      const { result } = renderHook(() => useFeed());
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      await act(async () => {
        await result.current.loadMore();
      });

      // Should only have been called once (initial load)
      expect(mockGet).toHaveBeenCalledTimes(1);
    });

    it("sets isLoadingMore during loadMore", async () => {
      let resolveSecond!: (v: unknown) => void;
      mockGet
        .mockResolvedValueOnce({
          success: true,
          data: [mockPost1],
          meta: { cursor: "cursor-1", hasMore: true, count: 1 },
        })
        .mockReturnValueOnce(new Promise((r) => (resolveSecond = r)));

      const { result } = renderHook(() => useFeed());
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      act(() => {
        result.current.loadMore();
      });

      expect(result.current.isLoadingMore).toBe(true);

      act(() => {
        resolveSecond({
          success: true,
          data: [mockPost2],
          meta: { cursor: null, hasMore: false, count: 1 },
        });
      });

      await waitFor(() => expect(result.current.isLoadingMore).toBe(false));
    });
  });

  describe("createPost", () => {
    it("prepends new post to feed on success", async () => {
      const newPost = { ...mockPost1, id: "post-new", content: "New post!" };

      mockGet.mockResolvedValueOnce({
        success: true,
        data: [mockPost2],
        meta: { cursor: null, hasMore: false, count: 1 },
      });
      mockPost.mockResolvedValueOnce({
        success: true,
        data: newPost,
      });

      const { result } = renderHook(() => useFeed());
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      await act(async () => {
        await result.current.createPost("New post!");
      });

      expect(result.current.posts[0].id).toBe("post-new");
      expect(result.current.posts[0].content).toBe("New post!");
    });

    it("calls POST /feed/posts with correct body", async () => {
      mockGet.mockResolvedValueOnce({
        success: true,
        data: [],
        meta: { cursor: null, hasMore: false, count: 0 },
      });
      mockPost.mockResolvedValueOnce({
        success: true,
        data: mockPost1,
      });

      const { result } = renderHook(() => useFeed());
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      await act(async () => {
        await result.current.createPost("Hello world!");
      });

      expect(mockPost).toHaveBeenCalledWith(
        "/feed/posts",
        expect.objectContaining({ content: "Hello world!" })
      );
    });

    it("sets isSubmitting during post creation", async () => {
      let resolvePost!: (v: unknown) => void;
      mockGet.mockResolvedValueOnce({
        success: true,
        data: [],
        meta: { cursor: null, hasMore: false, count: 0 },
      });
      mockPost.mockReturnValueOnce(new Promise((r) => (resolvePost = r)));

      const { result } = renderHook(() => useFeed());
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      act(() => {
        result.current.createPost("Hello!");
      });

      expect(result.current.isSubmitting).toBe(true);

      act(() => {
        resolvePost({ success: true, data: mockPost1 });
      });

      await waitFor(() => expect(result.current.isSubmitting).toBe(false));
    });

    it("returns false and sets error when post fails", async () => {
      mockGet.mockResolvedValueOnce({
        success: true,
        data: [],
        meta: { cursor: null, hasMore: false, count: 0 },
      });
      mockPost.mockResolvedValueOnce({
        success: false,
        error: { code: "ERROR", message: "Failed to post" },
      });

      const { result } = renderHook(() => useFeed());
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      let returned: boolean | undefined;
      await act(async () => {
        returned = await result.current.createPost("Hello!");
      });

      expect(returned).toBe(false);
    });
  });

  describe("toggleLike", () => {
    it("optimistically increments likeCount when liking", async () => {
      mockGet.mockResolvedValueOnce({
        success: true,
        data: [mockPost1],
        meta: { cursor: null, hasMore: false, count: 1 },
      });
      mockPost.mockResolvedValueOnce({ success: true, data: {} });

      const { result } = renderHook(() => useFeed());
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      const initialLikes = result.current.posts[0].likeCount;

      act(() => {
        result.current.toggleLike("post-1", false);
      });

      expect(result.current.posts[0].likeCount).toBe(initialLikes + 1);
      expect(result.current.posts[0].isLikedByMe).toBe(true);
    });

    it("optimistically decrements likeCount when unliking", async () => {
      const likedPost = { ...mockPost1, isLikedByMe: true, likeCount: 3 };
      mockGet.mockResolvedValueOnce({
        success: true,
        data: [likedPost],
        meta: { cursor: null, hasMore: false, count: 1 },
      });
      mockDelete.mockResolvedValueOnce({ success: true, data: {} });

      const { result } = renderHook(() => useFeed());
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      act(() => {
        result.current.toggleLike("post-1", true);
      });

      expect(result.current.posts[0].likeCount).toBe(2);
      expect(result.current.posts[0].isLikedByMe).toBe(false);
    });

    it("calls POST /feed/posts/:id/like when liking", async () => {
      mockGet.mockResolvedValueOnce({
        success: true,
        data: [mockPost1],
        meta: { cursor: null, hasMore: false, count: 1 },
      });
      mockPost.mockResolvedValueOnce({ success: true, data: {} });

      const { result } = renderHook(() => useFeed());
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      await act(async () => {
        await result.current.toggleLike("post-1", false);
      });

      expect(mockPost).toHaveBeenCalledWith("/feed/posts/post-1/like", {});
    });

    it("calls DELETE /feed/posts/:id/like when unliking", async () => {
      const likedPost = { ...mockPost1, isLikedByMe: true };
      mockGet.mockResolvedValueOnce({
        success: true,
        data: [likedPost],
        meta: { cursor: null, hasMore: false, count: 1 },
      });
      mockDelete.mockResolvedValueOnce({ success: true, data: {} });

      const { result } = renderHook(() => useFeed());
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      await act(async () => {
        await result.current.toggleLike("post-1", true);
      });

      expect(mockDelete).toHaveBeenCalledWith("/feed/posts/post-1/like");
    });

    it("reverts optimistic update on API failure when liking", async () => {
      mockGet.mockResolvedValueOnce({
        success: true,
        data: [mockPost1],
        meta: { cursor: null, hasMore: false, count: 1 },
      });
      mockPost.mockResolvedValueOnce({
        success: false,
        error: { code: "ERROR", message: "Failed" },
      });

      const { result } = renderHook(() => useFeed());
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      const initialLikes = result.current.posts[0].likeCount;

      await act(async () => {
        await result.current.toggleLike("post-1", false);
      });

      expect(result.current.posts[0].likeCount).toBe(initialLikes);
      expect(result.current.posts[0].isLikedByMe).toBe(false);
    });
  });
});
