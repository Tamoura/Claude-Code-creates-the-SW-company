import { render, screen } from "@testing-library/react";
import ReportsPage from "../page";

describe("ReportsPage", () => {
  beforeEach(() => {
    render(<ReportsPage />);
  });

  it("renders the page heading", () => {
    expect(
      screen.getByRole("heading", { level: 1, name: /reports/i })
    ).toBeInTheDocument();
  });

  it("renders page description", () => {
    expect(
      screen.getByText(/generate executive-ready reports/i)
    ).toBeInTheDocument();
  });

  it("renders report type cards", () => {
    expect(screen.getByText("Board Report")).toBeInTheDocument();
    expect(screen.getByText("Tech Health")).toBeInTheDocument();
    expect(screen.getByText("Cost Summary")).toBeInTheDocument();
  });

  it("renders descriptions for each report type", () => {
    expect(
      screen.getByText(/executive summary for board presentation/i)
    ).toBeInTheDocument();
  });

  it("renders empty state message", () => {
    expect(
      screen.getByText(/no reports generated yet/i)
    ).toBeInTheDocument();
  });
});
