import { renderHook, act, waitFor } from "@testing-library/react";
import { useReactions } from "../useReactions";

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

const mockReactionsData = {
  myReaction: "LIKE" as const,
  totalCount: 5,
  breakdown: { LIKE: 3, CELEBRATE: 1, LOVE: 1 },
};

describe("useReactions", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("initial state", () => {
    it("starts with null myReaction", () => {
      const { result } = renderHook(() => useReactions("post-1"));
      expect(result.current.myReaction).toBeNull();
    });

    it("starts with 0 totalCount", () => {
      const { result } = renderHook(() => useReactions("post-1"));
      expect(result.current.totalCount).toBe(0);
    });

    it("starts with empty breakdown", () => {
      const { result } = renderHook(() => useReactions("post-1"));
      expect(result.current.breakdown).toEqual({});
    });
  });

  describe("fetchReactions", () => {
    it("fetches reactions on mount", async () => {
      mockGet.mockResolvedValueOnce({ success: true, data: mockReactionsData });
      renderHook(() => useReactions("post-1"));
      await waitFor(() => expect(mockGet).toHaveBeenCalledTimes(1));
      expect(mockGet).toHaveBeenCalledWith("/feed/posts/post-1/reactions");
    });

    it("sets myReaction from response", async () => {
      mockGet.mockResolvedValueOnce({ success: true, data: mockReactionsData });
      const { result } = renderHook(() => useReactions("post-1"));
      await waitFor(() => expect(result.current.myReaction).toBe("LIKE"));
    });

    it("sets totalCount from response", async () => {
      mockGet.mockResolvedValueOnce({ success: true, data: mockReactionsData });
      const { result } = renderHook(() => useReactions("post-1"));
      await waitFor(() => expect(result.current.totalCount).toBe(5));
    });

    it("sets breakdown from response", async () => {
      mockGet.mockResolvedValueOnce({ success: true, data: mockReactionsData });
      const { result } = renderHook(() => useReactions("post-1"));
      await waitFor(() =>
        expect(result.current.breakdown).toEqual({ LIKE: 3, CELEBRATE: 1, LOVE: 1 })
      );
    });
  });

  describe("react", () => {
    it("calls POST /react with reaction type", async () => {
      mockGet.mockResolvedValueOnce({
        success: true,
        data: { myReaction: null, totalCount: 0, breakdown: {} },
      });
      mockPost.mockResolvedValueOnce({ success: true, data: {} });
      const { result } = renderHook(() => useReactions("post-1"));
      await waitFor(() => expect(mockGet).toHaveBeenCalledTimes(1));

      await act(async () => {
        await result.current.react("CELEBRATE");
      });

      expect(mockPost).toHaveBeenCalledWith("/feed/posts/post-1/react", { type: "CELEBRATE" });
    });

    it("optimistically updates myReaction when reacting", async () => {
      mockGet.mockResolvedValueOnce({
        success: true,
        data: { myReaction: null, totalCount: 2, breakdown: { LIKE: 2 } },
      });
      mockPost.mockResolvedValueOnce({ success: true, data: {} });
      const { result } = renderHook(() => useReactions("post-1"));
      await waitFor(() => expect(result.current.totalCount).toBe(2));

      act(() => {
        result.current.react("LOVE");
      });

      expect(result.current.myReaction).toBe("LOVE");
    });

    it("calls DELETE /react when reacting with the same type (toggle off)", async () => {
      mockGet.mockResolvedValueOnce({
        success: true,
        data: { myReaction: "LIKE", totalCount: 3, breakdown: { LIKE: 3 } },
      });
      mockDelete.mockResolvedValueOnce({ success: true, data: {} });
      const { result } = renderHook(() => useReactions("post-1"));
      await waitFor(() => expect(result.current.myReaction).toBe("LIKE"));

      await act(async () => {
        await result.current.react("LIKE");
      });

      expect(mockDelete).toHaveBeenCalledWith("/feed/posts/post-1/react");
    });

    it("optimistically clears myReaction when toggling off same type", async () => {
      mockGet.mockResolvedValueOnce({
        success: true,
        data: { myReaction: "LIKE", totalCount: 3, breakdown: { LIKE: 3 } },
      });
      mockDelete.mockResolvedValueOnce({ success: true, data: {} });
      const { result } = renderHook(() => useReactions("post-1"));
      await waitFor(() => expect(result.current.myReaction).toBe("LIKE"));

      act(() => {
        result.current.react("LIKE");
      });

      expect(result.current.myReaction).toBeNull();
    });
  });
});
