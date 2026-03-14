import {
  step1Schema,
  step2Schema,
  step3Schema,
  step4Schema,
  INDUSTRY_OPTIONS,
  EMPLOYEE_COUNT_OPTIONS,
  GROWTH_STAGE_OPTIONS,
  LANGUAGE_OPTIONS,
  FRAMEWORK_OPTIONS,
  DATABASE_OPTIONS,
  CLOUD_PROVIDER_OPTIONS,
  CHALLENGE_OPTIONS,
  COMMUNICATION_STYLES,
  RESPONSE_FORMATS,
  DETAIL_LEVELS,
  INTEREST_AREAS,
} from "../onboarding";

describe("Onboarding Validation Schemas", () => {
  describe("step1Schema (Company Basics)", () => {
    it("accepts valid company data", () => {
      const result = step1Schema.safeParse({
        industry: "Technology",
        employeeCount: "11-50",
        growthStage: "Series A",
        foundedYear: 2020,
      });
      expect(result.success).toBe(true);
    });

    it("rejects missing industry", () => {
      const result = step1Schema.safeParse({
        employeeCount: "11-50",
        growthStage: "Series A",
        foundedYear: 2020,
      });
      expect(result.success).toBe(false);
    });

    it("rejects missing employeeCount", () => {
      const result = step1Schema.safeParse({
        industry: "Technology",
        growthStage: "Series A",
        foundedYear: 2020,
      });
      expect(result.success).toBe(false);
    });

    it("rejects missing growthStage", () => {
      const result = step1Schema.safeParse({
        industry: "Technology",
        employeeCount: "11-50",
        foundedYear: 2020,
      });
      expect(result.success).toBe(false);
    });

    it("rejects foundedYear before 1900", () => {
      const result = step1Schema.safeParse({
        industry: "Technology",
        employeeCount: "11-50",
        growthStage: "Series A",
        foundedYear: 1899,
      });
      expect(result.success).toBe(false);
    });

    it("rejects foundedYear in the future", () => {
      const result = step1Schema.safeParse({
        industry: "Technology",
        employeeCount: "11-50",
        growthStage: "Series A",
        foundedYear: new Date().getFullYear() + 1,
      });
      expect(result.success).toBe(false);
    });

    it("accepts foundedYear as optional", () => {
      const result = step1Schema.safeParse({
        industry: "Technology",
        employeeCount: "11-50",
        growthStage: "Series A",
      });
      expect(result.success).toBe(true);
    });
  });

  describe("step2Schema (Tech Stack)", () => {
    it("accepts valid tech stack data", () => {
      const result = step2Schema.safeParse({
        languages: ["TypeScript", "Python"],
        frameworks: ["React"],
        databases: ["PostgreSQL"],
        cloudProvider: "AWS",
        architectureNotes: "Microservices",
      });
      expect(result.success).toBe(true);
    });

    it("accepts empty arrays for optional multi-selects", () => {
      const result = step2Schema.safeParse({
        languages: [],
        frameworks: [],
        databases: [],
        cloudProvider: "AWS",
      });
      expect(result.success).toBe(true);
    });

    it("rejects architectureNotes over 2000 chars", () => {
      const result = step2Schema.safeParse({
        languages: [],
        frameworks: [],
        databases: [],
        cloudProvider: "AWS",
        architectureNotes: "a".repeat(2001),
      });
      expect(result.success).toBe(false);
    });

    it("accepts missing cloudProvider", () => {
      const result = step2Schema.safeParse({
        languages: ["TypeScript"],
        frameworks: ["React"],
        databases: ["PostgreSQL"],
      });
      expect(result.success).toBe(true);
    });
  });

  describe("step3Schema (Challenges)", () => {
    it("accepts valid challenges with at least one selected", () => {
      const result = step3Schema.safeParse({
        challenges: ["Scaling infrastructure"],
        customChallenges: [],
      });
      expect(result.success).toBe(true);
    });

    it("accepts custom challenges counting toward minimum", () => {
      const result = step3Schema.safeParse({
        challenges: [],
        customChallenges: ["My unique challenge"],
      });
      expect(result.success).toBe(true);
    });

    it("rejects when no challenges selected at all", () => {
      const result = step3Schema.safeParse({
        challenges: [],
        customChallenges: [],
      });
      expect(result.success).toBe(false);
    });
  });

  describe("step4Schema (Preferences)", () => {
    it("accepts valid preferences", () => {
      const result = step4Schema.safeParse({
        communicationStyle: "Balanced",
        responseFormat: "Executive summary",
        detailLevel: "Moderate",
        areasOfInterest: ["Architecture", "Security"],
      });
      expect(result.success).toBe(true);
    });

    it("accepts empty areasOfInterest", () => {
      const result = step4Schema.safeParse({
        communicationStyle: "Concise",
        responseFormat: "Technical deep-dive",
        detailLevel: "High-level",
        areasOfInterest: [],
      });
      expect(result.success).toBe(true);
    });

    it("rejects missing communicationStyle", () => {
      const result = step4Schema.safeParse({
        responseFormat: "Executive summary",
        detailLevel: "Moderate",
        areasOfInterest: [],
      });
      expect(result.success).toBe(false);
    });
  });

  describe("Option constants", () => {
    it("has at least 20 industry options", () => {
      expect(INDUSTRY_OPTIONS.length).toBeGreaterThanOrEqual(20);
    });

    it("has employee count ranges", () => {
      expect(EMPLOYEE_COUNT_OPTIONS).toContain("1-10");
      expect(EMPLOYEE_COUNT_OPTIONS).toContain("1000+");
    });

    it("has growth stages", () => {
      expect(GROWTH_STAGE_OPTIONS).toContain("Seed");
      expect(GROWTH_STAGE_OPTIONS).toContain("Enterprise");
    });

    it("has programming languages", () => {
      expect(LANGUAGE_OPTIONS).toContain("TypeScript");
      expect(LANGUAGE_OPTIONS).toContain("Python");
    });

    it("has frameworks", () => {
      expect(FRAMEWORK_OPTIONS).toContain("React");
      expect(FRAMEWORK_OPTIONS).toContain("Next.js");
    });

    it("has databases", () => {
      expect(DATABASE_OPTIONS).toContain("PostgreSQL");
      expect(DATABASE_OPTIONS).toContain("MongoDB");
    });

    it("has cloud providers", () => {
      expect(CLOUD_PROVIDER_OPTIONS).toContain("AWS");
      expect(CLOUD_PROVIDER_OPTIONS).toContain("Multi-cloud");
    });

    it("has challenge options", () => {
      expect(CHALLENGE_OPTIONS).toContain("Scaling infrastructure");
      expect(CHALLENGE_OPTIONS.length).toBeGreaterThanOrEqual(12);
    });

    it("has communication styles", () => {
      expect(COMMUNICATION_STYLES).toEqual(["Concise", "Balanced", "Detailed"]);
    });

    it("has response formats", () => {
      expect(RESPONSE_FORMATS).toEqual([
        "Executive summary",
        "Technical deep-dive",
        "Actionable recommendations",
      ]);
    });

    it("has detail levels", () => {
      expect(DETAIL_LEVELS).toEqual(["High-level", "Moderate", "Granular"]);
    });

    it("has interest areas", () => {
      expect(INTEREST_AREAS).toContain("Architecture");
      expect(INTEREST_AREAS).toContain("Security");
      expect(INTEREST_AREAS.length).toBeGreaterThanOrEqual(8);
    });
  });
});
