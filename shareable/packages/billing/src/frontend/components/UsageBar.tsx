export interface UsageBarProps {
  label: string;
  used: number;
  limit: number | string;
  className?: string;
}

export default function UsageBar({ label, used, limit, className = '' }: UsageBarProps) {
  const isUnlimited = limit === 'unlimited' || limit === Infinity;
  const numericLimit = typeof limit === 'number' ? limit : 0;
  const percentage = isUnlimited ? 0 : numericLimit > 0 ? Math.min(100, (used / numericLimit) * 100) : 0;
  const isWarning = !isUnlimited && percentage >= 80;
  const isDanger = !isUnlimited && percentage >= 95;

  const barColor = isDanger
    ? 'bg-red-500'
    : isWarning
      ? 'bg-yellow-500'
      : 'bg-blue-500';

  return (
    <div className={`space-y-1 ${className}`}>
      <div className="flex justify-between text-sm">
        <span className="text-gray-700 dark:text-gray-300 font-medium">{label}</span>
        <span className="text-gray-500 dark:text-gray-400">
          {used.toLocaleString()} / {isUnlimited ? 'Unlimited' : numericLimit.toLocaleString()}
        </span>
      </div>
      {!isUnlimited && (
        <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${barColor}`}
            style={{ width: `${percentage}%` }}
          />
        </div>
      )}
    </div>
  );
}
