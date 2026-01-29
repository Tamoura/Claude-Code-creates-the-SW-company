interface DisplayProps {
  /** Display value */
  value: string;
  /** Whether displaying an error */
  error?: boolean;
}

/**
 * Display component for calculator
 * Shows current value or result with proper accessibility
 */
export function Display({ value, error = false }: DisplayProps) {
  // Show "0" if value is empty
  const displayValue = value || '0';

  return (
    <output
      role="status"
      aria-live="polite"
      aria-atomic="true"
      aria-label="Calculator display"
      data-testid="calculator-display"
      className={`
        w-full
        bg-calc-display-bg
        ${error ? 'text-red-400' : 'text-calc-display-text'}
        text-right
        text-3xl sm:text-4xl md:text-5xl
        font-mono
        font-bold
        p-4 sm:p-6
        rounded-lg
        mb-4
        min-h-[4rem] sm:min-h-[5rem]
        flex
        items-center
        justify-end
        break-all
      `}
    >
      {displayValue}
    </output>
  );
}
