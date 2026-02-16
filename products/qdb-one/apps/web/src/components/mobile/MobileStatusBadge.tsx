'use client';

const statusColorMap: Record<string, string> = {
  active: 'var(--success)',
  closed: 'var(--muted)',
  defaulted: 'var(--danger)',
  draft: 'var(--muted)',
  submitted: 'var(--primary)',
  under_review: 'var(--warning)',
  approved: 'var(--success)',
  rejected: 'var(--danger)',
  pending_signature: 'var(--warning)',
  expired: 'var(--muted)',
  claimed: 'var(--danger)',
  pending: 'var(--warning)',
  completed: 'var(--success)',
  scheduled: 'var(--primary)',
  cancelled: 'var(--danger)',
  enrolled: 'var(--primary)',
  in_progress: 'var(--warning)',
  filed: 'var(--accent)',
};

interface MobileStatusBadgeProps {
  status: string;
  label?: string;
}

export default function MobileStatusBadge({ status, label }: MobileStatusBadgeProps) {
  const color = statusColorMap[status] || 'var(--muted)';
  const displayLabel = label || status.replace(/_/g, ' ');

  return (
    <span
      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap"
      style={{ backgroundColor: `${color}20`, color }}
    >
      {displayLabel}
    </span>
  );
}
