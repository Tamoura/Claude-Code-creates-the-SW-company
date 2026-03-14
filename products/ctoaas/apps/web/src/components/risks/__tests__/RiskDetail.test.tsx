import { render, screen, fireEvent } from "@testing-library/react";
import { RiskDetail } from "../RiskDetail";
import type { RiskItem } from "@/types/risks";

const mockItem: RiskItem = {
  id: "risk-1",
  category: "tech-debt",
  title: "Legacy Node.js version",
  description: "Running Node 14 which is EOL and no longer receiving security patches.",
  severity: 8,
  trend: "up",
  status: "active",
  affectedSystems: ["API Gateway", "Worker Service"],
  mitigations: ["Upgrade to Node 20", "Add security scanning"],
  createdAt: "2026-03-01T00:00:00Z",
  updatedAt: "2026-03-14T00:00:00Z",
};

describe("RiskDetail", () => {
  const mockOnStatusChange = jest.fn();
  const mockOnClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders full title", () => {
    render(
      <RiskDetail
        item={mockItem}
        onStatusChange={mockOnStatusChange}
        onClose={mockOnClose}
      />
    );
    expect(screen.getByText("Legacy Node.js version")).toBeInTheDocument();
  });

  it("renders full description", () => {
    render(
      <RiskDetail
        item={mockItem}
        onStatusChange={mockOnStatusChange}
        onClose={mockOnClose}
      />
    );
    expect(
      screen.getByText(/Running Node 14 which is EOL/)
    ).toBeInTheDocument();
  });

  it("renders affected systems list", () => {
    render(
      <RiskDetail
        item={mockItem}
        onStatusChange={mockOnStatusChange}
        onClose={mockOnClose}
      />
    );
    expect(screen.getByText("API Gateway")).toBeInTheDocument();
    expect(screen.getByText("Worker Service")).toBeInTheDocument();
  });

  it("renders mitigations list", () => {
    render(
      <RiskDetail
        item={mockItem}
        onStatusChange={mockOnStatusChange}
        onClose={mockOnClose}
      />
    );
    expect(screen.getByText("Upgrade to Node 20")).toBeInTheDocument();
    expect(screen.getByText("Add security scanning")).toBeInTheDocument();
  });

  it("renders AI recommendations placeholder", () => {
    render(
      <RiskDetail
        item={mockItem}
        onStatusChange={mockOnStatusChange}
        onClose={mockOnClose}
      />
    );
    expect(
      screen.getByText(/AI recommendations/i)
    ).toBeInTheDocument();
  });

  it("renders status change buttons", () => {
    render(
      <RiskDetail
        item={mockItem}
        onStatusChange={mockOnStatusChange}
        onClose={mockOnClose}
      />
    );
    expect(
      screen.getByRole("button", { name: /mark as mitigated/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /dismiss risk/i })
    ).toBeInTheDocument();
  });

  it("calls onClose when close button clicked", () => {
    render(
      <RiskDetail
        item={mockItem}
        onStatusChange={mockOnStatusChange}
        onClose={mockOnClose}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: /close/i }));
    expect(mockOnClose).toHaveBeenCalled();
  });

  it("calls onStatusChange with mitigated", () => {
    render(
      <RiskDetail
        item={mockItem}
        onStatusChange={mockOnStatusChange}
        onClose={mockOnClose}
      />
    );
    fireEvent.click(
      screen.getByRole("button", { name: /mark as mitigated/i })
    );
    expect(mockOnStatusChange).toHaveBeenCalledWith("risk-1", "mitigated");
  });
});
