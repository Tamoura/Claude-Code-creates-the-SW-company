import { formatRelativeTime } from "../utils";

/**
 * Tests for formatRelativeTime.
 *
 * jest.useFakeTimers() is used to freeze the clock to a deterministic point
 * so that every assertion is stable regardless of when the suite runs.
 *
 * Fixed "now": 2024-06-15T12:00:00.000Z
 */

const FIXED_NOW = new Date("2024-06-15T12:00:00.000Z").getTime();

const SECOND = 1_000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;

/** Build an ISO date string that is `ms` milliseconds before the fixed "now". */
function msAgo(ms: number): string {
  return new Date(FIXED_NOW - ms).toISOString();
}

beforeAll(() => {
  jest.useFakeTimers();
  jest.setSystemTime(FIXED_NOW);
});

afterAll(() => {
  jest.useRealTimers();
});

describe("formatRelativeTime", () => {
  describe("seconds ago — returns 'just now' / 'X seconds ago'", () => {
    it("returns 'now' or 'just now' for a timestamp 0 seconds ago", () => {
      // Intl.RelativeTimeFormat with numeric:"auto" returns "now" for 0 seconds
      const result = formatRelativeTime(msAgo(0), "en");
      expect(result).toMatch(/now/i);
    });

    it("returns a seconds-ago string for 30 seconds ago", () => {
      const result = formatRelativeTime(msAgo(30 * SECOND), "en");
      expect(result).toMatch(/30 second/i);
    });

    it("returns a seconds-ago string for 59 seconds ago", () => {
      const result = formatRelativeTime(msAgo(59 * SECOND), "en");
      expect(result).toMatch(/59 second/i);
    });
  });

  describe("minutes ago — diff >= 60 s and < 60 min", () => {
    it("returns a minutes string for 60 seconds ago", () => {
      const result = formatRelativeTime(msAgo(60 * SECOND), "en");
      expect(result).toMatch(/minute/i);
    });

    it("returns a minutes-ago string for 30 minutes ago", () => {
      const result = formatRelativeTime(msAgo(30 * MINUTE), "en");
      expect(result).toMatch(/30 minute/i);
    });

    it("returns a minutes-ago string for 59 minutes ago", () => {
      const result = formatRelativeTime(msAgo(59 * MINUTE), "en");
      expect(result).toMatch(/59 minute/i);
    });
  });

  describe("hours ago — diff >= 60 min and < 24 h", () => {
    it("returns an hours string for exactly 1 hour ago", () => {
      const result = formatRelativeTime(msAgo(HOUR), "en");
      expect(result).toMatch(/hour/i);
    });

    it("returns a hours-ago string for 5 hours ago", () => {
      const result = formatRelativeTime(msAgo(5 * HOUR), "en");
      expect(result).toMatch(/5 hour/i);
    });

    it("returns a hours-ago string for 23 hours ago", () => {
      const result = formatRelativeTime(msAgo(23 * HOUR), "en");
      expect(result).toMatch(/23 hour/i);
    });
  });

  describe("days ago — diff >= 24 h and < 7 days", () => {
    it("returns a days-ago string for 1 day ago", () => {
      const result = formatRelativeTime(msAgo(DAY), "en");
      expect(result).toMatch(/day/i);
    });

    it("returns a days-ago string for 3 days ago", () => {
      const result = formatRelativeTime(msAgo(3 * DAY), "en");
      expect(result).toMatch(/3 day/i);
    });

    it("returns a days-ago string for 6 days ago", () => {
      const result = formatRelativeTime(msAgo(6 * DAY), "en");
      expect(result).toMatch(/6 day/i);
    });
  });

  describe("weeks ago — diff >= 7 days and < 28 days", () => {
    it("returns a weeks-ago string for exactly 7 days ago", () => {
      const result = formatRelativeTime(msAgo(WEEK), "en");
      expect(result).toMatch(/week/i);
    });

    it("returns a weeks-ago string for 2 weeks ago", () => {
      const result = formatRelativeTime(msAgo(2 * WEEK), "en");
      expect(result).toMatch(/2 week/i);
    });
  });

  describe("old dates — diff >= 28 days — returns a locale date string", () => {
    it("returns a formatted date string for a date 4 weeks ago", () => {
      const result = formatRelativeTime(msAgo(4 * WEEK), "en");
      // Should NOT contain "ago" — it is a calendar date
      expect(result).not.toMatch(/ago/i);
      // Should look like a date (contains at least one digit)
      expect(result).toMatch(/\d/);
    });

    it("returns a formatted date string for a date 1 year ago", () => {
      const oneYearAgo = new Date(FIXED_NOW);
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
      const result = formatRelativeTime(oneYearAgo.toISOString(), "en");
      expect(result).not.toMatch(/ago/i);
      expect(result).toMatch(/\d/);
    });
  });

  describe("locale support", () => {
    it("accepts an 'ar' locale parameter without throwing", () => {
      expect(() =>
        formatRelativeTime(msAgo(5 * MINUTE), "ar")
      ).not.toThrow();
    });

    it("defaults to 'en' locale when no locale is passed", () => {
      const withLocale = formatRelativeTime(msAgo(5 * MINUTE), "en");
      const withDefault = formatRelativeTime(msAgo(5 * MINUTE));
      expect(withLocale).toBe(withDefault);
    });
  });
});
