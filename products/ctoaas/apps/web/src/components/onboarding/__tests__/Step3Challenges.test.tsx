import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Step3Challenges } from "../Step3Challenges";

describe("Step3Challenges", () => {
  const onSubmit = jest.fn();
  const onBack = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders heading and challenge chips", () => {
    render(<Step3Challenges onSubmit={onSubmit} onBack={onBack} />);

    expect(
      screen.getByRole("heading", { name: /challenges/i })
    ).toBeInTheDocument();
    expect(
      screen.getByText("Scaling infrastructure")
    ).toBeInTheDocument();
    expect(
      screen.getByText("Technical debt management")
    ).toBeInTheDocument();
  });

  it("toggles chip selection on click", async () => {
    const user = userEvent.setup();
    render(<Step3Challenges onSubmit={onSubmit} onBack={onBack} />);

    const chip = screen.getByRole("button", {
      name: /scaling infrastructure/i,
    });

    await user.click(chip);
    expect(chip).toHaveAttribute("aria-pressed", "true");

    await user.click(chip);
    expect(chip).toHaveAttribute("aria-pressed", "false");
  });

  it("shows error when submitted with no challenges", async () => {
    const user = userEvent.setup();
    render(<Step3Challenges onSubmit={onSubmit} onBack={onBack} />);

    await user.click(
      screen.getByRole("button", { name: /next/i })
    );

    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeInTheDocument();
    });
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("submits with selected challenges", async () => {
    const user = userEvent.setup();
    render(<Step3Challenges onSubmit={onSubmit} onBack={onBack} />);

    await user.click(
      screen.getByRole("button", {
        name: /scaling infrastructure/i,
      })
    );
    await user.click(
      screen.getByRole("button", { name: /team velocity/i })
    );

    await user.click(
      screen.getByRole("button", { name: /next/i })
    );

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          challenges: expect.arrayContaining([
            "Scaling infrastructure",
            "Team velocity",
          ]),
        })
      );
    });
  });

  it("allows adding a custom challenge", async () => {
    const user = userEvent.setup();
    render(<Step3Challenges onSubmit={onSubmit} onBack={onBack} />);

    const customInput = screen.getByPlaceholderText(
      /add a custom challenge/i
    );
    await user.type(customInput, "My unique challenge");
    await user.click(
      screen.getByRole("button", { name: /^add$/i })
    );

    expect(screen.getByText("My unique challenge")).toBeInTheDocument();
  });

  it("calls onBack when back button is clicked", async () => {
    const user = userEvent.setup();
    render(<Step3Challenges onSubmit={onSubmit} onBack={onBack} />);

    await user.click(
      screen.getByRole("button", { name: /back/i })
    );

    expect(onBack).toHaveBeenCalled();
  });

  it("populates initial data", () => {
    render(
      <Step3Challenges
        onSubmit={onSubmit}
        onBack={onBack}
        initialData={{
          challenges: ["Team velocity"],
          customChallenges: ["Custom one"],
        }}
      />
    );

    const tvChip = screen.getByRole("button", {
      name: /team velocity/i,
    });
    expect(tvChip).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText("Custom one")).toBeInTheDocument();
  });
});
