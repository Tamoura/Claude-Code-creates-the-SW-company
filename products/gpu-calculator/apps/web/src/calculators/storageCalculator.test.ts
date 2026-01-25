import { describe, it, expect } from 'vitest';
import { calculateStorageCost } from './storageCalculator';

describe('storageCalculator', () => {
  describe('calculateStorageCost', () => {
    it('should calculate storage cost for a dataset', () => {
      const result = calculateStorageCost('aws', 100, 1); // 100GB for 1 month

      expect(result).toBeGreaterThan(0);
      expect(result).toBeCloseTo(2.185, 2); // (100-5 free) * $0.023/GB = $2.185
    });

    it('should apply free tier correctly', () => {
      const result = calculateStorageCost('aws', 5, 1); // 5GB within free tier

      expect(result).toBe(0);
    });

    it('should subtract free tier from total', () => {
      const result = calculateStorageCost('aws', 10, 1); // 10GB - 5GB free = 5GB charged

      expect(result).toBeCloseTo(0.115, 2); // $0.023 * 5GB
    });

    it('should scale with duration in months', () => {
      const singleMonth = calculateStorageCost('aws', 100, 1);
      const threeMonths = calculateStorageCost('aws', 100, 3);

      expect(threeMonths).toBeCloseTo(singleMonth * 3, 2);
    });

    it('should return 0 for 0GB storage', () => {
      const result = calculateStorageCost('aws', 0, 1);

      expect(result).toBe(0);
    });

    it('should handle different providers', () => {
      const awsCost = calculateStorageCost('aws', 100, 1);
      const gcpCost = calculateStorageCost('gcp', 100, 1);

      expect(awsCost).toBeGreaterThan(0);
      expect(gcpCost).toBeGreaterThan(0);
      expect(awsCost).not.toBe(gcpCost); // Different rates
    });

    it('should handle providers without free tier', () => {
      const result = calculateStorageCost('lambda-labs', 10, 1);

      expect(result).toBeGreaterThan(0);
      expect(result).toBeCloseTo(2.0, 1); // $0.20/GB * 10GB
    });
  });
});
