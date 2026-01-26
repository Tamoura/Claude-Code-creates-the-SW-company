import { render, screen } from "@testing-library/react";
import { ValueStreamCard } from "./value-stream-card";
import { Target } from "lucide-react";
import { describe, it, expect } from "vitest";

describe("ValueStreamCard", () => {
  const mockMetrics = [
    { label: "Metric 1", value: "100" },
    { label: "Metric 2", value: 50 },
  ];

  it("renders title and description", () => {
    render(
      <ValueStreamCard
        title="Test Stream"
        description="Test description"
        href="/test"
        icon={Target}
        color="bg-blue-600"
        metrics={mockMetrics}
      />
    );

    expect(screen.getByText("Test Stream")).toBeInTheDocument();
    expect(screen.getByText("Test description")).toBeInTheDocument();
  });

  it("renders all metrics", () => {
    render(
      <ValueStreamCard
        title="Test Stream"
        description="Test"
        href="/test"
        icon={Target}
        color="bg-blue-600"
        metrics={mockMetrics}
      />
    );

    expect(screen.getByText("Metric 1")).toBeInTheDocument();
    expect(screen.getByText("100")).toBeInTheDocument();
    expect(screen.getByText("Metric 2")).toBeInTheDocument();
    expect(screen.getByText("50")).toBeInTheDocument();
  });

  it("renders view dashboard button with correct link", () => {
    render(
      <ValueStreamCard
        title="Test Stream"
        description="Test"
        href="/test-stream"
        icon={Target}
        color="bg-blue-600"
        metrics={mockMetrics}
      />
    );

    const link = screen.getByRole("button", { name: /view dashboard/i }).closest("a");
    expect(link).toHaveAttribute("href", "/test-stream");
  });

  it("renders icon", () => {
    const { container } = render(
      <ValueStreamCard
        title="Test"
        description="Test"
        href="/test"
        icon={Target}
        color="bg-blue-600"
        metrics={mockMetrics}
      />
    );

    const icon = container.querySelector("svg");
    expect(icon).toBeInTheDocument();
  });
});
