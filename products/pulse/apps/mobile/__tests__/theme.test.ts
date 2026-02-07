import { getRiskColor, getRiskLevel, colors } from '../src/lib/theme';

describe('Theme utilities', () => {
  describe('getRiskColor', () => {
    it('returns green for low risk scores (0-40)', () => {
      expect(getRiskColor(0)).toBe(colors.riskLow);
      expect(getRiskColor(20)).toBe(colors.riskLow);
      expect(getRiskColor(40)).toBe(colors.riskLow);
    });

    it('returns yellow for medium risk scores (41-70)', () => {
      expect(getRiskColor(41)).toBe(colors.riskMedium);
      expect(getRiskColor(55)).toBe(colors.riskMedium);
      expect(getRiskColor(70)).toBe(colors.riskMedium);
    });

    it('returns red for high risk scores (71-100)', () => {
      expect(getRiskColor(71)).toBe(colors.riskHigh);
      expect(getRiskColor(85)).toBe(colors.riskHigh);
      expect(getRiskColor(100)).toBe(colors.riskHigh);
    });
  });

  describe('getRiskLevel', () => {
    it('returns low for scores 0-40', () => {
      expect(getRiskLevel(0)).toBe('low');
      expect(getRiskLevel(40)).toBe('low');
    });

    it('returns medium for scores 41-70', () => {
      expect(getRiskLevel(41)).toBe('medium');
      expect(getRiskLevel(70)).toBe('medium');
    });

    it('returns high for scores 71-100', () => {
      expect(getRiskLevel(71)).toBe('high');
      expect(getRiskLevel(100)).toBe('high');
    });
  });
});
