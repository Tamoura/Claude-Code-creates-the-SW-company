import React from "react";
import { render, screen } from "@testing-library/react";

// Mock next/navigation
const mockPush = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, replace: jest.fn(), back: jest.fn() }),
  usePathname: () => "/network",
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
        "network.myNetwork": "My Network",
        "network.pendingRequests": "Pending Requests",
        "network.peopleYouMayKnow": "People You May Know",
        "network.myConnections": "My Connections",
        "network.searchConnections": "Search connections...",
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

import NetworkPage from "../network/page";

describe("NetworkPage", () => {
  it('renders "My Network" heading', () => {
    render(<NetworkPage />);

    expect(
      screen.getByRole("heading", { name: "My Network", level: 1 })
    ).toBeInTheDocument();
  });

  it('renders search input with placeholder "Search connections..."', () => {
    render(<NetworkPage />);

    expect(
      screen.getByPlaceholderText("Search connections...")
    ).toBeInTheDocument();
  });

  it('renders "Pending Requests" section', () => {
    render(<NetworkPage />);

    expect(
      screen.getByRole("heading", { name: "Pending Requests", level: 2 })
    ).toBeInTheDocument();
  });

  it('renders "People You May Know" section', () => {
    render(<NetworkPage />);

    expect(
      screen.getByRole("heading", { name: "People You May Know", level: 2 })
    ).toBeInTheDocument();
  });
});
