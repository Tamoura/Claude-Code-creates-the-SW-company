import { render, screen } from "@testing-library/react";
import { RequestStatusBadge, SubscriptionStatusBadge, ServiceCategoryBadge } from "./status-badge";
import { describe, it, expect } from "vitest";

describe("RequestStatusBadge", () => {
  it("renders draft status", () => {
    render(<RequestStatusBadge status="draft" />);
    expect(screen.getByText("Draft")).toBeInTheDocument();
  });

  it("renders submitted status", () => {
    render(<RequestStatusBadge status="submitted" />);
    expect(screen.getByText("Submitted")).toBeInTheDocument();
  });

  it("renders approved status", () => {
    render(<RequestStatusBadge status="approved" />);
    expect(screen.getByText("Approved")).toBeInTheDocument();
  });

  it("renders rejected status", () => {
    render(<RequestStatusBadge status="rejected" />);
    expect(screen.getByText("Rejected")).toBeInTheDocument();
  });

  it("renders fulfilling status", () => {
    render(<RequestStatusBadge status="fulfilling" />);
    expect(screen.getByText("Fulfilling")).toBeInTheDocument();
  });

  it("renders fulfilled status", () => {
    render(<RequestStatusBadge status="fulfilled" />);
    expect(screen.getByText("Fulfilled")).toBeInTheDocument();
  });

  it("renders cancelled status", () => {
    render(<RequestStatusBadge status="cancelled" />);
    expect(screen.getByText("Cancelled")).toBeInTheDocument();
  });
});

describe("SubscriptionStatusBadge", () => {
  it("renders active status", () => {
    render(<SubscriptionStatusBadge status="active" />);
    expect(screen.getByText("Active")).toBeInTheDocument();
  });

  it("renders suspended status", () => {
    render(<SubscriptionStatusBadge status="suspended" />);
    expect(screen.getByText("Suspended")).toBeInTheDocument();
  });

  it("renders expired status", () => {
    render(<SubscriptionStatusBadge status="expired" />);
    expect(screen.getByText("Expired")).toBeInTheDocument();
  });

  it("renders cancelled status", () => {
    render(<SubscriptionStatusBadge status="cancelled" />);
    expect(screen.getByText("Cancelled")).toBeInTheDocument();
  });
});

describe("ServiceCategoryBadge", () => {
  it("renders compute category", () => {
    render(<ServiceCategoryBadge category="compute" />);
    expect(screen.getByText("Compute")).toBeInTheDocument();
  });

  it("renders storage category", () => {
    render(<ServiceCategoryBadge category="storage" />);
    expect(screen.getByText("Storage")).toBeInTheDocument();
  });

  it("renders database category", () => {
    render(<ServiceCategoryBadge category="database" />);
    expect(screen.getByText("Database")).toBeInTheDocument();
  });

  it("renders networking category", () => {
    render(<ServiceCategoryBadge category="networking" />);
    expect(screen.getByText("Networking")).toBeInTheDocument();
  });

  it("renders security category", () => {
    render(<ServiceCategoryBadge category="security" />);
    expect(screen.getByText("Security")).toBeInTheDocument();
  });

  it("renders software category", () => {
    render(<ServiceCategoryBadge category="software" />);
    expect(screen.getByText("Software")).toBeInTheDocument();
  });
});
