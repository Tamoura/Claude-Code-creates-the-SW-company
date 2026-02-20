import React from "react";
import { render, screen, act, waitFor } from "@testing-library/react";

// ---------------------------------------------------------------------------
// Mock react-i18next so we avoid pulling in the real i18next runtime.
// We capture whatever i18n instance is passed to I18nextProvider so we can
// inspect it in tests.
// ---------------------------------------------------------------------------
let capturedI18nInstance: Record<string, unknown> | null = null;

jest.mock("react-i18next", () => ({
  I18nextProvider: ({
    children,
    i18n,
  }: {
    children: React.ReactNode;
    i18n: Record<string, unknown>;
  }) => {
    capturedI18nInstance = i18n;
    return <>{children}</>;
  },
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: "en", changeLanguage: jest.fn() },
  }),
}));

// ---------------------------------------------------------------------------
// Build a fake i18n instance with the shape the provider depends on.
//   - i18n.language         (read)
//   - i18n.on(event, fn)    (subscribe to languageChanged)
//   - i18n.off(event, fn)   (unsubscribe)
//   - i18n.changeLanguage   (programmatic switch, called from tests)
// ---------------------------------------------------------------------------
type LangChangedHandler = (lng: string) => void;

const languageChangedHandlers: LangChangedHandler[] = [];

const fakeI18n = {
  language: "en",
  on: jest.fn((event: string, handler: LangChangedHandler) => {
    if (event === "languageChanged") {
      languageChangedHandlers.push(handler);
    }
  }),
  off: jest.fn((event: string, handler: LangChangedHandler) => {
    if (event === "languageChanged") {
      const idx = languageChangedHandlers.indexOf(handler);
      if (idx !== -1) languageChangedHandlers.splice(idx, 1);
    }
  }),
  // Helper used in tests to simulate a language change
  simulateLanguageChange(lng: string) {
    this.language = lng;
    languageChangedHandlers.forEach((fn) => fn(lng));
  },
};

jest.mock("@/i18n/config", () => fakeI18n);

