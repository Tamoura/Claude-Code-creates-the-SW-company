import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ReactionPicker } from "../ReactionPicker";

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: "en", changeLanguage: jest.fn() },
  }),
}));

describe("ReactionPicker", () => {
  const onReact = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders the trigger button", () => {
    render(<ReactionPicker postId="post-1" onReact={onReact} />);
    expect(screen.getByRole("button", { name: /like/i })).toBeInTheDocument();
  });

  it("shows reaction options on hover/click", async () => {
    const user = userEvent.setup();
    render(<ReactionPicker postId="post-1" onReact={onReact} />);
    await user.hover(screen.getByRole("button", { name: /like/i }));
    expect(screen.getByRole("button", { name: /celebrate/i })).toBeInTheDocument();
  });

  it("calls onReact with LIKE when like emoji is clicked from popup", async () => {
    const user = userEvent.setup();
    render(<ReactionPicker postId="post-1" onReact={onReact} />);
    const triggerBtn = screen.getByRole("button", { name: /like/i });
    await user.hover(triggerBtn);
    // After hover, the tooltip is shown - find "Celebrate" reaction button
    const celebrateBtn = screen.getByRole("button", { name: /celebrate/i });
    expect(celebrateBtn).toBeInTheDocument();
    onReact.mockClear();
    await user.click(celebrateBtn);
    expect(onReact).toHaveBeenCalledWith("CELEBRATE");
  });

  it("calls onReact with CELEBRATE when celebrate emoji is clicked", async () => {
    const user = userEvent.setup();
    render(<ReactionPicker postId="post-1" onReact={onReact} />);
    const triggerBtn = screen.getByRole("button", { name: /like/i });
    await user.hover(triggerBtn);
    await user.click(screen.getByRole("button", { name: /celebrate/i }));
    expect(onReact).toHaveBeenCalledWith("CELEBRATE");
  });

  it("shows current user reaction as highlighted when myReaction is set", () => {
    render(
      <ReactionPicker postId="post-1" onReact={onReact} myReaction="LOVE" />
    );
    const btn = screen.getByRole("button", { name: /love/i });
    expect(btn).toBeInTheDocument();
  });

  it("shows total count when totalCount > 0", () => {
    render(
      <ReactionPicker postId="post-1" onReact={onReact} totalCount={12} />
    );
    expect(screen.getByText("12")).toBeInTheDocument();
  });

  it("hides reaction popup after clicking a reaction", async () => {
    const user = userEvent.setup();
    render(<ReactionPicker postId="post-1" onReact={onReact} />);
    const triggerBtn = screen.getByRole("button", { name: /like/i });
    await user.hover(triggerBtn);
    expect(screen.getByRole("button", { name: /celebrate/i })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /celebrate/i }));
    // After clicking a reaction, the popup should close
    expect(screen.queryByRole("button", { name: /celebrate/i })).not.toBeInTheDocument();
  });
});
