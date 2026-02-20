import { cn, truncateText, getInitials } from "../utils";

describe("cn", () => {
  it("merges class names", () => {
    expect(cn("foo", "bar")).toBe("foo bar");
  });

  it("handles conditional classes", () => {
    expect(cn("base", false && "hidden", "visible")).toBe("base visible");
  });

  it("deduplicates tailwind classes", () => {
    expect(cn("p-4", "p-2")).toBe("p-2");
  });
});

describe("truncateText", () => {
  it("returns text unchanged if shorter than maxLength", () => {
    expect(truncateText("hello", 10)).toBe("hello");
  });

  it("truncates and adds ellipsis", () => {
    expect(truncateText("hello world", 5)).toBe("hello...");
  });

  it("handles exact length", () => {
    expect(truncateText("hello", 5)).toBe("hello");
  });
});

describe("getInitials", () => {
  it("returns single initial for one name", () => {
    expect(getInitials("Ahmad")).toBe("A");
  });

  it("returns first and last initials for two names", () => {
    expect(getInitials("Ahmad Hassan")).toBe("AH");
  });

  it("returns first and last initials for three names", () => {
    expect(getInitials("Ahmad Ibn Hassan")).toBe("AH");
  });

  it("handles Arabic names", () => {
    expect(getInitials("أحمد حسن")).toBe("أح");
  });
});
