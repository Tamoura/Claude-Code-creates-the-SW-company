import React from "react";
import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CookieConsent } from "../CookieConsent";

// Mock react-i18next — CookieConsent uses the t() function for labels.
jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const map: Record<string, string> = {
        "consent.title": "Cookie Consent",
        "consent.message": "We use cookies to improve your experience.",
        "consent.privacyLink": "Privacy Policy",
        "consent.accept": "Accept",
        "consent.decline": "Decline",
      };
      return map[key] ?? key;
    },
  }),
}));

const CONSENT_KEY = "connectin-cookie-consent";

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

function renderWithAct() {
  // CookieConsent uses useEffect to check localStorage, so we must wrap the
  // initial render in act() to flush the effect synchronously.
  let result!: ReturnType<typeof render>;
  act(() => {
    result = render(<CookieConsent />);
  });
  return result;
}

// ---------------------------------------------------------------------------
// tests
// ---------------------------------------------------------------------------

describe("CookieConsent", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("does not render when consent is already stored as 'accepted'", () => {
    localStorage.setItem(CONSENT_KEY, "accepted");
    renderWithAct();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("does not render when consent is already stored as 'declined'", () => {
    localStorage.setItem(CONSENT_KEY, "declined");
    renderWithAct();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("renders the banner when no consent is stored", () => {
    renderWithAct();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("has aria-modal attribute on the dialog element", () => {
    renderWithAct();
    const dialog = screen.getByRole("dialog");
    // The component sets aria-modal="false" (per spec — it is not a modal
    // trap, it is an inline banner). We test that the attribute is present.
    expect(dialog).toHaveAttribute("aria-modal");
  });

  it("has aria-label describing the dialog", () => {
    renderWithAct();
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("aria-label", "Cookie Consent");
  });

  it("renders Accept and Decline buttons", () => {
    renderWithAct();
    expect(
      screen.getByRole("button", { name: /accept/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /decline/i })
    ).toBeInTheDocument();
  });

  it("clicking Accept stores 'accepted' in localStorage", async () => {
    const user = userEvent.setup();
    renderWithAct();
    await user.click(screen.getByRole("button", { name: /accept/i }));
    expect(localStorage.getItem(CONSENT_KEY)).toBe("accepted");
  });

  it("clicking Accept hides the banner", async () => {
    const user = userEvent.setup();
    renderWithAct();
    await user.click(screen.getByRole("button", { name: /accept/i }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("clicking Decline stores 'declined' in localStorage", async () => {
    const user = userEvent.setup();
    renderWithAct();
    await user.click(screen.getByRole("button", { name: /decline/i }));
    expect(localStorage.getItem(CONSENT_KEY)).toBe("declined");
  });

  it("clicking Decline hides the banner", async () => {
    const user = userEvent.setup();
    renderWithAct();
    await user.click(screen.getByRole("button", { name: /decline/i }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("renders the privacy policy link", () => {
    renderWithAct();
    expect(screen.getByRole("link", { name: /privacy policy/i })).toHaveAttribute(
      "href",
      "/privacy"
    );
  });
});
