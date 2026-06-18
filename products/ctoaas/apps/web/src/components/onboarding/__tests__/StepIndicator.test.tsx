import { render, screen } from "@testing-library/react";
import { StepIndicator } from "../StepIndicator";

const STEP_NAMES = [
  "Company Basics",
  "Tech Stack",
  "Challenges",
  "Preferences",
];

describe("StepIndicator", () => {
  it("renders all 4 step names", () => {
    render(
      <StepIndicator currentStep={1} completedSteps={[]} />
    );

    STEP_NAMES.forEach((name) => {
      expect(screen.getByText(name)).toBeInTheDocument();
    });
  });

  it("marks the current step as active", () => {
    render(
      <StepIndicator currentStep={2} completedSteps={[1]} />
    );

    const step2Circle = screen.getByTestId("step-circle-2");
    expect(step2Circle).toHaveClass("bg-indigo-600");
  });

  it("marks completed steps with a checkmark", () => {
    render(
      <StepIndicator currentStep={3} completedSteps={[1, 2]} />
    );

    expect(screen.getByTestId("step-check-1")).toBeInTheDocument();
    expect(screen.getByTestId("step-check-2")).toBeInTheDocument();
  });

  it("marks upcoming steps as gray", () => {
    render(
      <StepIndicator currentStep={1} completedSteps={[]} />
    );

    const step3Circle = screen.getByTestId("step-circle-3");
    expect(step3Circle).toHaveClass("bg-gray-200");
  });

  it("shows step numbers for non-completed, non-active steps", () => {
    render(
      <StepIndicator currentStep={1} completedSteps={[]} />
    );

    expect(screen.getByTestId("step-circle-4")).toHaveTextContent("4");
  });

  it("has accessible step indicators", () => {
    render(
      <StepIndicator currentStep={2} completedSteps={[1]} />
    );

    const nav = screen.getByRole("navigation", {
      name: /onboarding progress/i,
    });
    expect(nav).toBeInTheDocument();
  });
});
