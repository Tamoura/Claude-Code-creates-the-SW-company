import { render, screen, fireEvent } from "@testing-library/react";
import { RiskItemRow } from "../RiskItemRow";
import type { RiskItem } from "@/types/risks";

const mockItem: RiskItem = {
  id: "risk-1",
  category: "tech-debt",
  title: "Legacy Node.js version",
  description: "Running Node 14 which is EOL and no longer receiving security patches.",
  severity: 8,
  trend: "up",
  status: "active",
  affectedSystems: ["API Gateway"],
  mitigations: ["Upgrade to Node 20"],
  createdAt: "2026-03-01T00:00:00Z",
  updatedAt: "2026-03-14T00:00:00Z",
};

describe("RiskItemRow", () => {
  const mockOnStatusChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders item title", () => {
    render(
      <RiskItemRow item={mockItem} onStatusChange={mockOnStatusChange} />
    );
    expect(screen.getByText("Legacy Node.js version")).toBeInTheDocument();
  });

  it("renders severity badge", () => {
    render(
      <RiskItemRow item={mockItem} onStatusChange={mockOnStatusChange} />
    );
    expect(screen.getByTestId("severity-badge")).toHaveTextContent("8");
  });

  it("renders status badge", () => {
    render(
      <RiskItemRow item={mockItem} onStatusChange={mockOnStatusChange} />
    );
    expect(screen.getByText(/active/i)).toBeInTheDocument();
  });

  it("renders trend indicator", () => {
    render(
      <RiskItemRow item={mockItem} onStatusChange={mockOnStatusChange} />
    );
    expect(screen.getByText(/increasing/i)).toBeInTheDocument();
  });

  it("calls onStatusChange when mitigate button clicked", () => {
    render(
      <RiskItemRow item={mockItem} onStatusChange={mockOnStatusChange} />
    );
    fireEvent.click(screen.getByRole("button", { name: /mitigate/i }));
    expect(mockOnStatusChange).toHaveBeenCalledWith("risk-1", "mitigated");
  });

  it("calls onStatusChange when dismiss button clicked", () => {
    render(
      <RiskItemRow item={mockItem} onStatusChange={mockOnStatusChange} />
    );
    fireEvent.click(screen.getByRole("button", { name: /dismiss/i }));
    expect(mockOnStatusChange).toHaveBeenCalledWith("risk-1", "dismissed");
  });

  it("shows description preview", () => {
    render(
      <RiskItemRow item={mockItem} onStatusChange={mockOnStatusChange} />
    );
    expect(screen.getByText(/Running Node 14/)).toBeInTheDocument();
  });

  it("has discuss link with risk context", () => {
    render(
      <RiskItemRow item={mockItem} onStatusChange={mockOnStatusChange} />
    );
    const link = screen.getByRole("link", { name: /discuss/i });
    expect(link).toHaveAttribute("href", "/chat?context=risk:risk-1");
  });
});
