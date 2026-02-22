import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { NotificationsPanel } from "../NotificationsPanel";
import type { Notification } from "@/types";

const mockNotifications: Notification[] = [
  {
    id: "notif-1",
    type: "CONNECTION_ACCEPTED",
    title: "Alice accepted your request",
    message: null,
    referenceId: null,
    referenceType: null,
    isRead: false,
    readAt: null,
    createdAt: new Date().toISOString(),
  },
];

const defaultProps = {
  notifications: mockNotifications,
  isLoading: false,
  unreadCount: 1,
  onClose: jest.fn(),
  onMarkRead: jest.fn(),
  onMarkAllRead: jest.fn(),
};

describe("NotificationsPanel", () => {
  beforeEach(() => jest.clearAllMocks());

  it("renders as dialog with aria-modal", () => {
    render(<NotificationsPanel {...defaultProps} />);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByRole("dialog")).toHaveAttribute("aria-modal", "true");
  });

  it("renders notification items", () => {
    render(<NotificationsPanel {...defaultProps} />);
    expect(screen.getByText("Alice accepted your request")).toBeInTheDocument();
  });

  it("shows empty state when no notifications", () => {
    render(<NotificationsPanel {...defaultProps} notifications={[]} unreadCount={0} />);
    expect(screen.getByText("notifications.noNotifications")).toBeInTheDocument();
  });

  it("shows mark all read button when unreadCount > 0", () => {
    render(<NotificationsPanel {...defaultProps} />);
    expect(screen.getByText("notifications.markAllRead")).toBeInTheDocument();
  });

  it("hides mark all read button when unreadCount is 0", () => {
    render(<NotificationsPanel {...defaultProps} unreadCount={0} />);
    expect(screen.queryByText("notifications.markAllRead")).not.toBeInTheDocument();
  });

  it("calls onMarkAllRead when button clicked", () => {
    render(<NotificationsPanel {...defaultProps} />);
    fireEvent.click(screen.getByText("notifications.markAllRead"));
    expect(defaultProps.onMarkAllRead).toHaveBeenCalled();
  });

  it("calls onClose when close button clicked", () => {
    render(<NotificationsPanel {...defaultProps} />);
    fireEvent.click(screen.getByLabelText("Close notifications"));
    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it("shows loading skeletons when isLoading is true", () => {
    render(<NotificationsPanel {...defaultProps} isLoading={true} notifications={[]} />);
    expect(document.querySelectorAll(".animate-pulse")).toHaveLength(9); // 3 items × 3 skeleton divs each (circle + 2 text lines)
  });

  it("closes on Escape key press", () => {
    render(<NotificationsPanel {...defaultProps} />);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(defaultProps.onClose).toHaveBeenCalled();
  });
});
