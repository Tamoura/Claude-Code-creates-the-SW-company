import { render, screen } from "@testing-library/react";
import { Breadcrumbs } from "./breadcrumbs";
import { describe, it, expect } from "vitest";

describe("Breadcrumbs", () => {
  it("renders breadcrumb items", () => {
    render(
      <Breadcrumbs
        items={[
          { title: "Dashboard", href: "/dashboard" },
          { title: "S2P", href: "/s2p" },
          { title: "Demands" },
        ]}
      />
    );

    expect(screen.getByText("Dashboard")).toBeInTheDocument();
    expect(screen.getByText("S2P")).toBeInTheDocument();
    expect(screen.getByText("Demands")).toBeInTheDocument();
  });

  it("renders links for items with href except the last one", () => {
    render(
      <Breadcrumbs
        items={[
          { title: "Dashboard", href: "/dashboard" },
          { title: "Current Page" },
        ]}
      />
    );

    const dashboardLink = screen.getByText("Dashboard");
    expect(dashboardLink.tagName).toBe("A");
    expect(dashboardLink).toHaveAttribute("href", "/dashboard");

    const currentPage = screen.getByText("Current Page");
    expect(currentPage.tagName).toBe("SPAN");
  });

  it("shows chevron separators between items", () => {
    const { container } = render(
      <Breadcrumbs
        items={[
          { title: "First" },
          { title: "Second" },
        ]}
      />
    );

    const chevrons = container.querySelectorAll('svg');
    expect(chevrons.length).toBeGreaterThan(0);
  });

  it("applies custom className", () => {
    const { container } = render(
      <Breadcrumbs
        items={[{ title: "Test" }]}
        className="custom-class"
      />
    );

    expect(container.firstChild).toHaveClass("custom-class");
  });
});
