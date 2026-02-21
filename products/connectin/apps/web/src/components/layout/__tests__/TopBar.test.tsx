import React from "react";
import { render, screen } from "@testing-library/react";

// Mock next/link
jest.mock("next/link", () => {
  return function MockLink({
    children,
    href,
    ...props
  }: {
    children: React.ReactNode;
    href: string;
    [key: string]: unknown;
  }) {
    return (
      <a href={href} {...props}>
        {children}
      </a>
    );
  };
});

// Mock react-i18next
jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        "nav.home": "Home",
        "nav.network": "Network",
        "nav.jobs": "Jobs",
        "nav.messages": "Messages",
        "nav.search": "Search",
        "nav.notifications": "Notifications",
        "landing.hero.login": "Sign In",
        "register.submit": "Join Now",
        "language.label": "Switch language",
        "language.switchTo": "EN",
      };
      return translations[key] || key;
    },
    i18n: { language: "ar", changeLanguage: jest.fn() },
  }),
}));

// Mutable user reference so individual tests can override it
const authState = {
  user: {
    id: "user-1",
    email: "test@example.com",
    displayName: "Ahmad Hassan",
    role: "user" as const,
    emailVerified: true,
    languagePreference: "en" as const,
    status: "active" as const,
    createdAt: "2026-01-01T00:00:00Z",
  } as {
    id: string;
    email: string;
    displayName: string;
    role: "user" | "recruiter" | "admin";
    emailVerified: boolean;
    languagePreference: "ar" | "en";
    status: "active" | "suspended" | "deleted";
    createdAt: string;
  } | null,
};

jest.mock("@/providers/AuthProvider", () => ({
  useAuthContext: () => ({
    user: authState.user,
    isLoading: false,
    isAuthenticated: authState.user !== null,
    error: null,
    login: jest.fn(),
    register: jest.fn(),
    logout: jest.fn(),
  }),
}));

// Mock Logo and LanguageToggle as they are not under test
jest.mock("@/components/shared/Logo", () => ({
  Logo: ({ size }: { size: string }) => (
    <div data-testid="logo" data-size={size}>
      Logo
    </div>
  ),
}));

jest.mock("@/components/layout/LanguageToggle", () => ({
  LanguageToggle: () => <button>EN</button>,
}));

import { TopBar } from "../TopBar";

describe("TopBar", () => {
  beforeEach(() => {
    // Restore default user before each test
    authState.user = {
      id: "user-1",
      email: "test@example.com",
      displayName: "Ahmad Hassan",
      role: "user",
      emailVerified: true,
      languagePreference: "en",
      status: "active",
      createdAt: "2026-01-01T00:00:00Z",
    };
  });

  describe("authenticated variant (default)", () => {
    it("renders the logo", () => {
      render(<TopBar />);
      expect(screen.getByTestId("logo")).toBeInTheDocument();
    });

    it("renders the logo as a link to /feed", () => {
      render(<TopBar />);
      const logoLink = screen.getByTestId("logo").closest("a");
      expect(logoLink).toHaveAttribute("href", "/feed");
    });

    it("renders the search input", () => {
      render(<TopBar />);
      expect(screen.getByRole("searchbox")).toBeInTheDocument();
    });

    it("renders the search input with correct placeholder", () => {
      render(<TopBar />);
      expect(screen.getByPlaceholderText("Search")).toBeInTheDocument();
    });

    it("renders navigation links for Home, Network, Jobs, Messages", () => {
      render(<TopBar />);
      expect(screen.getByRole("link", { name: "Home" })).toBeInTheDocument();
      expect(screen.getByRole("link", { name: "Network" })).toBeInTheDocument();
      expect(screen.getByRole("link", { name: "Jobs" })).toBeInTheDocument();
      expect(screen.getByRole("link", { name: "Messages" })).toBeInTheDocument();
    });

    it("navigation links point to the correct hrefs", () => {
      render(<TopBar />);
      expect(screen.getByRole("link", { name: "Home" })).toHaveAttribute("href", "/feed");
      expect(screen.getByRole("link", { name: "Network" })).toHaveAttribute("href", "/network");
      expect(screen.getByRole("link", { name: "Jobs" })).toHaveAttribute("href", "/jobs");
      expect(screen.getByRole("link", { name: "Messages" })).toHaveAttribute("href", "/messages");
    });

    it("renders the notifications button", () => {
      render(<TopBar />);
      expect(screen.getByRole("button", { name: "Notifications" })).toBeInTheDocument();
    });

    it("renders a link to the profile page", () => {
      render(<TopBar />);
      const profileLink = screen.getByRole("link", { name: /Ahmad Hassan/i });
      expect(profileLink).toHaveAttribute("href", "/profile");
    });

    it("renders the user avatar with the user's display name", () => {
      render(<TopBar />);
      // UserAvatar renders initials — AH for Ahmad Hassan
      expect(screen.getByLabelText("Ahmad Hassan")).toBeInTheDocument();
    });

    it("renders the language toggle", () => {
      render(<TopBar />);
      expect(screen.getByRole("button", { name: "EN" })).toBeInTheDocument();
    });

    it("renders inside a header element", () => {
      render(<TopBar />);
      expect(screen.getByRole("banner")).toBeInTheDocument();
    });
  });

  describe("unauthenticated variant", () => {
    it("renders the logo", () => {
      render(<TopBar variant="unauthenticated" />);
      expect(screen.getByTestId("logo")).toBeInTheDocument();
    });

    it("renders the logo as a link to /", () => {
      render(<TopBar variant="unauthenticated" />);
      const logoLink = screen.getByTestId("logo").closest("a");
      expect(logoLink).toHaveAttribute("href", "/");
    });

    it("renders a Sign In link", () => {
      render(<TopBar variant="unauthenticated" />);
      const loginLink = screen.getByRole("link", { name: "Sign In" });
      expect(loginLink).toBeInTheDocument();
      expect(loginLink).toHaveAttribute("href", "/login");
    });

    it("renders a Join Now link", () => {
      render(<TopBar variant="unauthenticated" />);
      const registerLink = screen.getByRole("link", { name: "Join Now" });
      expect(registerLink).toBeInTheDocument();
      expect(registerLink).toHaveAttribute("href", "/register");
    });

    it("does not render the search input", () => {
      render(<TopBar variant="unauthenticated" />);
      expect(screen.queryByRole("searchbox")).not.toBeInTheDocument();
    });

    it("does not render main navigation links", () => {
      render(<TopBar variant="unauthenticated" />);
      expect(screen.queryByRole("link", { name: "Home" })).not.toBeInTheDocument();
      expect(screen.queryByRole("link", { name: "Network" })).not.toBeInTheDocument();
    });

    it("does not render the notifications button", () => {
      render(<TopBar variant="unauthenticated" />);
      expect(
        screen.queryByRole("button", { name: "Notifications" })
      ).not.toBeInTheDocument();
    });

    it("renders inside a header element", () => {
      render(<TopBar variant="unauthenticated" />);
      expect(screen.getByRole("banner")).toBeInTheDocument();
    });
  });

  describe("fallback when no user", () => {
    it("renders User as the avatar display name when user is null", () => {
      authState.user = null;
      render(<TopBar />);
      // When user is null, displayName falls back to "User"
      expect(screen.getByLabelText("User")).toBeInTheDocument();
    });
  });
});
