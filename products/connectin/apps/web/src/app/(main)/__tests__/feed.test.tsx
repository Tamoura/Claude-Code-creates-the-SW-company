import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// Mock next/navigation
const mockPush = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, replace: jest.fn(), back: jest.fn() }),
  usePathname: () => "/feed",
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
        "feed.composer": "Start a post...",
        "feed.empty": "No posts yet. Be the first to share!",
        "actions.post": "Post",
        "actions.like": "Like",
        "actions.comment": "Comment",
        "actions.share": "Share",
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

import FeedPage from "../feed/page";

describe("FeedPage", () => {
  const user = userEvent.setup();

  it("renders post composer", () => {
    render(<FeedPage />);

    expect(screen.getByPlaceholderText("Start a post...")).toBeInTheDocument();
  });

  it("renders post button", () => {
    render(<FeedPage />);

    expect(screen.getByRole("button", { name: "Post" })).toBeInTheDocument();
  });

  it("shows empty state when no posts", () => {
    render(<FeedPage />);

    expect(
      screen.getByText("No posts yet. Be the first to share!")
    ).toBeInTheDocument();
  });

  it("allows typing in post composer", async () => {
    render(<FeedPage />);

    const textarea = screen.getByPlaceholderText("Start a post...");
    await user.type(textarea, "Hello ConnectIn!");

    expect(textarea).toHaveValue("Hello ConnectIn!");
  });
});
