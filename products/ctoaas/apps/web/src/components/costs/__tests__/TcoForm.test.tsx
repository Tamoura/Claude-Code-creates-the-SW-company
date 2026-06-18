import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TcoForm } from "../TcoForm";

describe("TcoForm", () => {
  const mockOnSubmit = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders title input", () => {
    render(<TcoForm onSubmit={mockOnSubmit} />);
    expect(
      screen.getByLabelText(/comparison title/i)
    ).toBeInTheDocument();
  });

  it("renders two option sections by default", () => {
    render(<TcoForm onSubmit={mockOnSubmit} />);
    const optionSections = screen.getAllByTestId(/^tco-option-/);
    expect(optionSections).toHaveLength(2);
  });

  it("renders all fields for each option", () => {
    render(<TcoForm onSubmit={mockOnSubmit} />);
    const firstOption = screen.getByTestId("tco-option-0");
    expect(
      within(firstOption).getByLabelText(/option name/i)
    ).toBeInTheDocument();
    expect(
      within(firstOption).getByLabelText(/upfront cost/i)
    ).toBeInTheDocument();
    expect(
      within(firstOption).getByLabelText(/monthly recurring/i)
    ).toBeInTheDocument();
    expect(
      within(firstOption).getByLabelText(/team size/i)
    ).toBeInTheDocument();
    expect(
      within(firstOption).getByLabelText(/hourly rate/i)
    ).toBeInTheDocument();
    expect(
      within(firstOption).getByLabelText(/duration/i)
    ).toBeInTheDocument();
    expect(
      within(firstOption).getByLabelText(/scaling factor/i)
    ).toBeInTheDocument();
  });

  it("adds a new option when Add Option is clicked", async () => {
    const user = userEvent.setup();
    render(<TcoForm onSubmit={mockOnSubmit} />);

    const addButton = screen.getByRole("button", { name: /add option/i });
    await user.click(addButton);

    const optionSections = screen.getAllByTestId(/^tco-option-/);
    expect(optionSections).toHaveLength(3);
  });

  it("removes an option when remove is clicked (if more than 2)", async () => {
    const user = userEvent.setup();
    render(<TcoForm onSubmit={mockOnSubmit} />);

    // Add a third option first
    await user.click(screen.getByRole("button", { name: /add option/i }));
    expect(screen.getAllByTestId(/^tco-option-/)).toHaveLength(3);

    // Remove the third option
    const removeButtons = screen.getAllByRole("button", {
      name: /remove option/i,
    });
    await user.click(removeButtons[2]);
    expect(screen.getAllByTestId(/^tco-option-/)).toHaveLength(2);
  });

  it("does not allow removing options below minimum of 2", () => {
    render(<TcoForm onSubmit={mockOnSubmit} />);
    const removeButtons = screen.queryAllByRole("button", {
      name: /remove option/i,
    });
    expect(removeButtons).toHaveLength(0);
  });

  it("shows validation errors for empty required fields on submit", async () => {
    const user = userEvent.setup();
    render(<TcoForm onSubmit={mockOnSubmit} />);

    await user.click(screen.getByRole("button", { name: /calculate/i }));

    expect(await screen.findByText(/title is required/i)).toBeInTheDocument();
    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it("renders calculate button", () => {
    render(<TcoForm onSubmit={mockOnSubmit} />);
    expect(
      screen.getByRole("button", { name: /calculate/i })
    ).toBeInTheDocument();
  });

  it("shows loading state when submitting", () => {
    render(<TcoForm onSubmit={mockOnSubmit} isLoading />);
    const button = screen.getByRole("button", { name: /calculating/i });
    expect(button).toBeDisabled();
  });
});
