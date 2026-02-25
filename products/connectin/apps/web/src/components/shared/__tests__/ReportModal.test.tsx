import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ReportModal } from "../ReportModal";

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: "en", changeLanguage: jest.fn() },
  }),
}));

const mockPost = jest.fn();

jest.mock("@/lib/api", () => ({
  apiClient: {
    post: (...args: unknown[]) => mockPost(...args),
  },
}));

describe("ReportModal", () => {
  const onClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders the report modal dialog", () => {
    render(
      <ReportModal
        targetId="post-1"
        targetType="post"
        onClose={onClose}
      />
    );
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("shows reason select options", () => {
    render(
      <ReportModal targetId="post-1" targetType="post" onClose={onClose} />
    );
    expect(screen.getByRole("combobox")).toBeInTheDocument();
  });

  it("has spam as a reason option", () => {
    render(
      <ReportModal targetId="post-1" targetType="post" onClose={onClose} />
    );
    expect(screen.getByRole("option", { name: /spam/i })).toBeInTheDocument();
  });

  it("has harassment as a reason option", () => {
    render(
      <ReportModal targetId="post-1" targetType="post" onClose={onClose} />
    );
    expect(screen.getByRole("option", { name: /harassment/i })).toBeInTheDocument();
  });

  it("renders optional description textarea", () => {
    render(
      <ReportModal targetId="post-1" targetType="post" onClose={onClose} />
    );
    expect(screen.getByRole("textbox")).toBeInTheDocument();
  });

  it("calls POST /reports with targetId, targetType and reason on submit", async () => {
    const user = userEvent.setup();
    mockPost.mockResolvedValueOnce({ success: true, data: {} });
    render(
      <ReportModal targetId="post-1" targetType="post" onClose={onClose} />
    );
    await user.selectOptions(screen.getByRole("combobox"), "spam");
    await user.click(screen.getByRole("button", { name: /submit/i }));
    await waitFor(() =>
      expect(mockPost).toHaveBeenCalledWith(
        "/reports",
        expect.objectContaining({
          targetId: "post-1",
          targetType: "post",
          reason: "spam",
        })
      )
    );
  });

  it("calls onClose after successful report submission", async () => {
    const user = userEvent.setup();
    mockPost.mockResolvedValueOnce({ success: true, data: {} });
    render(
      <ReportModal targetId="post-1" targetType="post" onClose={onClose} />
    );
    await user.selectOptions(screen.getByRole("combobox"), "spam");
    await user.click(screen.getByRole("button", { name: /submit/i }));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it("calls onClose when cancel button is clicked", async () => {
    const user = userEvent.setup();
    render(
      <ReportModal targetId="post-1" targetType="post" onClose={onClose} />
    );
    // Find the cancel button by its text content (not the X icon button)
    const cancelButtons = screen.getAllByRole("button", { name: /cancel/i });
    // The text Cancel button (last one, after X close icon)
    const cancelBtn = cancelButtons.find((b) => b.textContent?.includes("cancel") || b.textContent?.includes("Cancel"));
    await user.click(cancelBtn ?? cancelButtons[0]);
    expect(onClose).toHaveBeenCalled();
  });
});
