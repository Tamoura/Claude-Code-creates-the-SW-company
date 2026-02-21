import React from "react";
import { screen, act } from "@testing-library/react";
import { render } from "@testing-library/react";
import { renderHook } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { ThemeProvider, useTheme } from "../ThemeProvider";

// ---------------------------------------------------------------------------
// Browser API mocks
// localStorage is available in jsdom but matchMedia is not — we need to
// provide a full mock that also supports addEventListener / removeEventListener
// so the system-theme listener in the provider can be exercised.
// ---------------------------------------------------------------------------

type MediaQueryHandler = () => void;

function buildMatchMediaMock(prefersDark: boolean) {
  const listeners: MediaQueryHandler[] = [];

  const mql = {
    matches: prefersDark,
    addEventListener: jest.fn((_event: string, handler: MediaQueryHandler) => {
      listeners.push(handler);
    }),
    removeEventListener: jest.fn(
      (_event: string, handler: MediaQueryHandler) => {
        const idx = listeners.indexOf(handler);
        if (idx !== -1) listeners.splice(idx, 1);
      }
    ),
    // Helper to simulate OS-level theme change in tests
    simulateChange: (newPrefersDark: boolean) => {
      mql.matches = newPrefersDark;
      listeners.forEach((fn) => fn());
    },
  };

  return mql;
}

// Store a reference to the current mock so tests can call simulateChange.
let matchMediaMock: ReturnType<typeof buildMatchMediaMock>;

function setupMatchMedia(prefersDark = false) {
  matchMediaMock = buildMatchMediaMock(prefersDark);
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: jest.fn(() => matchMediaMock),
  });
}

