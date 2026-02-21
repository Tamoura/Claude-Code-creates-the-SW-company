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
        "nav.profile": "Profile",
      };
      return translations[key] || key;
    },
    i18n: { language: "en", changeLanguage: jest.fn() },
  }),
}));

import { BottomNav } from "../BottomNav";

describe("BottomNav", () => {
  beforeEach(() => {
    mockUsePathname.mockReturnValue("/feed");
  });

  describe("structure", () => {
    it("renders a navigation landmark", () => {
      render(<BottomNav />);
      expect(
        screen.getByRole("navigation", { name: "Mobile navigation" })
      ).toBeInTheDocument();
    });

    it("renders exactly 5 navigation links", () => {
      render(<BottomNav />);
      const links = screen.getAllByRole("link");
      expect(links).toHaveLength(5);
    });
  });

  describe("navigation links", () => {
    it("renders the Home link pointing to /feed", () => {
      render(<BottomNav />);
      expect(screen.getByRole("link", { name: "Home" })).toHaveAttribute(
        "href",
        "/feed"
      );
    });

    it("renders the Network link pointing to /network", () => {
      render(<BottomNav />);
      expect(screen.getByRole("link", { name: "Network" })).toHaveAttribute(
        "href",
        "/network"
      );
    });

    it("renders the Jobs link pointing to /jobs", () => {
      render(<BottomNav />);
      expect(screen.getByRole("link", { name: "Jobs" })).toHaveAttribute(
        "href",
        "/jobs"
      );
    });

    it("renders the Messages link pointing to /messages", () => {
      render(<BottomNav />);
      expect(screen.getByRole("link", { name: "Messages" })).toHaveAttribute(
        "href",
        "/messages"
      );
    });

    it("renders the Profile link pointing to /profile", () => {
      render(<BottomNav />);
      expect(screen.getByRole("link", { name: "Profile" })).toHaveAttribute(
        "href",
        "/profile"
      );
    });
  });

  describe("active state", () => {
    it("marks /feed as active when pathname is /feed", () => {
      mockUsePathname.mockReturnValue("/feed");
      render(<BottomNav />);
      expect(screen.getByRole("link", { name: "Home" })).toHaveAttribute(
        "aria-current",
        "page"
      );
    });

    it("does not mark inactive links with aria-current", () => {
      mockUsePathname.mockReturnValue("/feed");
      render(<BottomNav />);
      expect(
        screen.getByRole("link", { name: "Jobs" })
      ).not.toHaveAttribute("aria-current");
    });

    it("marks /network as active when pathname is /network", () => {
      mockUsePathname.mockReturnValue("/network");
      render(<BottomNav />);
      expect(screen.getByRole("link", { name: "Network" })).toHaveAttribute(
        "aria-current",
        "page"
      );
    });

    it("marks /profile as active when pathname is /profile", () => {
      mockUsePathname.mockReturnValue("/profile");
      render(<BottomNav />);
      expect(screen.getByRole("link", { name: "Profile" })).toHaveAttribute(
        "aria-current",
        "page"
      );
    });

    it("marks nested path as active (e.g. /jobs/123)", () => {
      mockUsePathname.mockReturnValue("/jobs/123");
      render(<BottomNav />);
      expect(screen.getByRole("link", { name: "Jobs" })).toHaveAttribute(
        "aria-current",
        "page"
      );
    });
  });

  describe("accessibility", () => {
    it("has aria-label on every link", () => {
      render(<BottomNav />);
      const links = screen.getAllByRole("link");
      links.forEach((link) => {
        expect(link).toHaveAttribute("aria-label");
      });
    });

    it("has minimum touch target size (48px)", () => {
      render(<BottomNav />);
      const links = screen.getAllByRole("link");
      links.forEach((link) => {
        // Verify the class includes min-w and min-h for 48px touch targets
        expect(link.className).toContain("min-w-[48px]");
        expect(link.className).toContain("min-h-[48px]");
      });
    });
  });
});
