import { render, screen } from "@testing-library/react";
import SettingsPage from "../page";

const mockReplace = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mockReplace }),
}));

describe("SettingsPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("redirects to /settings/profile", () => {
    render(<SettingsPage />);
    expect(mockReplace).toHaveBeenCalledWith("/settings/profile");
  });

  it("renders links to all settings sections", () => {
    render(<SettingsPage />);

    expect(
      screen.getByRole("link", { name: /profile settings/i })
    ).toHaveAttribute("href", "/settings/profile");
    expect(
      screen.getByRole("link", { name: /account settings/i })
    ).toHaveAttribute("href", "/settings/account");
    expect(
      screen.getByRole("link", { name: /advisory preferences/i })
    ).toHaveAttribute("href", "/settings/preferences");
  });
});
