import {
  getScoreColor,
  getTrendDisplay,
  RISK_CATEGORY_META,
  type RiskCategory,
} from "../risks";

describe("getScoreColor", () => {
  it("returns green for scores 1-3", () => {
    expect(getScoreColor(1).text).toBe("text-green-800");
    expect(getScoreColor(2).bg).toBe("bg-green-100");
    expect(getScoreColor(3).border).toBe("border-green-300");
  });

  it("returns yellow for scores 4-6", () => {
    expect(getScoreColor(4).text).toBe("text-yellow-800");
    expect(getScoreColor(5).bg).toBe("bg-yellow-100");
    expect(getScoreColor(6).border).toBe("border-yellow-300");
  });

  it("returns red for scores 7-10", () => {
    expect(getScoreColor(7).text).toBe("text-red-800");
    expect(getScoreColor(8).bg).toBe("bg-red-100");
    expect(getScoreColor(10).border).toBe("border-red-300");
  });
});

describe("getTrendDisplay", () => {
  it("returns increasing for up trend", () => {
    const result = getTrendDisplay("up");
    expect(result.label).toBe("Increasing");
    expect(result.color).toBe("text-red-600");
  });

  it("returns decreasing for down trend", () => {
    const result = getTrendDisplay("down");
    expect(result.label).toBe("Decreasing");
    expect(result.color).toBe("text-green-600");
  });

  it("returns stable for stable trend", () => {
    const result = getTrendDisplay("stable");
    expect(result.label).toBe("Stable");
    expect(result.color).toBe("text-gray-600");
  });
});

describe("RISK_CATEGORY_META", () => {
  it("has metadata for all four categories", () => {
    const categories: RiskCategory[] = [
      "tech-debt",
      "vendor",
      "compliance",
      "operational",
    ];
    categories.forEach((cat) => {
      expect(RISK_CATEGORY_META[cat]).toBeDefined();
      expect(RISK_CATEGORY_META[cat].label).toBeTruthy();
      expect(RISK_CATEGORY_META[cat].iconName).toBeTruthy();
      expect(RISK_CATEGORY_META[cat].description).toBeTruthy();
    });
  });
});
