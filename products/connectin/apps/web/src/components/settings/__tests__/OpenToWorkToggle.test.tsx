import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { OpenToWorkToggle } from "../OpenToWorkToggle";

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: "en", changeLanguage: jest.fn() },
  }),
}));

const mockPut = jest.fn();

jest.mock("@/lib/api", () => ({
  apiClient: {
    put: (...args: unknown[]) => mockPut(...args),
  },
}));

describe("OpenToWorkToggle", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders the toggle checkbox", () => {
    render(
      <OpenToWorkToggle openToWork={false} visibility="public" />
    );
    expect(screen.getByRole("checkbox")).toBeInTheDocument();
  });

  it("shows toggle as checked when openToWork is true", () => {
    render(
      <OpenToWorkToggle openToWork={true} visibility="public" />
    );
    expect(screen.getByRole("checkbox")).toBeChecked();
  });

  it("shows toggle as unchecked when openToWork is false", () => {
    render(
      <OpenToWorkToggle openToWork={false} visibility="public" />
    );
    expect(screen.getByRole("checkbox")).not.toBeChecked();
  });

  it("shows visibility radio buttons when openToWork is true", () => {
    render(
      <OpenToWorkToggle openToWork={true} visibility="public" />
    );
    expect(screen.getByRole("radio", { name: /public/i })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /recruiter/i })).toBeInTheDocument();
  });

  it("hides visibility radio buttons when openToWork is false", () => {
    render(
      <OpenToWorkToggle openToWork={false} visibility="public" />
    );
    expect(screen.queryByRole("radio")).not.toBeInTheDocument();
  });

  it("calls PUT /profiles/me/preferences when toggling", async () => {
    const user = userEvent.setup();
    mockPut.mockResolvedValueOnce({ success: true, data: {} });
    render(
      <OpenToWorkToggle openToWork={false} visibility="public" />
    );
    await user.click(screen.getByRole("checkbox"));
    await waitFor(() =>
      expect(mockPut).toHaveBeenCalledWith(
        "/profiles/me/preferences",
        expect.objectContaining({ openToWork: true })
      )
    );
  });

  it("calls PUT with visibility when changing visibility option", async () => {
    const user = userEvent.setup();
    mockPut.mockResolvedValueOnce({ success: true, data: {} });
    render(
      <OpenToWorkToggle openToWork={true} visibility="public" />
    );
    await user.click(screen.getByRole("radio", { name: /recruiter/i }));
    await waitFor(() =>
      expect(mockPut).toHaveBeenCalledWith(
        "/profiles/me/preferences",
        expect.objectContaining({ openToWorkVisibility: "recruiters_only" })
      )
    );
  });
});
