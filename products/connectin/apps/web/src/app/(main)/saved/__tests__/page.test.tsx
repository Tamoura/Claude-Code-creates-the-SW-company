import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import SavedPage from "../page";
import { useBookmarks } from "@/hooks/useBookmarks";

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { changeLanguage: jest.fn(), language: "en", dir: () => "ltr" },
  }),
}));

jest.mock("@/hooks/useBookmarks");

const mockBookmarks = [
  {
    id: "b1",
    userId: "u1",
    targetId: "p1",
    targetType: "post",
    createdAt: "2026-01-01T00:00:00Z",
    target: {
      id: "p1",
      content: "Post content",
      author: { userId: "u2", displayName: "Author" },
      textDirection: "ltr",
      createdAt: "2026-01-01",
      likeCount: 0,
      commentCount: 0,
      shareCount: 0,
      isLikedByMe: false,
    },
  },
  {
    id: "b2",
    userId: "u1",
    targetId: "j1",
    targetType: "job",
    createdAt: "2026-01-02T00:00:00Z",
    target: {
      id: "j1",
      title: "Dev Job",
      company: "Acme",
      workType: "REMOTE",
      experienceLevel: "MID",
      description: "Desc",
      language: "en",
      status: "OPEN",
      applicantCount: 5,
      createdAt: "2026-01-01",
    },
  },
];

describe("SavedPage", () => {
  beforeEach(() => {
    (useBookmarks as jest.Mock).mockReturnValue({
      bookmarks: mockBookmarks,
      isLoading: false,
      error: null,
      filteredBookmarks: (type: string) =>
        type === "all"
          ? mockBookmarks
          : mockBookmarks.filter((b) => b.targetType === type),
      addBookmark: jest.fn(),
      removeBookmark: jest.fn(),
      refetch: jest.fn(),
    });
  });

  it("renders page title", () => {
    render(<SavedPage />);
    expect(screen.getByText("nav.saved")).toBeInTheDocument();
  });

  it("renders filter tabs", () => {
    render(<SavedPage />);
    expect(screen.getByRole("button", { name: /saved.all/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /saved.posts/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /saved.jobs/i })).toBeInTheDocument();
  });

  it("shows all bookmarks by default", () => {
    render(<SavedPage />);
    expect(screen.getByText("Author")).toBeInTheDocument();
    expect(screen.getByText("Dev Job")).toBeInTheDocument();
  });

  it("filters to posts when Posts tab clicked", async () => {
    const user = userEvent.setup();
    render(<SavedPage />);
    await user.click(screen.getByRole("button", { name: /saved.posts/i }));
    expect(screen.getByText("Author")).toBeInTheDocument();
    expect(screen.queryByText("Dev Job")).not.toBeInTheDocument();
  });

  it("filters to jobs when Jobs tab clicked", async () => {
    const user = userEvent.setup();
    render(<SavedPage />);
    await user.click(screen.getByRole("button", { name: /saved.jobs/i }));
    expect(screen.queryByText("Author")).not.toBeInTheDocument();
    expect(screen.getByText("Dev Job")).toBeInTheDocument();
  });

  it("shows empty state when no bookmarks", () => {
    (useBookmarks as jest.Mock).mockReturnValue({
      bookmarks: [],
      isLoading: false,
      error: null,
      filteredBookmarks: () => [],
      addBookmark: jest.fn(),
      removeBookmark: jest.fn(),
      refetch: jest.fn(),
    });
    render(<SavedPage />);
    expect(screen.getByText("noResults")).toBeInTheDocument();
  });
});
