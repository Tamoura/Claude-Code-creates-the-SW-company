import { renderHook } from "@testing-library/react";
import { useDirection } from "../useDirection";

const mockChangeLanguage = jest.fn();

// Mock react-i18next with a mutable language reference
let currentLanguage = "en";

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: {
      get language() {
        return currentLanguage;
      },
      changeLanguage: mockChangeLanguage,
    },
  }),
}));

describe("useDirection", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    currentLanguage = "en";
  });

  describe("English language (ltr)", () => {
    it("returns ltr direction for English", () => {
      currentLanguage = "en";
      const { result } = renderHook(() => useDirection());
      expect(result.current.direction).toBe("ltr");
    });

    it("returns isRtl false for English", () => {
      currentLanguage = "en";
      const { result } = renderHook(() => useDirection());
      expect(result.current.isRtl).toBe(false);
    });

    it("returns the current language value for English", () => {
      currentLanguage = "en";
      const { result } = renderHook(() => useDirection());
      expect(result.current.language).toBe("en");
    });
  });

  describe("Arabic language (rtl)", () => {
    it("returns rtl direction for Arabic", () => {
      currentLanguage = "ar";
      const { result } = renderHook(() => useDirection());
      expect(result.current.direction).toBe("rtl");
    });

    it("returns isRtl true for Arabic", () => {
      currentLanguage = "ar";
      const { result } = renderHook(() => useDirection());
      expect(result.current.isRtl).toBe(true);
    });

    it("returns the current language value for Arabic", () => {
      currentLanguage = "ar";
      const { result } = renderHook(() => useDirection());
      expect(result.current.language).toBe("ar");
    });
  });

  describe("unknown language (ltr fallback)", () => {
    it("returns ltr for an unrecognized language code", () => {
      currentLanguage = "fr";
      const { result } = renderHook(() => useDirection());
      expect(result.current.direction).toBe("ltr");
    });

    it("returns isRtl false for an unrecognized language code", () => {
      currentLanguage = "fr";
      const { result } = renderHook(() => useDirection());
      expect(result.current.isRtl).toBe(false);
    });
  });

  describe("return shape", () => {
    it("returns an object with direction, isRtl, and language keys", () => {
      const { result } = renderHook(() => useDirection());
      expect(result.current).toHaveProperty("direction");
      expect(result.current).toHaveProperty("isRtl");
      expect(result.current).toHaveProperty("language");
    });

    it("direction and isRtl are consistent with each other", () => {
      currentLanguage = "ar";
      const { result } = renderHook(() => useDirection());
      const { direction, isRtl } = result.current;
      expect(direction === "rtl").toBe(isRtl);
    });
  });
});
