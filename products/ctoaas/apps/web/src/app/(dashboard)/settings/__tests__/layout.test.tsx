import { render, screen } from "@testing-library/react";
import SettingsLayout from "../layout";

let mockPathname = "/settings/profile";
jest.mock("next/navigation", () => ({
  usePathname: () => mockPathname,
}));

describe("SettingsLayout", () => {
  beforeEach(() => {
    mockPathname = "/settings/profile";
  });

  it("renders the settings heading", () => {
    render(
      <SettingsLayout>
        <div>child content</div>
      </SettingsLayout>
    );

    expect(
      screen.getByRole("heading", { name: /settings/i })
    ).toBeInTheDocument();
  });

  it("renders all three navigation tabs", () => {
    render(
      <SettingsLayout>
        <div>child content</div>
      </SettingsLayout>
    );

    expect(screen.getByRole("tab", { name: /profile/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /account/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /preferences/i })).toBeInTheDocument();
  });

  it("marks the active tab with aria-current", () => {
    mockPathname = "/settings/account";
    render(
      <SettingsLayout>
        <div>child content</div>
      </SettingsLayout>
    );

    expect(screen.getByRole("tab", { name: /account/i })).toHaveAttribute(
      "aria-current",
      "page"
    );
    expect(screen.getByRole("tab", { name: /profile/i })).not.toHaveAttribute(
      "aria-current"
    );
  });

  it("renders children content", () => {
    render(
      <SettingsLayout>
        <div>child content</div>
      </SettingsLayout>
    );

    expect(screen.getByText("child content")).toBeInTheDocument();
  });

  it("has navigation landmark with accessible label", () => {
    render(
      <SettingsLayout>
        <div>child content</div>
      </SettingsLayout>
    );

    expect(
      screen.getByRole("navigation", { name: /settings/i })
    ).toBeInTheDocument();
  });
});
