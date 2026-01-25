import { describe, it, expect } from 'vitest';
import {
  calculateRequiredGPUs,
  calculateMonthlyInferenceCost,
} from './inferenceCalculator';
import type { InferenceConfig } from '../types';

describe('inferenceCalculator', () => {
  describe('calculateRequiredGPUs', () => {
    it('should calculate GPU count for given throughput', () => {
      const gpuCount = calculateRequiredGPUs('A100-80GB', 100, 500, 'standard');

      expect(gpuCount).toBeGreaterThan(0);
      expect(Number.isInteger(gpuCount)).toBe(true);
    });

    it('should require more GPUs for higher request volume', () => {
      const lowVolume = calculateRequiredGPUs('A100-80GB', 10, 500, 'standard');
      const highVolume = calculateRequiredGPUs('A100-80GB', 100, 500, 'standard');

      expect(highVolume).toBeGreaterThan(lowVolume);
    });

    it('should require more GPUs for realtime latency', () => {
      const batch = calculateRequiredGPUs('A100-80GB', 100, 500, 'batch');
      const realtime = calculateRequiredGPUs('A100-80GB', 100, 500, 'realtime');

      expect(realtime).toBeGreaterThanOrEqual(batch);
    });

    it('should require fewer GPUs for more powerful GPU types', () => {
      const a100Count = calculateRequiredGPUs('A100-80GB', 100, 500, 'standard');
      const h100Count = calculateRequiredGPUs('H100-80GB', 100, 500, 'standard');

      expect(h100Count).toBeLessThanOrEqual(a100Count);
    });
  });

  describe('calculateMonthlyInferenceCost', () => {
    it('should return results for all providers', () => {
      const config: InferenceConfig = {
        modelSizeB: 7,
        requestsPerSec: 10,
        avgTokensPerRequest: 500,
        latencyTier: 'standard',
        batchSize: 16,
        avgResponseSizeKb: 2,
        durationMonths: 1,
      };

      const results = calculateMonthlyInferenceCost(config);

      expect(results).toHaveLength(7); // All 7 providers
      expect(results.every((r) => r.providerId)).toBe(true);
    });

    it('should calculate compute, egress, and total costs', () => {
      const config: InferenceConfig = {
        modelSizeB: 7,
        requestsPerSec: 10,
        avgTokensPerRequest: 500,
        latencyTier: 'standard',
        batchSize: 16,
        avgResponseSizeKb: 2,
        durationMonths: 1,
      };

      const results = calculateMonthlyInferenceCost(config);

      results.forEach((result) => {
        if (result.available) {
          expect(result.costs.compute).toBeGreaterThan(0);
          expect(result.costs.egress).toBeGreaterThanOrEqual(0);
          expect(result.costs.total).toBeGreaterThan(0);
          expect(result.costs.total).toBeGreaterThanOrEqual(result.costs.compute);
        }
      });
    });

    it('should scale compute cost with duration', () => {
      const baseConfig: InferenceConfig = {
        modelSizeB: 7,
        requestsPerSec: 10,
        avgTokensPerRequest: 500,
        latencyTier: 'standard',
        batchSize: 16,
        avgResponseSizeKb: 2,
        durationMonths: 1,
      };

      const oneMonth = calculateMonthlyInferenceCost(baseConfig);
      const threeMonths = calculateMonthlyInferenceCost({
        ...baseConfig,
        durationMonths: 3,
      });

      // Compare same provider
      const awsOneMonth = oneMonth.find((r) => r.providerId === 'aws')!;
      const awsThreeMonths = threeMonths.find((r) => r.providerId === 'aws')!;

      expect(awsThreeMonths.costs.compute).toBeCloseTo(
        awsOneMonth.costs.compute * 3,
        0
      );
    });

    it('should include configuration details', () => {
      const config: InferenceConfig = {
        modelSizeB: 7,
        requestsPerSec: 10,
        avgTokensPerRequest: 500,
        latencyTier: 'standard',
        batchSize: 16,
        avgResponseSizeKb: 2,
        durationMonths: 1,
      };

      const results = calculateMonthlyInferenceCost(config);

      results.forEach((result) => {
        if (result.available) {
          expect(result.configuration.gpuCount).toBeGreaterThan(0);
          expect(result.configuration.hourlyRate).toBeGreaterThan(0);
          expect(result.configuration.egressGb).toBeGreaterThan(0);
        }
      });
    });

    it('should calculate egress from request volume and response size', () => {
      const config: InferenceConfig = {
        modelSizeB: 7,
        requestsPerSec: 10,
        avgTokensPerRequest: 500,
        latencyTier: 'standard',
        batchSize: 16,
        avgResponseSizeKb: 100, // Large response
        durationMonths: 1,
      };

      const results = calculateMonthlyInferenceCost(config);

      results.forEach((result) => {
        if (result.available) {
          const expectedEgressGb =
            (10 * 60 * 60 * 24 * 30 * 100) / 1024 / 1024; // ~250GB
          expect(result.configuration.egressGb).toBeGreaterThan(100);
        }
      });
    });
  });
});
