import { render, screen } from "@testing-library/react";
import { KPICard } from "./kpi-card";
import { describe, it, expect } from "vitest";

describe("KPICard", () => {
  it("renders title and value", () => {
    render(<KPICard title="Test KPI" value="100" />);

    expect(screen.getByText("Test KPI")).toBeInTheDocument();
    expect(screen.getByText("100")).toBeInTheDocument();
  });

  it("renders with numeric value", () => {
    render(<KPICard title="Count" value={42} />);

    expect(screen.getByText("42")).toBeInTheDocument();
  });

  it("displays change and trend indicator", () => {
    render(
      <KPICard
        title="Incidents"
        value="50"
        change={-12}
        trend="down"
        description="vs last week"
      />
    );

    expect(screen.getByText("12%")).toBeInTheDocument();
    expect(screen.getByText("vs last week")).toBeInTheDocument();
  });

  it("shows description without change", () => {
    render(
      <KPICard
        title="Status"
        value="Active"
        description="Current status"
      />
    );

    expect(screen.getByText("Current status")).toBeInTheDocument();
  });

  it("applies custom className", () => {
    const { container } = render(
      <KPICard
        title="Test"
        value="123"
        className="custom-class"
      />
    );

    expect(container.querySelector(".custom-class")).toBeInTheDocument();
  });
});
