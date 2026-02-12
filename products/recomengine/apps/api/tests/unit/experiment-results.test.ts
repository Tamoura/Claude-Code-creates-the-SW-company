import { describe, it, expect } from '@jest/globals';
import { computeExperimentResults, VariantMetrics } from '../../src/modules/experiments/statistics';

describe('Experiment Results Computation', () => {
  const controlMetrics: VariantMetrics = {
    impressions: 10000,
    clicks: 800,
    conversions: 160,
    revenue: 5600,
    sampleSize: 5000,
  };

  const variantMetrics: VariantMetrics = {
    impressions: 10000,
    clicks: 960,
    conversions: 200,
    revenue: 7000,
    sampleSize: 5000,
  };

  describe('CTR metric', () => {
    it('should compute CTR correctly', () => {
      const result = computeExperimentResults('ctr', controlMetrics, variantMetrics);

      // Control CTR: 800/10000 = 0.08
      // Variant CTR: 960/10000 = 0.096
      expect(result.controlMetricValue).toBeCloseTo(0.08, 2);
      expect(result.variantMetricValue).toBeCloseTo(0.096, 2);
    });

    it('should compute lift correctly', () => {
      const result = computeExperimentResults('ctr', controlMetrics, variantMetrics);

      // Lift: (0.096 - 0.08) / 0.08 = 0.2
      expect(result.lift).toBeCloseTo(0.2, 1);
    });

    it('should detect statistical significance', () => {
      const result = computeExperimentResults('ctr', controlMetrics, variantMetrics);

      // With 10k impressions per group and 20% lift, should be significant
      expect(result.pValue).toBeLessThan(0.05);
      expect(result.isSignificant).toBe(true);
    });
  });

  describe('Conversion rate metric', () => {
    it('should compute conversion rate correctly', () => {
      const result = computeExperimentResults('conversion_rate', controlMetrics, variantMetrics);

      // Control: 160/5000 = 0.032
      // Variant: 200/5000 = 0.04
      expect(result.controlMetricValue).toBeCloseTo(0.032, 3);
      expect(result.variantMetricValue).toBeCloseTo(0.04, 3);
    });
  });

  describe('Edge cases', () => {
    it('should handle zero impressions', () => {
      const emptyControl: VariantMetrics = {
        impressions: 0, clicks: 0, conversions: 0, revenue: 0, sampleSize: 0,
      };
      const result = computeExperimentResults('ctr', emptyControl, emptyControl);

      expect(result.controlMetricValue).toBe(0);
      expect(result.variantMetricValue).toBe(0);
      expect(result.lift).toBe(0);
      expect(result.isSignificant).toBe(false);
    });

    it('should handle identical metrics', () => {
      const result = computeExperimentResults('ctr', controlMetrics, controlMetrics);

      expect(result.lift).toBe(0);
      expect(result.isSignificant).toBe(false);
    });

    it('should provide confidence intervals', () => {
      const result = computeExperimentResults('ctr', controlMetrics, variantMetrics);

      expect(result.controlConfidenceInterval.lower).toBeLessThan(result.controlMetricValue);
      expect(result.controlConfidenceInterval.upper).toBeGreaterThan(result.controlMetricValue);
      expect(result.variantConfidenceInterval.lower).toBeLessThan(result.variantMetricValue);
      expect(result.variantConfidenceInterval.upper).toBeGreaterThan(result.variantMetricValue);
    });
  });
});
