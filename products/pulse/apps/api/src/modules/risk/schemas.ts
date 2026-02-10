import { z } from 'zod';

// ────────────────────────────────────────
// Request Schemas
// ────────────────────────────────────────

export const currentRiskQuerySchema = z.object({
  teamId: z.string().min(1, 'teamId is required'),
});

export const riskHistoryQuerySchema = z.object({
  teamId: z.string().min(1, 'teamId is required'),
  days: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 30))
    .pipe(z.number().int().min(1).max(365)),
});

// ────────────────────────────────────────
// Types
// ────────────────────────────────────────

export type CurrentRiskQuery = z.infer<typeof currentRiskQuerySchema>;
export type RiskHistoryQuery = z.infer<typeof riskHistoryQuerySchema>;

export interface RiskFactor {
  name: string;
  score: number;
  weight: number;
  detail: string;
}

export interface RiskResult {
  score: number;
  level: 'low' | 'medium' | 'high';
  explanation: string;
  factors: RiskFactor[];
  calculatedAt: string;
}

export interface RiskHistoryResult {
  teamId: string;
  snapshots: Array<{
    id: string;
    score: number;
    level: string;
    explanation: string;
    factors: unknown;
    calculatedAt: string;
  }>;
}
