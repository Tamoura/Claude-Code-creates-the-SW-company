import { describe, it, expect } from 'vitest';
import { roundToPrecision, formatDisplay } from './precision';

describe('roundToPrecision', () => {
  it('should fix 0.1 + 0.2 precision error', () => {
    expect(roundToPrecision(0.1 + 0.2)).toBe(0.3);
  });

  it('should round to 10 decimal places by default', () => {
    expect(roundToPrecision(1 / 3)).toBe(0.3333333333);
  });

  it('should handle negative numbers', () => {
    expect(roundToPrecision(-0.1 - 0.2)).toBe(-0.3);
  });

  it('should handle zero', () => {
    expect(roundToPrecision(0)).toBe(0);
  });

  it('should handle integers', () => {
    expect(roundToPrecision(42)).toBe(42);
  });

  it('should handle multiplication precision issues', () => {
    expect(roundToPrecision(0.1 * 3)).toBe(0.3);
  });

  it('should allow custom decimal places', () => {
    expect(roundToPrecision(1 / 3, 2)).toBe(0.33);
    expect(roundToPrecision(1 / 3, 5)).toBe(0.33333);
  });
});

describe('formatDisplay', () => {
  it('should remove trailing zeros', () => {
    expect(formatDisplay(3.0)).toBe('3');
    expect(formatDisplay(3.1)).toBe('3.1');
  });

  it('should preserve significant decimals', () => {
    expect(formatDisplay(3.14)).toBe('3.14');
    expect(formatDisplay(3.14159265359)).toBe('3.1415926536');
  });

  it('should handle integers', () => {
    expect(formatDisplay(42)).toBe('42');
  });

  it('should handle negative numbers', () => {
    expect(formatDisplay(-3.14)).toBe('-3.14');
  });

  it('should handle zero', () => {
    expect(formatDisplay(0)).toBe('0');
  });

  it('should handle very small numbers', () => {
    // Very small numbers may be displayed in scientific notation
    const result = formatDisplay(0.0000000001);
    expect(result).toMatch(/^(0\.0000000001|1e-10)$/);
  });
});
