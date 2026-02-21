import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// Mock next/navigation
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn() }),
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

// Mock auth context — regular user by default
const mockUser = {
  id: "user-1",
  email: "test@example.com",
  displayName: "Test User",
  role: "user" as const,
  emailVerified: true,
  languagePreference: "en" as const,
  status: "active" as const,
  createdAt: "2026-01-01T00:00:00Z",
};

let mockAuthUser = mockUser;

jest.mock("@/providers/AuthProvider", () => ({
  useAuthContext: () => ({
    user: mockAuthUser,
    isLoading: false,
    isAuthenticated: true,
    error: null,
    login: jest.fn(),
    register: jest.fn(),
    logout: jest.fn(),
  }),
}));

// Mock useJobs hook
const mockSetFilter = jest.fn();
const mockLoadMore = jest.fn();
const mockSaveJob = jest.fn();
const mockUnsaveJob = jest.fn();
const mockApplyToJob = jest.fn().mockResolvedValue("app-1");

const makeJob = (overrides: Record<string, unknown> = {}) => ({
  id: "job-1",
  title: "Frontend Engineer",
  company: "Acme Corp",
  location: "Dubai, UAE",
  workType: "REMOTE",
  experienceLevel: "MID",
  description: "Build amazing things",
  salaryMin: 8000,
  salaryMax: 12000,
  salaryCurrency: "USD",
  language: "en",
  status: "OPEN",
  applicantCount: 5,
  createdAt: new Date().toISOString(),
  isApplied: false,
  isSaved: false,
  ...overrides,
});

let mockJobsState = {
  jobs: [] as ReturnType<typeof makeJob>[],
  isLoading: false,
  isLoadingMore: false,
  hasMore: false,
  error: null as string | null,
  filters: { q: "", location: "", workType: "", experienceLevel: "" },
};

jest.mock("@/hooks/useJobs", () => ({
  useJobs: () => ({
    ...mockJobsState,
    setFilter: mockSetFilter,
    loadMore: mockLoadMore,
    saveJob: mockSaveJob,
    unsaveJob: mockUnsaveJob,
    applyToJob: mockApplyToJob,
  }),
}));

import JobsPage from "../page";

