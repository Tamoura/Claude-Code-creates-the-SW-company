import { getRiskColor, getRiskLevel, colors } from '../src/lib/theme';

describe('Theme utilities', () => {
  describe('getRiskColor', () => {
    it('returns green for low risk scores (0-33)', () => {
      expect(getRiskColor(0)).toBe(colors.riskLow);
      expect(getRiskColor(20)).toBe(colors.riskLow);
      expect(getRiskColor(33)).toBe(colors.riskLow);
    });

    it('returns yellow for medium risk scores (34-66)', () => {
      expect(getRiskColor(34)).toBe(colors.riskMedium);
      expect(getRiskColor(50)).toBe(colors.riskMedium);
      expect(getRiskColor(66)).toBe(colors.riskMedium);
    });

    it('returns red for high risk scores (67-100)', () => {
      expect(getRiskColor(67)).toBe(colors.riskHigh);
      expect(getRiskColor(85)).toBe(colors.riskHigh);
      expect(getRiskColor(100)).toBe(colors.riskHigh);
    });
  });

  describe('getRiskLevel', () => {
    it('returns low for scores 0-33', () => {
      expect(getRiskLevel(0)).toBe('low');
      expect(getRiskLevel(33)).toBe('low');
    });

    it('returns medium for scores 34-66', () => {
      expect(getRiskLevel(34)).toBe('medium');
      expect(getRiskLevel(66)).toBe('medium');
    });

    it('returns high for scores 67-100', () => {
      expect(getRiskLevel(67)).toBe('high');
      expect(getRiskLevel(100)).toBe('high');
    });
  });
});
