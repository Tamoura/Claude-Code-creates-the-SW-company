interface StatusBadgeProps {
  status: 'operational' | 'degraded' | 'down' | 'valid' | 'invalid' | 'expired';
  label?: string;
}

const STATUS_CONFIG: Record<
  StatusBadgeProps['status'],
  { bg: string; text: string; dot: string; defaultLabel: string }
> = {
  operational: {
    bg: 'bg-green-500/10',
    text: 'text-green-400',
    dot: 'bg-green-400',
    defaultLabel: 'Operational',
  },
  valid: {
    bg: 'bg-green-500/10',
    text: 'text-green-400',
    dot: 'bg-green-400',
    defaultLabel: 'Valid',
  },
  degraded: {
    bg: 'bg-yellow-500/10',
    text: 'text-yellow-400',
    dot: 'bg-yellow-400',
    defaultLabel: 'Degraded',
  },
  down: {
    bg: 'bg-red-500/10',
    text: 'text-red-400',
    dot: 'bg-red-400',
    defaultLabel: 'Down',
  },
  invalid: {
    bg: 'bg-red-500/10',
    text: 'text-red-400',
    dot: 'bg-red-400',
    defaultLabel: 'Invalid',
  },
  expired: {
    bg: 'bg-yellow-500/10',
    text: 'text-yellow-400',
    dot: 'bg-yellow-400',
    defaultLabel: 'Expired',
  },
};

export default function StatusBadge({ status, label }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status];

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
      {label ?? config.defaultLabel}
    </span>
  );
}
