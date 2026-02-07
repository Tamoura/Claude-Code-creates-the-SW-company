import { z } from 'zod';

// ────────────────────────────────────────
// Request Schemas
// ────────────────────────────────────────

export const velocityQuerySchema = z.object({
  teamId: z.string().min(1, 'teamId is required'),
  period: z.enum(['7d', '30d', '90d']).default('30d'),
});

export const coverageQuerySchema = z.object({
  teamId: z.string().min(1, 'teamId is required'),
  repoId: z.string().optional(),
});

export const summaryQuerySchema = z.object({
  teamId: z.string().min(1, 'teamId is required'),
  period: z.enum(['7d', '30d', '90d']).default('30d'),
});

export const aggregateQuerySchema = z.object({
  teamId: z.string().min(1, 'teamId is required'),
});

// ────────────────────────────────────────
// Types
// ────────────────────────────────────────

export type VelocityQuery = z.infer<typeof velocityQuerySchema>;
export type CoverageQuery = z.infer<typeof coverageQuerySchema>;
export type SummaryQuery = z.infer<typeof summaryQuerySchema>;
export type AggregateQuery = z.infer<typeof aggregateQuerySchema>;
