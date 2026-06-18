import { render, screen, waitFor } from "@testing-library/react";
import VerifyEmailPage from "../page";

const mockPush = jest.fn();
let mockToken = "valid-token-123";
let mockSearchParams = new URLSearchParams();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
  useParams: () => ({ token: mockToken }),
  useSearchParams: () => mockSearchParams,
}));

const mockPost = jest.fn();
jest.mock("@/lib/api", () => ({
  apiClient: { post: (...args: unknown[]) => mockPost(...args) },
}));

describe("VerifyEmailPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    mockToken = "valid-token-123";
    mockSearchParams = new URLSearchParams();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("shows loading state initially", () => {
    mockPost.mockReturnValue(new Promise(() => {}));
    render(<VerifyEmailPage />);

    expect(
      screen.getByText(/verifying your email/i)
    ).toBeInTheDocument();
  });

  it("calls API with the token on mount", () => {
    mockPost.mockReturnValue(new Promise(() => {}));
    render(<VerifyEmailPage />);

    expect(mockPost).toHaveBeenCalledWith("/auth/verify-email", {
      token: "valid-token-123",
    });
  });

  it("shows success state and redirects after verification", async () => {
    mockPost.mockResolvedValue({ success: true });
    render(<VerifyEmailPage />);

    await waitFor(() => {
      expect(screen.getByText(/email verified/i)).toBeInTheDocument();
    });

    jest.advanceTimersByTime(2000);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/login");
    });
  });

  it("shows error state on verification failure", async () => {
    mockPost.mockResolvedValue({
      success: false,
      error: {
        code: "TOKEN_EXPIRED",
        message: "Token has expired",
      },
    });
    render(<VerifyEmailPage />);

    await waitFor(() => {
      expect(
        screen.getByText(/verification failed/i)
      ).toBeInTheDocument();
    });

    expect(
      screen.getByText(/token has expired/i)
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /create a new account/i })
    ).toHaveAttribute("href", "/signup");
  });

  it("shows pending state when token is 'pending'", () => {
    mockToken = "pending";
    mockSearchParams = new URLSearchParams(
      "message=Check+your+email+to+verify+your+account"
    );
    render(<VerifyEmailPage />);

    expect(
      screen.getByRole("heading", { name: /check your email/i })
    ).toBeInTheDocument();
    expect(mockPost).not.toHaveBeenCalled();
    expect(
      screen.getByRole("link", { name: /go to sign in/i })
    ).toHaveAttribute("href", "/login");
  });
});
