import { describe, it, expect } from '@jest/globals';
import { getExperimentAssignment } from '../../src/modules/experiments/assignment';

describe('Experiment Assignment', () => {
  it('should return either control or variant', () => {
    const result = getExperimentAssignment('user-123', 'exp-456', 50);
    expect(['control', 'variant']).toContain(result.variant);
  });

  it('should be deterministic (same input = same output)', () => {
    const result1 = getExperimentAssignment('user-123', 'exp-456', 50);
    const result2 = getExperimentAssignment('user-123', 'exp-456', 50);
    expect(result1.variant).toBe(result2.variant);
    expect(result1.bucket).toBe(result2.bucket);
  });

  it('should produce bucket in range 0-99', () => {
    for (let i = 0; i < 100; i++) {
      const result = getExperimentAssignment(`user-${i}`, 'exp-test', 50);
      expect(result.bucket).toBeGreaterThanOrEqual(0);
      expect(result.bucket).toBeLessThan(100);
    }
  });

  it('should respect traffic split (50/50 within tolerance)', () => {
    let controlCount = 0;
    let variantCount = 0;
    const sampleSize = 10000;

    for (let i = 0; i < sampleSize; i++) {
      const result = getExperimentAssignment(`user-${i}`, 'exp-split-test', 50);
      if (result.variant === 'control') controlCount++;
      else variantCount++;
    }

    // Within 5% tolerance of 50/50
    const controlRatio = controlCount / sampleSize;
    expect(controlRatio).toBeGreaterThan(0.45);
    expect(controlRatio).toBeLessThan(0.55);
  });

  it('should respect 80/20 traffic split', () => {
    let controlCount = 0;
    const sampleSize = 10000;

    for (let i = 0; i < sampleSize; i++) {
      const result = getExperimentAssignment(`user-${i}`, 'exp-80-20', 80);
      if (result.variant === 'control') controlCount++;
    }

    const controlRatio = controlCount / sampleSize;
    expect(controlRatio).toBeGreaterThan(0.75);
    expect(controlRatio).toBeLessThan(0.85);
  });

  it('should produce different assignments for different experiment IDs', () => {
    const assignments = new Set<string>();
    for (let i = 0; i < 100; i++) {
      const result = getExperimentAssignment('same-user', `exp-${i}`, 50);
      assignments.add(result.variant);
    }
    // With 100 different experiments, user should get both variants
    expect(assignments.size).toBe(2);
  });
});
