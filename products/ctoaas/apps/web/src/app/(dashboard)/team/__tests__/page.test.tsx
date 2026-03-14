import { render, screen } from "@testing-library/react";
import TeamPage from "../page";

describe("TeamPage", () => {
  beforeEach(() => {
    render(<TeamPage />);
  });

  it("renders the page heading", () => {
    expect(
      screen.getByRole("heading", { level: 1, name: /team management/i })
    ).toBeInTheDocument();
  });

  it("renders page description", () => {
    expect(
      screen.getByText(/manage your team members and collaboration/i)
    ).toBeInTheDocument();
  });

  it("renders planned feature cards", () => {
    expect(screen.getByText(/invite members/i)).toBeInTheDocument();
    expect(screen.getByText(/role assignment/i)).toBeInTheDocument();
    expect(screen.getByText(/shared conversations/i)).toBeInTheDocument();
  });

  it("renders empty state for team members", () => {
    expect(
      screen.getByText(/no team members yet/i)
    ).toBeInTheDocument();
  });
});
