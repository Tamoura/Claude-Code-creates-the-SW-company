import React from "react";
import { render, screen } from "@testing-library/react";

// Mock react-i18next
jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        "nav.saved": "Saved",
        noResults: "No results found",
      };
      return translations[key] || key;
    },
    i18n: { language: "en", changeLanguage: jest.fn() },
  }),
}));

import SavedPage from "../saved/page";

describe("SavedPage", () => {
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

  it("renders two card sections", () => {
    render(<SavedPage />);
    // The page has a heading card and an empty state card — both are rounded divs
    const cards = document.querySelectorAll(".rounded-xl");
    expect(cards.length).toBe(2);
  });

  it("renders the heading inside a white card", () => {
    render(<SavedPage />);
    const heading = screen.getByRole("heading", { name: "Saved" });
    const card = heading.closest(".rounded-xl");
    expect(card).toBeInTheDocument();
  });

  it("renders the empty state inside a centered card", () => {
    render(<SavedPage />);
    const emptyText = screen.getByText("No results found");
    const card = emptyText.closest(".rounded-xl");
    expect(card).toHaveClass("text-center");
  });
});
