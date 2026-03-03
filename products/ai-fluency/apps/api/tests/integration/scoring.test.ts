/**
 * tests/integration/scoring.test.ts — ScoringService unit tests
 *
 * ScoringService is a pure function — no DB, no app needed.
 * Tests the algorithm correctness per the addendum spec.
 *
 * [BACKEND-01] Scoring algorithm correctness tests
 */

import {
  scoreAssessment,
  IndicatorInput,
  DimensionWeights,
} from '../../src/services/scoring';

const EQUAL_WEIGHTS: DimensionWeights = {
  DELEGATION: 0.25,
  DESCRIPTION: 0.25,
  DISCERNMENT: 0.25,
  DILIGENCE: 0.25,
};

function makeScenarioIndicator(
  shortCode: string,
  dimension: 'DELEGATION' | 'DESCRIPTION' | 'DISCERNMENT' | 'DILIGENCE',
  answer: string,
  prevalenceWeight = 1.0
): IndicatorInput {
  return {
    shortCode,
    dimension,
    track: 'OBSERVABLE',
    prevalenceWeight,
    answer,
    questionType: 'SCENARIO',
  };
}

function makeSelfReportIndicator(
  shortCode: string,
  dimension: 'DELEGATION' | 'DESCRIPTION' | 'DISCERNMENT' | 'DILIGENCE',
  answer: string,
  prevalenceWeight = 1.0
): IndicatorInput {
  return {
    shortCode,
    dimension,
    track: 'SELF_REPORT',
    prevalenceWeight,
    answer,
    questionType: 'SELF_REPORT',
  };
}

const SCENARIO_OPTIONS = {
  IND_001: [
    { key: 'A', score: 1.0 },
    { key: 'B', score: 0.5 },
    { key: 'C', score: 0.0 },
    { key: 'D', score: 0.0 },
  ],
};

