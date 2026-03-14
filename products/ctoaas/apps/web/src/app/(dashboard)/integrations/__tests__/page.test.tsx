import { render, screen } from "@testing-library/react";
import IntegrationsPage from "../page";

describe("IntegrationsPage", () => {
  beforeEach(() => {
    render(<IntegrationsPage />);
  });

  it("renders the page heading", () => {
    expect(
      screen.getByRole("heading", { level: 1, name: /integrations/i })
    ).toBeInTheDocument();
  });

  it("renders page description", () => {
    expect(
      screen.getByText(/connect ctoaas with your existing tools/i)
    ).toBeInTheDocument();
  });

  it("renders integration cards for planned tools", () => {
    expect(screen.getByText("Jira")).toBeInTheDocument();
    expect(screen.getByText("GitHub")).toBeInTheDocument();
    expect(screen.getByText("Slack")).toBeInTheDocument();
    expect(screen.getByText("PagerDuty")).toBeInTheDocument();
  });

  it("renders phase 2 labels", () => {
    const labels = screen.getAllByText(/planned for phase 2/i);
    expect(labels.length).toBeGreaterThanOrEqual(4);
  });
});
