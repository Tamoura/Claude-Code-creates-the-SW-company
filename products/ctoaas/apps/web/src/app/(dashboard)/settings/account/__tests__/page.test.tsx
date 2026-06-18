import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AccountSettingsPage from "../page";

const mockGet = jest.fn();
const mockPut = jest.fn();
const mockDelete = jest.fn();
jest.mock("@/lib/api", () => ({
  apiClient: {
    get: (...args: unknown[]) => mockGet(...args),
    put: (...args: unknown[]) => mockPut(...args),
    delete: (...args: unknown[]) => mockDelete(...args),
  },
}));

describe("AccountSettingsPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGet.mockResolvedValue({
      success: true,
      data: { email: "user@example.com" },
    });
  });

  it("renders loading state initially", () => {
    mockGet.mockReturnValue(new Promise(() => {}));
    render(<AccountSettingsPage />);

    expect(screen.queryByLabelText(/email/i)).not.toBeInTheDocument();
  });

  it("displays the user email as read-only", async () => {
    render(<AccountSettingsPage />);

    await waitFor(() => {
      const emailInput = screen.getByLabelText(/email/i);
      expect(emailInput).toHaveValue("user@example.com");
      expect(emailInput).toHaveAttribute("readonly");
    });
  });

  it("renders change password form", async () => {
    render(<AccountSettingsPage />);

    await waitFor(() => {
      expect(
        screen.getByLabelText(/current password/i)
      ).toBeInTheDocument();
    });
    expect(screen.getByLabelText(/^new password$/i)).toBeInTheDocument();
    expect(
      screen.getByLabelText(/confirm new password/i)
    ).toBeInTheDocument();
  });

  it("validates password fields before submission", async () => {
    const user = userEvent.setup();
    render(<AccountSettingsPage />);

    await waitFor(() => {
      expect(
        screen.getByLabelText(/current password/i)
      ).toBeInTheDocument();
    });

    await user.click(
      screen.getByRole("button", { name: /update password/i })
    );

    await waitFor(() => {
      expect(screen.getAllByRole("alert").length).toBeGreaterThan(0);
    });
  });

  it("submits password change and shows success", async () => {
    mockPut.mockResolvedValue({ success: true });
    const user = userEvent.setup();
    render(<AccountSettingsPage />);

    await waitFor(() => {
      expect(
        screen.getByLabelText(/current password/i)
      ).toBeInTheDocument();
    });

    await user.type(
      screen.getByLabelText(/current password/i),
      "OldPass123!"
    );
    await user.type(
      screen.getByLabelText(/^new password$/i),
      "NewPass456@"
    );
    await user.type(
      screen.getByLabelText(/confirm new password/i),
      "NewPass456@"
    );

    await user.click(
      screen.getByRole("button", { name: /update password/i })
    );

    await waitFor(() => {
      expect(mockPut).toHaveBeenCalledWith("/auth/change-password", {
        currentPassword: "OldPass123!",
        newPassword: "NewPass456@",
      });
    });

    await waitFor(() => {
      expect(
        screen.getByText(/password changed successfully/i)
      ).toBeInTheDocument();
    });
  });

  it("shows delete account confirmation dialog", async () => {
    const user = userEvent.setup();
    render(<AccountSettingsPage />);

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /delete account/i })
      ).toBeInTheDocument();
    });

    await user.click(
      screen.getByRole("button", { name: /delete account/i })
    );

    expect(
      screen.getByText(/are you sure you want to delete/i)
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /yes, delete my account/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /cancel/i })
    ).toBeInTheDocument();
  });

  it("cancels delete account confirmation", async () => {
    const user = userEvent.setup();
    render(<AccountSettingsPage />);

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /delete account/i })
      ).toBeInTheDocument();
    });

    await user.click(
      screen.getByRole("button", { name: /delete account/i })
    );
    await user.click(
      screen.getByRole("button", { name: /cancel/i })
    );

    expect(
      screen.queryByText(/are you sure you want to delete/i)
    ).not.toBeInTheDocument();
  });
});
