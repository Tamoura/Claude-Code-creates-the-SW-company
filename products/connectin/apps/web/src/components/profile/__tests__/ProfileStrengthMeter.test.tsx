import React from "react";
import { render, screen } from "@testing-library/react";
import { ProfileStrengthMeter } from "../ProfileStrengthMeter";

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: "en", changeLanguage: jest.fn() },
  }),
}));

describe("ProfileStrengthMeter", () => {
  it("renders the strength score", () => {
    render(
      <ProfileStrengthMeter score={75} completeness={80} suggestions={[]} />
    );
    expect(screen.getByText("75")).toBeInTheDocument();
  });

  it("renders suggestions list when provided", () => {
    render(
      <ProfileStrengthMeter
        score={40}
        completeness={50}
        suggestions={["Add a profile photo", "Add your skills"]}
      />
    );
    expect(screen.getByText("Add a profile photo")).toBeInTheDocument();
    expect(screen.getByText("Add your skills")).toBeInTheDocument();
  });

  it("applies red color class when score is below 40", () => {
    const { container } = render(
      <ProfileStrengthMeter score={30} completeness={30} suggestions={[]} />
    );
    expect(container.firstChild).toHaveClass("text-red-500");
  });

  it("applies yellow color class when score is between 40 and 70", () => {
    const { container } = render(
      <ProfileStrengthMeter score={55} completeness={55} suggestions={[]} />
    );
    expect(container.firstChild).toHaveClass("text-yellow-500");
  });

  it("applies green color class when score is above 70", () => {
    const { container } = render(
      <ProfileStrengthMeter score={85} completeness={90} suggestions={[]} />
    );
    expect(container.firstChild).toHaveClass("text-green-500");
  });

  it("has a progressbar with correct value", () => {
    render(
      <ProfileStrengthMeter score={60} completeness={65} suggestions={[]} />
    );
    const progressbar = screen.getByRole("progressbar");
    expect(progressbar).toHaveAttribute("aria-valuenow", "60");
  });

  it("renders empty suggestions message when no suggestions", () => {
    render(
      <ProfileStrengthMeter score={100} completeness={100} suggestions={[]} />
    );
    // No suggestion items rendered
    expect(screen.queryByRole("listitem")).not.toBeInTheDocument();
  });
});
