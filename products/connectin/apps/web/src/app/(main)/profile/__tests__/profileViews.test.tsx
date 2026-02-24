import { render, screen } from "@testing-library/react";
import ProfilePage from "../page";
import { useProfile } from "@/hooks/useProfile";
import { useProfileViews } from "@/hooks/useProfileViews";

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { changeLanguage: jest.fn(), language: "en", dir: () => "ltr" },
  }),
}));
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn() }),
}));
jest.mock("@/providers/AuthProvider", () => ({
  useAuthContext: () => ({
    user: { id: "u1", displayName: "Test User" },
    isAuthenticated: true,
  }),
}));
jest.mock("@/hooks/useProfile");
jest.mock("@/hooks/useProfileViews");
jest.mock("@/lib/api", () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  },
}));

describe("ProfilePage - Views Section", () => {
  beforeEach(() => {
    (useProfile as jest.Mock).mockReturnValue({
      profile: {
        id: "p1",
        userId: "u1",
        headlineEn: "Dev",
        completenessScore: 50,
        experiences: [],
        education: [],
        skills: [],
      },
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    });
    (useProfileViews as jest.Mock).mockReturnValue({
      viewers: [
        {
          id: "v1",
          viewerId: "u2",
          viewerName: "Alice",
          viewerHeadline: "Designer",
          viewedAt: "2026-02-20T10:00:00Z",
        },
      ],
      count: 1,
      isLoading: false,
      error: null,
    });
  });

  it("renders ProfileViewsSection on profile page", () => {
    render(<ProfilePage />);
    expect(screen.getByText("profile.views")).toBeInTheDocument();
  });
});
