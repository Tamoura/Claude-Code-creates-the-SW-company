import React from "react";
import { render, screen } from "@testing-library/react";

// Mock next/navigation
const mockPush = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, replace: jest.fn(), back: jest.fn() }),
  usePathname: () => "/jobs",
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
        "jobs.search": "Search jobs...",
        "jobs.filters": "Filters",
        "jobs.remote": "Remote",
        "jobs.hybrid": "Hybrid",
        "jobs.onsite": "On-site",
        "jobs.entry": "Entry",
        "jobs.mid": "Mid",
        "jobs.senior": "Senior",
        "jobs.lead": "Lead",
        "jobs.postJob": "Post a Job",
        noResults: "No results found",
        "actions.loadMore": "Load more",
        "actions.loading": "Loading...",
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

// Mock useJobs hook so the page renders the empty state immediately
jest.mock("@/hooks/useJobs", () => ({
  useJobs: () => ({
    jobs: [],
    isLoading: false,
    isLoadingMore: false,
    hasMore: false,
    error: null,
    filters: { q: "", location: "", workType: "", experienceLevel: "" },
    setFilter: jest.fn(),
    loadMore: jest.fn(),
    saveJob: jest.fn(),
    unsaveJob: jest.fn(),
    applyToJob: jest.fn(),
  }),
}));

import JobsPage from "../jobs/page";

describe("JobsPage", () => {
  it("renders search input with placeholder", () => {
    render(<JobsPage />);

    expect(
      screen.getByPlaceholderText("Search jobs...")
    ).toBeInTheDocument();
  });

  it("renders Remote filter button", () => {
    render(<JobsPage />);

    expect(
      screen.getByRole("button", { name: "Remote" })
    ).toBeInTheDocument();
  });

  it("renders Hybrid filter button", () => {
    render(<JobsPage />);

    expect(
      screen.getByRole("button", { name: "Hybrid" })
    ).toBeInTheDocument();
  });

  it("renders On-site filter button", () => {
    render(<JobsPage />);

    expect(
      screen.getByRole("button", { name: "On-site" })
    ).toBeInTheDocument();
  });

  it("shows empty state when no jobs", () => {
    render(<JobsPage />);

    expect(screen.getByText("No results found")).toBeInTheDocument();
  });
});
