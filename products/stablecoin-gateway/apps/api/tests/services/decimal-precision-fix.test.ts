/**
 * Decimal Precision Fix Tests
 *
 * Audit Issue #2: Number(refund.amount) and Math.floor(amount * 10^6)
 * lose sub-cent precision for large USDC amounts near the safe integer
 * boundary.
 *
 * USDC has 6 decimal places. The fix uses string arithmetic to avoid
 * floating-point precision loss entirely.
 */

import Decimal from 'decimal.js';

/**
 * Convert a decimal amount to token units using string arithmetic.
 * Avoids floating-point precision loss by never passing through Number.
 *
 * @param amount - Amount as string or Decimal
 * @param decimals - Token decimal places (6 for USDC/USDT)
 * @returns BigInt token units
 */
export function amountToTokenUnits(amount: string | Decimal, decimals: number): bigint {
  const str = amount.toString();
  const [whole, frac = ''] = str.split('.');
  const paddedFrac = frac.padEnd(decimals, '0').slice(0, decimals);
  return BigInt(whole + paddedFrac);
}

describe('Decimal precision in blockchain amounts', () => {
  describe('amountToTokenUnits', () => {
    it('should convert 1000000.000001 to exactly 1000000000001n', () => {
      expect(amountToTokenUnits('1000000.000001', 6)).toBe(1000000000001n);
    });

    it('should convert 0.000001 to 1n (smallest USDC unit)', () => {
      expect(amountToTokenUnits('0.000001', 6)).toBe(1n);
    });

    it('should convert 100.50 to 100500000n', () => {
      expect(amountToTokenUnits('100.50', 6)).toBe(100500000n);
    });

    it('should convert whole number 100 to 100000000n', () => {
      expect(amountToTokenUnits('100', 6)).toBe(100000000n);
    });

    it('should handle Decimal input', () => {
      expect(amountToTokenUnits(new Decimal('1000000.000001'), 6)).toBe(1000000000001n);
    });

    it('should truncate excess decimals beyond 6 places', () => {
      expect(amountToTokenUnits('100.1234567', 6)).toBe(100123456n);
    });
  });

  describe('precision loss demonstration', () => {
    it('should show that Math.floor loses precision for large amounts', () => {
      // Near MAX_SAFE_INTEGER boundary: 9007199254.000001
      const amount = 9007199254.000001;
      const oldResult = BigInt(Math.floor(amount * Math.pow(10, 6)));
      // Expected: 9007199254000001n but gets 9007199254000002n
      expect(oldResult).not.toBe(9007199254000001n);

      // String arithmetic preserves precision
      const newResult = amountToTokenUnits('9007199254.000001', 6);
      expect(newResult).toBe(9007199254000001n);
    });
  });
});
