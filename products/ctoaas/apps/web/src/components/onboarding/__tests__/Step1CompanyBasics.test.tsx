import {
  render,
  screen,
  waitFor,
  fireEvent,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Step1CompanyBasics } from "../Step1CompanyBasics";

describe("Step1CompanyBasics", () => {
  const onSubmit = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders industry, employee count, growth stage, and founded year fields", () => {
    render(<Step1CompanyBasics onSubmit={onSubmit} />);

    expect(screen.getByLabelText(/industry/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/employee count/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/growth stage/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/founded year/i)).toBeInTheDocument();
  });

  it("renders heading and description", () => {
    render(<Step1CompanyBasics onSubmit={onSubmit} />);

    expect(
      screen.getByRole("heading", { name: /company basics/i })
    ).toBeInTheDocument();
  });

  it("shows validation errors when submitted empty", async () => {
    const user = userEvent.setup();
    render(<Step1CompanyBasics onSubmit={onSubmit} />);

    await user.click(
      screen.getByRole("button", { name: /next/i })
    );

    await waitFor(() => {
      expect(screen.getAllByRole("alert").length).toBeGreaterThan(0);
    });
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("calls onSubmit with valid data", async () => {
    const user = userEvent.setup();
    render(<Step1CompanyBasics onSubmit={onSubmit} />);

    // Use fireEvent.change for selects to ensure RHF registers the change
    fireEvent.change(screen.getByLabelText(/industry/i), {
      target: { value: "Technology" },
    });
    fireEvent.change(screen.getByLabelText(/employee count/i), {
      target: { value: "11-50" },
    });
    fireEvent.change(screen.getByLabelText(/growth stage/i), {
      target: { value: "Series A" },
    });
    await user.type(screen.getByLabelText(/founded year/i), "2020");

    await user.click(
      screen.getByRole("button", { name: /next/i })
    );

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          industry: "Technology",
          employeeCount: "11-50",
          growthStage: "Series A",
          foundedYear: 2020,
        }),
        expect.anything()
      );
    });
  });

  it("populates form with initial data", () => {
    render(
      <Step1CompanyBasics
        onSubmit={onSubmit}
        initialData={{
          industry: "Finance",
          employeeCount: "51-200",
          growthStage: "Series B",
          foundedYear: 2015,
        }}
      />
    );

    expect(screen.getByLabelText(/industry/i)).toHaveValue("Finance");
    expect(screen.getByLabelText(/employee count/i)).toHaveValue(
      "51-200"
    );
    expect(screen.getByLabelText(/growth stage/i)).toHaveValue(
      "Series B"
    );
    expect(screen.getByLabelText(/founded year/i)).toHaveValue(2015);
  });

  it("has aria-invalid on fields with errors", async () => {
    const user = userEvent.setup();
    render(<Step1CompanyBasics onSubmit={onSubmit} />);

    await user.click(
      screen.getByRole("button", { name: /next/i })
    );

    await waitFor(() => {
      expect(screen.getByLabelText(/industry/i)).toHaveAttribute(
        "aria-invalid",
        "true"
      );
    });
  });
});
