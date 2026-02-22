import React from "react";
import { render, screen } from "@testing-library/react";
import { MessageBubble } from "../MessageBubble";

jest.mock("@/providers/AuthProvider", () => ({
  useAuthContext: () => ({ user: { id: "user-1" } }),
}));

const baseMsg = {
  id: "msg-1",
  senderId: "user-2",
  content: "Hello, world!",
  createdAt: new Date().toISOString(),
  readAt: null,
};

describe("MessageBubble", () => {
  it("renders message content", () => {
    render(<MessageBubble message={baseMsg} />);
    expect(screen.getByText("Hello, world!")).toBeInTheDocument();
  });

  it("aligns own messages to the right", () => {
    render(<MessageBubble message={{ ...baseMsg, senderId: "user-1" }} />);
    const wrapper = screen.getByText("Hello, world!").closest(".self-end");
    expect(wrapper).toBeInTheDocument();
  });

  it("aligns other messages to the left", () => {
    render(<MessageBubble message={baseMsg} />);
    const wrapper = screen.getByText("Hello, world!").closest(".self-start");
    expect(wrapper).toBeInTheDocument();
  });

  it("shows read receipt for own read messages", () => {
    const readMsg = {
      ...baseMsg,
      senderId: "user-1",
      readAt: new Date().toISOString(),
    };
    render(<MessageBubble message={readMsg} />);
    expect(screen.getByLabelText("Read")).toBeInTheDocument();
  });

  it("does not show read receipt for unread messages", () => {
    render(<MessageBubble message={{ ...baseMsg, senderId: "user-1" }} />);
    expect(screen.queryByLabelText("Read")).not.toBeInTheDocument();
  });
});
