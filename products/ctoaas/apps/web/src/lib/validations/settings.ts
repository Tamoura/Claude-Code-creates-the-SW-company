import { z } from "zod";

export const INDUSTRY_OPTIONS = [
  "Technology",
  "Healthcare",
  "Finance",
  "E-commerce",
  "Education",
  "Manufacturing",
  "Media",
  "Government",
  "Non-profit",
  "Other",
] as const;

export const EMPLOYEE_COUNT_OPTIONS = [
  "1-10",
  "11-50",
  "51-200",
  "201-500",
  "501-1000",
  "1000+",
] as const;

export const GROWTH_STAGE_OPTIONS = [
  "Pre-seed",
  "Seed",
  "Series A",
  "Series B",
  "Series C+",
  "Profitable",
  "Enterprise",
] as const;

export const CLOUD_PROVIDER_OPTIONS = [
  "AWS",
  "GCP",
  "Azure",
  "Multi-cloud",
  "On-premise",
  "Hybrid",
  "None",
] as const;

export const AREAS_OF_INTEREST = [
  "Architecture",
  "Security",
  "DevOps",
  "AI/ML",
  "Data Engineering",
  "Frontend",
  "Backend",
  "Mobile",
  "Cloud Infrastructure",
  "Team Management",
  "Technical Debt",
  "Performance",
  "Compliance",
  "Cost Optimization",
] as const;

export const companyProfileSchema = z.object({
  companyName: z
    .string()
    .min(2, "Company name must be at least 2 characters")
    .max(255, "Company name must be at most 255 characters"),
  industry: z.string().min(1, "Please select an industry"),
  employeeCount: z.string().min(1, "Please select employee count"),
  growthStage: z.string().min(1, "Please select a growth stage"),
  languages: z.string().optional(),
  frameworks: z.string().optional(),
  databases: z.string().optional(),
  cloudProvider: z.string().optional(),
  architectureNotes: z
    .string()
    .max(2000, "Architecture notes must be at most 2000 characters")
    .optional(),
  currentChallenges: z
    .string()
    .max(2000, "Current challenges must be at most 2000 characters")
    .optional(),
});

export type CompanyProfileFormData = z.infer<typeof companyProfileSchema>;

export const changePasswordSchema = z
  .object({
    currentPassword: z
      .string()
      .min(1, "Current password is required"),
    newPassword: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[A-Z]/, "Must contain at least one uppercase letter")
      .regex(/[a-z]/, "Must contain at least one lowercase letter")
      .regex(/[0-9]/, "Must contain at least one number")
      .regex(
        /[^A-Za-z0-9]/,
        "Must contain at least one special character"
      ),
    confirmNewPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmNewPassword, {
    message: "Passwords do not match",
    path: ["confirmNewPassword"],
  });

export type ChangePasswordFormData = z.infer<typeof changePasswordSchema>;

export const preferencesSchema = z.object({
  communicationStyle: z.enum(["concise", "balanced", "detailed"]),
  responseFormat: z.enum([
    "executive-summary",
    "technical-deep-dive",
    "actionable-recommendations",
  ]),
  detailLevel: z.enum(["high-level", "moderate", "granular"]),
  areasOfInterest: z
    .array(z.string())
    .min(1, "Please select at least one area of interest"),
});

export type PreferencesFormData = z.infer<typeof preferencesSchema>;
