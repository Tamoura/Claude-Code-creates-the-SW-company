import { renderHook, act, waitFor } from "@testing-library/react";
import { useNotifications } from "../useNotifications";
import { apiClient } from "@/lib/api";

jest.mock("@/lib/api", () => ({
  apiClient: {
    get: jest.fn(),
    patch: jest.fn(),
  },
}));

const mockNotifications = [
  {
    id: "notif-1",
    type: "CONNECTION_ACCEPTED" as const,
    title: "Alice accepted your request",
    message: null,
    referenceId: null,
    referenceType: null,
    isRead: false,
    readAt: null,
    createdAt: new Date().toISOString(),
  },
  {
    id: "notif-2",
    type: "POST_LIKE" as const,
    title: "Bob liked your post",
    message: null,
    referenceId: "post-1",
    referenceType: "post",
    isRead: true,
    readAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  },
];

describe("useNotifications", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    (apiClient.get as jest.Mock).mockImplementation((url) => {
      if (url.includes("unread-count")) {
        return Promise.resolve({ success: true, data: { count: 1 } });
      }
      return Promise.resolve({
        success: true,
        data: mockNotifications,
        meta: { cursor: null, hasMore: false, count: 2 },
      });
    });
    (apiClient.patch as jest.Mock).mockResolvedValue({ success: true, data: {} });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("fetches unread count on mount", async () => {
    const { result } = renderHook(() => useNotifications());
    await waitFor(() => expect(result.current.unreadCount).toBe(1));
    expect(apiClient.get).toHaveBeenCalledWith("/notifications/unread-count");
  });

  it("starts polling unread count every 30 seconds", async () => {
    renderHook(() => useNotifications());
    await waitFor(() => expect(apiClient.get).toHaveBeenCalledTimes(1));
    act(() => { jest.advanceTimersByTime(30_000); });
    await waitFor(() => expect(apiClient.get).toHaveBeenCalledTimes(2));
  });

  it("loads notifications when openPanel is called", async () => {
    const { result } = renderHook(() => useNotifications());
    await act(async () => { await result.current.openPanel(); });
    expect(result.current.notifications).toHaveLength(2);
    expect(result.current.isOpen).toBe(true);
  });

  it("closes panel when closePanel is called", async () => {
    const { result } = renderHook(() => useNotifications());
    await act(async () => { await result.current.openPanel(); });
    act(() => { result.current.closePanel(); });
    expect(result.current.isOpen).toBe(false);
  });

  it("optimistically marks notification as read", async () => {
    const { result } = renderHook(() => useNotifications());
    await act(async () => { await result.current.openPanel(); });

    await act(async () => { await result.current.markRead("notif-1"); });

    expect(result.current.notifications.find((n) => n.id === "notif-1")?.isRead).toBe(true);
    expect(result.current.unreadCount).toBe(0);
    expect(apiClient.patch).toHaveBeenCalledWith("/notifications/notif-1/read", {});
  });

  it("marks all notifications as read", async () => {
    const { result } = renderHook(() => useNotifications());
    await act(async () => { await result.current.openPanel(); });
    await act(async () => { await result.current.markAllRead(); });

    expect(result.current.unreadCount).toBe(0);
    expect(result.current.notifications.every((n) => n.isRead)).toBe(true);
    expect(apiClient.patch).toHaveBeenCalledWith("/notifications/read-all", {});
  });
});
