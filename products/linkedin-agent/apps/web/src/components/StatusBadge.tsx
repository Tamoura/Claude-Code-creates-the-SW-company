interface StatusBadgeProps {
  status: 'draft' | 'review' | 'approved' | 'published';
}

const statusConfig = {
  draft: {
    label: 'Draft',
    className: 'bg-gray-700/50 text-gray-300 border-gray-600',
  },
  review: {
    label: 'In Review',
    className: 'bg-yellow-900/30 text-yellow-400 border-yellow-700/50',
  },
  approved: {
    label: 'Approved',
    className: 'bg-green-900/30 text-green-400 border-green-700/50',
  },
  published: {
    label: 'Published',
    className: 'bg-blue-900/30 text-blue-400 border-blue-700/50',
  },
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const config = statusConfig[status];

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${config.className}`}>
      {config.label}
    </span>
  );
}
