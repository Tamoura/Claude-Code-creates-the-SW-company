import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ProfileSettingsPage from "../page";

const mockGet = jest.fn();
const mockPut = jest.fn();
jest.mock("@/lib/api", () => ({
  apiClient: {
    get: (...args: unknown[]) => mockGet(...args),
    put: (...args: unknown[]) => mockPut(...args),
  },
}));

const mockProfile = {
  companyName: "Test Corp",
  industry: "Technology",
  employeeCount: "11-50",
  growthStage: "Series A",
  languages: "TypeScript",
  frameworks: "React",
  databases: "PostgreSQL",
  cloudProvider: "AWS",
  architectureNotes: "Monolith",
  currentChallenges: "Scaling",
};

describe("ProfileSettingsPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGet.mockResolvedValue({
      success: true,
      data: mockProfile,
    });
  });

  it("renders loading state initially", () => {
    mockGet.mockReturnValue(new Promise(() => {}));
    render(<ProfileSettingsPage />);

    expect(screen.queryByLabelText(/company name/i)).not.toBeInTheDocument();
  });

  it("loads and displays company profile data", async () => {
    render(<ProfileSettingsPage />);

    await waitFor(() => {
      expect(screen.getByLabelText(/company name/i)).toHaveValue(
        "Test Corp"
      );
    });

    expect(mockGet).toHaveBeenCalledWith("/profile/company");
    expect(screen.getByLabelText(/industry/i)).toHaveValue("Technology");
    expect(screen.getByLabelText(/employee count/i)).toHaveValue("11-50");
  });

  it("displays profile completeness indicator", async () => {
    render(<ProfileSettingsPage />);

    await waitFor(() => {
      expect(
        screen.getByRole("progressbar", {
          name: /profile completeness/i,
        })
      ).toBeInTheDocument();
    });

    expect(screen.getByText("100%")).toBeInTheDocument();
  });

  it("shows validation errors for required fields", async () => {
    mockGet.mockResolvedValue({ success: true, data: {} });
    const user = userEvent.setup();
    render(<ProfileSettingsPage />);

    await waitFor(() => {
      expect(screen.getByLabelText(/company name/i)).toBeInTheDocument();
    });

    await user.click(
      screen.getByRole("button", { name: /save profile/i })
    );

    await waitFor(() => {
      expect(screen.getAllByRole("alert").length).toBeGreaterThan(0);
    });
  });

  it("submits profile update and shows success message", async () => {
    mockPut.mockResolvedValue({ success: true });
    const user = userEvent.setup();
    render(<ProfileSettingsPage />);

    await waitFor(() => {
      expect(screen.getByLabelText(/company name/i)).toHaveValue(
        "Test Corp"
      );
    });

    await user.click(
      screen.getByRole("button", { name: /save profile/i })
    );

    await waitFor(() => {
      expect(mockPut).toHaveBeenCalledWith(
        "/profile/company",
        expect.objectContaining({ companyName: "Test Corp" })
      );
    });

    await waitFor(() => {
      expect(
        screen.getByText(/profile updated successfully/i)
      ).toBeInTheDocument();
    });
  });

  it("shows server error on failed update", async () => {
    mockPut.mockResolvedValue({
      success: false,
      error: { code: "ERR", message: "Update failed" },
    });
    const user = userEvent.setup();
    render(<ProfileSettingsPage />);

    await waitFor(() => {
      expect(screen.getByLabelText(/company name/i)).toHaveValue(
        "Test Corp"
      );
    });

    await user.click(
      screen.getByRole("button", { name: /save profile/i })
    );

    await waitFor(() => {
      expect(screen.getByText(/update failed/i)).toBeInTheDocument();
    });
  });

  it("has accessible form fields with aria attributes", async () => {
    mockGet.mockResolvedValue({ success: true, data: {} });
    const user = userEvent.setup();
    render(<ProfileSettingsPage />);

    await waitFor(() => {
      expect(screen.getByLabelText(/company name/i)).toBeInTheDocument();
    });

    await user.click(
      screen.getByRole("button", { name: /save profile/i })
    );

    await waitFor(() => {
      expect(screen.getByLabelText(/company name/i)).toHaveAttribute(
        "aria-invalid",
        "true"
      );
    });
  });
});
