import { render, screen } from "@testing-library/react";
import { BuildStatusBadge, DeploymentStatusBadge, ReleaseStatusBadge } from "./status-badge";
import { describe, it, expect } from "vitest";

describe("BuildStatusBadge", () => {
  it("renders pending status", () => {
    render(<BuildStatusBadge status="pending" />);
    expect(screen.getByText("Pending")).toBeInTheDocument();
  });

  it("renders running status", () => {
    render(<BuildStatusBadge status="running" />);
    expect(screen.getByText("Running")).toBeInTheDocument();
  });

  it("renders success status", () => {
    render(<BuildStatusBadge status="success" />);
    expect(screen.getByText("Success")).toBeInTheDocument();
  });

  it("renders failed status", () => {
    render(<BuildStatusBadge status="failed" />);
    expect(screen.getByText("Failed")).toBeInTheDocument();
  });

  it("renders cancelled status", () => {
    render(<BuildStatusBadge status="cancelled" />);
    expect(screen.getByText("Cancelled")).toBeInTheDocument();
  });
});

describe("DeploymentStatusBadge", () => {
  it("renders pending status", () => {
    render(<DeploymentStatusBadge status="pending" />);
    expect(screen.getByText("Pending")).toBeInTheDocument();
  });

  it("renders in_progress status", () => {
    render(<DeploymentStatusBadge status="in_progress" />);
    expect(screen.getByText("In Progress")).toBeInTheDocument();
  });

  it("renders success status", () => {
    render(<DeploymentStatusBadge status="success" />);
    expect(screen.getByText("Success")).toBeInTheDocument();
  });

  it("renders failed status", () => {
    render(<DeploymentStatusBadge status="failed" />);
    expect(screen.getByText("Failed")).toBeInTheDocument();
  });

  it("renders rolled_back status", () => {
    render(<DeploymentStatusBadge status="rolled_back" />);
    expect(screen.getByText("Rolled Back")).toBeInTheDocument();
  });
});

describe("ReleaseStatusBadge", () => {
  it("renders draft status", () => {
    render(<ReleaseStatusBadge status="draft" />);
    expect(screen.getByText("Draft")).toBeInTheDocument();
  });

  it("renders scheduled status", () => {
    render(<ReleaseStatusBadge status="scheduled" />);
    expect(screen.getByText("Scheduled")).toBeInTheDocument();
  });

  it("renders in_progress status", () => {
    render(<ReleaseStatusBadge status="in_progress" />);
    expect(screen.getByText("In Progress")).toBeInTheDocument();
  });

  it("renders completed status", () => {
    render(<ReleaseStatusBadge status="completed" />);
    expect(screen.getByText("Completed")).toBeInTheDocument();
  });

  it("renders failed status", () => {
    render(<ReleaseStatusBadge status="failed" />);
    expect(screen.getByText("Failed")).toBeInTheDocument();
  });

  it("renders cancelled status", () => {
    render(<ReleaseStatusBadge status="cancelled" />);
    expect(screen.getByText("Cancelled")).toBeInTheDocument();
  });
});
