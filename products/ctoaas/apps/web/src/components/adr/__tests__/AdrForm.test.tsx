import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AdrForm } from "../AdrForm";

describe("AdrForm", () => {
  const onSubmit = jest.fn();
  const onCancel = jest.fn();

  beforeEach(() => {
    onSubmit.mockClear();
    onCancel.mockClear();
    onSubmit.mockResolvedValue(undefined);
  });

  it("renders all form fields", () => {
    render(
      <AdrForm onSubmit={onSubmit} onCancel={onCancel} isSaving={false} />
    );
    expect(screen.getByLabelText(/title/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/status/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/context/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^decision/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/consequences/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/alternatives/i)).toBeInTheDocument();
    expect(
      screen.getByLabelText(/architecture diagram/i)
    ).toBeInTheDocument();
  });

  it("renders create button when no initial data", () => {
    render(
      <AdrForm onSubmit={onSubmit} onCancel={onCancel} isSaving={false} />
    );
    expect(
      screen.getByRole("button", { name: /create adr/i })
    ).toBeInTheDocument();
  });

  it("renders update button when initial data provided", () => {
    render(
      <AdrForm
        initialData={{
          id: "1",
          title: "Test",
          status: "proposed",
          context: "Context",
          decision: "Decision",
          consequences: "",
          alternatives: "",
          diagram: "",
          createdAt: "2026-01-01T00:00:00Z",
          updatedAt: "2026-01-01T00:00:00Z",
        }}
        onSubmit={onSubmit}
        onCancel={onCancel}
        isSaving={false}
      />
    );
    expect(
      screen.getByRole("button", { name: /update adr/i })
    ).toBeInTheDocument();
  });

  it("shows validation errors for empty required fields", async () => {
    render(
      <AdrForm onSubmit={onSubmit} onCancel={onCancel} isSaving={false} />
    );
    fireEvent.click(screen.getByRole("button", { name: /create adr/i }));

    await waitFor(() => {
      expect(screen.getByText("Title is required")).toBeInTheDocument();
    });
    await waitFor(() => {
      expect(
        screen.getByText("Context is required")
      ).toBeInTheDocument();
    });
    await waitFor(() => {
      expect(
        screen.getByText("Decision is required")
      ).toBeInTheDocument();
    });

    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("calls onCancel when cancel button clicked", () => {
    render(
      <AdrForm onSubmit={onSubmit} onCancel={onCancel} isSaving={false} />
    );
    fireEvent.click(screen.getByRole("button", { name: /cancel/i }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("disables submit button when saving", () => {
    render(
      <AdrForm onSubmit={onSubmit} onCancel={onCancel} isSaving={true} />
    );
    expect(
      screen.getByRole("button", { name: /saving/i })
    ).toBeDisabled();
  });

  it("shows mermaid info text", () => {
    render(
      <AdrForm onSubmit={onSubmit} onCancel={onCancel} isSaving={false} />
    );
    expect(
      screen.getByText(/paste mermaid syntax/i)
    ).toBeInTheDocument();
  });
});
