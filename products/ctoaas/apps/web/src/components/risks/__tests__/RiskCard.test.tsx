import { render, screen } from "@testing-library/react";
import { RiskCard } from "../RiskCard";
import type { RiskCategorySummary } from "@/types/risks";

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

const mockSummary: RiskCategorySummary = {
  category: "tech-debt",
  score: 7,
  trend: "up",
  activeCount: 5,
};

describe("RiskCard", () => {
  it("renders category name", () => {
    render(<RiskCard summary={mockSummary} />);
    expect(screen.getByText("Tech Debt")).toBeInTheDocument();
  });

  it("renders score with correct value", () => {
    render(<RiskCard summary={mockSummary} />);
    expect(screen.getByText("7")).toBeInTheDocument();
  });

  it("renders active count", () => {
    render(<RiskCard summary={mockSummary} />);
    expect(screen.getByText(/5 active/i)).toBeInTheDocument();
  });

  it("renders trend indicator", () => {
    render(<RiskCard summary={mockSummary} />);
    expect(screen.getByText(/increasing/i)).toBeInTheDocument();
  });

  it("links to category detail page", () => {
    render(<RiskCard summary={mockSummary} />);
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/risks/tech-debt");
  });

  it("applies red color for high scores", () => {
    render(<RiskCard summary={mockSummary} />);
    const scoreEl = screen.getByTestId("risk-score");
    expect(scoreEl.className).toContain("bg-red");
  });

  it("applies green color for low scores", () => {
    const lowSummary: RiskCategorySummary = {
      ...mockSummary,
      score: 2,
      trend: "down",
    };
    render(<RiskCard summary={lowSummary} />);
    const scoreEl = screen.getByTestId("risk-score");
    expect(scoreEl.className).toContain("bg-green");
  });

  it("has accessible label", () => {
    render(<RiskCard summary={mockSummary} />);
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute(
      "aria-label",
      expect.stringContaining("Tech Debt")
    );
  });
});
