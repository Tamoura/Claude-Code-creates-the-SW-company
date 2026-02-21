import React from "react";
import { render, screen } from "@testing-library/react";

// Mock next/navigation
const mockPush = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
  usePathname: () => "/profile",
}));

// Mock next/link
jest.mock("next/link", () => {
  return function MockLink({
    children,
    href,
  }: {
    children: React.ReactNode;
    href: string;
  }) {
    return <a href={href}>{children}</a>;
  };
});

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

// Mock useProfile hook
jest.mock("@/hooks/useProfile", () => ({
  useProfile: () => ({
    profile: {
      id: "profile-1",
      userId: "user-1",
      headlineEn: "Software Engineer",
      summaryEn: "Passionate about tech",
      completenessScore: 75,
      experiences: [
        {
          id: "exp-1",
          company: "TechCorp",
          title: "Engineer",
          startDate: "2024-01-01",
          isCurrent: true,
        },
      ],
      education: [
        {
          id: "edu-1",
          institution: "University",
          degree: "BSc CS",
          startYear: 2020,
          endYear: 2024,
        },
      ],
      skills: [{ id: "skill-1", name: "TypeScript" }],
    },
    isLoading: false,
    error: null,
    refetch: jest.fn(),
  }),
}));

import ProfilePage from "../profile/page";

describe("ProfilePage", () => {
  it("displays the user display name", () => {
    render(<ProfilePage />);

    expect(screen.getByText("Ahmad Hassan")).toBeInTheDocument();
  });

  it("renders the Edit Profile button", () => {
    render(<ProfilePage />);

    expect(
      screen.getByRole("button", { name: "Edit Profile" })
    ).toBeInTheDocument();
  });

  it("renders the Experience section header", () => {
    render(<ProfilePage />);

    expect(
      screen.getByRole("heading", { name: "Experience" })
    ).toBeInTheDocument();
  });

  it("renders the Education section header", () => {
    render(<ProfilePage />);

    expect(
      screen.getByRole("heading", { name: "Education" })
    ).toBeInTheDocument();
  });

  it("renders the Skills section header", () => {
    render(<ProfilePage />);

    expect(
      screen.getByRole("heading", { name: "Skills" })
    ).toBeInTheDocument();
  });
});
