'use client';

// Usage: <LoadingSpinner size="md" />

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  label?: string;
}

const sizeMap = {
  sm: 'w-4 h-4 border-2',
  md: 'w-6 h-6 border-2',
  lg: 'w-10 h-10 border-4',
};

export default function LoadingSpinner({
  size = 'md',
  className = '',
  label = 'Loading…',
}: LoadingSpinnerProps) {
  return (
    <span
      role="status"
      aria-label={label}
      className={`inline-block rounded-full border-gray-300 border-t-primary-500 animate-spin ${sizeMap[size]} ${className}`}
    />
  );
}
