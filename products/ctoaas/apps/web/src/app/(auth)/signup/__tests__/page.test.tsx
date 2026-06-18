import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import SignupPage from "../page";

const mockPush = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

const mockPost = jest.fn();
jest.mock("@/lib/api", () => ({
  apiClient: { post: (...args: unknown[]) => mockPost(...args) },
}));

describe("SignupPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders all form fields", () => {
    render(<SignupPage />);

    expect(
      screen.getByRole("heading", { name: /create your account/i })
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/work email/i)).toBeInTheDocument();
    expect(
      screen.getByLabelText(/company name/i)
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
    expect(
      screen.getByLabelText(/confirm password/i)
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /create account/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /sign in/i })
    ).toHaveAttribute("href", "/login");
  });

  it("shows validation errors for empty fields on submit", async () => {
    const user = userEvent.setup();
    render(<SignupPage />);

    await user.click(
      screen.getByRole("button", { name: /create account/i })
    );

    await waitFor(() => {
      expect(screen.getAllByRole("alert").length).toBeGreaterThan(0);
    });
  });

  it("shows password mismatch error", async () => {
    const user = userEvent.setup();
    render(<SignupPage />);

    await user.type(screen.getByLabelText(/full name/i), "Jane Smith");
    await user.type(
      screen.getByLabelText(/work email/i),
      "jane@co.com"
    );
    await user.type(
      screen.getByLabelText(/company name/i),
      "Acme Inc"
    );
    await user.type(
      screen.getByLabelText(/^password$/i),
      "Str0ng!Pass"
    );
    await user.type(
      screen.getByLabelText(/confirm password/i),
      "DifferentPass1!"
    );

    await user.click(
      screen.getByRole("button", { name: /create account/i })
    );

    await waitFor(() => {
      expect(screen.getByText(/do not match/i)).toBeInTheDocument();
    });
  });

  it("submits valid form data and redirects on success", async () => {
    mockPost.mockResolvedValue({ success: true });
    const user = userEvent.setup();
    render(<SignupPage />);

    await user.type(screen.getByLabelText(/full name/i), "Jane Smith");
    await user.type(
      screen.getByLabelText(/work email/i),
      "jane@co.com"
    );
    await user.type(
      screen.getByLabelText(/company name/i),
      "Acme Inc"
    );
    await user.type(
      screen.getByLabelText(/^password$/i),
      "Str0ng!Pass"
    );
    await user.type(
      screen.getByLabelText(/confirm password/i),
      "Str0ng!Pass"
    );

    await user.click(
      screen.getByRole("button", { name: /create account/i })
    );

    await waitFor(() => {
      expect(mockPost).toHaveBeenCalledWith("/auth/signup", {
        name: "Jane Smith",
        email: "jane@co.com",
        password: "Str0ng!Pass",
        companyName: "Acme Inc",
      });
    });

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith(
        expect.stringContaining("/verify-email/pending")
      );
    });
  });

  it("shows server error on API failure", async () => {
    mockPost.mockResolvedValue({
      success: false,
      error: { code: "EMAIL_EXISTS", message: "Email already in use" },
    });
    const user = userEvent.setup();
    render(<SignupPage />);

    await user.type(screen.getByLabelText(/full name/i), "Jane Smith");
    await user.type(
      screen.getByLabelText(/work email/i),
      "jane@co.com"
    );
    await user.type(
      screen.getByLabelText(/company name/i),
      "Acme Inc"
    );
    await user.type(
      screen.getByLabelText(/^password$/i),
      "Str0ng!Pass"
    );
    await user.type(
      screen.getByLabelText(/confirm password/i),
      "Str0ng!Pass"
    );

    await user.click(
      screen.getByRole("button", { name: /create account/i })
    );

    await waitFor(() => {
      expect(
        screen.getByText(/email already in use/i)
      ).toBeInTheDocument();
    });
  });

  it("sets aria-invalid on fields with validation errors", async () => {
    const user = userEvent.setup();
    render(<SignupPage />);

    await user.click(
      screen.getByRole("button", { name: /create account/i })
    );

    await waitFor(() => {
      expect(screen.getByLabelText(/full name/i)).toHaveAttribute(
        "aria-invalid",
        "true"
      );
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
    render(<SignupPage />);

    await user.type(screen.getByLabelText(/full name/i), "Jane Smith");
    await user.type(
      screen.getByLabelText(/work email/i),
      "jane@co.com"
    );
    await user.type(
      screen.getByLabelText(/company name/i),
      "Acme Inc"
    );
    await user.type(
      screen.getByLabelText(/^password$/i),
      "Str0ng!Pass"
    );
    await user.type(
      screen.getByLabelText(/confirm password/i),
      "Str0ng!Pass"
    );

    await user.click(
      screen.getByRole("button", { name: /create account/i })
    );

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /creating account/i })
      ).toBeDisabled();
    });

    // Resolve to avoid act() warnings
    resolvePost!({ success: true });

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalled();
    });
  });
});
