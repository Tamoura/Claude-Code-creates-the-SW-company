import { z } from 'zod';

/**
 * Onboarding step 1: Company basics
 * All fields optional to allow "skipping" a step.
 */
export const step1Schema = z
  .object({
    industry: z.string().min(1).max(100).optional(),
    employeeCount: z.number().int().min(0).optional(),
    growthStage: z
      .enum([
        'SEED',
        'SERIES_A',
        'SERIES_B',
        'SERIES_C',
        'GROWTH',
        'ENTERPRISE',
      ])
      .optional(),
    foundedYear: z.number().int().min(1900).max(2100).optional(),
  })
  .strict();

/**
 * Onboarding step 2: Tech stack
 */
export const step2Schema = z
  .object({
    languages: z.array(z.string()).optional(),
    frameworks: z.array(z.string()).optional(),
    databases: z.array(z.string()).optional(),
    cloudProvider: z.string().max(50).optional(),
    architectureNotes: z.string().max(2000).optional(),
  })
  .strict();

/**
 * Onboarding step 3: Challenges
 */
export const step3Schema = z
  .object({
    challenges: z.array(z.string()).min(1).optional(),
    customChallenges: z.string().max(2000).optional(),
  })
  .strict();

/**
 * Onboarding step 4: Advisory preferences
 */
export const step4Schema = z
  .object({
    communicationStyle: z
      .enum(['concise', 'balanced', 'detailed', 'direct'])
      .optional(),
    responseFormat: z
      .enum(['executive', 'technical', 'actionable', 'structured'])
      .optional(),
    detailLevel: z
      .enum(['high-level', 'moderate', 'granular', 'detailed'])
      .optional(),
  })
  .strict();

/**
 * Company profile update schema
 */
export const companyProfileUpdateSchema = z
  .object({
    techStack: z
      .object({
        languages: z.array(z.string()).optional(),
        frameworks: z.array(z.string()).optional(),
        databases: z.array(z.string()).optional(),
      })
      .optional(),
    cloudProvider: z.string().max(50).optional(),
    architectureNotes: z.string().max(2000).optional(),
    constraints: z.string().max(2000).optional(),
  })
  .strict();

export const stepSchemas: Record<number, z.ZodSchema> = {
  1: step1Schema,
  2: step2Schema,
  3: step3Schema,
  4: step4Schema,
};
