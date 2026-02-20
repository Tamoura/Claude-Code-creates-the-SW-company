import React from "react";
import { render, screen } from "@testing-library/react";

// Mock next/navigation
const mockPush = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, replace: jest.fn(), back: jest.fn() }),
  usePathname: () => "/settings",
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
        "settings.account": "Account",
        "settings.notifications": "Notifications",
        "settings.privacy": "Privacy",
        "settings.language": "Language",
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

import SettingsPage from "../settings/page";

describe("SettingsPage", () => {
  it("renders Account section", () => {
    render(<SettingsPage />);

    expect(
      screen.getByRole("heading", { name: "Account" })
    ).toBeInTheDocument();
  });

  it("renders Notifications section", () => {
    render(<SettingsPage />);

    expect(
      screen.getByRole("heading", { name: "Notifications" })
    ).toBeInTheDocument();
  });

  it("renders Privacy section", () => {
    render(<SettingsPage />);

    expect(
      screen.getByRole("heading", { name: "Privacy" })
    ).toBeInTheDocument();
  });

  it("renders Language section", () => {
    render(<SettingsPage />);

    expect(
      screen.getByRole("heading", { name: "Language" })
    ).toBeInTheDocument();
  });
});
