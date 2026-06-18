import {
  companyProfileSchema,
  changePasswordSchema,
  preferencesSchema,
} from "../settings";

describe("companyProfileSchema", () => {
  it("accepts valid company profile data", () => {
    const result = companyProfileSchema.safeParse({
      companyName: "Acme Inc.",
      industry: "Technology",
      employeeCount: "11-50",
      growthStage: "Series A",
      languages: "TypeScript, Python",
      frameworks: "React, Next.js",
      databases: "PostgreSQL",
      cloudProvider: "AWS",
      architectureNotes: "Monolith transitioning to microservices",
      currentChallenges: "Scaling the database layer",
    });
    expect(result.success).toBe(true);
  });

  it("requires company name with minimum length", () => {
    const result = companyProfileSchema.safeParse({
      companyName: "A",
      industry: "Technology",
      employeeCount: "1-10",
      growthStage: "Seed",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toContain("companyName");
    }
  });

  it("requires industry selection", () => {
    const result = companyProfileSchema.safeParse({
      companyName: "Acme",
      industry: "",
      employeeCount: "1-10",
      growthStage: "Seed",
    });
    expect(result.success).toBe(false);
  });

  it("allows optional tech stack fields to be empty", () => {
    const result = companyProfileSchema.safeParse({
      companyName: "Acme Inc.",
      industry: "Technology",
      employeeCount: "11-50",
      growthStage: "Series A",
    });
    expect(result.success).toBe(true);
  });
});

describe("changePasswordSchema", () => {
  it("accepts valid password change data", () => {
    const result = changePasswordSchema.safeParse({
      currentPassword: "OldPass123!",
      newPassword: "NewPass456@",
      confirmNewPassword: "NewPass456@",
    });
    expect(result.success).toBe(true);
  });

  it("rejects mismatched passwords", () => {
    const result = changePasswordSchema.safeParse({
      currentPassword: "OldPass123!",
      newPassword: "NewPass456@",
      confirmNewPassword: "Different789#",
    });
    expect(result.success).toBe(false);
  });

  it("rejects weak new password", () => {
    const result = changePasswordSchema.safeParse({
      currentPassword: "OldPass123!",
      newPassword: "weak",
      confirmNewPassword: "weak",
    });
    expect(result.success).toBe(false);
  });

  it("requires current password", () => {
    const result = changePasswordSchema.safeParse({
      currentPassword: "",
      newPassword: "NewPass456@",
      confirmNewPassword: "NewPass456@",
    });
    expect(result.success).toBe(false);
  });
});

describe("preferencesSchema", () => {
  it("accepts valid preferences data", () => {
    const result = preferencesSchema.safeParse({
      communicationStyle: "balanced",
      responseFormat: "executive-summary",
      detailLevel: "moderate",
      areasOfInterest: ["Architecture", "Security"],
    });
    expect(result.success).toBe(true);
  });

  it("requires at least one area of interest", () => {
    const result = preferencesSchema.safeParse({
      communicationStyle: "concise",
      responseFormat: "technical-deep-dive",
      detailLevel: "granular",
      areasOfInterest: [],
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid communication style", () => {
    const result = preferencesSchema.safeParse({
      communicationStyle: "ultra-verbose",
      responseFormat: "executive-summary",
      detailLevel: "moderate",
      areasOfInterest: ["AI/ML"],
    });
    expect(result.success).toBe(false);
  });
});
