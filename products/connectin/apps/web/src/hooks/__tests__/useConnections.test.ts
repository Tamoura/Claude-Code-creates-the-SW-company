"use client";

import { renderHook, act, waitFor } from "@testing-library/react";
import { useConnections } from "../useConnections";

// Mock the API client
const mockGet = jest.fn();
const mockPut = jest.fn();
const mockDelete = jest.fn();

jest.mock("@/lib/api", () => ({
  apiClient: {
    get: (...args: unknown[]) => mockGet(...args),
    put: (...args: unknown[]) => mockPut(...args),
    delete: (...args: unknown[]) => mockDelete(...args),
  },
}));

const mockConnection = {
  userId: "user-2",
  displayName: "Bob Jones",
  avatarUrl: undefined,
  headline: "Product Manager",
  status: "connected" as const,
};

const mockPendingRequest = {
  connectionId: "conn-1",
  user: {
    id: "user-3",
    displayName: "Charlie Brown",
    avatarUrl: undefined,
    headlineEn: "Designer",
  },
  requestedAt: new Date().toISOString(),
};

const mockOutgoingRequest = {
  connectionId: "conn-2",
  user: {
    id: "user-4",
    displayName: "Diana Prince",
    avatarUrl: undefined,
    headlineEn: "Engineer",
  },
  requestedAt: new Date().toISOString(),
};

