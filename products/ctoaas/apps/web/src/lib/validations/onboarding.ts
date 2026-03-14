import { z } from "zod";

export const INDUSTRY_OPTIONS = [
  "Technology",
  "Finance",
  "Healthcare",
  "E-commerce",
  "Education",
  "Manufacturing",
  "Media",
  "Telecommunications",
  "Energy",
  "Real Estate",
  "Transportation",
  "Government",
  "Non-profit",
  "Consulting",
  "Legal",
  "Retail",
  "Agriculture",
  "Gaming",
  "Cybersecurity",
  "AI/ML",
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
  "Seed",
  "Series A",
  "Series B",
  "Series C",
  "Growth",
  "Enterprise",
] as const;

export const LANGUAGE_OPTIONS = [
  "TypeScript",
  "JavaScript",
  "Python",
  "Java",
  "Go",
  "Rust",
  "C#",
  "Ruby",
  "PHP",
  "Kotlin",
  "Swift",
  "Scala",
  "C++",
  "Elixir",
  "Dart",
] as const;

export const FRAMEWORK_OPTIONS = [
  "React",
  "Angular",
  "Vue",
  "Next.js",
  "Django",
  "Flask",
  "Spring",
  "Express",
  "Fastify",
  "Rails",
  ".NET",
  "Laravel",
  "Svelte",
  "NestJS",
  "FastAPI",
] as const;

export const DATABASE_OPTIONS = [
  "PostgreSQL",
  "MySQL",
  "MongoDB",
  "Redis",
  "DynamoDB",
  "Elasticsearch",
  "SQLite",
  "Cassandra",
  "CockroachDB",
  "Neo4j",
  "ClickHouse",
] as const;

export const CLOUD_PROVIDER_OPTIONS = [
  "AWS",
  "GCP",
  "Azure",
  "On-premise",
  "Multi-cloud",
  "Other",
] as const;

export const CHALLENGE_OPTIONS = [
  "Scaling infrastructure",
  "Technical debt management",
  "Hiring & retention",
  "Security & compliance",
  "Cloud cost optimization",
  "Microservices migration",
  "Legacy system modernization",
  "Team velocity",
  "Architecture decisions",
  "Vendor selection",
  "AI/ML adoption",
  "DevOps maturity",
] as const;

export const COMMUNICATION_STYLES = [
  "Concise",
  "Balanced",
  "Detailed",
] as const;

export const RESPONSE_FORMATS = [
  "Executive summary",
  "Technical deep-dive",
  "Actionable recommendations",
] as const;

export const DETAIL_LEVELS = [
  "High-level",
  "Moderate",
  "Granular",
] as const;

export const INTEREST_AREAS = [
  "Architecture",
  "Security",
  "DevOps",
  "Cloud",
  "AI/ML",
  "Team",
  "Costs",
  "Compliance",
] as const;

const currentYear = new Date().getFullYear();

export const step1Schema = z.object({
  industry: z.string().min(1, "Industry is required"),
  employeeCount: z.string().min(1, "Employee count is required"),
  growthStage: z.string().min(1, "Growth stage is required"),
  foundedYear: z.preprocess(
    (val) => (val === "" || Number.isNaN(val) ? undefined : val),
    z
      .number()
      .min(1900, "Founded year must be 1900 or later")
      .max(currentYear, "Founded year cannot be in the future")
      .optional()
  ),
});

export type Step1FormData = z.infer<typeof step1Schema>;

export const step2Schema = z.object({
  languages: z.array(z.string()).default([]),
  frameworks: z.array(z.string()).default([]),
  databases: z.array(z.string()).default([]),
  cloudProvider: z.string().optional(),
  architectureNotes: z
    .string()
    .max(2000, "Architecture notes must be 2000 characters or less")
    .optional(),
});

export type Step2FormData = z.infer<typeof step2Schema>;

export const step3Schema = z
  .object({
    challenges: z.array(z.string()).default([]),
    customChallenges: z.array(z.string()).default([]),
  })
  .refine(
    (data) => data.challenges.length + data.customChallenges.length >= 1,
    {
      message: "Select at least one challenge",
      path: ["challenges"],
    }
  );

export type Step3FormData = z.infer<typeof step3Schema>;

export const step4Schema = z.object({
  communicationStyle: z.string().min(1, "Communication style is required"),
  responseFormat: z.string().min(1, "Response format is required"),
  detailLevel: z.string().min(1, "Detail level is required"),
  areasOfInterest: z.array(z.string()).default([]),
});

export type Step4FormData = z.infer<typeof step4Schema>;
