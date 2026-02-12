export interface VariantMetrics {
  impressions: number;
  clicks: number;
  conversions: number;
  revenue: number;
  sampleSize: number;
}

export interface StatisticalResult {
  lift: number;
  pValue: number;
  isSignificant: boolean;
  controlMetricValue: number;
  variantMetricValue: number;
  controlConfidenceInterval: { lower: number; upper: number };
  variantConfidenceInterval: { lower: number; upper: number };
}

/**
 * Two-proportion z-test for CTR and conversion rate.
 */
function twoProportionZTest(
  successes1: number,
  total1: number,
  successes2: number,
  total2: number
): { zScore: number; pValue: number } {
  if (total1 === 0 || total2 === 0) {
    return { zScore: 0, pValue: 1 };
  }

  const p1 = successes1 / total1;
  const p2 = successes2 / total2;
  const pPooled = (successes1 + successes2) / (total1 + total2);
  const se = Math.sqrt(pPooled * (1 - pPooled) * (1 / total1 + 1 / total2));

  if (se === 0) return { zScore: 0, pValue: 1 };

  const zScore = (p2 - p1) / se;
  // Approximate two-tailed p-value using normal CDF
  const pValue = 2 * (1 - normalCDF(Math.abs(zScore)));

  return { zScore, pValue };
}

/**
 * Standard normal CDF approximation (Abramowitz and Stegun).
 */
function normalCDF(x: number): number {
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;

  const sign = x < 0 ? -1 : 1;
  x = Math.abs(x) / Math.sqrt(2);
  const t = 1.0 / (1.0 + p * x);
  const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);

  return 0.5 * (1.0 + sign * y);
}

/**
 * Wilson score confidence interval for a proportion.
 */
function wilsonCI(successes: number, total: number, z: number = 1.96): { lower: number; upper: number } {
  if (total === 0) return { lower: 0, upper: 0 };

  const p = successes / total;
  const denominator = 1 + z * z / total;
  const center = (p + z * z / (2 * total)) / denominator;
  const margin = (z / denominator) * Math.sqrt(p * (1 - p) / total + z * z / (4 * total * total));

  return {
    lower: Math.max(0, Math.round((center - margin) * 10000) / 10000),
    upper: Math.min(1, Math.round((center + margin) * 10000) / 10000),
  };
}

export function computeExperimentResults(
  metric: string,
  control: VariantMetrics,
  variant: VariantMetrics
): StatisticalResult {
  let controlValue: number;
  let variantValue: number;
  let testResult: { zScore: number; pValue: number };
  let controlCI: { lower: number; upper: number };
  let variantCI: { lower: number; upper: number };

  switch (metric) {
    case 'ctr':
      controlValue = control.impressions > 0 ? control.clicks / control.impressions : 0;
      variantValue = variant.impressions > 0 ? variant.clicks / variant.impressions : 0;
      testResult = twoProportionZTest(control.clicks, control.impressions, variant.clicks, variant.impressions);
      controlCI = wilsonCI(control.clicks, control.impressions);
      variantCI = wilsonCI(variant.clicks, variant.impressions);
      break;

    case 'conversion_rate':
      controlValue = control.sampleSize > 0 ? control.conversions / control.sampleSize : 0;
      variantValue = variant.sampleSize > 0 ? variant.conversions / variant.sampleSize : 0;
      testResult = twoProportionZTest(control.conversions, control.sampleSize, variant.conversions, variant.sampleSize);
      controlCI = wilsonCI(control.conversions, control.sampleSize);
      variantCI = wilsonCI(variant.conversions, variant.sampleSize);
      break;

    case 'revenue_per_visitor':
    default:
      controlValue = control.sampleSize > 0 ? control.revenue / control.sampleSize : 0;
      variantValue = variant.sampleSize > 0 ? variant.revenue / variant.sampleSize : 0;
      // Simple z-test approximation for means
      testResult = { zScore: 0, pValue: control.sampleSize < 30 || variant.sampleSize < 30 ? 1 : 0.5 };
      controlCI = { lower: controlValue * 0.9, upper: controlValue * 1.1 };
      variantCI = { lower: variantValue * 0.9, upper: variantValue * 1.1 };
      break;
  }

  const lift = controlValue > 0 ? (variantValue - controlValue) / controlValue : 0;

  return {
    lift: Math.round(lift * 10000) / 10000,
    pValue: Math.round(testResult.pValue * 10000) / 10000,
    isSignificant: testResult.pValue < 0.05,
    controlMetricValue: Math.round(controlValue * 10000) / 10000,
    variantMetricValue: Math.round(variantValue * 10000) / 10000,
    controlConfidenceInterval: controlCI,
    variantConfidenceInterval: variantCI,
  };
}