describe("useConnections", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("initial state", () => {
    it("starts with empty arrays", async () => {
      mockGet
        .mockResolvedValueOnce({ success: true, data: [] })
        .mockResolvedValueOnce({
          success: true,
          data: { incoming: [], outgoing: [] },
        });

      const { result } = renderHook(() => useConnections());
      expect(result.current.connections).toEqual([]);
      expect(result.current.pendingIncoming).toEqual([]);
      expect(result.current.pendingOutgoing).toEqual([]);

      await waitFor(() => expect(result.current.isLoading).toBe(false));
    });

    it("starts with isLoading true", async () => {
      let resolve!: (v: unknown) => void;
      mockGet
        .mockReturnValueOnce(new Promise((r) => (resolve = r)))
        .mockResolvedValueOnce({
          success: true,
          data: { incoming: [], outgoing: [] },
        });

      const { result } = renderHook(() => useConnections());
      expect(result.current.isLoading).toBe(true);

      act(() => {
        resolve({ success: true, data: [] });
      });
    });

    it("starts with null error", async () => {
      mockGet
        .mockResolvedValueOnce({ success: true, data: [] })
        .mockResolvedValueOnce({
          success: true,
          data: { incoming: [], outgoing: [] },
        });

      const { result } = renderHook(() => useConnections());
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.error).toBeNull();
    });
  });

  describe("fetching connections", () => {
    it("calls /connections and /connections/pending on mount", async () => {
      mockGet
        .mockResolvedValueOnce({ success: true, data: [mockConnection] })
        .mockResolvedValueOnce({
          success: true,
          data: { incoming: [mockPendingRequest], outgoing: [] },
        });

      const { result } = renderHook(() => useConnections());
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(mockGet).toHaveBeenCalledWith("/connections");
      expect(mockGet).toHaveBeenCalledWith("/connections/pending");
    });

    it("sets connections on successful fetch", async () => {
      mockGet
        .mockResolvedValueOnce({ success: true, data: [mockConnection] })
        .mockResolvedValueOnce({
          success: true,
          data: { incoming: [], outgoing: [] },
        });

      const { result } = renderHook(() => useConnections());
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.connections).toHaveLength(1);
      expect(result.current.connections[0].userId).toBe("user-2");
    });

    it("sets pendingIncoming and pendingOutgoing correctly", async () => {
      mockGet
        .mockResolvedValueOnce({ success: true, data: [] })
        .mockResolvedValueOnce({
          success: true,
          data: {
            incoming: [mockPendingRequest],
            outgoing: [mockOutgoingRequest],
          },
        });

      const { result } = renderHook(() => useConnections());
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.pendingIncoming).toHaveLength(1);
      expect(result.current.pendingIncoming[0].connectionId).toBe("conn-1");
      expect(result.current.pendingOutgoing).toHaveLength(1);
      expect(result.current.pendingOutgoing[0].connectionId).toBe("conn-2");
    });

    it("sets error when connections fetch fails", async () => {
      mockGet
        .mockResolvedValueOnce({
          success: false,
          error: { code: "ERROR", message: "Failed to load connections" },
        })
        .mockResolvedValueOnce({
          success: true,
          data: { incoming: [], outgoing: [] },
        });

      const { result } = renderHook(() => useConnections());
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.error).toBe("Failed to load connections");
    });

    it("sets error on network failure", async () => {
      mockGet.mockRejectedValueOnce(new Error("Network down"));

      const { result } = renderHook(() => useConnections());
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.error).toBe("Network error. Please try again.");
    });
  });

  describe("acceptConnection", () => {
    it("calls PUT /connections/:id/accept", async () => {
      mockGet
        .mockResolvedValueOnce({ success: true, data: [] })
        .mockResolvedValueOnce({
          success: true,
          data: { incoming: [mockPendingRequest], outgoing: [] },
        });
      mockPut.mockResolvedValueOnce({ success: true, data: {} });

      const { result } = renderHook(() => useConnections());
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      await act(async () => {
        await result.current.acceptConnection("conn-1");
      });

      expect(mockPut).toHaveBeenCalledWith("/connections/conn-1/accept");
    });

    it("removes accepted request from pendingIncoming", async () => {
      mockGet
        .mockResolvedValueOnce({ success: true, data: [] })
        .mockResolvedValueOnce({
          success: true,
          data: { incoming: [mockPendingRequest], outgoing: [] },
        });
      mockPut.mockResolvedValueOnce({ success: true, data: {} });

      const { result } = renderHook(() => useConnections());
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.pendingIncoming).toHaveLength(1);

      await act(async () => {
        await result.current.acceptConnection("conn-1");
      });

      expect(result.current.pendingIncoming).toHaveLength(0);
    });

    it("adds accepted user to connections list", async () => {
      mockGet
        .mockResolvedValueOnce({ success: true, data: [] })
        .mockResolvedValueOnce({
          success: true,
          data: { incoming: [mockPendingRequest], outgoing: [] },
        });
      mockPut.mockResolvedValueOnce({ success: true, data: {} });

      const { result } = renderHook(() => useConnections());
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      await act(async () => {
        await result.current.acceptConnection("conn-1");
      });

      expect(result.current.connections.some((c) => c.userId === "user-3")).toBe(true);
    });
  });

  describe("rejectConnection", () => {
    it("calls DELETE /connections/:id/reject", async () => {
      mockGet
        .mockResolvedValueOnce({ success: true, data: [] })
        .mockResolvedValueOnce({
          success: true,
          data: { incoming: [mockPendingRequest], outgoing: [] },
        });
      mockDelete.mockResolvedValueOnce({ success: true, data: {} });

      const { result } = renderHook(() => useConnections());
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      await act(async () => {
        await result.current.rejectConnection("conn-1");
      });

      expect(mockDelete).toHaveBeenCalledWith("/connections/conn-1/reject");
    });

    it("removes rejected request from pendingIncoming", async () => {
      mockGet
        .mockResolvedValueOnce({ success: true, data: [] })
        .mockResolvedValueOnce({
          success: true,
          data: { incoming: [mockPendingRequest], outgoing: [] },
        });
      mockDelete.mockResolvedValueOnce({ success: true, data: {} });

      const { result } = renderHook(() => useConnections());
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.pendingIncoming).toHaveLength(1);

      await act(async () => {
        await result.current.rejectConnection("conn-1");
      });

      expect(result.current.pendingIncoming).toHaveLength(0);
    });
  });
});
