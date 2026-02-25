import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MentionAutocomplete } from "../MentionAutocomplete";

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

const mockUsers = [
  { id: "user-1", displayName: "Alice Smith", headlineEn: "Engineer", avatarUrl: null },
  { id: "user-2", displayName: "Bob Jones", headlineEn: "Designer", avatarUrl: null },
];

describe("MentionAutocomplete", () => {
  const onSelect = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders without crashing", () => {
    render(
      <MentionAutocomplete query="" onSelect={onSelect} visible={false} />
    );
    // Dropdown hidden when not visible
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("shows dropdown when visible=true and has results", async () => {
    mockGet.mockResolvedValueOnce({ success: true, data: mockUsers });
    render(
      <MentionAutocomplete query="ali" onSelect={onSelect} visible={true} />
    );
    await waitFor(() =>
      expect(screen.getByRole("listbox")).toBeInTheDocument()
    );
  });

  it("calls GET /search/people with query when visible", async () => {
    mockGet.mockResolvedValueOnce({ success: true, data: mockUsers });
    render(
      <MentionAutocomplete query="alice" onSelect={onSelect} visible={true} />
    );
    await waitFor(() =>
      expect(mockGet).toHaveBeenCalledWith(
        "/search/people",
        expect.objectContaining({ params: { q: "alice" } })
      )
    );
  });

  it("renders user names in dropdown", async () => {
    mockGet.mockResolvedValueOnce({ success: true, data: mockUsers });
    render(
      <MentionAutocomplete query="ali" onSelect={onSelect} visible={true} />
    );
    await waitFor(() =>
      expect(screen.getByText("Alice Smith")).toBeInTheDocument()
    );
  });

  it("calls onSelect with user when option is clicked", async () => {
    const user = userEvent.setup();
    mockGet.mockResolvedValueOnce({ success: true, data: mockUsers });
    render(
      <MentionAutocomplete query="ali" onSelect={onSelect} visible={true} />
    );
    await waitFor(() =>
      expect(screen.getByText("Alice Smith")).toBeInTheDocument()
    );
    await user.click(screen.getByText("Alice Smith"));
    expect(onSelect).toHaveBeenCalledWith(
      expect.objectContaining({ displayName: "Alice Smith" })
    );
  });
});