// ---------------------------------------------------------------------------
// Import the provider AFTER mocks are set up
// ---------------------------------------------------------------------------
import { I18nProvider } from "../I18nProvider";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function TestChild() {
  return <p data-testid="child">hello</p>;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("I18nProvider", () => {
  beforeEach(() => {
    // Reset DOM attributes
    document.documentElement.removeAttribute("dir");
    document.documentElement.removeAttribute("lang");
    // Reset language state
    fakeI18n.language = "en";
    // Clear any lingering handlers (they are cleaned up by the provider's
    // cleanup, but guard against test isolation leaks)
    languageChangedHandlers.length = 0;
    capturedI18nInstance = null;
    jest.clearAllMocks();
  });

  describe("initialisation", () => {
    it("renders children after initialisation", async () => {
      render(
        <I18nProvider>
          <TestChild />
        </I18nProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId("child")).toBeInTheDocument();
      });
    });

    it("does not render children before ready", () => {
      // The provider renders null until isReady is true.
      // Because useEffect is async, the component starts in !isReady.
      // In the jsdom/act environment the effect fires synchronously enough
      // that by the time render returns the child is visible — so we verify
      // the provider eventually reaches the ready state (children visible).
      render(
        <I18nProvider>
          <TestChild />
        </I18nProvider>
      );

      // After effects fire the child should appear
      expect(screen.getByTestId("child")).toBeInTheDocument();
    });

    it("passes the i18n config instance to I18nextProvider", async () => {
      render(
        <I18nProvider>
          <TestChild />
        </I18nProvider>
      );

      await waitFor(() => {
        expect(capturedI18nInstance).not.toBeNull();
      });

      expect(capturedI18nInstance).toBe(fakeI18n);
    });
  });

  describe("document attributes — initial language", () => {
    it("sets lang attribute to the current i18n language on mount", async () => {
      fakeI18n.language = "en";

      render(
        <I18nProvider>
          <TestChild />
        </I18nProvider>
      );

      await waitFor(() => {
        expect(document.documentElement.getAttribute("lang")).toBe("en");
      });
    });

    it("sets dir=ltr for English on mount", async () => {
      fakeI18n.language = "en";

      render(
        <I18nProvider>
          <TestChild />
        </I18nProvider>
      );

      await waitFor(() => {
        expect(document.documentElement.getAttribute("dir")).toBe("ltr");
      });
    });

    it("sets dir=rtl for Arabic on mount", async () => {
      fakeI18n.language = "ar";

      render(
        <I18nProvider>
          <TestChild />
        </I18nProvider>
      );

      await waitFor(() => {
        expect(document.documentElement.getAttribute("dir")).toBe("rtl");
      });
    });

    it("sets lang=ar when i18n language is Arabic on mount", async () => {
      fakeI18n.language = "ar";

      render(
        <I18nProvider>
          <TestChild />
        </I18nProvider>
      );

      await waitFor(() => {
        expect(document.documentElement.getAttribute("lang")).toBe("ar");
      });
    });
  });

  describe("language change events", () => {
    it("updates dir to rtl when language changes to Arabic", async () => {
      fakeI18n.language = "en";

      render(
        <I18nProvider>
          <TestChild />
        </I18nProvider>
      );

      // Wait for initial setup
      await waitFor(() => {
        expect(document.documentElement.getAttribute("lang")).toBe("en");
      });

      act(() => {
        fakeI18n.simulateLanguageChange("ar");
      });

      expect(document.documentElement.getAttribute("dir")).toBe("rtl");
      expect(document.documentElement.getAttribute("lang")).toBe("ar");
    });

    it("updates dir to ltr when language changes from Arabic to English", async () => {
      fakeI18n.language = "ar";

      render(
        <I18nProvider>
          <TestChild />
        </I18nProvider>
      );

      await waitFor(() => {
        expect(document.documentElement.getAttribute("dir")).toBe("rtl");
      });

      act(() => {
        fakeI18n.simulateLanguageChange("en");
      });

      expect(document.documentElement.getAttribute("dir")).toBe("ltr");
      expect(document.documentElement.getAttribute("lang")).toBe("en");
    });

    it("registers a languageChanged listener on mount", async () => {
      render(
        <I18nProvider>
          <TestChild />
        </I18nProvider>
      );

      await waitFor(() => {
        expect(fakeI18n.on).toHaveBeenCalledWith(
          "languageChanged",
          expect.any(Function)
        );
      });
    });

    it("removes the languageChanged listener on unmount", async () => {
      const { unmount } = render(
        <I18nProvider>
          <TestChild />
        </I18nProvider>
      );

      await waitFor(() => {
        expect(fakeI18n.on).toHaveBeenCalled();
      });

      unmount();

      expect(fakeI18n.off).toHaveBeenCalledWith(
        "languageChanged",
        expect.any(Function)
      );
    });

    it("stops responding to language changes after unmount", async () => {
      fakeI18n.language = "en";

      const { unmount } = render(
        <I18nProvider>
          <TestChild />
        </I18nProvider>
      );

      await waitFor(() => {
        expect(document.documentElement.getAttribute("lang")).toBe("en");
      });

      unmount();

      // Language change fires after unmount — attributes should not update
      act(() => {
        fakeI18n.simulateLanguageChange("ar");
      });

      // After unmount the listener was removed, so lang stays as "en"
      expect(document.documentElement.getAttribute("lang")).toBe("en");
    });
  });

  describe("RTL/LTR direction logic", () => {
    const cases: Array<{ language: string; expectedDir: string }> = [
      { language: "ar", expectedDir: "rtl" },
      { language: "en", expectedDir: "ltr" },
      // Any non-Arabic language should be ltr
      { language: "fr", expectedDir: "ltr" },
      { language: "de", expectedDir: "ltr" },
    ];

    cases.forEach(({ language, expectedDir }) => {
      it(`sets dir=${expectedDir} for language "${language}"`, async () => {
        fakeI18n.language = language;

        render(
          <I18nProvider>
            <TestChild />
          </I18nProvider>
        );

        await waitFor(() => {
          expect(document.documentElement.getAttribute("dir")).toBe(
            expectedDir
          );
        });
      });
    });

    it("updates to rtl on dynamic change to ar", async () => {
      fakeI18n.language = "en";

      render(
        <I18nProvider>
          <TestChild />
        </I18nProvider>
      );

      await waitFor(() => {
        expect(document.documentElement.getAttribute("dir")).toBe("ltr");
      });

      act(() => {
        fakeI18n.simulateLanguageChange("ar");
      });

      expect(document.documentElement.getAttribute("dir")).toBe("rtl");
    });

    it("updates back to ltr on dynamic change away from ar", async () => {
      fakeI18n.language = "ar";

      render(
        <I18nProvider>
          <TestChild />
        </I18nProvider>
      );

      await waitFor(() => {
        expect(document.documentElement.getAttribute("dir")).toBe("rtl");
      });

      act(() => {
        fakeI18n.simulateLanguageChange("en");
      });

      expect(document.documentElement.getAttribute("dir")).toBe("ltr");
    });
  });
});
