import {
  render,
  screen,
  waitFor,
  fireEvent,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Step2TechStack } from "../Step2TechStack";

describe("Step2TechStack", () => {
  const onSubmit = jest.fn();
  const onBack = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders language, framework, database, cloud, and notes fields", () => {
    render(<Step2TechStack onSubmit={onSubmit} onBack={onBack} />);

    expect(screen.getByLabelText(/languages/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/frameworks/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/databases/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/cloud provider/i)).toBeInTheDocument();
    expect(
      screen.getByLabelText(/architecture notes/i)
    ).toBeInTheDocument();
  });

  it("renders heading", () => {
    render(<Step2TechStack onSubmit={onSubmit} onBack={onBack} />);

    expect(
      screen.getByRole("heading", { name: /tech stack/i })
    ).toBeInTheDocument();
  });

  it("calls onSubmit with form data", async () => {
    const user = userEvent.setup();
    render(<Step2TechStack onSubmit={onSubmit} onBack={onBack} />);

    fireEvent.change(screen.getByLabelText(/cloud provider/i), {
      target: { value: "AWS" },
    });
    await user.type(
      screen.getByLabelText(/architecture notes/i),
      "Our architecture"
    );

    await user.click(
      screen.getByRole("button", { name: /next/i })
    );

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          cloudProvider: "AWS",
          architectureNotes: "Our architecture",
        })
      );
    });
  });

  it("calls onBack when back button is clicked", async () => {
    const user = userEvent.setup();
    render(<Step2TechStack onSubmit={onSubmit} onBack={onBack} />);

    await user.click(
      screen.getByRole("button", { name: /back/i })
    );

    expect(onBack).toHaveBeenCalled();
  });

  it("limits architectureNotes to 2000 chars via maxLength", () => {
    render(<Step2TechStack onSubmit={onSubmit} onBack={onBack} />);

    const notes = screen.getByLabelText(/architecture notes/i);
    expect(notes).toHaveAttribute("maxlength", "2000");
  });

  it("populates initial data", () => {
    render(
      <Step2TechStack
        onSubmit={onSubmit}
        onBack={onBack}
        initialData={{
          languages: ["TypeScript"],
          frameworks: ["React"],
          databases: ["PostgreSQL"],
          cloudProvider: "AWS",
          architectureNotes: "Notes here",
        }}
      />
    );

    expect(screen.getByLabelText(/cloud provider/i)).toHaveValue("AWS");
    expect(screen.getByLabelText(/architecture notes/i)).toHaveValue(
      "Notes here"
    );
    expect(screen.getByText("TypeScript")).toBeInTheDocument();
  });
});
