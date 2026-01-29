import type { ButtonProps } from '../types/calculator';

/**
 * Button component for calculator
 * Accessible, responsive, and styled according to variant
 */
export function Button({ value, onClick, ariaLabel, variant, className = '' }: ButtonProps) {
  // Base classes for all buttons
  const baseClasses = [
    'w-14 h-14',              // 56px (14*4) - exceeds 44px minimum touch target
    'sm:w-16 sm:h-16',        // 64px on tablet
    'md:w-20 md:h-20',        // 80px on desktop
    'text-calc-btn-text',     // White text
    'font-semibold',
    'text-lg sm:text-xl md:text-2xl',
    'rounded-lg',
    'transition-all',
    'duration-150',
    'hover:scale-105',
    'active:scale-95',
    'focus:outline-none',
    'focus:ring-4',
    'focus:ring-blue-500',
    'focus:ring-offset-2',
  ];

  // Variant-specific styling
  const variantClasses: Record<typeof variant, string> = {
    number: 'bg-calc-btn-number hover:bg-gray-600',
    operator: 'bg-calc-btn-operator hover:bg-blue-700',
    equals: 'bg-calc-btn-equals hover:bg-green-600',
    clear: 'bg-calc-btn-clear hover:bg-red-600',
    decimal: 'bg-calc-btn-number hover:bg-gray-600',
  };

  const classes = [...baseClasses, variantClasses[variant], className].join(' ');

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      className={classes}
    >
      {value}
    </button>
  );
}
