import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import PreferencesSettingsPage from "../page";

const mockGet = jest.fn();
const mockPut = jest.fn();
jest.mock("@/lib/api", () => ({
  apiClient: {
    get: (...args: unknown[]) => mockGet(...args),
    put: (...args: unknown[]) => mockPut(...args),
  },
}));

const mockPreferences = {
  communicationStyle: "detailed",
  responseFormat: "technical-deep-dive",
  detailLevel: "granular",
  areasOfInterest: ["Architecture", "Security"],
};

function getRadioById(id: string): HTMLInputElement {
  return document.getElementById(id) as HTMLInputElement;
}

function getCheckboxById(id: string): HTMLInputElement {
  return document.getElementById(id) as HTMLInputElement;
}

describe("PreferencesSettingsPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGet.mockResolvedValue({
      success: true,
      data: mockPreferences,
    });
  });

  it("renders loading state initially", () => {
    mockGet.mockReturnValue(new Promise(() => {}));
    render(<PreferencesSettingsPage />);

    expect(
      screen.queryByRole("button", { name: /save preferences/i })
    ).not.toBeInTheDocument();
  });

  it("loads and pre-selects saved preferences", async () => {
    render(<PreferencesSettingsPage />);

    await waitFor(() => {
      expect(getRadioById("comm-detailed")).toBeChecked();
    });

    expect(getRadioById("format-technical-deep-dive")).toBeChecked();
    expect(getRadioById("detail-granular")).toBeChecked();
  });

  it("loads and pre-checks saved areas of interest", async () => {
    render(<PreferencesSettingsPage />);

    await waitFor(() => {
      expect(
        getCheckboxById("area-Architecture")
      ).toBeChecked();
    });

    expect(getCheckboxById("area-Security")).toBeChecked();
    expect(getCheckboxById("area-DevOps")).not.toBeChecked();
  });

  it("renders all radio groups as fieldsets", async () => {
    render(<PreferencesSettingsPage />);

    await waitFor(() => {
      expect(
        screen.getByRole("group", { name: /communication style/i })
      ).toBeInTheDocument();
    });

    expect(
      screen.getByRole("group", { name: /response format/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("group", { name: /detail level/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("group", { name: /areas of interest/i })
    ).toBeInTheDocument();
  });

  it("submits preferences update and shows success", async () => {
    mockPut.mockResolvedValue({ success: true });
    const user = userEvent.setup();
    render(<PreferencesSettingsPage />);

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /save preferences/i })
      ).toBeInTheDocument();
    });

    await user.click(
      screen.getByRole("button", { name: /save preferences/i })
    );

    await waitFor(() => {
      expect(mockPut).toHaveBeenCalledWith(
        "/preferences",
        expect.objectContaining({
          communicationStyle: "detailed",
          areasOfInterest: expect.arrayContaining(["Architecture"]),
        })
      );
    });

    await waitFor(() => {
      expect(
        screen.getByText(/preferences updated successfully/i)
      ).toBeInTheDocument();
    });
  });

  it("shows server error on failed update", async () => {
    mockPut.mockResolvedValue({
      success: false,
      error: { code: "ERR", message: "Save failed" },
    });
    const user = userEvent.setup();
    render(<PreferencesSettingsPage />);

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /save preferences/i })
      ).toBeInTheDocument();
    });

    await user.click(
      screen.getByRole("button", { name: /save preferences/i })
    );

    await waitFor(() => {
      expect(screen.getByText(/save failed/i)).toBeInTheDocument();
    });
  });

  it("allows changing communication style", async () => {
    const user = userEvent.setup();
    render(<PreferencesSettingsPage />);

    await waitFor(() => {
      expect(getRadioById("comm-detailed")).toBeChecked();
    });

    await user.click(getRadioById("comm-concise"));

    expect(getRadioById("comm-concise")).toBeChecked();
    expect(getRadioById("comm-detailed")).not.toBeChecked();
  });
});
