import { render, screen } from "@testing-library/react";
import { IncidentStatusBadge, SeverityBadge } from "./status-badge";
import { describe, it, expect } from "vitest";

describe("IncidentStatusBadge", () => {
  it("renders new status", () => {
    render(<IncidentStatusBadge status="new" />);
    expect(screen.getByText("New")).toBeInTheDocument();
  });

  it("renders assigned status", () => {
    render(<IncidentStatusBadge status="assigned" />);
    expect(screen.getByText("Assigned")).toBeInTheDocument();
  });

  it("renders in progress status", () => {
    render(<IncidentStatusBadge status="in_progress" />);
    expect(screen.getByText("In Progress")).toBeInTheDocument();
  });

  it("renders resolved status", () => {
    render(<IncidentStatusBadge status="resolved" />);
    expect(screen.getByText("Resolved")).toBeInTheDocument();
  });

  it("renders closed status", () => {
    render(<IncidentStatusBadge status="closed" />);
    expect(screen.getByText("Closed")).toBeInTheDocument();
  });
});

describe("SeverityBadge", () => {
  it("renders critical severity", () => {
    render(<SeverityBadge severity={1} />);
    expect(screen.getByText("Critical")).toBeInTheDocument();
  });

  it("renders high severity", () => {
    render(<SeverityBadge severity={2} />);
    expect(screen.getByText("High")).toBeInTheDocument();
  });

  it("renders medium severity", () => {
    render(<SeverityBadge severity={3} />);
    expect(screen.getByText("Medium")).toBeInTheDocument();
  });

  it("renders low severity", () => {
    render(<SeverityBadge severity={4} />);
    expect(screen.getByText("Low")).toBeInTheDocument();
  });
});
