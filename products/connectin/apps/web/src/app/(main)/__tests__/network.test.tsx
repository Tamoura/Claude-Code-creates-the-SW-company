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

// Mock next/image
jest.mock("next/image", () => {
  return function MockImage({ src, alt }: { src: string; alt: string }) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={alt} />;
  };
});

// Mock react-i18next
jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        "network.myNetwork": "My Network",
        "network.pendingRequests": "Pending Requests",
        "network.myConnections": "My Connections",
        "network.searchConnections": "Search connections...",
        "network.noConnections": "You have no connections yet.",
        "network.noSearchResults": "No results found.",
        "actions.accept": "Accept",
        "actions.decline": "Decline",
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

// Mock useConnections hook
const mockAcceptConnection = jest.fn();
const mockRejectConnection = jest.fn();

jest.mock("@/hooks/useConnections", () => ({
  useConnections: () => ({
    connections: [],
    pendingIncoming: [],
    pendingOutgoing: [],
    isLoading: false,
    error: null,
    acceptConnection: mockAcceptConnection,
    rejectConnection: mockRejectConnection,
    refetch: jest.fn(),
  }),
}));

import NetworkPage from "../network/page";

describe("NetworkPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

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

  it('renders "My Connections" section', () => {
    render(<NetworkPage />);

    expect(
      screen.getByRole("heading", { name: "My Connections", level: 2 })
    ).toBeInTheDocument();
  });

  it("shows empty connections message when no connections", () => {
    render(<NetworkPage />);

    expect(
      screen.getByText("You have no connections yet.")
    ).toBeInTheDocument();
  });
});
