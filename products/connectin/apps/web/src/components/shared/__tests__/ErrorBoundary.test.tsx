import React, { useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ErrorBoundary } from "../ErrorBoundary";

// Suppress React's expected console.error output from error boundaries.
beforeEach(() => {
  jest.spyOn(console, "error").mockImplementation(() => undefined);
});

afterEach(() => {
  (console.error as jest.Mock).mockRestore();
});

/** Throws unconditionally — used to trigger the boundary. */
function AlwaysThrows(): React.ReactNode {
  throw new Error("Test error message");
}

/** Safe child — never throws. */
function SafeChild() {
  return <div>Safe content</div>;
}

/**
 * Wrapper that lets a test toggle throwing on and off via a button rendered
 * outside the ErrorBoundary, so that clicking "Try Again" inside the boundary
 * causes the next render to succeed.
 */
function TogglableBomb() {
  const [shouldThrow, setShouldThrow] = useState(true);

  return (
    <>
      <button onClick={() => setShouldThrow(false)}>Stop throwing</button>
      <ErrorBoundary>
        {shouldThrow ? <AlwaysThrows /> : <div>Recovered content</div>}
      </ErrorBoundary>
    </>
  );
}

describe("ErrorBoundary", () => {
  it("renders children when no error is thrown", () => {
    render(
      <ErrorBoundary>
        <SafeChild />
      </ErrorBoundary>
    );
    expect(screen.getByText("Safe content")).toBeInTheDocument();
  });

  it("shows the default error UI when a child throws and no fallback is provided", () => {
    render(
      <ErrorBoundary>
        <AlwaysThrows />
      </ErrorBoundary>
    );
    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
  });

  it("shows the error message from the thrown error in the default UI", () => {
    render(
      <ErrorBoundary>
        <AlwaysThrows />
      </ErrorBoundary>
    );
    expect(screen.getByText("Test error message")).toBeInTheDocument();
  });

  it("renders a 'Try Again' button in the default error UI", () => {
    render(
      <ErrorBoundary>
        <AlwaysThrows />
      </ErrorBoundary>
    );
    expect(
      screen.getByRole("button", { name: /try again/i })
    ).toBeInTheDocument();
  });

  it("does not render children after a child throws", () => {
    render(
      <ErrorBoundary>
        <AlwaysThrows />
      </ErrorBoundary>
    );
    expect(screen.queryByText("Safe content")).not.toBeInTheDocument();
  });

  it("shows the custom fallback when one is provided and a child throws", () => {
    render(
      <ErrorBoundary fallback={<p>Custom fallback UI</p>}>
        <AlwaysThrows />
      </ErrorBoundary>
    );
    expect(screen.getByText("Custom fallback UI")).toBeInTheDocument();
    expect(screen.queryByText("Something went wrong")).not.toBeInTheDocument();
  });

  it("does not show the default error UI when a custom fallback is provided", () => {
    render(
      <ErrorBoundary fallback={<p>Custom fallback UI</p>}>
        <AlwaysThrows />
      </ErrorBoundary>
    );
    expect(screen.queryByRole("button", { name: /try again/i })).not.toBeInTheDocument();
  });

  it("resets the error state and shows children again after 'Try Again' is clicked", async () => {
    const user = userEvent.setup();

    // Render the togglable wrapper — initially throws, boundary shows error UI.
    render(<TogglableBomb />);

    expect(screen.getByText("Something went wrong")).toBeInTheDocument();

    // First stop the child from throwing so that the reset re-render succeeds.
    await user.click(screen.getByRole("button", { name: /stop throwing/i }));

    // Now click "Try Again" inside the boundary to reset its state.
    await user.click(screen.getByRole("button", { name: /try again/i }));

    expect(screen.getByText("Recovered content")).toBeInTheDocument();
    expect(screen.queryByText("Something went wrong")).not.toBeInTheDocument();
  });
});
