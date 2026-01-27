import { describe, it, expect } from 'vitest';
import { calculate } from './arithmetic';

describe('calculate - addition', () => {
  it('should add two positive integers', () => {
    expect(calculate(5, 3, '+')).toBe(8);
  });

  it('should add two decimals', () => {
    expect(calculate(3.14, 2.86, '+')).toBe(6);
  });

  it('should fix floating point precision (0.1 + 0.2)', () => {
    expect(calculate(0.1, 0.2, '+')).toBe(0.3);
  });

  it('should handle negative numbers', () => {
    expect(calculate(-5, 3, '+')).toBe(-2);
    expect(calculate(5, -3, '+')).toBe(2);
    expect(calculate(-5, -3, '+')).toBe(-8);
  });

  it('should handle zero', () => {
    expect(calculate(0, 5, '+')).toBe(5);
    expect(calculate(5, 0, '+')).toBe(5);
  });
});

describe('calculate - subtraction', () => {
  it('should subtract two positive integers', () => {
    expect(calculate(10, 4, '-')).toBe(6);
  });

  it('should subtract decimals', () => {
    expect(calculate(5.5, 2.3, '-')).toBe(3.2);
  });

  it('should handle negative results', () => {
    expect(calculate(3, 5, '-')).toBe(-2);
  });

  it('should handle negative numbers', () => {
    expect(calculate(-5, 3, '-')).toBe(-8);
    expect(calculate(5, -3, '-')).toBe(8);
    expect(calculate(-5, -3, '-')).toBe(-2);
  });

  it('should handle zero', () => {
    expect(calculate(5, 0, '-')).toBe(5);
    expect(calculate(0, 5, '-')).toBe(-5);
  });
});

describe('calculate - multiplication', () => {
  it('should multiply two positive integers', () => {
    expect(calculate(7, 6, '*')).toBe(42);
  });

  it('should multiply decimals', () => {
    expect(calculate(2.5, 4, '*')).toBe(10);
  });

  it('should fix floating point precision (0.1 * 3)', () => {
    expect(calculate(0.1, 3, '*')).toBe(0.3);
  });

  it('should handle negative numbers', () => {
    expect(calculate(-5, 3, '*')).toBe(-15);
    expect(calculate(5, -3, '*')).toBe(-15);
    expect(calculate(-5, -3, '*')).toBe(15);
  });

  it('should handle zero', () => {
    expect(calculate(0, 5, '*')).toBe(0);
    expect(calculate(5, 0, '*')).toBe(0);
  });
});

describe('calculate - division', () => {
  it('should divide two positive integers', () => {
    expect(calculate(15, 3, '/')).toBe(5);
  });

  it('should divide with decimal result', () => {
    expect(calculate(10, 3, '/')).toBe(3.3333333333);
  });

  it('should handle decimals', () => {
    expect(calculate(7.5, 2.5, '/')).toBe(3);
  });

  it('should handle negative numbers', () => {
    expect(calculate(-15, 3, '/')).toBe(-5);
    expect(calculate(15, -3, '/')).toBe(-5);
    expect(calculate(-15, -3, '/')).toBe(5);
  });

  it('should throw error on division by zero', () => {
    expect(() => calculate(5, 0, '/')).toThrow('Cannot divide by zero');
    expect(() => calculate(0, 0, '/')).toThrow('Cannot divide by zero');
  });
});

describe('calculate - edge cases', () => {
  it('should throw error for unknown operation', () => {
    // @ts-expect-error - Testing invalid operation
    expect(() => calculate(5, 3, '%')).toThrow('Unknown operation');
  });

  it('should handle very large numbers', () => {
    // JavaScript Number precision limits apply
    const result = calculate(999999999999, 2, '*');
    expect(result).toBeCloseTo(1999999999998, 0); // Within 1 unit
  });

  it('should handle very small decimals', () => {
    expect(calculate(0.000001, 0.000001, '+')).toBe(0.000002);
  });
});
