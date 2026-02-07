interface RiskGaugeProps {
  score: number;
  label?: string;
}

function getColor(score: number): string {
  if (score <= 30) return 'text-green-500';
  if (score <= 60) return 'text-amber-500';
  return 'text-red-500';
}

function getLabel(score: number): string {
  if (score <= 30) return 'Low';
  if (score <= 60) return 'Medium';
  return 'High';
}

function getBgColor(score: number): string {
  if (score <= 30) return 'bg-green-500';
  if (score <= 60) return 'bg-amber-500';
  return 'bg-red-500';
}

export default function RiskGauge({ score, label = 'Sprint Risk' }: RiskGaugeProps) {
  const clampedScore = Math.max(0, Math.min(100, score));
  const riskLevel = getLabel(clampedScore);

  return (
    <div
      className="bg-[var(--bg-card)] border border-[var(--border-card)] rounded-xl p-6"
      role="region"
      aria-label={`${label}: ${riskLevel}, score ${clampedScore} out of 100`}
    >
      <div className="text-sm text-[var(--text-secondary)] mb-4">{label}</div>
      <div className="flex items-center gap-6">
        <div className="relative w-24 h-24">
          <svg
            className="w-24 h-24 -rotate-90"
            viewBox="0 0 36 36"
            role="img"
            aria-label={`Risk gauge showing ${clampedScore} out of 100, risk level ${riskLevel}`}
          >
            <path
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              fill="none"
              stroke="var(--border-card)"
              strokeWidth="3"
            />
            <path
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              fill="none"
              className={getColor(clampedScore).replace('text-', 'stroke-')}
              strokeWidth="3"
              strokeDasharray={`${clampedScore}, 100`}
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center" aria-hidden="true">
            <span className={`text-2xl font-bold ${getColor(clampedScore)}`}>
              {clampedScore}
            </span>
          </div>
        </div>
        <div>
          <div className={`text-lg font-semibold ${getColor(clampedScore)}`}>
            {riskLevel}
          </div>
          <div
            className="bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-2 w-32"
            role="progressbar"
            aria-valuenow={clampedScore}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`${label} progress: ${clampedScore}%`}
          >
            <div
              className={`h-2 rounded-full ${getBgColor(clampedScore)}`}
              style={{ width: `${clampedScore}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
