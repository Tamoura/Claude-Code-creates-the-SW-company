import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RepostButton } from "../RepostButton";

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: "en", changeLanguage: jest.fn() },
  }),
}));

const mockGet = jest.fn();
const mockPost = jest.fn();
const mockDelete = jest.fn();

jest.mock("@/lib/api", () => ({
  apiClient: {
    get: (...args: unknown[]) => mockGet(...args),
    post: (...args: unknown[]) => mockPost(...args),
    delete: (...args: unknown[]) => mockDelete(...args),
  },
}));

describe("RepostButton", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders share button", () => {
    render(<RepostButton postId="post-1" repostCount={0} hasReposted={false} />);
    expect(screen.getByRole("button", { name: /share/i })).toBeInTheDocument();
  });

  it("shows repost count when > 0", () => {
    render(<RepostButton postId="post-1" repostCount={5} hasReposted={false} />);
    expect(screen.getByText("5")).toBeInTheDocument();
  });

  it("opens modal with repost options when clicked", async () => {
    const user = userEvent.setup();
    render(<RepostButton postId="post-1" repostCount={0} hasReposted={false} />);
    await user.click(screen.getByRole("button", { name: /share/i }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("shows 'Share now' option in modal", async () => {
    const user = userEvent.setup();
    render(<RepostButton postId="post-1" repostCount={0} hasReposted={false} />);
    await user.click(screen.getByRole("button", { name: /share/i }));
    expect(screen.getByRole("button", { name: /share now/i })).toBeInTheDocument();
  });

  it("calls POST /feed/posts/:id/repost when Share now is clicked", async () => {
    const user = userEvent.setup();
    mockPost.mockResolvedValueOnce({ success: true, data: {} });
    render(<RepostButton postId="post-1" repostCount={0} hasReposted={false} />);
    await user.click(screen.getByRole("button", { name: /share/i }));
    await user.click(screen.getByRole("button", { name: /share now/i }));
    await waitFor(() =>
      expect(mockPost).toHaveBeenCalledWith(
        "/feed/posts/post-1/repost",
        expect.any(Object)
      )
    );
  });

  it("shows hasReposted state visually", () => {
    render(<RepostButton postId="post-1" repostCount={1} hasReposted={true} />);
    const btn = screen.getByRole("button", { name: /share/i });
    expect(btn).toHaveClass("text-green-600");
  });
});
