import {
  render,
  screen,
  waitFor,
  fireEvent,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import OnboardingPage from "../page";

const mockPush = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

const mockGet = jest.fn();
const mockPut = jest.fn();
jest.mock("@/lib/api", () => ({
  apiClient: {
    get: (...args: unknown[]) => mockGet(...args),
    put: (...args: unknown[]) => mockPut(...args),
  },
}));

describe("OnboardingPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGet.mockResolvedValue({
      success: true,
      data: { currentStep: 1, completedSteps: [], stepData: {} },
    });
    mockPut.mockResolvedValue({ success: true });
  });

  it("renders the onboarding page with step indicator", async () => {
    render(<OnboardingPage />);

    await waitFor(() => {
      expect(
        screen.getByRole("navigation", {
          name: /onboarding progress/i,
        })
      ).toBeInTheDocument();
    });
  });

  it("fetches current step on mount", async () => {
    render(<OnboardingPage />);

    await waitFor(() => {
      expect(mockGet).toHaveBeenCalledWith(
        "/onboarding/step/current"
      );
    });
  });

  it("shows step 1 by default", async () => {
    render(<OnboardingPage />);

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: /company basics/i })
      ).toBeInTheDocument();
    });
  });

  it("shows a progress bar", async () => {
    render(<OnboardingPage />);

    await waitFor(() => {
      expect(
        screen.getByRole("progressbar")
      ).toBeInTheDocument();
    });
  });

  it("advances to step 2 when step 1 is submitted", async () => {
    const user = userEvent.setup();
    render(<OnboardingPage />);

    await waitFor(() => {
      expect(
        screen.getByLabelText(/industry/i)
      ).toBeInTheDocument();
    });

    // Use fireEvent.change for select elements to ensure RHF registers values
    fireEvent.change(screen.getByLabelText(/industry/i), {
      target: { value: "Technology" },
    });
    fireEvent.change(screen.getByLabelText(/employee count/i), {
      target: { value: "11-50" },
    });
    fireEvent.change(screen.getByLabelText(/growth stage/i), {
      target: { value: "Series A" },
    });

    await user.click(
      screen.getByRole("button", { name: /next/i })
    );

    await waitFor(
      () => {
        expect(mockPut).toHaveBeenCalledWith(
          "/onboarding/step/1",
          expect.objectContaining({
            industry: "Technology",
            employeeCount: "11-50",
            growthStage: "Series A",
          })
        );
      },
      { timeout: 3000 }
    );

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: /tech stack/i })
      ).toBeInTheDocument();
    });
  });

  it("shows skip button on step 2", async () => {
    mockGet.mockResolvedValue({
      success: true,
      data: { currentStep: 2, completedSteps: [1], stepData: {} },
    });

    render(<OnboardingPage />);

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /skip/i })
      ).toBeInTheDocument();
    });
  });

  it("does not show skip button on step 1", async () => {
    render(<OnboardingPage />);

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: /company basics/i })
      ).toBeInTheDocument();
    });

    expect(
      screen.queryByRole("button", { name: /skip/i })
    ).not.toBeInTheDocument();
  });

  it("redirects to dashboard on completion", async () => {
    mockGet.mockResolvedValue({
      success: true,
      data: {
        currentStep: 4,
        completedSteps: [1, 2, 3],
        stepData: {},
      },
    });
    mockPut.mockResolvedValue({ success: true });

    const user = userEvent.setup();
    render(<OnboardingPage />);

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: /preferences/i })
      ).toBeInTheDocument();
    });

    await user.click(screen.getByLabelText("Balanced"));
    await user.click(screen.getByLabelText("Executive summary"));
    await user.click(screen.getByLabelText("Moderate"));

    await user.click(
      screen.getByRole("button", { name: /complete/i })
    );

    await waitFor(() => {
      expect(mockPut).toHaveBeenCalledWith(
        "/onboarding/step/4",
        expect.objectContaining({
          communicationStyle: "Balanced",
        })
      );
    });

    await waitFor(() => {
      expect(mockPut).toHaveBeenCalledWith(
        "/onboarding/complete"
      );
    });

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/dashboard");
    });
  });

  it("shows loading state while fetching current step", () => {
    mockGet.mockReturnValue(new Promise(() => {}));
    render(<OnboardingPage />);

    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });
});