describe("JobsPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAuthUser = mockUser;
    mockJobsState = {
      jobs: [],
      isLoading: false,
      isLoadingMore: false,
      hasMore: false,
      error: null,
      filters: { q: "", location: "", workType: "", experienceLevel: "" },
    };
  });

  describe("search input", () => {
    it("renders search input with placeholder", () => {
      render(<JobsPage />);
      expect(screen.getByPlaceholderText("Search jobs...")).toBeInTheDocument();
    });

    it("calls setFilter with q when typing in search", async () => {
      jest.useFakeTimers();
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      render(<JobsPage />);

      const input = screen.getByPlaceholderText("Search jobs...");
      await user.type(input, "React");
      jest.advanceTimersByTime(300);

      expect(mockSetFilter).toHaveBeenCalledWith("q", expect.stringContaining("React"));
      jest.useRealTimers();
    });
  });

  describe("work type filter chips", () => {
    it("renders Remote filter button", () => {
      render(<JobsPage />);
      expect(screen.getByRole("button", { name: "Remote" })).toBeInTheDocument();
    });

    it("renders Hybrid filter button", () => {
      render(<JobsPage />);
      expect(screen.getByRole("button", { name: "Hybrid" })).toBeInTheDocument();
    });

    it("renders On-site filter button", () => {
      render(<JobsPage />);
      expect(screen.getByRole("button", { name: "On-site" })).toBeInTheDocument();
    });

    it("calls setFilter with workType when Remote is clicked", async () => {
      const user = userEvent.setup();
      render(<JobsPage />);
      await user.click(screen.getByRole("button", { name: "Remote" }));
      expect(mockSetFilter).toHaveBeenCalledWith("workType", "REMOTE");
    });

    it("toggles off workType filter when same chip is clicked again", async () => {
      const user = userEvent.setup();
      mockJobsState.filters = { q: "", location: "", workType: "REMOTE", experienceLevel: "" };
      render(<JobsPage />);
      await user.click(screen.getByRole("button", { name: "Remote" }));
      expect(mockSetFilter).toHaveBeenCalledWith("workType", "");
    });
  });

  describe("experience level filter chips", () => {
    it("renders Entry filter button", () => {
      render(<JobsPage />);
      expect(screen.getByRole("button", { name: "Entry" })).toBeInTheDocument();
    });

    it("renders Mid filter button", () => {
      render(<JobsPage />);
      expect(screen.getByRole("button", { name: "Mid" })).toBeInTheDocument();
    });

    it("renders Senior filter button", () => {
      render(<JobsPage />);
      expect(screen.getByRole("button", { name: "Senior" })).toBeInTheDocument();
    });

    it("renders Lead filter button", () => {
      render(<JobsPage />);
      expect(screen.getByRole("button", { name: "Lead" })).toBeInTheDocument();
    });

    it("calls setFilter with experienceLevel when Entry is clicked", async () => {
      const user = userEvent.setup();
      render(<JobsPage />);
      await user.click(screen.getByRole("button", { name: "Entry" }));
      expect(mockSetFilter).toHaveBeenCalledWith("experienceLevel", "ENTRY");
    });
  });

  describe("job listing", () => {
    it("renders job cards when jobs are loaded", () => {
      mockJobsState.jobs = [makeJob()];
      render(<JobsPage />);
      expect(screen.getByText("Frontend Engineer")).toBeInTheDocument();
    });

    it("renders empty state when no jobs and not loading", () => {
      render(<JobsPage />);
      expect(screen.getByText("No results found")).toBeInTheDocument();
    });

    it("renders loading skeletons when isLoading is true", () => {
      mockJobsState.isLoading = true;
      render(<JobsPage />);
      // Skeletons should be present, not empty state
      expect(screen.queryByText("No results found")).not.toBeInTheDocument();
    });

    it("renders Load more button when hasMore is true", () => {
      mockJobsState.jobs = [makeJob()];
      mockJobsState.hasMore = true;
      render(<JobsPage />);
      expect(screen.getByRole("button", { name: /load more/i })).toBeInTheDocument();
    });

    it("does not render Load more button when hasMore is false", () => {
      mockJobsState.jobs = [makeJob()];
      mockJobsState.hasMore = false;
      render(<JobsPage />);
      expect(screen.queryByRole("button", { name: /load more/i })).not.toBeInTheDocument();
    });

    it("calls loadMore when Load more button is clicked", async () => {
      const user = userEvent.setup();
      mockJobsState.jobs = [makeJob()];
      mockJobsState.hasMore = true;
      render(<JobsPage />);
      await user.click(screen.getByRole("button", { name: /load more/i }));
      expect(mockLoadMore).toHaveBeenCalled();
    });
  });

  describe("Post a Job button (recruiter only)", () => {
    it("does not show Post a Job button for regular users", () => {
      render(<JobsPage />);
      expect(screen.queryByRole("button", { name: /post a job/i })).not.toBeInTheDocument();
    });

    it("shows Post a Job button for recruiters", () => {
      mockAuthUser = { ...mockUser, role: "recruiter" as "user" };
      render(<JobsPage />);
      expect(screen.getByRole("button", { name: /post a job/i })).toBeInTheDocument();
    });
  });

  describe("apply flow", () => {
    it("opens ApplyModal when Apply is clicked on a job card", async () => {
      const user = userEvent.setup();
      mockJobsState.jobs = [makeJob()];
      render(<JobsPage />);

      await user.click(screen.getByRole("button", { name: /apply/i }));

      // Modal should be visible
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });

    it("closes ApplyModal on cancel", async () => {
      const user = userEvent.setup();
      mockJobsState.jobs = [makeJob()];
      render(<JobsPage />);

      await user.click(screen.getByRole("button", { name: /apply/i }));
      expect(screen.getByRole("dialog")).toBeInTheDocument();

      await user.click(screen.getByRole("button", { name: /cancel/i }));
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });

  describe("save flow", () => {
    it("calls saveJob when Save is clicked on an unsaved job", async () => {
      const user = userEvent.setup();
      mockJobsState.jobs = [makeJob({ isSaved: false })];
      render(<JobsPage />);

      await user.click(screen.getByRole("button", { name: /save/i }));
      expect(mockSaveJob).toHaveBeenCalledWith("job-1");
    });

    it("calls unsaveJob when Unsave is clicked on a saved job", async () => {
      const user = userEvent.setup();
      mockJobsState.jobs = [makeJob({ isSaved: true })];
      render(<JobsPage />);

      await user.click(screen.getByRole("button", { name: /unsave/i }));
      expect(mockUnsaveJob).toHaveBeenCalledWith("job-1");
    });
  });
});
