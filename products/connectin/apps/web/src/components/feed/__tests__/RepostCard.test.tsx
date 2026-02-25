import React from "react";
import { render, screen } from "@testing-library/react";
import { RepostCard } from "../RepostCard";
import type { Post } from "@/types";

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: "en", changeLanguage: jest.fn() },
  }),
}));

jest.mock("@/lib/utils", () => ({
  ...jest.requireActual("@/lib/utils"),
  formatRelativeTime: () => "1 hour ago",
}));

const originalPost: Post = {
  id: "post-original",
  author: {
    userId: "user-original",
    displayName: "Original Author",
    headline: "Engineer",
  },
  content: "Original post content here",
  textDirection: "ltr",
  createdAt: new Date().toISOString(),
  likeCount: 5,
  commentCount: 2,
  shareCount: 1,
  isLikedByMe: false,
};

describe("RepostCard", () => {
  it("shows reposter name in header", () => {
    render(
      <RepostCard
        reposterName="Bob Jones"
        repostedAt={new Date().toISOString()}
        originalPost={originalPost}
      />
    );
    expect(screen.getByText("Bob Jones")).toBeInTheDocument();
  });

  it("shows 'reposted' label", () => {
    render(
      <RepostCard
        reposterName="Bob Jones"
        repostedAt={new Date().toISOString()}
        originalPost={originalPost}
      />
    );
    expect(screen.getByText(/reposted/i)).toBeInTheDocument();
  });

  it("shows original post content", () => {
    render(
      <RepostCard
        reposterName="Bob Jones"
        repostedAt={new Date().toISOString()}
        originalPost={originalPost}
      />
    );
    expect(screen.getByText("Original post content here")).toBeInTheDocument();
  });

  it("shows original author name", () => {
    render(
      <RepostCard
        reposterName="Bob Jones"
        repostedAt={new Date().toISOString()}
        originalPost={originalPost}
      />
    );
    expect(screen.getByText("Original Author")).toBeInTheDocument();
  });

  it("shows optional repost comment when provided", () => {
    render(
      <RepostCard
        reposterName="Bob Jones"
        repostedAt={new Date().toISOString()}
        originalPost={originalPost}
        comment="Great insight!"
      />
    );
    expect(screen.getByText("Great insight!")).toBeInTheDocument();
  });

  it("does not show comment section when no comment", () => {
    render(
      <RepostCard
        reposterName="Bob Jones"
        repostedAt={new Date().toISOString()}
        originalPost={originalPost}
      />
    );
    expect(screen.queryByTestId("repost-comment")).not.toBeInTheDocument();
  });
});
