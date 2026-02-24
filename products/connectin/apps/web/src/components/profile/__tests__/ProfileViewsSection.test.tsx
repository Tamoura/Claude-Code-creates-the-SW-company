import { render, screen } from "@testing-library/react";
import { ProfileViewsSection } from "../ProfileViewsSection";
import { useProfileViews } from "@/hooks/useProfileViews";

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { changeLanguage: jest.fn(), language: "en", dir: () => "ltr" },
  }),
}));
jest.mock("@/hooks/useProfileViews");

const mockViewers = [
  {
    id: "v1",
    viewerId: "u2",
    viewerName: "Alice",
    viewerHeadline: "Designer",
    viewedAt: "2026-02-20T10:00:00Z",
  },
  {
    id: "v2",
    viewerId: "u3",
    viewerName: "Bob",
    viewerHeadline: "Manager",
    viewedAt: "2026-02-19T10:00:00Z",
  },
];

describe("ProfileViewsSection", () => {
  it("renders section header with count badge", () => {
    (useProfileViews as jest.Mock).mockReturnValue({
      viewers: mockViewers,
      count: 15,
      isLoading: false,
      error: null,
    });
    render(<ProfileViewsSection />);
    expect(screen.getByText("profile.views")).toBeInTheDocument();
    expect(screen.getByText("15")).toBeInTheDocument();
  });

  it("renders viewer list", () => {
    (useProfileViews as jest.Mock).mockReturnValue({
      viewers: mockViewers,
      count: 2,
      isLoading: false,
      error: null,
    });
    render(<ProfileViewsSection />);
    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.getByText("Bob")).toBeInTheDocument();
  });

  it("shows loading state", () => {
    (useProfileViews as jest.Mock).mockReturnValue({
      viewers: [],
      count: 0,
      isLoading: true,
      error: null,
    });
    render(<ProfileViewsSection />);
    expect(screen.getByText("loading")).toBeInTheDocument();
  });

  it("shows empty state when no viewers", () => {
    (useProfileViews as jest.Mock).mockReturnValue({
      viewers: [],
      count: 0,
      isLoading: false,
      error: null,
    });
    render(<ProfileViewsSection />);
    expect(screen.getByText("profile.noViews")).toBeInTheDocument();
  });

  it("shows error state", () => {
    (useProfileViews as jest.Mock).mockReturnValue({
      viewers: [],
      count: 0,
      isLoading: false,
      error: "Failed",
    });
    render(<ProfileViewsSection />);
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });
});
