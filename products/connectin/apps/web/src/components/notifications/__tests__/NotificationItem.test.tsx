import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { NotificationItem } from "../NotificationItem";
import type { Notification } from "@/types";

const baseNotif: Notification = {
  id: "notif-1",
  type: "CONNECTION_ACCEPTED",
  title: "Alice accepted your connection request",
  message: null,
  referenceId: null,
  referenceType: null,
  isRead: false,
  readAt: null,
  createdAt: new Date().toISOString(),
};

describe("NotificationItem", () => {
  it("renders notification title", () => {
    render(<NotificationItem notification={baseNotif} onMarkRead={jest.fn()} />);
    expect(screen.getByText("Alice accepted your connection request")).toBeInTheDocument();
  });

  it("shows unread dot for unread notifications", () => {
    render(<NotificationItem notification={baseNotif} onMarkRead={jest.fn()} />);
    expect(screen.getByLabelText("unread")).toBeInTheDocument();
  });

  it("does not show unread dot for read notifications", () => {
    render(<NotificationItem notification={{ ...baseNotif, isRead: true }} onMarkRead={jest.fn()} />);
    expect(screen.queryByLabelText("unread")).not.toBeInTheDocument();
  });

  it("calls onMarkRead when clicking unread notification", () => {
    const onMarkRead = jest.fn();
    render(<NotificationItem notification={baseNotif} onMarkRead={onMarkRead} />);
    fireEvent.click(screen.getByRole("button"));
    expect(onMarkRead).toHaveBeenCalledWith("notif-1");
  });

  it("does not call onMarkRead when clicking already-read notification", () => {
    const onMarkRead = jest.fn();
    render(<NotificationItem notification={{ ...baseNotif, isRead: true }} onMarkRead={onMarkRead} />);
    fireEvent.click(screen.getByRole("button"));
    expect(onMarkRead).not.toHaveBeenCalled();
  });

  it("renders message when present", () => {
    render(<NotificationItem notification={{ ...baseNotif, message: "Great to connect!" }} onMarkRead={jest.fn()} />);
    expect(screen.getByText("Great to connect!")).toBeInTheDocument();
  });
});
