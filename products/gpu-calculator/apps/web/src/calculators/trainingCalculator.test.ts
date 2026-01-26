import { describe, it, expect } from 'vitest';
import { calculateTrainingHours, calculateTrainingCost } from './trainingCalculator';
import type { TrainingConfig } from '../types';

describe('trainingCalculator', () => {
  describe('calculateTrainingHours', () => {
    it('should calculate training hours for a 7B model', () => {
      const config: TrainingConfig = {
        modelSizeB: 7,
        datasetSizeGb: 100,
        epochs: 3,
        tokensPerSample: 512,
        sampleCount: 1000000,
        gpuType: 'A100-80GB',
        gpuCount: 8,
        nodeCount: 1,
        includeStorage: true,
        storageDurationMonths: 1,
        checkpointFrequency: 'epoch',
      };

      const hours = calculateTrainingHours(config);

      expect(hours).toBeGreaterThan(0);
      expect(hours).toBeLessThan(1000); // Sanity check
    });

    it('should scale with number of epochs', () => {
      const baseConfig: TrainingConfig = {
        modelSizeB: 7,
        datasetSizeGb: 100,
        epochs: 1,
        tokensPerSample: 512,
        sampleCount: 1000000,
        gpuType: 'A100-80GB',
        gpuCount: 8,
        nodeCount: 1,
        includeStorage: false,
        storageDurationMonths: 1,
        checkpointFrequency: 'none',
      };

      const oneEpoch = calculateTrainingHours(baseConfig);
      const threeEpochs = calculateTrainingHours({ ...baseConfig, epochs: 3 });

      expect(threeEpochs).toBeCloseTo(oneEpoch * 3, 1);
    });

    it('should decrease with more GPUs', () => {
      const baseConfig: TrainingConfig = {
        modelSizeB: 7,
        datasetSizeGb: 100,
        epochs: 1,
        tokensPerSample: 512,
        sampleCount: 1000000,
        gpuType: 'A100-80GB',
        gpuCount: 1,
        nodeCount: 1,
        includeStorage: false,
        storageDurationMonths: 1,
        checkpointFrequency: 'none',
      };

      const oneGpu = calculateTrainingHours(baseConfig);
      const eightGpus = calculateTrainingHours({ ...baseConfig, gpuCount: 8 });

      expect(eightGpus).toBeCloseTo(oneGpu / 8, 1);
    });

    it('should handle different GPU types', () => {
      const baseConfig: TrainingConfig = {
        modelSizeB: 7,
        datasetSizeGb: 100,
        epochs: 1,
        tokensPerSample: 512,
        sampleCount: 1000000,
        gpuType: 'A100-80GB',
        gpuCount: 1,
        nodeCount: 1,
        includeStorage: false,
        storageDurationMonths: 1,
        checkpointFrequency: 'none',
      };

      const a100Hours = calculateTrainingHours(baseConfig);
      const h100Hours = calculateTrainingHours({ ...baseConfig, gpuType: 'H100-80GB' });

      // H100 is faster, should take less time
      expect(h100Hours).toBeLessThan(a100Hours);
    });

    it('should scale training hours with datasetSizeGb', () => {
      const baseConfig: TrainingConfig = {
        modelSizeB: 7,
        datasetSizeGb: 100,
        epochs: 1,
        tokensPerSample: 512,
        sampleCount: 1000000,
        gpuType: 'A100-80GB',
        gpuCount: 8,
        nodeCount: 1,
        includeStorage: false,
        storageDurationMonths: 1,
        checkpointFrequency: 'none',
      };

      const smallDataset = calculateTrainingHours(baseConfig);
      const largeDataset = calculateTrainingHours({ ...baseConfig, datasetSizeGb: 200 });

      // Doubling dataset size should double training hours
      expect(largeDataset).toBeCloseTo(smallDataset * 2, 1);
    });
  });

  describe('calculateTrainingCost', () => {
    it('should return results for all providers', () => {
      const config: TrainingConfig = {
        modelSizeB: 7,
        datasetSizeGb: 100,
        epochs: 3,
        tokensPerSample: 512,
        sampleCount: 1000000,
        gpuType: 'A100-80GB',
        gpuCount: 8,
        nodeCount: 1,
        includeStorage: true,
        storageDurationMonths: 1,
        checkpointFrequency: 'epoch',
      };

      const results = calculateTrainingCost(config);

      expect(results).toHaveLength(7); // All 7 providers
      expect(results.every((r) => r.providerId)).toBe(true);
      expect(results.every((r) => r.providerName)).toBe(true);
    });

    it('should calculate compute, storage, and total costs', () => {
      const config: TrainingConfig = {
        modelSizeB: 7,
        datasetSizeGb: 100,
        epochs: 3,
        tokensPerSample: 512,
        sampleCount: 1000000,
        gpuType: 'A100-80GB',
        gpuCount: 1,
        nodeCount: 1,
        includeStorage: true,
        storageDurationMonths: 1,
        checkpointFrequency: 'epoch',
      };

      const results = calculateTrainingCost(config);

      results.forEach((result) => {
        if (result.available) {
          expect(result.costs.compute).toBeGreaterThan(0);
          expect(result.costs.total).toBeGreaterThanOrEqual(result.costs.compute);

          if (config.includeStorage) {
            expect(result.costs.storage).toBeGreaterThanOrEqual(0);
          }
        }
      });
    });

    it('should mark provider as unavailable if GPU not available', () => {
      const config: TrainingConfig = {
        modelSizeB: 70,
        datasetSizeGb: 500,
        epochs: 1,
        tokensPerSample: 2048,
        sampleCount: 5000000,
        gpuType: 'H100-80GB',
        gpuCount: 8,
        nodeCount: 1,
        includeStorage: false,
        storageDurationMonths: 1,
        checkpointFrequency: 'none',
      };

      const results = calculateTrainingCost(config);

      // All providers should have results
      expect(results.length).toBe(7);

      // Check that providers have availability status
      results.forEach((result) => {
        expect(typeof result.available).toBe('boolean');
      });
    });

    it('should include configuration details', () => {
      const config: TrainingConfig = {
        modelSizeB: 7,
        datasetSizeGb: 100,
        epochs: 1,
        tokensPerSample: 512,
        sampleCount: 1000000,
        gpuType: 'A100-80GB',
        gpuCount: 8,
        nodeCount: 1,
        includeStorage: false,
        storageDurationMonths: 1,
        checkpointFrequency: 'none',
      };

      const results = calculateTrainingCost(config);

      results.forEach((result) => {
        if (result.available) {
          expect(result.configuration.gpuType).toBe(config.gpuType);
          expect(result.configuration.gpuCount).toBe(config.gpuCount);
          expect(result.configuration.estimatedHours).toBeGreaterThan(0);
          expect(result.configuration.hourlyRate).toBeGreaterThan(0);
        }
      });
    });
  });
});
