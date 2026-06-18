import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import LoginPage from "../page";

const mockPush = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

const mockPost = jest.fn();
jest.mock("@/lib/api", () => ({
  apiClient: { post: (...args: unknown[]) => mockPost(...args) },
}));

describe("LoginPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders the login form", () => {
    render(<LoginPage />);

    expect(
      screen.getByRole("heading", { name: /sign in to ctoaas/i })
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText(/email address/i)
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /sign in/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /create an account/i })
    ).toHaveAttribute("href", "/signup");
  });

  it("shows validation errors for empty fields", async () => {
    const user = userEvent.setup();
    render(<LoginPage />);

    await user.click(
      screen.getByRole("button", { name: /sign in/i })
    );

    await waitFor(() => {
      expect(screen.getAllByRole("alert").length).toBeGreaterThan(0);
    });
  });

  it("submits valid credentials and redirects to dashboard", async () => {
    mockPost.mockResolvedValue({ success: true });
    const user = userEvent.setup();
    render(<LoginPage />);

    await user.type(
      screen.getByLabelText(/email address/i),
      "user@co.com"
    );
    await user.type(screen.getByLabelText(/password/i), "MyPass123!");

    await user.click(
      screen.getByRole("button", { name: /sign in/i })
    );

    await waitFor(() => {
      expect(mockPost).toHaveBeenCalledWith("/auth/login", {
        email: "user@co.com",
        password: "MyPass123!",
      });
    });

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/dashboard");
    });
  });

  it("shows generic error on invalid credentials", async () => {
    mockPost.mockResolvedValue({
      success: false,
      error: { code: "AUTH_FAILED", message: "Invalid credentials" },
    });
    const user = userEvent.setup();
    render(<LoginPage />);

    await user.type(
      screen.getByLabelText(/email address/i),
      "user@co.com"
    );
    await user.type(screen.getByLabelText(/password/i), "wrongpass");

    await user.click(
      screen.getByRole("button", { name: /sign in/i })
    );

    await waitFor(() => {
      expect(
        screen.getByText(/invalid email or password/i)
      ).toBeInTheDocument();
    });

    // Must NOT show the backend message (prevents user enumeration)
    expect(
      screen.queryByText(/invalid credentials/i)
    ).not.toBeInTheDocument();
  });

  it("sets aria-invalid on email field with validation error", async () => {
    const user = userEvent.setup();
    render(<LoginPage />);

    await user.type(
      screen.getByLabelText(/email address/i),
      "not-email"
    );
    await user.click(
      screen.getByRole("button", { name: /sign in/i })
    );

    await waitFor(() => {
      expect(
        screen.getByLabelText(/email address/i)
      ).toHaveAttribute("aria-invalid", "true");
    });
  });

  it("disables submit button while submitting", async () => {
    let resolvePost: (val: unknown) => void;
    mockPost.mockReturnValue(
      new Promise((resolve) => {
        resolvePost = resolve;
      })
    );

    const user = userEvent.setup();
    render(<LoginPage />);

    await user.type(
      screen.getByLabelText(/email address/i),
      "user@co.com"
    );
    await user.type(screen.getByLabelText(/password/i), "MyPass123!");

    await user.click(
      screen.getByRole("button", { name: /sign in/i })
    );

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /signing in/i })
      ).toBeDisabled();
    });

    resolvePost!({ success: true });

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalled();
    });
  });
});
