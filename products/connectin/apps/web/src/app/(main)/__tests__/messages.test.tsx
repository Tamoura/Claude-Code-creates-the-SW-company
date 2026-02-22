import React from "react";
import { render, screen } from "@testing-library/react";

// Mock next/navigation
const mockPush = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, replace: jest.fn(), back: jest.fn() }),
  usePathname: () => "/messages",
}));

// Mock next/link
jest.mock("next/link", () => {
  return function MockLink({
    children,
    href,
  }: {
    children: React.ReactNode;
    href: string;
  }) {
    return <a href={href}>{children}</a>;
  };
});

// Mock react-i18next
jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        "messages.inbox": "Messages",
        "messages.search": "Search conversations",
        "messages.noConversations": "No conversations yet",
        "messages.startConversation": "Start a conversation",
        "messages.typeMessage": "Type a message...",
        "messages.send": "Send",
      };
      return translations[key] || key;
    },
    i18n: { language: "en", changeLanguage: jest.fn() },
  }),
}));

// Mock auth context - authenticated user
jest.mock("@/providers/AuthProvider", () => ({
  useAuthContext: () => ({
    user: {
      id: "user-1",
      email: "test@example.com",
      displayName: "Test User",
      role: "user",
      emailVerified: true,
      languagePreference: "en",
      status: "active",
      createdAt: "2026-01-01T00:00:00Z",
    },
    isLoading: false,
    isAuthenticated: true,
    error: null,
    login: jest.fn(),
    register: jest.fn(),
    logout: jest.fn(),
  }),
}));

// Mock useMessages hook
jest.mock("@/hooks/useMessages", () => ({
  useMessages: () => ({
    conversations: [],
    messages: [],
    isLoadingConversations: false,
    isLoadingMessages: false,
    isSending: false,
    error: null,
    sendMessage: jest.fn(),
    markRead: jest.fn(),
    refetchConversations: jest.fn(),
    refetchMessages: jest.fn(),
  }),
}));

import MessagesPage from "../messages/page";

describe("MessagesPage", () => {
  it('renders "Messages" heading', () => {
    render(<MessagesPage />);

    expect(
      screen.getByRole("heading", { name: "Messages" })
    ).toBeInTheDocument();
  });

  it('renders search input with placeholder "Search conversations"', () => {
    render(<MessagesPage />);

    expect(
      screen.getByPlaceholderText("Search conversations")
    ).toBeInTheDocument();
  });

  it("shows empty state when no conversations", () => {
    render(<MessagesPage />);

    expect(screen.getByText("No conversations yet")).toBeInTheDocument();
  });

  it("shows start conversation prompt when no thread selected", () => {
    render(<MessagesPage />);

    expect(screen.getByText("Start a conversation")).toBeInTheDocument();
  });
});
