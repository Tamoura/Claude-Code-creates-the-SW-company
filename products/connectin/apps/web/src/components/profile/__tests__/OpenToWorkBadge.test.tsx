import React from "react";
import { render, screen } from "@testing-library/react";
import { OpenToWorkBadge } from "../OpenToWorkBadge";

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: "en", changeLanguage: jest.fn() },
  }),
}));

describe("OpenToWorkBadge", () => {
  it("renders the badge when openToWork is true", () => {
    render(<OpenToWorkBadge openToWork={true} />);
    expect(screen.getByText(/open to work/i)).toBeInTheDocument();
  });

  it("does not render badge when openToWork is false", () => {
    const { container } = render(<OpenToWorkBadge openToWork={false} />);
    expect(container.firstChild).toBeNull();
  });

  it("has a green background", () => {
    render(<OpenToWorkBadge openToWork={true} />);
    const badge = screen.getByText(/open to work/i).closest("span");
    expect(badge).toHaveClass("bg-green-500");
  });

  it("has accessible label", () => {
    render(<OpenToWorkBadge openToWork={true} />);
    expect(screen.getByRole("status")).toBeInTheDocument();
  });
});
