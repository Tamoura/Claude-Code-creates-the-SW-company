import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CloudSpendForm } from "../CloudSpendForm";

describe("CloudSpendForm", () => {
  const mockOnSubmit = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders provider select", () => {
    render(<CloudSpendForm onSubmit={mockOnSubmit} />);
    expect(screen.getByLabelText(/cloud provider/i)).toBeInTheDocument();
  });

  it("renders period date fields", () => {
    render(<CloudSpendForm onSubmit={mockOnSubmit} />);
    expect(screen.getByLabelText(/start date/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/end date/i)).toBeInTheDocument();
  });

  it("renders all spend category fields", () => {
    render(<CloudSpendForm onSubmit={mockOnSubmit} />);
    expect(screen.getByLabelText(/compute/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/storage/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/database/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/networking/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/other/i)).toBeInTheDocument();
  });

  it("auto-calculates total from categories", async () => {
    const user = userEvent.setup();
    render(<CloudSpendForm onSubmit={mockOnSubmit} />);

    const computeInput = screen.getByLabelText(/compute/i);
    const storageInput = screen.getByLabelText(/storage/i);

    await user.clear(computeInput);
    await user.type(computeInput, "1000");
    await user.clear(storageInput);
    await user.type(storageInput, "500");

    const totalDisplay = screen.getByTestId("spend-total");
    expect(totalDisplay).toHaveTextContent("$1,500");
  });

  it("renders save button", () => {
    render(<CloudSpendForm onSubmit={mockOnSubmit} />);
    expect(
      screen.getByRole("button", { name: /save/i })
    ).toBeInTheDocument();
  });

  it("shows validation errors for missing provider", async () => {
    const user = userEvent.setup();
    render(<CloudSpendForm onSubmit={mockOnSubmit} />);

    await user.click(screen.getByRole("button", { name: /save/i }));

    expect(
      await screen.findByText(/provider is required/i)
    ).toBeInTheDocument();
    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it("shows loading state when submitting", () => {
    render(<CloudSpendForm onSubmit={mockOnSubmit} isLoading />);
    const button = screen.getByRole("button", { name: /saving/i });
    expect(button).toBeDisabled();
  });

  it("renders provider options", () => {
    render(<CloudSpendForm onSubmit={mockOnSubmit} />);
    const select = screen.getByLabelText(/cloud provider/i);
    expect(select).toBeInTheDocument();
    // Check that options exist
    expect(screen.getByText("AWS")).toBeInTheDocument();
    expect(screen.getByText("Google Cloud")).toBeInTheDocument();
    expect(screen.getByText("Microsoft Azure")).toBeInTheDocument();
  });
});
