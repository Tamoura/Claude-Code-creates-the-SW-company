import { render, screen } from "@testing-library/react";
import HelpPage from "../page";

describe("HelpPage", () => {
  beforeEach(() => {
    render(<HelpPage />);
  });

  it("renders the page heading", () => {
    expect(
      screen.getByRole("heading", { level: 1, name: /help center/i })
    ).toBeInTheDocument();
  });

  it("renders page description", () => {
    expect(
      screen.getByText(/find answers to common questions/i)
    ).toBeInTheDocument();
  });

  it("renders FAQ questions", () => {
    expect(
      screen.getByText(/what is ctoaas/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/how does the ai advisor work/i)
    ).toBeInTheDocument();
  });

  it("renders at least 5 FAQ items", () => {
    const summaries = screen.getAllByRole("group");
    expect(summaries.length).toBeGreaterThanOrEqual(5);
  });

  it("renders contact support section", () => {
    expect(
      screen.getByText(/still need help/i)
    ).toBeInTheDocument();
  });
});
