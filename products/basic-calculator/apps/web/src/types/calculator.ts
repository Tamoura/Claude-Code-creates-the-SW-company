import type { Operation } from '../calculators/arithmetic';

/**
 * Calculator state interface
 */
export interface CalculatorState {
  /** Current display value (what user is typing or result) */
  currentValue: string;
  /** Previous operand (stored when operation selected) */
  previousValue: string | null;
  /** Current operation selected (+, -, *, /) */
  operation: Operation | null;
  /** Flag to reset display on next number input */
  shouldResetDisplay: boolean;
  /** Error message if any */
  error: string | null;
}

/**
 * Button variant type
 */
export type ButtonVariant = 'number' | 'operator' | 'equals' | 'clear' | 'decimal';

/**
 * Button props interface
 */
export interface ButtonProps {
  /** Button value/label */
  value: string;
  /** Click handler */
  onClick: () => void;
  /** Accessible label for screen readers */
  ariaLabel: string;
  /** Button variant for styling */
  variant: ButtonVariant;
  /** Optional additional CSS classes */
  className?: string;
}
