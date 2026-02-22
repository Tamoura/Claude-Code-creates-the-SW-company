import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// Mock next/navigation
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn() }),
  usePathname: () => "/profile",
}));

// Mock react-i18next
jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        "profile.completeness": "Profile Completeness",
        "profile.experience": "Experience",
        "profile.education": "Education",
        "profile.skills": "Skills",
        "profile.about": "About",
        "profile.editProfile": "Edit Profile",
        "profile.posts": "Posts",
        "profile.present": "Present",
        "profile.addHeadline": "Add a headline",
        "profile.editHeadline": "Edit headline",
        "profile.headlinePlaceholder": "e.g. Senior Engineer at Acme",
        "actions.save": "Save",
        "actions.saving": "Saving...",
        "actions.cancel": "Cancel",
      };
      return translations[key] || key;
    },
    i18n: { language: "en", changeLanguage: jest.fn() },
  }),
}));

// Mock auth context
jest.mock("@/providers/AuthProvider", () => ({
  useAuthContext: () => ({
    user: {
      id: "user-1",
      email: "test@example.com",
      displayName: "Ahmad Hassan",
      role: "user",
      emailVerified: true,
      languagePreference: "en",
      status: "active",
      createdAt: "2026-01-01T00:00:00Z",
    },
    isLoading: false,
    isAuthenticated: true,
    error: null,
    login: jest.fn(),
    register: jest.fn(),
    logout: jest.fn(),
  }),
}));

const mockRefetch = jest.fn().mockResolvedValue(undefined);

jest.mock("@/hooks/useProfile", () => ({
  useProfile: () => ({
    profile: {
      id: "profile-1",
      userId: "user-1",
      headlineEn: "Software Engineer",
      completenessScore: 75,
      experiences: [],
      education: [],
      skills: [],
    },
    isLoading: false,
    error: null,
    refetch: mockRefetch,
  }),
}));

const mockPut = jest.fn();
const mockGet = jest.fn().mockResolvedValue({ success: true, data: [] });
jest.mock("@/lib/api", () => ({
  apiClient: {
    put: (...args: unknown[]) => mockPut(...args),
    get: (...args: unknown[]) => mockGet(...args),
  },
}));

import ProfilePage from "../page";

describe("ProfilePage — edit headline", () => {
  const user = userEvent.setup();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("opens the inline edit form when Edit Profile is clicked", async () => {
    render(<ProfilePage />);

    await user.click(screen.getByRole("button", { name: "Edit Profile" }));

    expect(screen.getByRole("textbox", { name: "Edit headline" })).toBeInTheDocument();
  });

  it("hides the Edit Profile button while editing", async () => {
    render(<ProfilePage />);

    await user.click(screen.getByRole("button", { name: "Edit Profile" }));

    expect(
      screen.queryByRole("button", { name: "Edit Profile" })
    ).not.toBeInTheDocument();
  });

  it("pre-fills the edit input with the current headline", async () => {
    render(<ProfilePage />);

    await user.click(screen.getByRole("button", { name: "Edit Profile" }));

    expect(screen.getByRole("textbox", { name: "Edit headline" })).toHaveValue(
      "Software Engineer"
    );
  });

  it("closes the edit form when Cancel is clicked", async () => {
    render(<ProfilePage />);

    await user.click(screen.getByRole("button", { name: "Edit Profile" }));
    await user.click(screen.getByRole("button", { name: "Cancel" }));

    expect(
      screen.queryByRole("textbox", { name: "Edit headline" })
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Edit Profile" })
    ).toBeInTheDocument();
  });

  it("calls PUT /profiles/me when Save is clicked", async () => {
    mockPut.mockResolvedValueOnce({ success: true, data: {} });
    render(<ProfilePage />);

    await user.click(screen.getByRole("button", { name: "Edit Profile" }));

    const input = screen.getByRole("textbox", { name: "Edit headline" });
    await user.clear(input);
    await user.type(input, "New Headline");

    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(mockPut).toHaveBeenCalledWith("/profiles/me", {
      headlineEn: "New Headline",
      location: "",
      summaryEn: "",
    });
  });

  it("calls refetch after a successful save", async () => {
    mockPut.mockResolvedValueOnce({ success: true, data: {} });
    render(<ProfilePage />);

    await user.click(screen.getByRole("button", { name: "Edit Profile" }));
    await user.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(mockRefetch).toHaveBeenCalledTimes(1));
  });

  it("closes the edit form after a successful save", async () => {
    mockPut.mockResolvedValueOnce({ success: true, data: {} });
    render(<ProfilePage />);

    await user.click(screen.getByRole("button", { name: "Edit Profile" }));
    await user.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() =>
      expect(
        screen.queryByRole("textbox", { name: "Edit headline" })
      ).not.toBeInTheDocument()
    );
  });

  it("shows an error message when save fails", async () => {
    mockPut.mockResolvedValueOnce({
      success: false,
      error: { code: "ERROR", message: "Validation failed" },
    });
    render(<ProfilePage />);

    await user.click(screen.getByRole("button", { name: "Edit Profile" }));
    await user.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() =>
      expect(screen.getByText("Validation failed")).toBeInTheDocument()
    );
  });
});
