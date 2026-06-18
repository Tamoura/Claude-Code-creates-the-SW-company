import { render, screen } from "@testing-library/react";
import { CloudSpendAnalysisView } from "../CloudSpendAnalysisView";
import type { CloudSpendAnalysis } from "@/types/costs";

const mockAnalysis: CloudSpendAnalysis = {
  totalSpend: 10000,
  breakdown: [
    { category: "compute", amount: 5000, percentage: 50 },
    { category: "storage", amount: 2000, percentage: 20 },
    { category: "database", amount: 1500, percentage: 15 },
    { category: "networking", amount: 1000, percentage: 10 },
    { category: "other", amount: 500, percentage: 5 },
  ],
  benchmarks: [
    {
      category: "compute",
      yourSpend: 5000,
      industryAverage: 4000,
      percentDifference: 25,
    },
    {
      category: "storage",
      yourSpend: 2000,
      industryAverage: 2500,
      percentDifference: -20,
    },
  ],
  recommendations: [
    {
      title: "Right-size compute instances",
      description: "Your compute spend is 25% above industry average.",
      estimatedSavings: 1000,
      priority: "high",
    },
    {
      title: "Use reserved instances",
      description: "Commit to 1-year reservations for predictable workloads.",
      estimatedSavings: 500,
      priority: "medium",
    },
  ],
};

describe("CloudSpendAnalysisView", () => {
  it("renders total spend", () => {
    render(<CloudSpendAnalysisView analysis={mockAnalysis} />);
    expect(screen.getByText("$10,000")).toBeInTheDocument();
  });

  it("renders spend breakdown bars", () => {
    render(<CloudSpendAnalysisView analysis={mockAnalysis} />);
    const bars = screen.getAllByTestId(/^spend-bar-/);
    expect(bars).toHaveLength(5);
  });

  it("renders benchmark comparisons", () => {
    render(<CloudSpendAnalysisView analysis={mockAnalysis} />);
    expect(
      screen.getByRole("heading", { name: /industry average comparison/i })
    ).toBeInTheDocument();
  });

  it("renders recommendations", () => {
    render(<CloudSpendAnalysisView analysis={mockAnalysis} />);
    expect(
      screen.getByText("Right-size compute instances")
    ).toBeInTheDocument();
    expect(
      screen.getByText("Use reserved instances")
    ).toBeInTheDocument();
  });

  it("shows estimated savings for recommendations", () => {
    render(<CloudSpendAnalysisView analysis={mockAnalysis} />);
    expect(screen.getAllByText(/\$1,000/).length).toBeGreaterThanOrEqual(1);
  });

  it("renders priority badges on recommendations", () => {
    render(<CloudSpendAnalysisView analysis={mockAnalysis} />);
    expect(screen.getAllByText(/high/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/medium/i).length).toBeGreaterThanOrEqual(1);
  });

  it("has accessible structure", () => {
    render(<CloudSpendAnalysisView analysis={mockAnalysis} />);
    expect(
      screen.getByRole("heading", { name: /spend breakdown/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /recommendations/i })
    ).toBeInTheDocument();
  });
});
