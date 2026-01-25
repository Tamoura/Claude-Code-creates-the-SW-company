import { describe, it, expect } from 'vitest';
import { calculateEgressCost } from './networkCalculator';

describe('networkCalculator', () => {
  describe('calculateEgressCost', () => {
    it('should calculate egress cost with free tier', () => {
      const result = calculateEgressCost('aws', 150); // 150GB - 100GB free = 50GB charged

      expect(result).toBeCloseTo(4.5, 1); // 50GB * $0.09/GB
    });

    it('should return 0 when within free tier', () => {
      const result = calculateEgressCost('aws', 50); // Within 100GB free tier

      expect(result).toBe(0);
    });

    it('should apply tiered pricing', () => {
      // AWS: First 10TB at $0.09, next 40TB at $0.085
      const result = calculateEgressCost('aws', 11000); // 11TB (beyond first tier)

      // (10000 - 100 free) * 0.09 + 1000 * 0.085 = 891 + 85 = 976
      // Actual calculation: first tier is 10240GB, so (10240-100)*0.09 + (11000-10240)*0.085
      expect(result).toBeCloseTo(977.7, 1);
    });

    it('should handle providers with free egress', () => {
      const result = calculateEgressCost('lambda-labs', 1000); // Lambda has free egress

      expect(result).toBe(0);
    });

    it('should handle providers with flat pricing', () => {
      const result = calculateEgressCost('runpod', 50); // 50GB - 10GB free = 40GB charged

      expect(result).toBeCloseTo(4.0, 1); // 40GB * $0.10/GB
    });

    it('should return 0 for 0GB egress', () => {
      const result = calculateEgressCost('aws', 0);

      expect(result).toBe(0);
    });

    it('should handle different providers correctly', () => {
      const awsCost = calculateEgressCost('aws', 200);
      const gcpCost = calculateEgressCost('gcp', 200);
      const lambdaCost = calculateEgressCost('lambda-labs', 200);

      expect(awsCost).toBeGreaterThan(0);
      expect(gcpCost).toBeGreaterThan(0);
      expect(lambdaCost).toBe(0);
      expect(awsCost).not.toBe(gcpCost);
    });
  });
});
