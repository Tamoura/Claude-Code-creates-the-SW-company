import { render, screen } from "@testing-library/react";
import { ComingSoon } from "./coming-soon";
import { describe, it, expect } from "vitest";

describe("ComingSoon", () => {
  it("renders with default text", () => {
    render(<ComingSoon />);

    expect(screen.getByText("Coming Soon")).toBeInTheDocument();
    expect(screen.getByText(/This feature is under development/i)).toBeInTheDocument();
    expect(screen.getByText("Check back soon for updates!")).toBeInTheDocument();
  });

  it("renders with custom title and description", () => {
    render(
      <ComingSoon
        title="Custom Title"
        description="Custom description text"
      />
    );

    expect(screen.getByText("Custom Title")).toBeInTheDocument();
    expect(screen.getByText("Custom description text")).toBeInTheDocument();
  });

  it("displays construction icon", () => {
    const { container } = render(<ComingSoon />);
    const icon = container.querySelector('svg');
    expect(icon).toBeInTheDocument();
  });
});
