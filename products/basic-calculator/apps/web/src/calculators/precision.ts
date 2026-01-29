/**
 * Rounds a number to specified decimal places, eliminating floating point errors
 * @param num - The number to round
 * @param decimals - Number of decimal places (default: 10)
 * @returns Rounded number
 * @example
 * roundToPrecision(0.1 + 0.2) // Returns 0.3 (not 0.30000000000000004)
 * roundToPrecision(1/3) // Returns 0.3333333333 (10 decimal places)
 */
export function roundToPrecision(num: number, decimals: number = 10): number {
  const factor = Math.pow(10, decimals);
  return Math.round(num * factor) / factor;
}

/**
 * Formats a number for display, removing trailing zeros
 * @param num - The number to format
 * @returns Formatted string
 * @example
 * formatDisplay(3.00) // Returns "3"
 * formatDisplay(3.14) // Returns "3.14"
 * formatDisplay(3.10) // Returns "3.1"
 */
export function formatDisplay(num: number): string {
  // Round to 10 decimal places first
  const rounded = roundToPrecision(num);

  // Convert to string
  let str = rounded.toString();

  // If it has a decimal point, remove trailing zeros
  if (str.includes('.')) {
    str = str.replace(/\.?0+$/, '');
  }

  return str;
}
