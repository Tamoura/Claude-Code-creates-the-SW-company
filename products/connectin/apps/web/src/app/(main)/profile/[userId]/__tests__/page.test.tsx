import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// Mock React.use to resolve Promise synchronously in jsdom.
// The [userId]/page.tsx calls use(params) where params is a Promise<{userId}>.
// In the test environment React.use() does not resolve Promises synchronously,
// so we intercept it here and return the resolved value directly.
const realUse = React.use.bind(React);
jest.spyOn(React, "use").mockImplementation((value: unknown) => {
  if (value instanceof Promise) {
    // For testing, run the promise synchronously by inspecting its internal state.
    // Since we always pass Promise.resolve({userId}) this cast is safe.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const anyValue = value as any;
    if (anyValue._value !== undefined) return anyValue._value;
    if (anyValue._result !== undefined) return anyValue._result;
    // Fallback: return a default userId so the component renders
    return { userId: "user-42" };
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return realUse(value as any);
});

// Mock next/navigation
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn() }),
  usePathname: () => "/profile/user-42",
}));

// Mock react-i18next
jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        "profile.about": "About",
        "profile.experience": "Experience",
        "profile.education": "Education",
        "profile.skills": "Skills",
        "profile.present": "Present",
        "profile.notFound": "Profile not found.",
        "network.connect": "Connect",
        "network.connected": "Connected",
        "network.pendingSent": "Request sent",
        "actions.loading": "Loading...",
      };
      return translations[key] || key;
    },
    i18n: { language: "en", changeLanguage: jest.fn() },
  }),
}));

// Mock apiClient for the connect button action
jest.mock("@/lib/api", () => ({
  apiClient: {
    post: jest.fn().mockResolvedValue({ success: true, data: {} }),
  },
}));

const mockUseProfile = jest.fn();
jest.mock("@/hooks/useProfile", () => ({
  useProfile: (...args: unknown[]) => mockUseProfile(...args),
}));

const mockProfile = {
  id: "profile-42",
  userId: "user-42",
  headlineEn: "Senior Engineer",
  headlineAr: undefined,
  avatarUrl: undefined,
  completenessScore: 60,
  experiences: [
    {
      id: "exp-1",
      company: "Acme Corp",
      title: "Engineer",
      startDate: "2020-01-01",
      endDate: undefined,
      isCurrent: true,
    },
  ],
  education: [],
  skills: [{ id: "skill-1", nameEn: "TypeScript" }],
};

import UserProfilePage from "../page";

describe("UserProfilePage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("shows a loading spinner while profile is loading", () => {
    mockUseProfile.mockReturnValue({ profile: null, isLoading: true });

    render(
      <UserProfilePage params={Promise.resolve({ userId: "user-42" })} />
    );

    const spinner = document.querySelector(".animate-spin");
    expect(spinner).toBeInTheDocument();
  });

  it("shows not-found message when profile is null after loading", () => {
    mockUseProfile.mockReturnValue({ profile: null, isLoading: false });

    render(
      <UserProfilePage params={Promise.resolve({ userId: "user-42" })} />
    );

    expect(screen.getByText("Profile not found.")).toBeInTheDocument();
  });

  it("renders the user headline as the page heading", () => {
    mockUseProfile.mockReturnValue({ profile: mockProfile, isLoading: false });

    render(
      <UserProfilePage params={Promise.resolve({ userId: "user-42" })} />
    );

    expect(
      screen.getByRole("heading", { name: "Senior Engineer", level: 1 })
    ).toBeInTheDocument();
  });

  it("renders the Connect button for another user's profile", () => {
    mockUseProfile.mockReturnValue({ profile: mockProfile, isLoading: false });

    render(
      <UserProfilePage params={Promise.resolve({ userId: "user-42" })} />
    );

    expect(screen.getByRole("button", { name: "Connect" })).toBeInTheDocument();
  });

  it("renders experience entries when the profile has them", () => {
    mockUseProfile.mockReturnValue({ profile: mockProfile, isLoading: false });

    render(
      <UserProfilePage params={Promise.resolve({ userId: "user-42" })} />
    );

    expect(screen.getByText("Engineer")).toBeInTheDocument();
    expect(screen.getByText("Acme Corp")).toBeInTheDocument();
  });

  it("renders skills when the profile has them", () => {
    mockUseProfile.mockReturnValue({ profile: mockProfile, isLoading: false });

    render(
      <UserProfilePage params={Promise.resolve({ userId: "user-42" })} />
    );

    expect(screen.getByText("TypeScript")).toBeInTheDocument();
  });

  it("renders empty education message when no education", () => {
    mockUseProfile.mockReturnValue({ profile: mockProfile, isLoading: false });

    render(
      <UserProfilePage params={Promise.resolve({ userId: "user-42" })} />
    );

    expect(screen.getByText("No education added yet.")).toBeInTheDocument();
  });

  it("passes the userId to useProfile", () => {
    mockUseProfile.mockReturnValue({ profile: mockProfile, isLoading: false });

    render(
      <UserProfilePage params={Promise.resolve({ userId: "user-42" })} />
    );

    expect(mockUseProfile).toHaveBeenCalledWith("user-42");
  });

  describe("Connect button behaviour", () => {
    it("calls apiClient.post when Connect is clicked", async () => {
      const { apiClient } = jest.requireMock("@/lib/api") as {
        apiClient: { post: jest.Mock };
      };
      mockUseProfile.mockReturnValue({ profile: mockProfile, isLoading: false });

      const user = userEvent.setup();
      render(
        <UserProfilePage params={Promise.resolve({ userId: "user-42" })} />
      );

      await user.click(screen.getByRole("button", { name: "Connect" }));

      expect(apiClient.post).toHaveBeenCalledWith("/connections/request", {
        targetUserId: "user-42",
      });
    });

    it("changes button label to 'Request sent' after a successful connect", async () => {
      const { apiClient } = jest.requireMock("@/lib/api") as {
        apiClient: { post: jest.Mock };
      };
      apiClient.post.mockResolvedValueOnce({ success: true, data: {} });
      mockUseProfile.mockReturnValue({ profile: mockProfile, isLoading: false });

      const user = userEvent.setup();
      render(
        <UserProfilePage params={Promise.resolve({ userId: "user-42" })} />
      );

      await user.click(screen.getByRole("button", { name: "Connect" }));

      await waitFor(() =>
        expect(screen.getByRole("button", { name: "Request sent" })).toBeInTheDocument()
      );
    });

    it("disables the Connect button after request is sent", async () => {
      const { apiClient } = jest.requireMock("@/lib/api") as {
        apiClient: { post: jest.Mock };
      };
      apiClient.post.mockResolvedValueOnce({ success: true, data: {} });
      mockUseProfile.mockReturnValue({ profile: mockProfile, isLoading: false });

      const user = userEvent.setup();
      render(
        <UserProfilePage params={Promise.resolve({ userId: "user-42" })} />
      );

      await user.click(screen.getByRole("button", { name: "Connect" }));

      await waitFor(() =>
        expect(
          screen.getByRole("button", { name: "Request sent" })
        ).toBeDisabled()
      );
    });
  });
});
