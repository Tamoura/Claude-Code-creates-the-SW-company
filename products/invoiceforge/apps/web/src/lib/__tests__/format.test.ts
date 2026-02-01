import { describe, it, expect } from 'vitest';
import {
  formatCents,
  formatTaxRate,
  formatDate,
  parseDollars,
  parsePercentage,
} from '../format';

describe('formatCents', () => {
  it('formats zero cents as $0.00', () => {
    expect(formatCents(0)).toBe('$0.00');
  });

  it('formats positive cents correctly', () => {
    expect(formatCents(12500)).toBe('$125.00');
  });

  it('formats cents with decimal portion', () => {
    expect(formatCents(9999)).toBe('$99.99');
  });

  it('formats single cent', () => {
    expect(formatCents(1)).toBe('$0.01');
  });

  it('formats large amounts', () => {
    expect(formatCents(1000000)).toBe('$10000.00');
  });

  it('formats negative cents', () => {
    expect(formatCents(-500)).toBe('$-5.00');
  });
});

describe('formatTaxRate', () => {
  it('formats zero tax rate', () => {
    expect(formatTaxRate(0)).toBe('0%');
  });

  it('formats whole percentage rates (no decimals when evenly divisible)', () => {
    expect(formatTaxRate(1000)).toBe('10%');
  });

  it('formats fractional tax rate in basis points', () => {
    expect(formatTaxRate(850)).toBe('8.50%');
  });

  it('formats 100 basis points as 1%', () => {
    expect(formatTaxRate(100)).toBe('1%');
  });

  it('formats small basis points with decimals', () => {
    expect(formatTaxRate(25)).toBe('0.25%');
  });
});

describe('formatDate', () => {
  it('formats ISO date string to US locale', () => {
    const result = formatDate('2025-01-15T00:00:00.000Z');
    expect(result).toContain('Jan');
    expect(result).toContain('15');
    expect(result).toContain('2025');
  });

  it('formats a different date correctly', () => {
    const result = formatDate('2024-12-25T00:00:00.000Z');
    expect(result).toContain('Dec');
    expect(result).toContain('25');
    expect(result).toContain('2024');
  });
});

describe('parseDollars', () => {
  it('parses simple dollar amount to cents', () => {
    expect(parseDollars('125.00')).toBe(12500);
  });

  it('parses dollar amount with $ symbol', () => {
    expect(parseDollars('$125.00')).toBe(12500);
  });

  it('parses dollar amount with commas', () => {
    expect(parseDollars('$1,250.00')).toBe(125000);
  });

  it('parses dollar amount without decimal', () => {
    expect(parseDollars('100')).toBe(10000);
  });

  it('rounds to nearest cent', () => {
    expect(parseDollars('99.999')).toBe(10000);
  });

  it('parses zero', () => {
    expect(parseDollars('0')).toBe(0);
  });
});

describe('parsePercentage', () => {
  it('parses percentage string to basis points', () => {
    expect(parsePercentage('10')).toBe(1000);
  });

  it('parses percentage with % symbol', () => {
    expect(parsePercentage('8.5%')).toBe(850);
  });

  it('parses zero percentage', () => {
    expect(parsePercentage('0')).toBe(0);
  });

  it('parses fractional percentage', () => {
    expect(parsePercentage('0.25%')).toBe(25);
  });

  it('rounds to nearest basis point', () => {
    expect(parsePercentage('10.125%')).toBe(1013);
  });
});
