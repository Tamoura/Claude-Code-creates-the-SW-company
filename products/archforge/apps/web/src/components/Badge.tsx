'use client';

// Usage: <Badge variant="framework" value="C4" />

interface BadgeProps {
  value: string;
  variant?: 'framework' | 'status' | 'type' | 'default';
  className?: string;
}

const frameworkColors: Record<string, string> = {
  c4: 'bg-indigo-100 text-indigo-700',
  archimate: 'bg-purple-100 text-purple-700',
  togaf: 'bg-blue-100 text-blue-700',
  bpmn: 'bg-teal-100 text-teal-700',
};

const statusColors: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-600',
  active: 'bg-green-100 text-green-700',
  archived: 'bg-amber-100 text-amber-700',
  generated: 'bg-green-100 text-green-700',
  generating: 'bg-blue-100 text-blue-700',
  failed: 'bg-red-100 text-red-700',
};

function resolveColor(variant: BadgeProps['variant'], value: string): string {
  const key = value.toLowerCase();
  if (variant === 'framework') {
    return frameworkColors[key] ?? 'bg-gray-100 text-gray-600';
  }
  if (variant === 'status') {
    return statusColors[key] ?? 'bg-gray-100 text-gray-600';
  }
  return 'bg-gray-100 text-gray-600';
}

export default function Badge({
  value,
  variant = 'default',
  className = '',
}: BadgeProps) {
  const color = resolveColor(variant, value);
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${color} ${className}`}
    >
      {value.toUpperCase()}
    </span>
  );
}
