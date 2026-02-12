/**
 * Zod schemas for API response validation
 *
 * These schemas validate the shape of responses from the Mu'aththir API.
 * On validation failure, a warning is logged but the data is still returned
 * to avoid breaking the app (graceful degradation).
 */

import { z } from 'zod';

// ==================== Child Schema ====================

export const ChildSchema = z.object({
  id: z.string(),
  name: z.string(),
  dateOfBirth: z.string(),
  gender: z.enum(['male', 'female']).nullable(),
  ageBand: z.string().nullable(),
  photoUrl: z.string().nullable(),
  medicalNotes: z.string().nullable(),
  allergies: z.array(z.string()).nullable(),
  specialNeeds: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  observationCount: z.number().optional(),
  milestoneProgress: z
    .object({
      total: z.number(),
      achieved: z.number(),
    })
    .optional(),
});

// ==================== Observation Schema ====================

export const ObservationSchema = z.object({
  id: z.string(),
  childId: z.string(),
  dimension: z.string(),
  content: z.string(),
  sentiment: z.string(),
  observedAt: z.string(),
  tags: z.array(z.string()),
  createdAt: z.string(),
  updatedAt: z.string(),
});

// ==================== Dashboard Schema ====================

const DimensionScoreSchema = z.object({
  dimension: z.string(),
  score: z.number(),
  factors: z.object({
    observation: z.number(),
    milestone: z.number(),
    sentiment: z.number(),
  }),
  observationCount: z.number(),
  milestoneProgress: z.object({
    achieved: z.number(),
    total: z.number(),
  }),
});

export const DashboardDataSchema = z.object({
  childId: z.string(),
  childName: z.string(),
  ageBand: z.string().nullable(),
  overallScore: z.number(),
  dimensions: z.array(DimensionScoreSchema),
  calculatedAt: z.string(),
});

// ==================== Validation Helper ====================

/**
 * Validate an API response against a Zod schema.
 *
 * On success, returns the parsed data.
 * On failure, logs a warning and returns the raw data unchanged.
 * This ensures the app never breaks due to unexpected API shapes,
 * while still alerting developers to mismatches.
 */
export function validateResponse<T>(
  schema: z.ZodType<T>,
  data: unknown,
  endpoint: string
): T {
  const result = schema.safeParse(data);

  if (!result.success) {
    console.warn(
      `[API Validation] ${endpoint} response did not match schema`,
      result.error.issues
    );
    return data as T;
  }

  return result.data;
}
