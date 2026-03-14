import { render, screen } from "@testing-library/react";
import { TcoResults } from "../TcoResults";
import type { TcoComparison } from "@/types/costs";

const mockComparison: TcoComparison = {
  id: "tco-1",
  title: "Cloud vs On-Prem",
  options: [
    {
      name: "AWS Cloud",
      upfrontCost: 0,
      monthlyRecurring: 5000,
      teamSize: 2,
      hourlyRate: 75,
      durationMonths: 36,
      scalingFactor: 1.2,
      year1: 72000,
      year2: 86400,
      year3: 103680,
      totalCost: 262080,
    },
    {
      name: "On-Premise",
      upfrontCost: 100000,
      monthlyRecurring: 2000,
      teamSize: 3,
      hourlyRate: 75,
      durationMonths: 36,
      scalingFactor: 1.0,
      year1: 124000,
      year2: 24000,
      year3: 24000,
      totalCost: 172000,
    },
  ],
  winnerIndex: 1,
  aiAnalysis: "On-premise is more cost-effective over 3 years.",
  createdAt: "2026-03-14T00:00:00Z",
};

describe("TcoResults", () => {
  it("renders comparison title", () => {
    render(<TcoResults comparison={mockComparison} />);
    expect(screen.getByText("Cloud vs On-Prem")).toBeInTheDocument();
  });

  it("renders summary table with option names", () => {
    render(<TcoResults comparison={mockComparison} />);
    expect(screen.getAllByText("AWS Cloud").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("On-Premise").length).toBeGreaterThanOrEqual(1);
  });

  it("renders year columns in summary table", () => {
    render(<TcoResults comparison={mockComparison} />);
    expect(screen.getByText("Year 1")).toBeInTheDocument();
    expect(screen.getByText("Year 2")).toBeInTheDocument();
    expect(screen.getByText("Year 3")).toBeInTheDocument();
    expect(screen.getByText("Total")).toBeInTheDocument();
  });

  it("highlights the winner row", () => {
    render(<TcoResults comparison={mockComparison} />);
    const winnerRow = screen.getByTestId("tco-option-row-1");
    expect(winnerRow.className).toContain("bg-green");
  });

  it("renders bar chart for 3-year totals", () => {
    render(<TcoResults comparison={mockComparison} />);
    const bars = screen.getAllByTestId(/^tco-bar-/);
    expect(bars.length).toBeGreaterThanOrEqual(2);
  });

  it("renders AI analysis section", () => {
    render(<TcoResults comparison={mockComparison} />);
    expect(
      screen.getByText(/on-premise is more cost-effective/i)
    ).toBeInTheDocument();
  });

  it("has accessible table structure", () => {
    render(<TcoResults comparison={mockComparison} />);
    expect(screen.getByRole("table")).toBeInTheDocument();
    const columnHeaders = screen.getAllByRole("columnheader");
    expect(columnHeaders.length).toBeGreaterThanOrEqual(4);
  });
});
