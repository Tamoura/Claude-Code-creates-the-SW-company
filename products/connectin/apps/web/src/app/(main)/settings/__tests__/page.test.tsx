import { render, screen } from "@testing-library/react";
import SettingsPage from "../page";

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { changeLanguage: jest.fn(), language: "en", dir: () => "ltr" },
  }),
}));

jest.mock("@/hooks/useProfile", () => ({
  useProfile: () => ({ profile: { slug: "test-user" }, isLoading: false }),
}));

jest.mock("@/lib/api", () => ({
  apiClient: { put: jest.fn() },
}));

describe("SettingsPage", () => {
  it("renders all settings sections", () => {
    render(<SettingsPage />);
    expect(screen.getByText("settings.account")).toBeInTheDocument();
    expect(screen.getByText("settings.notifications")).toBeInTheDocument();
    expect(screen.getByText("settings.privacy")).toBeInTheDocument();
  });

  it("renders custom URL section", () => {
    render(<SettingsPage />);
    expect(screen.getByText("settings.customUrl")).toBeInTheDocument();
  });

  it("renders language section", () => {
    render(<SettingsPage />);
    expect(screen.getByText("settings.language")).toBeInTheDocument();
  });
});
