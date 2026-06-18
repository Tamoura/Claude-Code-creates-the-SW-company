import { render, screen } from "@testing-library/react";
import ChatPage from "../page";

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn() }),
  usePathname: () => "/chat",
}));

jest.mock("@/hooks/useConversations", () => ({
  useConversations: () => ({
    conversations: [
      {
        id: "conv-1",
        title: "Architecture Review",
        createdAt: "2026-03-14T10:00:00Z",
        updatedAt: "2026-03-14T10:30:00Z",
        messageCount: 5,
      },
    ],
    isLoading: false,
    error: null,
    refetch: jest.fn(),
  }),
}));

jest.mock("@/hooks/useChat", () => ({
  useChat: () => ({
    messages: [],
    isLoading: false,
    error: null,
    sendMessage: jest.fn(),
    conversationId: null,
    resetChat: jest.fn(),
  }),
}));

describe("ChatPage", () => {
  it("renders the page heading", () => {
    render(<ChatPage />);
    expect(
      screen.getByRole("heading", { name: /ai cto advisor/i })
    ).toBeInTheDocument();
  });

  it("renders the chat input area", () => {
    render(<ChatPage />);
    expect(
      screen.getByRole("textbox", { name: /message/i })
    ).toBeInTheDocument();
  });

  it("renders new conversation button", () => {
    render(<ChatPage />);
    expect(
      screen.getByRole("button", { name: /new conversation/i })
    ).toBeInTheDocument();
  });

  it("renders conversation sidebar with conversations", () => {
    render(<ChatPage />);
    expect(
      screen.getByText("Architecture Review")
    ).toBeInTheDocument();
  });

  it("renders send button", () => {
    render(<ChatPage />);
    expect(
      screen.getByRole("button", { name: /send/i })
    ).toBeInTheDocument();
  });

  it("shows empty state when no messages", () => {
    render(<ChatPage />);
    expect(
      screen.getByText(/start a conversation/i)
    ).toBeInTheDocument();
  });
});
