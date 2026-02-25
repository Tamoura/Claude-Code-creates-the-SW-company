import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { EndorseButton } from "../EndorseButton";

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

describe("EndorseButton", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders Endorse button when not endorsed", () => {
    render(
      <EndorseButton skillId="skill-1" isEndorsed={false} endorsementCount={5} />
    );
    expect(screen.getByRole("button", { name: /endorse/i })).toBeInTheDocument();
  });

  it("shows endorsed state when already endorsed", () => {
    render(
      <EndorseButton skillId="skill-1" isEndorsed={true} endorsementCount={6} />
    );
    expect(screen.getByRole("button", { name: /endorsed/i })).toBeInTheDocument();
  });

  it("shows endorsement count", () => {
    render(
      <EndorseButton skillId="skill-1" isEndorsed={false} endorsementCount={12} />
    );
    expect(screen.getByText("12")).toBeInTheDocument();
  });

  it("calls POST /endorsements/:skillId when clicking Endorse", async () => {
    const user = userEvent.setup();
    mockPost.mockResolvedValueOnce({ success: true, data: {} });
    render(
      <EndorseButton skillId="skill-1" isEndorsed={false} endorsementCount={3} />
    );
    await user.click(screen.getByRole("button", { name: /endorse/i }));
    expect(mockPost).toHaveBeenCalledWith("/endorsements/skill-1", {});
  });

  it("calls DELETE /endorsements/:skillId when clicking to remove endorsement", async () => {
    const user = userEvent.setup();
    mockDelete.mockResolvedValueOnce({ success: true, data: {} });
    render(
      <EndorseButton skillId="skill-1" isEndorsed={true} endorsementCount={7} />
    );
    await user.click(screen.getByRole("button", { name: /endorsed/i }));
    expect(mockDelete).toHaveBeenCalledWith("/endorsements/skill-1");
  });

  it("calls onEndorse callback after endorsing", async () => {
    const user = userEvent.setup();
    const onEndorse = jest.fn();
    mockPost.mockResolvedValueOnce({ success: true, data: {} });
    render(
      <EndorseButton
        skillId="skill-1"
        isEndorsed={false}
        endorsementCount={3}
        onEndorse={onEndorse}
      />
    );
    await user.click(screen.getByRole("button", { name: /endorse/i }));
    await waitFor(() => expect(onEndorse).toHaveBeenCalledWith(true));
  });
});
