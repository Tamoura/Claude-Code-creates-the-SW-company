import { render, screen } from "@testing-library/react";
import CompliancePage from "../page";

describe("CompliancePage", () => {
  beforeEach(() => {
    render(<CompliancePage />);
  });

  it("renders the page heading", () => {
    expect(
      screen.getByRole("heading", { level: 1, name: /compliance/i })
    ).toBeInTheDocument();
  });

  it("renders page description", () => {
    expect(
      screen.getByText(/assess your compliance posture/i)
    ).toBeInTheDocument();
  });

  it("renders compliance framework cards", () => {
    expect(screen.getByText("SOC 2")).toBeInTheDocument();
    expect(screen.getByText("ISO 27001")).toBeInTheDocument();
    expect(screen.getByText("GDPR")).toBeInTheDocument();
    expect(screen.getByText("HIPAA")).toBeInTheDocument();
  });

  it("renders assessment status for each framework", () => {
    const statuses = screen.getAllByText(/not assessed/i);
    expect(statuses.length).toBeGreaterThanOrEqual(4);
  });
});
