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

// Mock next/navigation
const mockUsePathname = jest.fn(() => "/feed");
jest.mock("next/navigation", () => ({
  usePathname: () => mockUsePathname(),
}));

// Mock react-i18next
jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        "nav.home": "Home",
        "nav.network": "Network",
        "nav.jobs": "Jobs",
        "nav.messages": "Messages",
        "nav.saved": "Saved",
        "nav.settings": "Settings",
        "profile.connections": "connections",
        "landing.footer.about": "About",
        "landing.footer.privacy": "Privacy",
        "landing.footer.terms": "Terms",
        "landing.footer.copyright": "ConnectIn",
      };
      return translations[key] || key;
    },
    i18n: { language: "en", changeLanguage: jest.fn() },
  }),
}));

// Mutable auth state so individual tests can override the user
const sidebarAuthState = {
  user: {
    id: "user-1",
    email: "test@example.com",
    displayName: "Sara Ali",
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
    user: sidebarAuthState.user,
    isLoading: false,
    isAuthenticated: sidebarAuthState.user !== null,
    error: null,
    login: jest.fn(),
    register: jest.fn(),
    logout: jest.fn(),
  }),
}));

import { Sidebar } from "../Sidebar";

describe("Sidebar", () => {
  beforeEach(() => {
    mockUsePathname.mockReturnValue("/feed");
    // Restore default user before each test
    sidebarAuthState.user = {
      id: "user-1",
      email: "test@example.com",
      displayName: "Sara Ali",
      role: "user",
      emailVerified: true,
      languagePreference: "en",
      status: "active",
      createdAt: "2026-01-01T00:00:00Z",
    };
  });

  describe("structure", () => {
    it("renders an aside element", () => {
      render(<Sidebar />);
      expect(screen.getByRole("complementary")).toBeInTheDocument();
    });

    it("renders a navigation landmark", () => {
      render(<Sidebar />);
      expect(screen.getByRole("navigation", { name: "Sidebar navigation" })).toBeInTheDocument();
    });
  });

  describe("user profile mini-card", () => {
    it("renders the user display name", () => {
      render(<Sidebar />);
      expect(screen.getByText("Sara Ali")).toBeInTheDocument();
    });

    it("renders a link to /profile", () => {
      render(<Sidebar />);
      const profileLink = screen.getByRole("link", { name: /Sara Ali/i });
      expect(profileLink).toHaveAttribute("href", "/profile");
    });

    it("renders the user avatar with the correct display name", () => {
      render(<Sidebar />);
      // UserAvatar renders initials: SA for Sara Ali
      expect(screen.getByLabelText("Sara Ali")).toBeInTheDocument();
    });

    it("renders the connections count", () => {
      render(<Sidebar />);
      expect(screen.getByText(/0 connections/i)).toBeInTheDocument();
    });
  });

  describe("navigation links", () => {
    it("renders the Home navigation link", () => {
      render(<Sidebar />);
      expect(screen.getByRole("link", { name: "Home" })).toHaveAttribute("href", "/feed");
    });

    it("renders the Network navigation link", () => {
      render(<Sidebar />);
      expect(screen.getByRole("link", { name: /Network/ })).toHaveAttribute("href", "/network");
    });

    it("renders the Jobs navigation link", () => {
      render(<Sidebar />);
      expect(screen.getByRole("link", { name: /Jobs/ })).toHaveAttribute("href", "/jobs");
    });

    it("renders the Messages navigation link", () => {
      render(<Sidebar />);
      expect(screen.getByRole("link", { name: /Messages/ })).toHaveAttribute("href", "/messages");
    });

    it("renders the Saved navigation link", () => {
      render(<Sidebar />);
      expect(screen.getByRole("link", { name: "Saved" })).toHaveAttribute("href", "/saved");
    });

    it("renders the Settings navigation link", () => {
      render(<Sidebar />);
      expect(screen.getByRole("link", { name: "Settings" })).toHaveAttribute("href", "/settings");
    });
  });

  describe("active state", () => {
    it("marks the active link with aria-current=page", () => {
      mockUsePathname.mockReturnValue("/feed");
      render(<Sidebar />);
      expect(screen.getByRole("link", { name: "Home" })).toHaveAttribute(
        "aria-current",
        "page"
      );
    });

    it("does not mark inactive links with aria-current", () => {
      mockUsePathname.mockReturnValue("/feed");
      render(<Sidebar />);
      expect(screen.getByRole("link", { name: "Settings" })).not.toHaveAttribute("aria-current");
    });

    it("marks /network as active when pathname is /network", () => {
      mockUsePathname.mockReturnValue("/network");
      render(<Sidebar />);
      expect(screen.getByRole("link", { name: /Network/ })).toHaveAttribute(
        "aria-current",
        "page"
      );
    });

    it("marks /saved as active when pathname is /saved", () => {
      mockUsePathname.mockReturnValue("/saved");
      render(<Sidebar />);
      expect(screen.getByRole("link", { name: "Saved" })).toHaveAttribute(
        "aria-current",
        "page"
      );
    });

    it("marks nested path as active (e.g. /jobs/123)", () => {
      mockUsePathname.mockReturnValue("/jobs/123");
      render(<Sidebar />);
      expect(screen.getByRole("link", { name: /Jobs/ })).toHaveAttribute(
        "aria-current",
        "page"
      );
    });
  });

  describe("notification badges", () => {
    it("renders the Network badge with count 3", () => {
      render(<Sidebar />);
      expect(screen.getByLabelText("3 new Network")).toBeInTheDocument();
    });

    it("renders the Messages badge with count 2", () => {
      render(<Sidebar />);
      expect(screen.getByLabelText("2 new Messages")).toBeInTheDocument();
    });

    it("does not render a badge for Home", () => {
      render(<Sidebar />);
      expect(screen.queryByLabelText(/new Home/)).not.toBeInTheDocument();
    });

    it("does not render a badge for Saved", () => {
      render(<Sidebar />);
      expect(screen.queryByLabelText(/new Saved/)).not.toBeInTheDocument();
    });
  });

  describe("footer links", () => {
    it("renders the About footer link", () => {
      render(<Sidebar />);
      expect(screen.getByRole("link", { name: "About" })).toHaveAttribute("href", "/about");
    });

    it("renders the Privacy footer link", () => {
      render(<Sidebar />);
      expect(screen.getByRole("link", { name: "Privacy" })).toHaveAttribute("href", "/privacy");
    });

    it("renders the Terms footer link", () => {
      render(<Sidebar />);
      expect(screen.getByRole("link", { name: "Terms" })).toHaveAttribute("href", "/terms");
    });

    it("renders the copyright notice", () => {
      render(<Sidebar />);
      expect(screen.getByText(/2026 ConnectIn/)).toBeInTheDocument();
    });
  });

  describe("null user fallback", () => {
    it("renders User as display name when user is null", () => {
      sidebarAuthState.user = null;
      render(<Sidebar />);
      // When user is null, displayName falls back to "User"
      expect(screen.getByLabelText("User")).toBeInTheDocument();
    });
  });
});
