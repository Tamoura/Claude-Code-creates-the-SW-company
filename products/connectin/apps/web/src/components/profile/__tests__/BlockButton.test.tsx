import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BlockButton } from "../BlockButton";

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: "en", changeLanguage: jest.fn() },
  }),
}));

const mockPost = jest.fn();
const mockDelete = jest.fn();

jest.mock("@/lib/api", () => ({
  apiClient: {
    post: (...args: unknown[]) => mockPost(...args),
    delete: (...args: unknown[]) => mockDelete(...args),
  },
}));

describe("BlockButton", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders Block button when not blocked", () => {
    render(<BlockButton userId="user-2" isBlocked={false} />);
    expect(screen.getByRole("button", { name: /block/i })).toBeInTheDocument();
  });

  it("renders Unblock button when blocked", () => {
    render(<BlockButton userId="user-2" isBlocked={true} />);
    expect(screen.getByRole("button", { name: /unblock/i })).toBeInTheDocument();
  });

  it("calls POST /blocks/:userId when clicking Block", async () => {
    const user = userEvent.setup();
    mockPost.mockResolvedValueOnce({ success: true, data: {} });
    render(<BlockButton userId="user-2" isBlocked={false} />);
    await user.click(screen.getByRole("button", { name: /block/i }));
    expect(mockPost).toHaveBeenCalledWith("/blocks/user-2", {});
  });

  it("calls DELETE /blocks/:userId when clicking Unblock", async () => {
    const user = userEvent.setup();
    mockDelete.mockResolvedValueOnce({ success: true, data: {} });
    render(<BlockButton userId="user-2" isBlocked={true} />);
    await user.click(screen.getByRole("button", { name: /unblock/i }));
    expect(mockDelete).toHaveBeenCalledWith("/blocks/user-2");
  });

  it("calls onBlock callback after successful block", async () => {
    const user = userEvent.setup();
    const onBlock = jest.fn();
    mockPost.mockResolvedValueOnce({ success: true, data: {} });
    render(<BlockButton userId="user-2" isBlocked={false} onBlock={onBlock} />);
    await user.click(screen.getByRole("button", { name: /block/i }));
    await waitFor(() => expect(onBlock).toHaveBeenCalledWith(true));
  });
});