describe('[BACKEND-01] ScoringService', () => {
  test('[BACKEND-01] perfect SCENARIO answer (score=1.0) produces PASS status', () => {
    const indicators = [makeScenarioIndicator('IND_001', 'DELEGATION', 'A')];
    const result = scoreAssessment(indicators, EQUAL_WEIGHTS, SCENARIO_OPTIONS);

    expect(result.indicatorBreakdown['IND_001'].score).toBe(1.0);
    expect(result.indicatorBreakdown['IND_001'].status).toBe('PASS');
  });

  test('[BACKEND-01] partial SCENARIO answer (score=0.5) produces PARTIAL status', () => {
    const indicators = [makeScenarioIndicator('IND_001', 'DELEGATION', 'B')];
    const result = scoreAssessment(indicators, EQUAL_WEIGHTS, SCENARIO_OPTIONS);

    expect(result.indicatorBreakdown['IND_001'].score).toBe(0.5);
    expect(result.indicatorBreakdown['IND_001'].status).toBe('PARTIAL');
  });

  test('[BACKEND-01] wrong SCENARIO answer (score=0.0) produces FAIL status', () => {
    const indicators = [makeScenarioIndicator('IND_001', 'DELEGATION', 'C')];
    const result = scoreAssessment(indicators, EQUAL_WEIGHTS, SCENARIO_OPTIONS);

    expect(result.indicatorBreakdown['IND_001'].score).toBe(0.0);
    expect(result.indicatorBreakdown['IND_001'].status).toBe('FAIL');
  });

  test('[BACKEND-01] SELF_REPORT Likert 5 (max) normalizes to 1.0', () => {
    const indicators = [makeSelfReportIndicator('SR_001', 'DELEGATION', '5')];
    const result = scoreAssessment(indicators, EQUAL_WEIGHTS, {});

    expect(result.indicatorBreakdown['SR_001'].score).toBe(1.0);
    expect(result.indicatorBreakdown['SR_001'].status).toBe('PASS');
  });

  test('[BACKEND-01] SELF_REPORT Likert 1 (min) normalizes to 0.0', () => {
    const indicators = [makeSelfReportIndicator('SR_001', 'DELEGATION', '1')];
    const result = scoreAssessment(indicators, EQUAL_WEIGHTS, {});

    expect(result.indicatorBreakdown['SR_001'].score).toBe(0.0);
    expect(result.indicatorBreakdown['SR_001'].status).toBe('FAIL');
  });

  test('[BACKEND-01] SELF_REPORT Likert 3 (middle) normalizes to 0.5', () => {
    const indicators = [makeSelfReportIndicator('SR_001', 'DELEGATION', '3')];
    const result = scoreAssessment(indicators, EQUAL_WEIGHTS, {});

    expect(result.indicatorBreakdown['SR_001'].score).toBe(0.5);
    expect(result.indicatorBreakdown['SR_001'].status).toBe('PARTIAL');
  });

  test('[BACKEND-01] overall score is 0-100 (not 0-1)', () => {
    const indicators = [makeScenarioIndicator('IND_001', 'DELEGATION', 'A')];
    const result = scoreAssessment(indicators, EQUAL_WEIGHTS, SCENARIO_OPTIONS);

    expect(result.overallScore).toBeGreaterThanOrEqual(0);
    expect(result.overallScore).toBeLessThanOrEqual(100);
  });

  test('[BACKEND-01] all perfect answers gives overallScore=100', () => {
    const indicators = [
      makeScenarioIndicator('IND_DEL', 'DELEGATION', 'A'),
      makeScenarioIndicator('IND_DESC', 'DESCRIPTION', 'A'),
      makeScenarioIndicator('IND_DISC', 'DISCERNMENT', 'A'),
      makeScenarioIndicator('IND_DIL', 'DILIGENCE', 'A'),
    ];
    const options = {
      IND_DEL: [{ key: 'A', score: 1.0 }],
      IND_DESC: [{ key: 'A', score: 1.0 }],
      IND_DISC: [{ key: 'A', score: 1.0 }],
      IND_DIL: [{ key: 'A', score: 1.0 }],
    };
    const result = scoreAssessment(indicators, EQUAL_WEIGHTS, options);
    expect(result.overallScore).toBe(100);
  });

  test('[BACKEND-01] all zero answers gives overallScore=0', () => {
    const indicators = [
      makeScenarioIndicator('IND_DEL', 'DELEGATION', 'C'),
      makeScenarioIndicator('IND_DESC', 'DESCRIPTION', 'C'),
      makeScenarioIndicator('IND_DISC', 'DISCERNMENT', 'C'),
      makeScenarioIndicator('IND_DIL', 'DILIGENCE', 'C'),
    ];
    const options = {
      IND_DEL: [{ key: 'A', score: 1.0 }, { key: 'C', score: 0.0 }],
      IND_DESC: [{ key: 'A', score: 1.0 }, { key: 'C', score: 0.0 }],
      IND_DISC: [{ key: 'A', score: 1.0 }, { key: 'C', score: 0.0 }],
      IND_DIL: [{ key: 'A', score: 1.0 }, { key: 'C', score: 0.0 }],
    };
    const result = scoreAssessment(indicators, EQUAL_WEIGHTS, options);
    expect(result.overallScore).toBe(0);
  });

  test('[BACKEND-01] discernmentGap=true when both gap indicators FAIL', () => {
    const indicators = [
      makeScenarioIndicator('DELEGATION_REASONING', 'DELEGATION', 'C'),
      makeScenarioIndicator('DISCERNMENT_MISSING_CONTEXT', 'DISCERNMENT', 'C'),
    ];
    const options = {
      DELEGATION_REASONING: [{ key: 'A', score: 1.0 }, { key: 'C', score: 0.0 }],
      DISCERNMENT_MISSING_CONTEXT: [{ key: 'A', score: 1.0 }, { key: 'C', score: 0.0 }],
    };
    const result = scoreAssessment(indicators, EQUAL_WEIGHTS, options);
    expect(result.discernmentGap).toBe(true);
  });

  test('[BACKEND-01] discernmentGap=false when only one gap indicator FAILs', () => {
    const indicators = [
      makeScenarioIndicator('DELEGATION_REASONING', 'DELEGATION', 'C'),
      makeScenarioIndicator('DISCERNMENT_MISSING_CONTEXT', 'DISCERNMENT', 'A'),
    ];
    const options = {
      DELEGATION_REASONING: [{ key: 'A', score: 1.0 }, { key: 'C', score: 0.0 }],
      DISCERNMENT_MISSING_CONTEXT: [{ key: 'A', score: 1.0 }, { key: 'C', score: 0.0 }],
    };
    const result = scoreAssessment(indicators, EQUAL_WEIGHTS, options);
    expect(result.discernmentGap).toBe(false);
  });

  test('[BACKEND-01] discernmentGap=false with no gap indicators present', () => {
    const indicators = [makeScenarioIndicator('IND_001', 'DELEGATION', 'A')];
    const result = scoreAssessment(indicators, EQUAL_WEIGHTS, SCENARIO_OPTIONS);
    expect(result.discernmentGap).toBe(false);
  });

  test('[BACKEND-01] prevalence weighting affects dimension scores correctly', () => {
    // Two indicators: high-weight PASS and low-weight FAIL
    const indicators = [
      makeScenarioIndicator('HEAVY_PASS', 'DELEGATION', 'A', 0.9),
      makeScenarioIndicator('LIGHT_FAIL', 'DELEGATION', 'C', 0.1),
    ];
    const options = {
      HEAVY_PASS: [{ key: 'A', score: 1.0 }],
      LIGHT_FAIL: [{ key: 'A', score: 1.0 }, { key: 'C', score: 0.0 }],
    };
    const result = scoreAssessment(indicators, EQUAL_WEIGHTS, options);
    // Weighted: (1.0 × 0.9 + 0.0 × 0.1) / (0.9 + 0.1) = 0.9 → 90.0
    expect(result.dimensionScores.DELEGATION).toBe(90);
  });

  test('[BACKEND-01] scoreAssessment result has all required fields', () => {
    const indicators = [makeScenarioIndicator('IND_001', 'DELEGATION', 'A')];
    const result = scoreAssessment(indicators, EQUAL_WEIGHTS, SCENARIO_OPTIONS);

    expect(result).toHaveProperty('overallScore');
    expect(result).toHaveProperty('dimensionScores');
    expect(result).toHaveProperty('selfReportScores');
    expect(result).toHaveProperty('indicatorBreakdown');
    expect(result).toHaveProperty('discernmentGap');
    expect(result.dimensionScores).toHaveProperty('DELEGATION');
    expect(result.dimensionScores).toHaveProperty('DESCRIPTION');
    expect(result.dimensionScores).toHaveProperty('DISCERNMENT');
    expect(result.dimensionScores).toHaveProperty('DILIGENCE');
  });
});
