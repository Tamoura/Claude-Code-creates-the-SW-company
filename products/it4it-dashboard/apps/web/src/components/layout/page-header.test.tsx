import { render, screen } from "@testing-library/react";
import { PageHeader } from "./page-header";
import { Button } from "@/components/ui/button";
import { describe, it, expect } from "vitest";

describe("PageHeader", () => {
  it("renders title and description", () => {
    render(
      <PageHeader
        title="Test Title"
        description="Test description"
      />
    );

    expect(screen.getByText("Test Title")).toBeInTheDocument();
    expect(screen.getByText("Test description")).toBeInTheDocument();
  });

  it("renders breadcrumbs when provided", () => {
    render(
      <PageHeader
        title="Test"
        breadcrumbs={[
          { title: "Dashboard", href: "/dashboard" },
          { title: "Current" },
        ]}
      />
    );

    expect(screen.getByText("Dashboard")).toBeInTheDocument();
    expect(screen.getByText("Current")).toBeInTheDocument();
  });

  it("renders actions when provided", () => {
    render(
      <PageHeader
        title="Test"
        actions={<Button>Action Button</Button>}
      />
    );

    expect(screen.getByText("Action Button")).toBeInTheDocument();
  });

  it("renders without optional props", () => {
    render(<PageHeader title="Simple Title" />);

    expect(screen.getByText("Simple Title")).toBeInTheDocument();
  });
});
