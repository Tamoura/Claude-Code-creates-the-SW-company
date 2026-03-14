import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Step4Preferences } from "../Step4Preferences";

describe("Step4Preferences", () => {
  const onSubmit = jest.fn();
  const onBack = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders heading and all preference sections", () => {
    render(<Step4Preferences onSubmit={onSubmit} onBack={onBack} />);

    expect(
      screen.getByRole("heading", { name: /preferences/i })
    ).toBeInTheDocument();
    expect(screen.getByText(/communication style/i)).toBeInTheDocument();
    expect(screen.getByText(/response format/i)).toBeInTheDocument();
    expect(screen.getByText(/detail level/i)).toBeInTheDocument();
    expect(screen.getByText(/areas of interest/i)).toBeInTheDocument();
  });

  it("renders radio buttons for communication style", () => {
    render(<Step4Preferences onSubmit={onSubmit} onBack={onBack} />);

    expect(screen.getByLabelText("Concise")).toBeInTheDocument();
    expect(screen.getByLabelText("Balanced")).toBeInTheDocument();
    expect(screen.getByLabelText("Detailed")).toBeInTheDocument();
  });

  it("renders radio buttons for response format", () => {
    render(<Step4Preferences onSubmit={onSubmit} onBack={onBack} />);

    expect(screen.getByLabelText("Executive summary")).toBeInTheDocument();
    expect(
      screen.getByLabelText("Technical deep-dive")
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText("Actionable recommendations")
    ).toBeInTheDocument();
  });

  it("renders radio buttons for detail level", () => {
    render(<Step4Preferences onSubmit={onSubmit} onBack={onBack} />);

    expect(screen.getByLabelText("High-level")).toBeInTheDocument();
    expect(screen.getByLabelText("Moderate")).toBeInTheDocument();
    expect(screen.getByLabelText("Granular")).toBeInTheDocument();
  });

  it("renders checkboxes for areas of interest", () => {
    render(<Step4Preferences onSubmit={onSubmit} onBack={onBack} />);

    expect(
      screen.getByRole("checkbox", { name: "Architecture" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("checkbox", { name: "Security" })
    ).toBeInTheDocument();
  });

  it("shows validation errors when submitted without required fields", async () => {
    const user = userEvent.setup();
    render(<Step4Preferences onSubmit={onSubmit} onBack={onBack} />);

    await user.click(
      screen.getByRole("button", { name: /complete/i })
    );

    await waitFor(() => {
      expect(screen.getAllByRole("alert").length).toBeGreaterThan(0);
    });
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("submits with valid selections", async () => {
    const user = userEvent.setup();
    render(<Step4Preferences onSubmit={onSubmit} onBack={onBack} />);

    await user.click(screen.getByLabelText("Balanced"));
    await user.click(screen.getByLabelText("Executive summary"));
    await user.click(screen.getByLabelText("Moderate"));
    await user.click(
      screen.getByRole("checkbox", { name: "Architecture" })
    );

    await user.click(
      screen.getByRole("button", { name: /complete/i })
    );

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          communicationStyle: "Balanced",
          responseFormat: "Executive summary",
          detailLevel: "Moderate",
          areasOfInterest: ["Architecture"],
        }),
        expect.anything()
      );
    });
  });

  it("calls onBack when back button is clicked", async () => {
    const user = userEvent.setup();
    render(<Step4Preferences onSubmit={onSubmit} onBack={onBack} />);

    await user.click(
      screen.getByRole("button", { name: /back/i })
    );

    expect(onBack).toHaveBeenCalled();
  });

  it("populates initial data", () => {
    render(
      <Step4Preferences
        onSubmit={onSubmit}
        onBack={onBack}
        initialData={{
          communicationStyle: "Detailed",
          responseFormat: "Technical deep-dive",
          detailLevel: "Granular",
          areasOfInterest: ["Security", "DevOps"],
        }}
      />
    );

    expect(screen.getByLabelText("Detailed")).toBeChecked();
    expect(
      screen.getByLabelText("Technical deep-dive")
    ).toBeChecked();
    expect(screen.getByLabelText("Granular")).toBeChecked();
    expect(
      screen.getByRole("checkbox", { name: "Security" })
    ).toBeChecked();
    expect(
      screen.getByRole("checkbox", { name: "DevOps" })
    ).toBeChecked();
  });
});
