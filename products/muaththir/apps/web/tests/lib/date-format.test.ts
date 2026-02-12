import { formatDate, formatDateLong, formatDateTime } from '../../src/lib/date-format';

describe('date-format utilities', () => {
  describe('formatDate', () => {
    it('formats a date string for English locale', () => {
      const result = formatDate('2026-02-12T10:00:00Z', 'en');
      // en maps to en-GB: "12 Feb 2026"
      expect(result).toMatch(/12/);
      expect(result).toMatch(/Feb/);
      expect(result).toMatch(/2026/);
    });

    it('formats a date string for Arabic locale', () => {
      const result = formatDate('2026-02-12T10:00:00Z', 'ar');
      // ar maps to ar-SA, uses Arabic numerals
      expect(result).toBeTruthy();
      expect(result.length).toBeGreaterThan(0);
    });

    it('handles a Date object input', () => {
      const date = new Date('2026-06-15T00:00:00Z');
      const result = formatDate(date, 'en');
      expect(result).toMatch(/15/);
      expect(result).toMatch(/Jun/);
      expect(result).toMatch(/2026/);
    });

    it('returns the original string for an invalid date', () => {
      const result = formatDate('not-a-date', 'en');
      expect(result).toBe('not-a-date');
    });

    it('handles unknown locale by passing it through', () => {
      const result = formatDate('2026-01-01T00:00:00Z', 'fr');
      // Should not throw; falls back to 'fr' locale
      expect(result).toBeTruthy();
    });
  });

  describe('formatDateLong', () => {
    it('formats with long month name for English', () => {
      const result = formatDateLong('2026-02-12T10:00:00Z', 'en');
      expect(result).toMatch(/12/);
      expect(result).toMatch(/February/);
      expect(result).toMatch(/2026/);
    });

    it('returns original string for invalid date', () => {
      const result = formatDateLong('invalid', 'en');
      expect(result).toBe('invalid');
    });
  });

  describe('formatDateTime', () => {
    it('includes time in the output', () => {
      const result = formatDateTime('2026-02-12T14:30:00Z', 'en');
      expect(result).toMatch(/12/);
      expect(result).toMatch(/February/);
      expect(result).toMatch(/2026/);
      // Should include time portion
      expect(result).toMatch(/\d{1,2}:\d{2}/);
    });

    it('returns original string for invalid date', () => {
      const result = formatDateTime('garbage', 'en');
      expect(result).toBe('garbage');
    });
  });
});
