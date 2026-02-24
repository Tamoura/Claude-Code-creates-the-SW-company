import React from "react";
import { render, screen } from "@testing-library/react";
import { useBookmarks } from "@/hooks/useBookmarks";

// Mock react-i18next
jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        "nav.saved": "Saved",
        noResults: "No results found",
        "saved.all": "All",
        "saved.posts": "Posts",
        "saved.jobs": "Jobs",
      };
      return translations[key] || key;
    },
    i18n: { language: "en", changeLanguage: jest.fn() },
  }),
}));

jest.mock("@/hooks/useBookmarks");

import SavedPage from "../saved/page";

describe("SavedPage", () => {
  beforeEach(() => {
    (useBookmarks as jest.Mock).mockReturnValue({
      bookmarks: [],
      isLoading: false,
      error: null,
      filteredBookmarks: () => [],
      addBookmark: jest.fn(),
      removeBookmark: jest.fn(),
      refetch: jest.fn(),
    });
  });

  it("renders the page heading", () => {
    render(<SavedPage />);
    expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
  });

  it("renders the Saved heading text", () => {
    render(<SavedPage />);
    expect(screen.getByRole("heading", { name: "Saved" })).toBeInTheDocument();
  });

  it("renders the empty state message", () => {
    render(<SavedPage />);
    expect(screen.getByText("No results found")).toBeInTheDocument();
  });

  it("renders filter tabs", () => {
    render(<SavedPage />);
    expect(screen.getByRole("button", { name: "All" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Posts" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Jobs" })).toBeInTheDocument();
  });

  it("renders the heading inside a white card", () => {
    render(<SavedPage />);
    const heading = screen.getByRole("heading", { name: "Saved" });
    const card = heading.closest(".rounded-\\[18px\\]");
    expect(card).toBeInTheDocument();
  });

  it("renders the empty state inside a card", () => {
    render(<SavedPage />);
    const emptyText = screen.getByText("No results found");
    expect(emptyText).toBeInTheDocument();
  });
});
