/**
 * Token Unit Conversion Utilities
 *
 * Converts between decimal amounts and blockchain token units
 * using string arithmetic to avoid floating-point precision loss.
 *
 * SEC: Addresses audit issue #2 (Decimal Precision Loss).
 * The old approach (Math.floor(amount * 10^decimals)) loses sub-cent
 * precision for large amounts near the IEEE 754 safe integer boundary.
 */

import Decimal from 'decimal.js';

/**
 * Convert a decimal amount to token units using string arithmetic.
 *
 * @param amount - Amount as string, number, or Decimal
 * @param decimals - Token decimal places (6 for USDC/USDT)
 * @returns BigInt token units
 */
export function amountToTokenUnits(amount: string | number | Decimal, decimals: number): bigint {
  const str = amount.toString();
  const [whole, frac = ''] = str.split('.');
  const paddedFrac = frac.padEnd(decimals, '0').slice(0, decimals);
  return BigInt(whole + paddedFrac);
}
