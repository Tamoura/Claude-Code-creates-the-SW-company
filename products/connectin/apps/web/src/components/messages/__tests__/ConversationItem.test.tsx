import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { ConversationItem } from "../ConversationItem";

const baseConv = {
  id: "conv-1",
  contact: {
    userId: "user-2",
    displayName: "Alice Smith",
    avatarUrl: null,
    headline: "Frontend Engineer",
  },
  lastMessage: {
    content: "See you tomorrow",
    createdAt: new Date().toISOString(),
    isRead: true,
    senderId: "user-2",
  },
  unreadCount: 0,
  lastMessageAt: new Date().toISOString(),
};

describe("ConversationItem", () => {
  it("renders contact display name", () => {
    render(<ConversationItem conversation={baseConv} isActive={false} onClick={jest.fn()} />);
    expect(screen.getByText("Alice Smith")).toBeInTheDocument();
  });

  it("renders last message preview", () => {
    render(<ConversationItem conversation={baseConv} isActive={false} onClick={jest.fn()} />);
    expect(screen.getByText("See you tomorrow")).toBeInTheDocument();
  });

  it("shows unread badge when unreadCount > 0", () => {
    render(<ConversationItem conversation={{ ...baseConv, unreadCount: 3 }} isActive={false} onClick={jest.fn()} />);
    expect(screen.getByLabelText("3 unread")).toBeInTheDocument();
  });

  it("shows 9+ for high unread counts", () => {
    render(<ConversationItem conversation={{ ...baseConv, unreadCount: 15 }} isActive={false} onClick={jest.fn()} />);
    expect(screen.getByText("9+")).toBeInTheDocument();
  });

  it("calls onClick when clicked", () => {
    const onClick = jest.fn();
    render(<ConversationItem conversation={baseConv} isActive={false} onClick={onClick} />);
    fireEvent.click(screen.getByRole("button"));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("applies active styles when isActive", () => {
    render(<ConversationItem conversation={baseConv} isActive={true} onClick={jest.fn()} />);
    expect(screen.getByRole("button")).toHaveAttribute("aria-current", "true");
  });
});