// ---------------------------------------------------------------------------
// renderWithAct: wraps render inside act so useEffect state updates are
// flushed synchronously and React's "not configured to support act()" warning
// is suppressed.
// ---------------------------------------------------------------------------
async function renderProvider(ui: React.ReactElement) {
  let result!: ReturnType<typeof render>;
  await act(async () => {
    result = render(ui);
  });
  return result;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function TestConsumer() {
  const { theme, resolvedTheme, setTheme } = useTheme();
  return (
    <div>
      <span data-testid="theme">{theme}</span>
      <span data-testid="resolved">{resolvedTheme}</span>
      <button onClick={() => setTheme("light")}>set-light</button>
      <button onClick={() => setTheme("dark")}>set-dark</button>
      <button onClick={() => setTheme("system")}>set-system</button>
    </div>
  );
}

function wrapper({ children }: { children: React.ReactNode }) {
  return <ThemeProvider>{children}</ThemeProvider>;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("ThemeProvider", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove("dark");
    setupMatchMedia(false);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("initial state", () => {
    it("defaults to system theme when no defaultTheme prop is provided", async () => {
      await renderProvider(<ThemeProvider><TestConsumer /></ThemeProvider>);

      expect(screen.getByTestId("theme").textContent).toBe("system");
    });

    it("uses the defaultTheme prop when provided", async () => {
      await renderProvider(
        <ThemeProvider defaultTheme="light">
          <TestConsumer />
        </ThemeProvider>
      );

      expect(screen.getByTestId("theme").textContent).toBe("light");
    });

    it("reads persisted theme from localStorage on mount", async () => {
      localStorage.setItem("connectin-theme", "dark");

      await renderProvider(<ThemeProvider><TestConsumer /></ThemeProvider>);

      expect(screen.getByTestId("theme").textContent).toBe("dark");
    });

    it("resolves light when system prefers light", async () => {
      setupMatchMedia(false);

      await renderProvider(<ThemeProvider><TestConsumer /></ThemeProvider>);

      expect(screen.getByTestId("resolved").textContent).toBe("light");
    });

    it("resolves dark when system prefers dark", async () => {
      setupMatchMedia(true);

      await renderProvider(<ThemeProvider><TestConsumer /></ThemeProvider>);

      expect(screen.getByTestId("resolved").textContent).toBe("dark");
    });
  });

  describe("setTheme", () => {
    it("switches to light theme", async () => {
      const user = userEvent.setup();

      await renderProvider(<ThemeProvider><TestConsumer /></ThemeProvider>);

      await user.click(screen.getByText("set-light"));

      expect(screen.getByTestId("theme").textContent).toBe("light");
      expect(screen.getByTestId("resolved").textContent).toBe("light");
    });

    it("switches to dark theme", async () => {
      const user = userEvent.setup();

      await renderProvider(<ThemeProvider><TestConsumer /></ThemeProvider>);

      await user.click(screen.getByText("set-dark"));

      expect(screen.getByTestId("theme").textContent).toBe("dark");
      expect(screen.getByTestId("resolved").textContent).toBe("dark");
    });

    it("switches to system theme", async () => {
      const user = userEvent.setup();
      setupMatchMedia(false);

      await renderProvider(
        <ThemeProvider defaultTheme="dark">
          <TestConsumer />
        </ThemeProvider>
      );

      await user.click(screen.getByText("set-system"));

      expect(screen.getByTestId("theme").textContent).toBe("system");
      // system + light OS preference = resolved light
      expect(screen.getByTestId("resolved").textContent).toBe("light");
    });
  });

  describe("dark class on documentElement", () => {
    it("adds dark class when theme is dark", async () => {
      const user = userEvent.setup();

      await renderProvider(<ThemeProvider><TestConsumer /></ThemeProvider>);

      await user.click(screen.getByText("set-dark"));

      expect(document.documentElement.classList.contains("dark")).toBe(true);
    });

    it("removes dark class when theme is light", async () => {
      document.documentElement.classList.add("dark");
      const user = userEvent.setup();

      await renderProvider(
        <ThemeProvider defaultTheme="dark"><TestConsumer /></ThemeProvider>
      );

      await user.click(screen.getByText("set-light"));

      expect(document.documentElement.classList.contains("dark")).toBe(false);
    });

    it("applies dark class when system prefers dark", async () => {
      setupMatchMedia(true);

      await renderProvider(<ThemeProvider><TestConsumer /></ThemeProvider>);

      expect(document.documentElement.classList.contains("dark")).toBe(true);
    });
  });

  describe("localStorage persistence", () => {
    it("persists theme choice to localStorage", async () => {
      const user = userEvent.setup();

      await renderProvider(<ThemeProvider><TestConsumer /></ThemeProvider>);

      await user.click(screen.getByText("set-dark"));

      expect(localStorage.getItem("connectin-theme")).toBe("dark");
    });

    it("persists light theme to localStorage", async () => {
      const user = userEvent.setup();

      await renderProvider(<ThemeProvider><TestConsumer /></ThemeProvider>);

      await user.click(screen.getByText("set-light"));

      expect(localStorage.getItem("connectin-theme")).toBe("light");
    });

    it("persists system theme to localStorage", async () => {
      const user = userEvent.setup();

      await renderProvider(
        <ThemeProvider defaultTheme="dark">
          <TestConsumer />
        </ThemeProvider>
      );

      await user.click(screen.getByText("set-system"));

      expect(localStorage.getItem("connectin-theme")).toBe("system");
    });
  });

  describe("system theme listener", () => {
    it("updates resolvedTheme when OS preference changes to dark", async () => {
      setupMatchMedia(false);

      await renderProvider(<ThemeProvider><TestConsumer /></ThemeProvider>);

      expect(screen.getByTestId("resolved").textContent).toBe("light");

      act(() => {
        matchMediaMock.simulateChange(true);
      });

      expect(screen.getByTestId("resolved").textContent).toBe("dark");
    });

    it("updates resolvedTheme when OS preference changes to light", async () => {
      setupMatchMedia(true);

      await renderProvider(<ThemeProvider><TestConsumer /></ThemeProvider>);

      expect(screen.getByTestId("resolved").textContent).toBe("dark");

      act(() => {
        matchMediaMock.simulateChange(false);
      });

      expect(screen.getByTestId("resolved").textContent).toBe("light");
    });

    it("resolves to the explicit light value when theme is light", async () => {
      const user = userEvent.setup();

      await renderProvider(
        <ThemeProvider defaultTheme="light"><TestConsumer /></ThemeProvider>
      );

      await user.click(screen.getByText("set-light"));

      // With an explicit theme, resolvedTheme should match regardless of system preference.
      expect(screen.getByTestId("resolved").textContent).toBe("light");
    });

    it("removes listener on unmount when theme is system", async () => {
      setupMatchMedia(false);

      const { unmount } = await renderProvider(
        <ThemeProvider>
          <TestConsumer />
        </ThemeProvider>
      );

      unmount();

      expect(matchMediaMock.removeEventListener).toHaveBeenCalled();
    });
  });

  describe("useTheme hook", () => {
    it("throws when used outside ThemeProvider", () => {
      const consoleError = jest
        .spyOn(console, "error")
        .mockImplementation(() => {});

      expect(() => {
        renderHook(() => useTheme());
      }).toThrow("useTheme must be used within a ThemeProvider");

      consoleError.mockRestore();
    });

    it("returns theme, resolvedTheme, and setTheme", async () => {
      const { result } = renderHook(() => useTheme(), { wrapper });

      // renderHook flushes effects internally
      await act(async () => {});

      expect(result.current.theme).toBeDefined();
      expect(result.current.resolvedTheme).toBeDefined();
      expect(typeof result.current.setTheme).toBe("function");
    });

    it("resolvedTheme is always light or dark (never system)", async () => {
      const { result } = renderHook(() => useTheme(), { wrapper });

      await act(async () => {});

      expect(["light", "dark"]).toContain(result.current.resolvedTheme);
    });
  });

  describe("children rendering", () => {
    it("renders children inside the provider", async () => {
      await renderProvider(
        <ThemeProvider>
          <p>inner content</p>
        </ThemeProvider>
      );

      expect(screen.getByText("inner content")).toBeInTheDocument();
    });
  });
});
