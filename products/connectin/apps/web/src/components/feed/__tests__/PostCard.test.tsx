import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PostCard } from "../PostCard";
import type { Post } from "@/types";

// Mock react-i18next
jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        "actions.comment": "Comment",
        "actions.save": "Save",
        "actions.saving": "Saving...",
        "actions.cancel": "Cancel",
        "actions.delete": "Delete",
        "actions.loading": "Loading...",
        "actions.submit": "Submit",
        "feed.editPost": "Edit post",
        "feed.deletePost": "Delete post",
        "feed.confirmDeletePost": "Are you sure you want to delete this post?",
        "feed.writeComment": "Write a comment...",
        "feed.noComments": "No comments yet.",
      };
      return translations[key] || key;
    },
    i18n: { language: "en", changeLanguage: jest.fn() },
  }),
}));

// Mock apiClient for comments
jest.mock("@/lib/api", () => ({
  apiClient: {
    get: jest.fn().mockResolvedValue({ success: true, data: [] }),
    post: jest.fn().mockResolvedValue({ success: true, data: {} }),
  },
}));

// formatRelativeTime uses Intl — stub it so output is deterministic in CI
jest.mock("@/lib/utils", () => ({
  ...jest.requireActual("@/lib/utils"),
  formatRelativeTime: () => "2 hours ago",
  getInitials: (name: string) => {
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  },
}));

const basePost: Post = {
  id: "post-1",
  author: {
    userId: "user-1",
    displayName: "Alice Smith",
    headline: "Software Engineer",
  },
  content: "Hello ConnectIn world!",
  textDirection: "ltr",
  createdAt: new Date().toISOString(),
  likeCount: 0,
  commentCount: 0,
  shareCount: 0,
  isLikedByMe: false,
};

describe("PostCard", () => {
  const onToggleLike = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("content rendering", () => {
    it("renders the author display name", () => {
      render(<PostCard post={basePost} onToggleLike={onToggleLike} />);

      expect(screen.getByText("Alice Smith")).toBeInTheDocument();
    });

    it("renders the post content", () => {
      render(<PostCard post={basePost} onToggleLike={onToggleLike} />);

      expect(screen.getByText("Hello ConnectIn world!")).toBeInTheDocument();
    });

    it("renders the author headline when provided", () => {
      render(<PostCard post={basePost} onToggleLike={onToggleLike} />);

      expect(screen.getByText("Software Engineer")).toBeInTheDocument();
    });

    it("does not render headline section when headline is absent", () => {
      const postWithoutHeadline: Post = {
        ...basePost,
        author: { ...basePost.author, headline: undefined },
      };
      render(<PostCard post={postWithoutHeadline} onToggleLike={onToggleLike} />);

      expect(screen.queryByText("Software Engineer")).not.toBeInTheDocument();
    });

    it("has an accessible article label with the author name", () => {
      render(<PostCard post={basePost} onToggleLike={onToggleLike} />);

      expect(
        screen.getByRole("article", { name: "Post by Alice Smith" })
      ).toBeInTheDocument();
    });

    it("renders the relative timestamp", () => {
      render(<PostCard post={basePost} onToggleLike={onToggleLike} />);

      expect(screen.getByText("2 hours ago")).toBeInTheDocument();
    });
  });

  describe("like count display", () => {
    it("shows 'Like' text when likeCount is 0", () => {
      render(<PostCard post={basePost} onToggleLike={onToggleLike} />);

      expect(screen.getByRole("button", { name: "Like post" })).toHaveTextContent(
        "Like"
      );
    });

    it("shows the numeric like count when likeCount is greater than 0", () => {
      const likedPost: Post = { ...basePost, likeCount: 7 };
      render(<PostCard post={likedPost} onToggleLike={onToggleLike} />);

      expect(screen.getByRole("button", { name: "Like post" })).toHaveTextContent(
        "7"
      );
    });

    it("shows 'Comment' text when commentCount is 0", () => {
      render(<PostCard post={basePost} onToggleLike={onToggleLike} />);

      expect(screen.getByLabelText("0 comments")).toHaveTextContent("Comment");
    });

    it("shows numeric comment count when commentCount is greater than 0", () => {
      const post: Post = { ...basePost, commentCount: 3 };
      render(<PostCard post={post} onToggleLike={onToggleLike} />);

      expect(screen.getByLabelText("3 comments")).toHaveTextContent("3");
    });
  });

  describe("like button interaction", () => {
    it("calls onToggleLike with postId and isLikedByMe=false when liking", async () => {
      const user = userEvent.setup();
      render(<PostCard post={basePost} onToggleLike={onToggleLike} />);

      await user.click(screen.getByRole("button", { name: "Like post" }));

      expect(onToggleLike).toHaveBeenCalledTimes(1);
      expect(onToggleLike).toHaveBeenCalledWith("post-1", false);
    });

    it("calls onToggleLike with isLikedByMe=true when the post is already liked", async () => {
      const user = userEvent.setup();
      const likedPost: Post = { ...basePost, isLikedByMe: true, likeCount: 1 };
      render(<PostCard post={likedPost} onToggleLike={onToggleLike} />);

      await user.click(screen.getByRole("button", { name: "Unlike post" }));

      expect(onToggleLike).toHaveBeenCalledWith("post-1", true);
    });

    it("has aria-pressed=false when post is not liked", () => {
      render(<PostCard post={basePost} onToggleLike={onToggleLike} />);

      expect(screen.getByRole("button", { name: "Like post" })).toHaveAttribute(
        "aria-pressed",
        "false"
      );
    });

    it("has aria-pressed=true when post is liked", () => {
      const likedPost: Post = { ...basePost, isLikedByMe: true };
      render(<PostCard post={likedPost} onToggleLike={onToggleLike} />);

      expect(screen.getByRole("button", { name: "Unlike post" })).toHaveAttribute(
        "aria-pressed",
        "true"
      );
    });
  });

  describe("text direction", () => {
    it("sets dir='rtl' on the content paragraph when textDirection is rtl", () => {
      const rtlPost: Post = { ...basePost, content: "مرحباً", textDirection: "rtl" };
      render(<PostCard post={rtlPost} onToggleLike={onToggleLike} />);

      const contentEl = screen.getByText("مرحباً");
      expect(contentEl).toHaveAttribute("dir", "rtl");
    });

    it("sets dir='ltr' on the content paragraph when textDirection is ltr", () => {
      render(<PostCard post={basePost} onToggleLike={onToggleLike} />);

      const contentEl = screen.getByText("Hello ConnectIn world!");
      expect(contentEl).toHaveAttribute("dir", "ltr");
    });

    it("omits the dir attribute when textDirection is auto", () => {
      const autoPost: Post = { ...basePost, textDirection: "auto" };
      render(<PostCard post={autoPost} onToggleLike={onToggleLike} />);

      const contentEl = screen.getByText("Hello ConnectIn world!");
      expect(contentEl).not.toHaveAttribute("dir");
    });
  });
});
