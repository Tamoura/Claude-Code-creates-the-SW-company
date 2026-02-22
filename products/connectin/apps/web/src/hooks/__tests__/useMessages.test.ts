import { renderHook, act, waitFor } from "@testing-library/react";
import { useMessages } from "../useMessages";
import { apiClient } from "@/lib/api";

jest.mock("@/lib/api", () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
    patch: jest.fn(),
  },
}));

jest.mock("@/providers/AuthProvider", () => ({
  useAuthContext: () => ({ user: { id: "user-1" } }),
}));

const mockConvs = [
  {
    id: "conv-1",
    contact: { userId: "user-2", displayName: "Alice", avatarUrl: null, headline: null },
    lastMessage: { content: "Hello", createdAt: new Date().toISOString(), isRead: true, senderId: "user-2" },
    unreadCount: 0,
    lastMessageAt: new Date().toISOString(),
  },
];

const mockMessages = [
  {
    id: "msg-1",
    conversationId: "conv-1",
    senderId: "user-2",
    content: "Hello",
    createdAt: new Date().toISOString(),
    readAt: null,
  },
];

describe("useMessages", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    (apiClient.get as jest.Mock).mockResolvedValue({
      success: true,
      data: mockConvs,
      meta: { cursor: null, hasMore: false, count: 1 },
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("fetches conversations on mount", async () => {
    const { result } = renderHook(() => useMessages());
    await waitFor(() => {
      expect(result.current.conversations).toHaveLength(1);
    });
    expect(apiClient.get).toHaveBeenCalledWith("/conversations", expect.any(Object));
  });

  it("fetches messages when conversationId is provided", async () => {
    (apiClient.get as jest.Mock).mockImplementation((url: string) => {
      if (url.includes("/messages")) {
        return Promise.resolve({ success: true, data: mockMessages, meta: { cursor: null, hasMore: false, count: 1 } });
      }
      return Promise.resolve({ success: true, data: mockConvs, meta: { cursor: null, hasMore: false, count: 1 } });
    });

    const { result } = renderHook(() => useMessages("conv-1"));
    await waitFor(() => {
      expect(result.current.messages).toHaveLength(1);
    });
  });

  it("sends a message and optimistically updates", async () => {
    const newMsg = { id: "msg-2", conversationId: "conv-1", senderId: "user-1", content: "Hi there!", createdAt: new Date().toISOString() };
    (apiClient.post as jest.Mock).mockResolvedValue({ success: true, data: newMsg });
    (apiClient.get as jest.Mock).mockImplementation((url: string) => {
      if (url.includes("/messages")) {
        return Promise.resolve({ success: true, data: [], meta: { cursor: null, hasMore: false, count: 0 } });
      }
      return Promise.resolve({ success: true, data: mockConvs, meta: { cursor: null, hasMore: false, count: 1 } });
    });

    const { result } = renderHook(() => useMessages("conv-1"));
    await waitFor(() => !result.current.isLoadingMessages);

    await act(async () => {
      const ok = await result.current.sendMessage("conv-1", "Hi there!");
      expect(ok).toBe(true);
    });

    expect(apiClient.post).toHaveBeenCalledWith("/conversations/messages", {
      conversationId: "conv-1",
      content: "Hi there!",
    });
  });

  it("reverts optimistic message on send failure", async () => {
    (apiClient.post as jest.Mock).mockResolvedValue({ success: false });
    (apiClient.get as jest.Mock).mockImplementation((url: string) => {
      if (url.includes("/messages")) {
        return Promise.resolve({ success: true, data: [], meta: { cursor: null, hasMore: false, count: 0 } });
      }
      return Promise.resolve({ success: true, data: mockConvs, meta: { cursor: null, hasMore: false, count: 1 } });
    });

    const { result } = renderHook(() => useMessages("conv-1"));
    await waitFor(() => !result.current.isLoadingMessages);

    await act(async () => {
      const ok = await result.current.sendMessage("conv-1", "test");
      expect(ok).toBe(false);
    });

    expect(result.current.messages).toHaveLength(0);
  });

  it("does not send empty message", async () => {
    const { result } = renderHook(() => useMessages("conv-1"));
    await act(async () => {
      const ok = await result.current.sendMessage("conv-1", "  ");
      expect(ok).toBe(false);
    });
    expect(apiClient.post).not.toHaveBeenCalled();
  });
});
