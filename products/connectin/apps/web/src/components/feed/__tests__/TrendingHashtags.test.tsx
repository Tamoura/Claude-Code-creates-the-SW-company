import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { TrendingHashtags } from "../TrendingHashtags";

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: "en", changeLanguage: jest.fn() },
  }),
}));

const mockGet = jest.fn();

jest.mock("@/lib/api", () => ({
  apiClient: {
    get: (...args: unknown[]) => mockGet(...args),
  },
}));

const mockTrending = [
  { id: "ht-1", tag: "cybersecurity", postCount: 120 },
  { id: "ht-2", tag: "GRC", postCount: 85 },
  { id: "ht-3", tag: "compliance", postCount: 60 },
];

describe("TrendingHashtags", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("shows loading state initially", () => {
    mockGet.mockReturnValueOnce(new Promise(() => {}));
    render(<TrendingHashtags />);
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("renders trending hashtags after load", async () => {
    mockGet.mockResolvedValueOnce({ success: true, data: mockTrending });
    render(<TrendingHashtags />);
    await waitFor(() =>
      expect(screen.getByText("#cybersecurity")).toBeInTheDocument()
    );
    expect(screen.getByText("#GRC")).toBeInTheDocument();
  });

  it("renders hashtags as links", async () => {
    mockGet.mockResolvedValueOnce({ success: true, data: mockTrending });
    render(<TrendingHashtags />);
    await waitFor(() =>
      expect(screen.getByRole("link", { name: /#cybersecurity/i })).toBeInTheDocument()
    );
  });

  it("shows post count for each hashtag", async () => {
    mockGet.mockResolvedValueOnce({ success: true, data: mockTrending });
    render(<TrendingHashtags />);
    await waitFor(() => expect(screen.getByText("120")).toBeInTheDocument());
  });

  it("calls GET /hashtags/trending on mount", async () => {
    mockGet.mockResolvedValueOnce({ success: true, data: [] });
    render(<TrendingHashtags />);
    await waitFor(() => expect(mockGet).toHaveBeenCalledWith("/hashtags/trending"));
  });

  it("shows empty state when no trending hashtags", async () => {
    mockGet.mockResolvedValueOnce({ success: true, data: [] });
    render(<TrendingHashtags />);
    await waitFor(() =>
      expect(screen.queryByRole("link")).not.toBeInTheDocument()
    );
  });
});
