/**
 * services/scoring.ts — ScoringService
 *
 * IMPORTANT: This service is a PURE FUNCTION stub — no side effects, no DB writes.
 * The caller (route handler) is responsible for persisting results.
 *
 * Score formula (from addendum):
 *   Indicator score = answer_score (SCENARIO: 0.0/0.5/1.0)
 *                   or likert_normalized (SELF_REPORT: (n-1)/4)
 *   Dimension score = Σ(score × prevalenceWeight) / Σ(prevalenceWeight)
 *   Overall score   = Σ(dimensionScore × dimensionWeight) × 100
 *
 * Discernment Gap:
 *   discernmentGap = true when DELEGATION_REASONING FAIL AND DISCERNMENT_MISSING_CONTEXT FAIL
 */

export interface IndicatorInput {
  shortCode: string;
  dimension: 'DELEGATION' | 'DESCRIPTION' | 'DISCERNMENT' | 'DILIGENCE';
  track: 'OBSERVABLE' | 'SELF_REPORT';
  prevalenceWeight: number;
  answer: string;
  questionType: 'SCENARIO' | 'SELF_REPORT';
}

export interface ScoredIndicator {
  shortCode: string;
  score: number;          // 0.0 – 1.0
  status: 'PASS' | 'PARTIAL' | 'FAIL';
  track: 'OBSERVABLE' | 'SELF_REPORT';
}

export interface DimensionScores {
  DELEGATION: number;
  DESCRIPTION: number;
  DISCERNMENT: number;
  DILIGENCE: number;
}

export interface ScoredProfile {
  overallScore: number;           // 0–100
  dimensionScores: DimensionScores;
  selfReportScores: DimensionScores;
  indicatorBreakdown: Record<string, ScoredIndicator>;
  discernmentGap: boolean;
}

export type DimensionWeights = Record<'DELEGATION' | 'DESCRIPTION' | 'DISCERNMENT' | 'DILIGENCE', number>;

/**
 * Behavioral indicator short codes used in discernment gap detection.
 *
 * These codes MUST match the `shortCode` values seeded in the
 * `behavioral_indicators` table (BehavioralIndicator.shortCode VARCHAR 50).
 *
 * Expected seed values (Sprint 1.5 seed script):
 *   DISCERNMENT_GAP_INDICATORS.DELEGATION_REASONING:
 *     dimension=DELEGATION, track=OBSERVABLE, name="Question AI reasoning"
 *   DISCERNMENT_GAP_INDICATORS.DISCERNMENT_MISSING_CONTEXT:
 *     dimension=DISCERNMENT, track=OBSERVABLE, name="Identify missing context"
 *
 * TODO(Sprint 1.5): Load these codes dynamically from the database
 * (e.g. BehavioralIndicator.findMany({ where: { isDiscernmentGapIndicator: true } }))
 * once the seed script is finalized and the schema is locked.
 *
 * @see products/ai-fluency/docs/PRD.md — Discernment Gap definition
 */
export const DISCERNMENT_GAP_INDICATORS = {
  DELEGATION_REASONING: 'DELEGATION_REASONING',
  DISCERNMENT_MISSING_CONTEXT: 'DISCERNMENT_MISSING_CONTEXT',
} as const;

/**
 * Compute score for a single indicator answer.
 * - SCENARIO: maps A/B/C/D to 0.0, 0.5, or 1.0 based on isCorrect and partial flags
 * - SELF_REPORT: normalizes Likert 1–5 → 0.0–1.0 via (n-1)/4
 */
function scoreAnswer(
  answer: string,
  questionType: 'SCENARIO' | 'SELF_REPORT',
  optionsJson: unknown
): number {
  if (questionType === 'SELF_REPORT') {
    const n = parseInt(answer, 10);
    if (isNaN(n) || n < 1 || n > 5) return 0;
    return (n - 1) / 4;
  }

  // SCENARIO: options are [{key, text, isCorrect, score}]
  if (Array.isArray(optionsJson)) {
    const option = (optionsJson as Array<{ key: string; score: number }>).find(
      (o) => o.key === answer
    );
    return option?.score ?? 0;
  }

  return 0;
}

function indicatorStatus(score: number): 'PASS' | 'PARTIAL' | 'FAIL' {
  if (score >= 0.8) return 'PASS';
  if (score >= 0.4) return 'PARTIAL';
  return 'FAIL';
}

