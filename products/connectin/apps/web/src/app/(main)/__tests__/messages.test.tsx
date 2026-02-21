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
        "messages.search": "Search messages...",
        noResults: "No results found",
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

import MessagesPage from "../messages/page";

describe("MessagesPage", () => {
  it('renders "Messages" heading', () => {
    render(<MessagesPage />);

    expect(
      screen.getByRole("heading", { name: "Messages" })
    ).toBeInTheDocument();
  });

  it('renders search input with placeholder "Search messages..."', () => {
    render(<MessagesPage />);

    expect(
      screen.getByPlaceholderText("Search messages...")
    ).toBeInTheDocument();
  });

  it("shows empty state text", () => {
    render(<MessagesPage />);

    expect(screen.getByText("No results found")).toBeInTheDocument();
  });
});
