import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FollowButton } from "../FollowButton";

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

describe("FollowButton", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders a Follow button when not following", async () => {
    mockGet.mockResolvedValueOnce({
      success: true,
      data: { isFollowing: false, followerCount: 10 },
    });
    render(<FollowButton userId="user-2" />);
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /follow/i })).toBeInTheDocument()
    );
  });

  it("renders an Unfollow button when following", async () => {
    mockGet.mockResolvedValueOnce({
      success: true,
      data: { isFollowing: true, followerCount: 42 },
    });
    render(<FollowButton userId="user-2" />);
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /unfollow/i })).toBeInTheDocument()
    );
  });

  it("shows follower count", async () => {
    mockGet.mockResolvedValueOnce({
      success: true,
      data: { isFollowing: false, followerCount: 99 },
    });
    render(<FollowButton userId="user-2" />);
    await waitFor(() => expect(screen.getByText("99")).toBeInTheDocument());
  });

  it("calls POST /follows/:userId when clicking Follow", async () => {
    const user = userEvent.setup();
    mockGet.mockResolvedValueOnce({
      success: true,
      data: { isFollowing: false, followerCount: 5 },
    });
    mockPost.mockResolvedValueOnce({ success: true, data: {} });
    render(<FollowButton userId="user-2" />);
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /follow/i })).toBeInTheDocument()
    );
    await user.click(screen.getByRole("button", { name: /follow/i }));
    expect(mockPost).toHaveBeenCalledWith("/follows/user-2", {});
  });

  it("calls DELETE /follows/:userId when clicking Unfollow", async () => {
    const user = userEvent.setup();
    mockGet.mockResolvedValueOnce({
      success: true,
      data: { isFollowing: true, followerCount: 20 },
    });
    mockDelete.mockResolvedValueOnce({ success: true, data: {} });
    render(<FollowButton userId="user-2" />);
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /unfollow/i })).toBeInTheDocument()
    );
    await user.click(screen.getByRole("button", { name: /unfollow/i }));
    expect(mockDelete).toHaveBeenCalledWith("/follows/user-2");
  });

  it("optimistically toggles to following state on click", async () => {
    const user = userEvent.setup();
    mockGet.mockResolvedValueOnce({
      success: true,
      data: { isFollowing: false, followerCount: 5 },
    });
    mockPost.mockResolvedValueOnce({ success: true, data: {} });
    render(<FollowButton userId="user-2" />);
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /follow/i })).toBeInTheDocument()
    );
    await user.click(screen.getByRole("button", { name: /follow/i }));
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /unfollow/i })).toBeInTheDocument()
    );
  });
});