/**
 * Score a completed assessment session.
 *
 * @param indicators - All behavioral indicator inputs with answers
 * @param dimensionWeights - Weight per dimension (must sum to 1.0)
 * @param optionsMap - Map of indicatorShortCode to optionsJson for scoring
 * @returns ScoredProfile — pure result, no side effects
 */
export function scoreAssessment(
  indicators: IndicatorInput[],
  dimensionWeights: DimensionWeights,
  optionsMap: Record<string, unknown>
): ScoredProfile {
  const dimensions: Array<'DELEGATION' | 'DESCRIPTION' | 'DISCERNMENT' | 'DILIGENCE'> = [
    'DELEGATION',
    'DESCRIPTION',
    'DISCERNMENT',
    'DILIGENCE',
  ];

  const indicatorBreakdown: Record<string, ScoredIndicator> = {};

  // Score each indicator
  for (const ind of indicators) {
    const rawScore = scoreAnswer(ind.answer, ind.questionType, optionsMap[ind.shortCode]);
    const scored: ScoredIndicator = {
      shortCode: ind.shortCode,
      score: rawScore,
      status: indicatorStatus(rawScore),
      track: ind.track,
    };
    indicatorBreakdown[ind.shortCode] = scored;
  }

  // Compute dimension scores (prevalence-weighted average) separately by track
  const dimensionScores: DimensionScores = {
    DELEGATION: 0,
    DESCRIPTION: 0,
    DISCERNMENT: 0,
    DILIGENCE: 0,
  };
  const selfReportScores: DimensionScores = {
    DELEGATION: 0,
    DESCRIPTION: 0,
    DISCERNMENT: 0,
    DILIGENCE: 0,
  };

  for (const dim of dimensions) {
    const observableInds = indicators.filter(
      (i) => i.dimension === dim && i.track === 'OBSERVABLE'
    );
    const selfReportInds = indicators.filter(
      (i) => i.dimension === dim && i.track === 'SELF_REPORT'
    );

    const computeWeightedAvg = (inds: IndicatorInput[]): number => {
      const totalWeight = inds.reduce((s, i) => s + i.prevalenceWeight, 0);
      if (totalWeight === 0) return 0;
      const weightedSum = inds.reduce(
        (s, i) => s + (indicatorBreakdown[i.shortCode]?.score ?? 0) * i.prevalenceWeight,
        0
      );
      return weightedSum / totalWeight;
    };

    dimensionScores[dim] = computeWeightedAvg(observableInds);
    selfReportScores[dim] = computeWeightedAvg(selfReportInds);
  }

  // Overall score = weighted average of observable dimension scores × 100
  const overallScore =
    dimensions.reduce((s, dim) => s + dimensionScores[dim] * dimensionWeights[dim], 0) * 100;

  // Discernment gap detection
  // Uses named constants — see DISCERNMENT_GAP_INDICATORS for seed value documentation
  const delegationReasoning =
    indicatorBreakdown[DISCERNMENT_GAP_INDICATORS.DELEGATION_REASONING];
  const discernmentMissingContext =
    indicatorBreakdown[DISCERNMENT_GAP_INDICATORS.DISCERNMENT_MISSING_CONTEXT];
  const discernmentGap =
    delegationReasoning?.status === 'FAIL' &&
    discernmentMissingContext?.status === 'FAIL';

  return {
    overallScore: Math.min(100, Math.max(0, Math.round(overallScore * 10) / 10)),
    dimensionScores: {
      DELEGATION: Math.round(dimensionScores.DELEGATION * 100 * 10) / 10,
      DESCRIPTION: Math.round(dimensionScores.DESCRIPTION * 100 * 10) / 10,
      DISCERNMENT: Math.round(dimensionScores.DISCERNMENT * 100 * 10) / 10,
      DILIGENCE: Math.round(dimensionScores.DILIGENCE * 100 * 10) / 10,
    },
    selfReportScores: {
      DELEGATION: Math.round(selfReportScores.DELEGATION * 100 * 10) / 10,
      DESCRIPTION: Math.round(selfReportScores.DESCRIPTION * 100 * 10) / 10,
      DISCERNMENT: Math.round(selfReportScores.DISCERNMENT * 100 * 10) / 10,
      DILIGENCE: Math.round(selfReportScores.DILIGENCE * 100 * 10) / 10,
    },
    indicatorBreakdown,
    discernmentGap,
  };
}
