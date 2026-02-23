import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// Mock next/navigation
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn() }),
  usePathname: () => "/feed",
}));

// Mock react-i18next
jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        "feed.composer": "Start a post...",
        "feed.empty": "No posts yet. Be the first to share!",
        "actions.post": "Post",
        "actions.posting": "Posting...",
        "actions.loading": "Loading...",
        "actions.loadMore": "Load more",
        "actions.comment": "Comment",
        "nav.home": "Feed",
      };
      return translations[key] || key;
    },
    i18n: { language: "en", changeLanguage: jest.fn() },
  }),
}));

// Mock AuthProvider
jest.mock("@/providers/AuthProvider", () => ({
  useAuthContext: () => ({
    user: { id: "current-user-1", displayName: "Current User" },
    isAuthenticated: true,
  }),
}));

// Shared mock state — overridden per test group
let mockFeedState = {
  posts: [] as object[],
  isLoading: false,
  isLoadingMore: false,
  isSubmitting: false,
  hasMore: false,
  error: null as string | null,
  createPost: jest.fn().mockResolvedValue(true),
  loadMore: jest.fn(),
  toggleLike: jest.fn(),
  editPost: jest.fn().mockResolvedValue(true),
  deletePost: jest.fn().mockResolvedValue(true),
  refetch: jest.fn(),
};

jest.mock("@/hooks/useFeed", () => ({
  useFeed: () => mockFeedState,
}));

// Mock @/lib/utils so formatRelativeTime is deterministic
jest.mock("@/lib/utils", () => ({
  ...jest.requireActual("@/lib/utils"),
  formatRelativeTime: () => "just now",
  getInitials: (name: string) => {
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  },
}));

import FeedPage from "../page";

const samplePost = {
  id: "post-1",
  author: {
    userId: "user-1",
    displayName: "Alice Smith",
    headline: "Engineer",
  },
  content: "Hello world!",
  textDirection: "ltr" as const,
  createdAt: new Date().toISOString(),
  likeCount: 0,
  commentCount: 0,
  shareCount: 0,
  isLikedByMe: false,
};

describe("FeedPage", () => {
  beforeEach(() => {
    // Reset to a clean empty state before each test
    mockFeedState = {
      posts: [],
      isLoading: false,
      isLoadingMore: false,
      isSubmitting: false,
      hasMore: false,
      error: null,
      createPost: jest.fn().mockResolvedValue(true),
      loadMore: jest.fn(),
      toggleLike: jest.fn(),
      editPost: jest.fn().mockResolvedValue(true),
      deletePost: jest.fn().mockResolvedValue(true),
      refetch: jest.fn(),
    };
  });

  describe("loading state", () => {
    it("renders skeleton placeholders while loading", () => {
      mockFeedState = { ...mockFeedState, isLoading: true };
      render(<FeedPage />);

      // PostCardSkeleton is a div with aria-label="Loading post"
      const skeletons = screen.getAllByLabelText("Loading post");
      expect(skeletons.length).toBeGreaterThanOrEqual(1);
    });

    it("does not show empty state while loading", () => {
      mockFeedState = { ...mockFeedState, isLoading: true };
      render(<FeedPage />);

      expect(
        screen.queryByText("No posts yet. Be the first to share!")
      ).not.toBeInTheDocument();
    });
  });

  describe("empty state", () => {
    it("shows the empty state message when posts array is empty and not loading", () => {
      render(<FeedPage />);

      expect(
        screen.getByText("No posts yet. Be the first to share!")
      ).toBeInTheDocument();
    });
  });

  describe("posts list", () => {
    it("renders a post card for each post in the feed", () => {
      const post2 = { ...samplePost, id: "post-2", content: "Second post" };
      mockFeedState = { ...mockFeedState, posts: [samplePost, post2] };
      render(<FeedPage />);

      expect(screen.getByText("Hello world!")).toBeInTheDocument();
      expect(screen.getByText("Second post")).toBeInTheDocument();
    });

    it("does not show empty state when posts exist", () => {
      mockFeedState = { ...mockFeedState, posts: [samplePost] };
      render(<FeedPage />);

      expect(
        screen.queryByText("No posts yet. Be the first to share!")
      ).not.toBeInTheDocument();
    });
  });

  describe("load more", () => {
    it("shows the Load more button when hasMore is true", () => {
      mockFeedState = { ...mockFeedState, posts: [samplePost], hasMore: true };
      render(<FeedPage />);

      expect(screen.getByRole("button", { name: "Load more" })).toBeInTheDocument();
    });

    it("does not show the Load more button when hasMore is false", () => {
      mockFeedState = { ...mockFeedState, posts: [samplePost], hasMore: false };
      render(<FeedPage />);

      expect(
        screen.queryByRole("button", { name: "Load more" })
      ).not.toBeInTheDocument();
    });

    it("shows Loading... text on the load more button while isLoadingMore", () => {
      mockFeedState = {
        ...mockFeedState,
        posts: [samplePost],
        hasMore: true,
        isLoadingMore: true,
      };
      render(<FeedPage />);

      expect(screen.getByRole("button", { name: "Loading..." })).toBeInTheDocument();
    });
  });

  describe("post composer", () => {
    it("renders the composer textarea", () => {
      render(<FeedPage />);

      expect(screen.getByPlaceholderText("Start a post...")).toBeInTheDocument();
    });

    it("renders the Post button", () => {
      render(<FeedPage />);

      expect(screen.getByRole("button", { name: "Post" })).toBeInTheDocument();
    });

    it("renders the character counter starting at 3000", () => {
      render(<FeedPage />);

      expect(screen.getByText("3000")).toBeInTheDocument();
    });

    it("shows Posting... label on the button while isSubmitting", () => {
      mockFeedState = { ...mockFeedState, isSubmitting: true };
      render(<FeedPage />);

      expect(screen.getByRole("button", { name: "Posting..." })).toBeInTheDocument();
    });

    it("calls createPost when Post button is clicked with non-empty content", async () => {
      const user = userEvent.setup();
      render(<FeedPage />);

      const textarea = screen.getByPlaceholderText("Start a post...");
      await user.type(textarea, "My new post");
      await user.click(screen.getByRole("button", { name: "Post" }));

      expect(mockFeedState.createPost).toHaveBeenCalledWith("My new post");
    });

    it("clears the textarea after a successful post", async () => {
      const user = userEvent.setup();
      mockFeedState = {
        ...mockFeedState,
        createPost: jest.fn().mockResolvedValue(true),
      };
      render(<FeedPage />);

      const textarea = screen.getByPlaceholderText("Start a post...");
      await user.type(textarea, "My new post");
      await user.click(screen.getByRole("button", { name: "Post" }));

      await waitFor(() => expect(textarea).toHaveValue(""));
    });

    it("does not call createPost when the textarea is empty", async () => {
      const user = userEvent.setup();
      const createPostMock = jest.fn().mockResolvedValue(true);
      mockFeedState = { ...mockFeedState, createPost: createPostMock };
      render(<FeedPage />);

      await user.click(screen.getByRole("button", { name: "Post" }));

      expect(createPostMock).not.toHaveBeenCalled();
    });
  });
});
