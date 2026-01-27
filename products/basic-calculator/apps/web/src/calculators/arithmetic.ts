import { roundToPrecision } from './precision';

/**
 * Operation type for calculator
 */
export type Operation = '+' | '-' | '*' | '/';

/**
 * Performs arithmetic calculation
 * @param a - First operand
 * @param b - Second operand
 * @param operation - Operation to perform (+, -, *, /)
 * @returns Result of calculation (rounded to 10 decimal places)
 * @throws Error if division by zero or unknown operation
 * @example
 * calculate(5, 3, '+') // Returns 8
 * calculate(0.1, 0.2, '+') // Returns 0.3 (not 0.30000000000000004)
 * calculate(5, 0, '/') // Throws "Cannot divide by zero"
 */
export function calculate(
  a: number,
  b: number,
  operation: Operation
): number {
  let result: number;

  switch (operation) {
    case '+':
      result = a + b;
      break;
    case '-':
      result = a - b;
      break;
    case '*':
      result = a * b;
      break;
    case '/':
      if (b === 0) {
        throw new Error('Cannot divide by zero');
      }
      result = a / b;
      break;
    default:
      throw new Error(`Unknown operation: ${operation}`);
  }

  // Round result to eliminate floating point errors
  return roundToPrecision(result);
}
