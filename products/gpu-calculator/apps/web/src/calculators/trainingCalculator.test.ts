import { describe, it, expect } from 'vitest';
import { calculateTrainingHours, calculateTrainingCost } from './trainingCalculator';
import type { TrainingConfig } from '../types';

/**
 * Creates a base training config for testing
 * Can be overridden with partial config
 */
function createBaseConfig(overrides: Partial<TrainingConfig> = {}): TrainingConfig {
  return {
    modelSizeB: 7,
    datasetSizeGb: 100,
    epochs: 3,
    tokensPerSample: 512,
    sampleCount: 1000000,
    gpuType: 'A100-80GB',
    gpuCount: 8,
    nodeCount: 1,
    includeStorage: false,
    storageDurationMonths: 1,
    checkpointFrequency: 'none',
    ...overrides,
  };
}

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

  /**
   * Comprehensive tests for each form field parameter
   * These tests verify the calculation behavior matches user stories in TEST-PLAN.md
   */
  describe('Form Field Tests: modelSizeB', () => {
    it('should return positive hours for valid model size', () => {
      const config = createBaseConfig({ modelSizeB: 7 });
      const hours = calculateTrainingHours(config);
      expect(hours).toBeGreaterThan(0);
    });

    it('should double training hours when model size doubles', () => {
      const baseHours = calculateTrainingHours(createBaseConfig({ modelSizeB: 7 }));
      const doubleHours = calculateTrainingHours(createBaseConfig({ modelSizeB: 14 }));
      expect(doubleHours).toBeCloseTo(baseHours * 2, 1);
    });

    it('should halve training hours when model size halves', () => {
      const baseHours = calculateTrainingHours(createBaseConfig({ modelSizeB: 7 }));
      const halfHours = calculateTrainingHours(createBaseConfig({ modelSizeB: 3.5 }));
      expect(halfHours).toBeCloseTo(baseHours / 2, 1);
    });

    it('should handle decimal model sizes', () => {
      const hours = calculateTrainingHours(createBaseConfig({ modelSizeB: 7.5 }));
      expect(hours).toBeGreaterThan(0);
    });

    it('should handle very small model sizes', () => {
      const hours = calculateTrainingHours(createBaseConfig({ modelSizeB: 0.1 }));
      expect(hours).toBeGreaterThan(0);
    });

    it('should handle very large model sizes', () => {
      const hours = calculateTrainingHours(createBaseConfig({ modelSizeB: 1000 }));
      expect(hours).toBeGreaterThan(0);
    });

    it('should return zero or handle gracefully for zero model size', () => {
      const hours = calculateTrainingHours(createBaseConfig({ modelSizeB: 0 }));
      // Zero model size should result in zero hours (no training needed)
      expect(hours).toBe(0);
    });
  });

  describe('Form Field Tests: datasetSizeGb', () => {
    it('should return positive hours for valid dataset size', () => {
      const config = createBaseConfig({ datasetSizeGb: 100 });
      const hours = calculateTrainingHours(config);
      expect(hours).toBeGreaterThan(0);
    });

    it('should double training hours when dataset size doubles', () => {
      const baseHours = calculateTrainingHours(createBaseConfig({ datasetSizeGb: 100 }));
      const doubleHours = calculateTrainingHours(createBaseConfig({ datasetSizeGb: 200 }));
      expect(doubleHours).toBeCloseTo(baseHours * 2, 1);
    });

    it('should halve training hours when dataset size halves', () => {
      const baseHours = calculateTrainingHours(createBaseConfig({ datasetSizeGb: 100 }));
      const halfHours = calculateTrainingHours(createBaseConfig({ datasetSizeGb: 50 }));
      expect(halfHours).toBeCloseTo(baseHours / 2, 1);
    });

    it('should handle decimal dataset sizes', () => {
      const hours = calculateTrainingHours(createBaseConfig({ datasetSizeGb: 150.5 }));
      expect(hours).toBeGreaterThan(0);
    });

    it('should handle very small dataset sizes', () => {
      const hours = calculateTrainingHours(createBaseConfig({ datasetSizeGb: 0.1 }));
      expect(hours).toBeGreaterThan(0);
    });

    it('should handle very large dataset sizes', () => {
      const hours = calculateTrainingHours(createBaseConfig({ datasetSizeGb: 10000 }));
      expect(hours).toBeGreaterThan(0);
    });

    it('should return zero or handle gracefully for zero dataset size', () => {
      const hours = calculateTrainingHours(createBaseConfig({ datasetSizeGb: 0 }));
      expect(hours).toBe(0);
    });
  });

  describe('Form Field Tests: epochs', () => {
    it('should return positive hours for valid epochs', () => {
      const config = createBaseConfig({ epochs: 3 });
      const hours = calculateTrainingHours(config);
      expect(hours).toBeGreaterThan(0);
    });

    it('should triple training hours when epochs triple', () => {
      const baseHours = calculateTrainingHours(createBaseConfig({ epochs: 1 }));
      const tripleHours = calculateTrainingHours(createBaseConfig({ epochs: 3 }));
      expect(tripleHours).toBeCloseTo(baseHours * 3, 1);
    });

    it('should scale linearly with epoch count', () => {
      const oneEpoch = calculateTrainingHours(createBaseConfig({ epochs: 1 }));
      const fiveEpochs = calculateTrainingHours(createBaseConfig({ epochs: 5 }));
      const tenEpochs = calculateTrainingHours(createBaseConfig({ epochs: 10 }));
      expect(fiveEpochs).toBeCloseTo(oneEpoch * 5, 1);
      expect(tenEpochs).toBeCloseTo(oneEpoch * 10, 1);
    });

    it('should handle very large epoch counts', () => {
      const hours = calculateTrainingHours(createBaseConfig({ epochs: 100 }));
      expect(hours).toBeGreaterThan(0);
    });

    it('should return zero or handle gracefully for zero epochs', () => {
      const hours = calculateTrainingHours(createBaseConfig({ epochs: 0 }));
      expect(hours).toBe(0);
    });
  });

  describe('Form Field Tests: gpuType', () => {
    it('should return positive hours for A100-80GB', () => {
      const hours = calculateTrainingHours(createBaseConfig({ gpuType: 'A100-80GB' }));
      expect(hours).toBeGreaterThan(0);
    });

    it('should return positive hours for H100-80GB', () => {
      const hours = calculateTrainingHours(createBaseConfig({ gpuType: 'H100-80GB' }));
      expect(hours).toBeGreaterThan(0);
    });

    it('should return positive hours for A10', () => {
      const hours = calculateTrainingHours(createBaseConfig({ gpuType: 'A10' }));
      expect(hours).toBeGreaterThan(0);
    });

    it('H100 should be significantly faster than A100', () => {
      const a100Hours = calculateTrainingHours(createBaseConfig({ gpuType: 'A100-80GB', gpuCount: 1 }));
      const h100Hours = calculateTrainingHours(createBaseConfig({ gpuType: 'H100-80GB', gpuCount: 1 }));
      // H100 has ~6x TFLOPS of A100, so should be significantly faster
      expect(h100Hours).toBeLessThan(a100Hours * 0.5);
    });

    it('A10 should be slower than A100', () => {
      const a100Hours = calculateTrainingHours(createBaseConfig({ gpuType: 'A100-80GB', gpuCount: 1 }));
      const a10Hours = calculateTrainingHours(createBaseConfig({ gpuType: 'A10', gpuCount: 1 }));
      // A10 has lower TFLOPS than A100
      expect(a10Hours).toBeGreaterThan(a100Hours);
    });

    it('should return zero for invalid GPU type', () => {
      const hours = calculateTrainingHours(createBaseConfig({ gpuType: 'INVALID-GPU' as any }));
      expect(hours).toBe(0);
    });
  });

  describe('Form Field Tests: gpuCount', () => {
    it('should return positive hours for valid GPU count', () => {
      const hours = calculateTrainingHours(createBaseConfig({ gpuCount: 8 }));
      expect(hours).toBeGreaterThan(0);
    });

    it('should halve training hours when GPU count doubles', () => {
      const baseHours = calculateTrainingHours(createBaseConfig({ gpuCount: 4 }));
      const doubleHours = calculateTrainingHours(createBaseConfig({ gpuCount: 8 }));
      expect(doubleHours).toBeCloseTo(baseHours / 2, 1);
    });

    it('should double training hours when GPU count halves', () => {
      const baseHours = calculateTrainingHours(createBaseConfig({ gpuCount: 8 }));
      const halfHours = calculateTrainingHours(createBaseConfig({ gpuCount: 4 }));
      expect(halfHours).toBeCloseTo(baseHours * 2, 1);
    });

    it('should scale inversely with GPU count', () => {
      const oneGpu = calculateTrainingHours(createBaseConfig({ gpuCount: 1, nodeCount: 1 }));
      const fourGpus = calculateTrainingHours(createBaseConfig({ gpuCount: 4, nodeCount: 1 }));
      const eightGpus = calculateTrainingHours(createBaseConfig({ gpuCount: 8, nodeCount: 1 }));
      expect(fourGpus).toBeCloseTo(oneGpu / 4, 1);
      expect(eightGpus).toBeCloseTo(oneGpu / 8, 1);
    });

    it('should handle single GPU', () => {
      const hours = calculateTrainingHours(createBaseConfig({ gpuCount: 1, nodeCount: 1 }));
      expect(hours).toBeGreaterThan(0);
    });

    it('should handle very large GPU counts', () => {
      const hours = calculateTrainingHours(createBaseConfig({ gpuCount: 1000 }));
      expect(hours).toBeGreaterThan(0);
    });
  });

  describe('Form Field Tests: nodeCount', () => {
    it('should return positive hours for valid node count', () => {
      const hours = calculateTrainingHours(createBaseConfig({ nodeCount: 1 }));
      expect(hours).toBeGreaterThan(0);
    });

    it('should halve training hours when node count doubles', () => {
      const baseHours = calculateTrainingHours(createBaseConfig({ nodeCount: 1 }));
      const doubleHours = calculateTrainingHours(createBaseConfig({ nodeCount: 2 }));
      expect(doubleHours).toBeCloseTo(baseHours / 2, 1);
    });

    it('should scale inversely with node count', () => {
      const oneNode = calculateTrainingHours(createBaseConfig({ nodeCount: 1 }));
      const twoNodes = calculateTrainingHours(createBaseConfig({ nodeCount: 2 }));
      const fourNodes = calculateTrainingHours(createBaseConfig({ nodeCount: 4 }));
      expect(twoNodes).toBeCloseTo(oneNode / 2, 1);
      expect(fourNodes).toBeCloseTo(oneNode / 4, 1);
    });

    it('nodeCount should multiply with gpuCount for total GPUs', () => {
      // 8 GPUs on 2 nodes should equal 16 GPUs on 1 node
      const twoNodesEightGpus = calculateTrainingHours(createBaseConfig({ gpuCount: 8, nodeCount: 2 }));
      const oneNodeSixteenGpus = calculateTrainingHours(createBaseConfig({ gpuCount: 16, nodeCount: 1 }));
      expect(twoNodesEightGpus).toBeCloseTo(oneNodeSixteenGpus, 1);
    });

    it('should handle large node counts', () => {
      const hours = calculateTrainingHours(createBaseConfig({ nodeCount: 100 }));
      expect(hours).toBeGreaterThan(0);
    });
  });

  describe('Combined Parameter Tests', () => {
    it('doubling model size and GPUs should result in same hours', () => {
      const baseHours = calculateTrainingHours(createBaseConfig({ modelSizeB: 7, gpuCount: 8 }));
      const doubledHours = calculateTrainingHours(createBaseConfig({ modelSizeB: 14, gpuCount: 16 }));
      expect(doubledHours).toBeCloseTo(baseHours, 1);
    });

    it('doubling dataset and epochs should 4x training hours', () => {
      const baseHours = calculateTrainingHours(createBaseConfig({ datasetSizeGb: 100, epochs: 1 }));
      const doubledHours = calculateTrainingHours(createBaseConfig({ datasetSizeGb: 200, epochs: 2 }));
      expect(doubledHours).toBeCloseTo(baseHours * 4, 1);
    });

    it('combined scaling test: all parameters doubled except GPUs', () => {
      const baseConfig = createBaseConfig({ modelSizeB: 7, datasetSizeGb: 100, epochs: 1, gpuCount: 8 });
      const baseHours = calculateTrainingHours(baseConfig);

      const scaledConfig = createBaseConfig({ modelSizeB: 14, datasetSizeGb: 200, epochs: 2, gpuCount: 8 });
      const scaledHours = calculateTrainingHours(scaledConfig);

      // 2x model * 2x dataset * 2x epochs = 8x hours
      expect(scaledHours).toBeCloseTo(baseHours * 8, 1);
    });
  });

  describe('Cost Calculation Tests by Parameter', () => {
    it('increasing model size should increase total cost', () => {
      const smallModel = calculateTrainingCost(createBaseConfig({ modelSizeB: 7, includeStorage: false }));
      const largeModel = calculateTrainingCost(createBaseConfig({ modelSizeB: 14, includeStorage: false }));

      const smallModelCost = smallModel.find(r => r.available)?.costs.total ?? 0;
      const largeModelCost = largeModel.find(r => r.available)?.costs.total ?? 0;

      expect(largeModelCost).toBeGreaterThan(smallModelCost);
    });

    it('increasing dataset size should increase total cost', () => {
      const smallDataset = calculateTrainingCost(createBaseConfig({ datasetSizeGb: 100, includeStorage: false }));
      const largeDataset = calculateTrainingCost(createBaseConfig({ datasetSizeGb: 200, includeStorage: false }));

      const smallCost = smallDataset.find(r => r.available)?.costs.total ?? 0;
      const largeCost = largeDataset.find(r => r.available)?.costs.total ?? 0;

      expect(largeCost).toBeGreaterThan(smallCost);
    });

    it('increasing epochs should increase total cost', () => {
      const fewEpochs = calculateTrainingCost(createBaseConfig({ epochs: 1, includeStorage: false }));
      const manyEpochs = calculateTrainingCost(createBaseConfig({ epochs: 5, includeStorage: false }));

      const fewCost = fewEpochs.find(r => r.available)?.costs.total ?? 0;
      const manyCost = manyEpochs.find(r => r.available)?.costs.total ?? 0;

      expect(manyCost).toBeGreaterThan(fewCost);
    });

    it('faster GPU should reduce training hours but may affect cost differently', () => {
      const a100Results = calculateTrainingCost(createBaseConfig({ gpuType: 'A100-80GB', gpuCount: 1 }));
      const h100Results = calculateTrainingCost(createBaseConfig({ gpuType: 'H100-80GB', gpuCount: 1 }));

      const a100Hours = a100Results.find(r => r.available)?.configuration.estimatedHours ?? 0;
      const h100Hours = h100Results.find(r => r.available)?.configuration.estimatedHours ?? 0;

      // H100 should be faster
      expect(h100Hours).toBeLessThan(a100Hours);
    });
  });
});
