import { describe, it, expect } from "vitest";
import { cn, formatCurrency, formatNumber, formatPercent, getInitials, truncate } from "./utils";

describe("utils", () => {
  describe("cn", () => {
    it("merges class names", () => {
      expect(cn("foo", "bar")).toBe("foo bar");
    });

    it("handles conditional classes", () => {
      expect(cn("foo", false && "bar", "baz")).toBe("foo baz");
    });

    it("merges tailwind classes correctly", () => {
      expect(cn("px-2", "px-4")).toBe("px-4");
    });
  });

  describe("formatCurrency", () => {
    it("formats numbers as currency", () => {
      expect(formatCurrency(1000)).toBe("$1,000");
      expect(formatCurrency(1234567)).toBe("$1,234,567");
    });

    it("handles zero", () => {
      expect(formatCurrency(0)).toBe("$0");
    });

    it("handles negative numbers", () => {
      expect(formatCurrency(-1000)).toBe("-$1,000");
    });
  });

  describe("formatNumber", () => {
    it("formats numbers with commas", () => {
      expect(formatNumber(1000)).toBe("1,000");
      expect(formatNumber(1234567)).toBe("1,234,567");
    });
  });

  describe("formatPercent", () => {
    it("formats numbers as percentages", () => {
      expect(formatPercent(50)).toBe("50.0%");
      expect(formatPercent(75.5)).toBe("75.5%");
    });

    it("respects decimal places", () => {
      expect(formatPercent(75.555, 2)).toBe("75.56%");
      expect(formatPercent(75.555, 0)).toBe("76%");
    });
  });

  describe("getInitials", () => {
    it("gets initials from full name", () => {
      expect(getInitials("John Doe")).toBe("JD");
      expect(getInitials("Jane Smith")).toBe("JS");
    });

    it("handles single names", () => {
      expect(getInitials("Madonna")).toBe("M");
    });

    it("handles three or more names", () => {
      expect(getInitials("John Paul Jones")).toBe("JP");
    });
  });

  describe("truncate", () => {
    it("truncates long text", () => {
      expect(truncate("Hello World", 5)).toBe("Hello...");
    });

    it("does not truncate short text", () => {
      expect(truncate("Hello", 10)).toBe("Hello");
    });

    it("handles exact length", () => {
      expect(truncate("Hello", 5)).toBe("Hello");
    });
  });
});
