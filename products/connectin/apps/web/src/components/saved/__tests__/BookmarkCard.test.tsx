import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BookmarkCard } from "../BookmarkCard";
import type { Bookmark } from "@/types";

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { changeLanguage: jest.fn(), language: "en", dir: () => "ltr" },
  }),
}));

const postBookmark: Bookmark = {
  id: "b1",
  userId: "u1",
  targetId: "post-1",
  targetType: "post",
  createdAt: "2026-01-01T00:00:00Z",
  target: {
    id: "post-1",
    content: "Hello world post content",
    author: { userId: "u2", displayName: "Jane Doe", headline: "Engineer" },
    textDirection: "ltr",
    createdAt: "2026-01-01T00:00:00Z",
    likeCount: 5,
    commentCount: 2,
    shareCount: 1,
    isLikedByMe: false,
  } as any,
};

const jobBookmark: Bookmark = {
  id: "b2",
  userId: "u1",
  targetId: "job-1",
  targetType: "job",
  createdAt: "2026-01-02T00:00:00Z",
  target: {
    id: "job-1",
    title: "Senior Developer",
    company: "Acme Corp",
    location: "Remote",
    workType: "REMOTE",
    experienceLevel: "SENIOR",
    description: "Great job",
    language: "en",
    status: "OPEN",
    applicantCount: 10,
    createdAt: "2026-01-01",
  } as any,
};

describe("BookmarkCard", () => {
  it("renders post bookmark with author and content", () => {
    render(<BookmarkCard bookmark={postBookmark} onRemove={jest.fn()} />);
    expect(screen.getByText("Jane Doe")).toBeInTheDocument();
    expect(screen.getByText(/Hello world post content/)).toBeInTheDocument();
  });

  it("renders job bookmark with title and company", () => {
    render(<BookmarkCard bookmark={jobBookmark} onRemove={jest.fn()} />);
    expect(screen.getByText("Senior Developer")).toBeInTheDocument();
    expect(screen.getByText("Acme Corp")).toBeInTheDocument();
  });

  it("shows post type badge for post bookmarks", () => {
    render(<BookmarkCard bookmark={postBookmark} onRemove={jest.fn()} />);
    expect(screen.getByText("saved.post")).toBeInTheDocument();
  });

  it("shows job type badge for job bookmarks", () => {
    render(<BookmarkCard bookmark={jobBookmark} onRemove={jest.fn()} />);
    expect(screen.getByText("saved.job")).toBeInTheDocument();
  });

  it("calls onRemove when unsave button clicked", async () => {
    const user = userEvent.setup();
    const onRemove = jest.fn();
    render(<BookmarkCard bookmark={postBookmark} onRemove={onRemove} />);
    await user.click(screen.getByRole("button", { name: /saved.remove/i }));
    expect(onRemove).toHaveBeenCalledWith("b1");
  });
});
