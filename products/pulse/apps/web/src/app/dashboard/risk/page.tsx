import RiskGauge from '../../../components/dashboard/RiskGauge';

const mockRiskData = {
  score: 42,
  level: 'medium' as const,
  explanation:
    'Sprint velocity has decreased by 15% compared to the 4-week rolling average. Two pull requests have been open for more than 5 days without review, and test coverage dipped below the 85% threshold on the auth module.',
  factors: [
    {
      name: 'Velocity Trend',
      score: 55,
      weight: 0.25,
      detail: 'Velocity down 15% vs 4-week average',
    },
    {
      name: 'PR Cycle Time',
      score: 48,
      weight: 0.2,
      detail: 'Median cycle time increased to 22h',
    },
    {
      name: 'Test Coverage',
      score: 38,
      weight: 0.2,
      detail: 'Coverage at 84.2%, below 85% target',
    },
    {
      name: 'Code Churn',
      score: 32,
      weight: 0.15,
      detail: 'Low churn rate, stable codebase',
    },
    {
      name: 'Review Bottleneck',
      score: 60,
      weight: 0.1,
      detail: '2 PRs waiting > 5 days for review',
    },
    {
      name: 'Deployment Frequency',
      score: 25,
      weight: 0.05,
      detail: '3 deploys this week, on track',
    },
    {
      name: 'Incident Rate',
      score: 10,
      weight: 0.05,
      detail: 'No incidents in past 14 days',
    },
  ],
  calculatedAt: '2026-02-07T10:30:00Z',
};

function getFactorColor(score: number): string {
  if (score <= 30) return 'bg-green-500';
  if (score <= 60) return 'bg-amber-500';
  return 'bg-red-500';
}

export default function RiskPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">AI Sprint Risk</h1>
          <p className="text-[var(--text-secondary)] mt-1">
            AI-predicted sprint risk with natural language explanations
          </p>
        </div>
        <a
          href="/dashboard/risk/history"
          className="text-[var(--accent-indigo)] hover:underline text-sm font-medium transition-colors"
        >
          View History
        </a>
      </div>

      {/* Risk Gauge */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <RiskGauge score={mockRiskData.score} label="Sprint Risk" />
          <p className="text-xs text-[var(--text-muted)] mt-2">
            <time dateTime={mockRiskData.calculatedAt}>
              Last calculated: {new Date(mockRiskData.calculatedAt).toLocaleString()}
            </time>
          </p>
        </div>

        {/* AI Explanation */}
        <section className="lg:col-span-2 bg-[var(--bg-card)] border border-[var(--border-card)] rounded-xl p-6" aria-label="AI risk explanation">
          <div className="flex items-center gap-2 mb-3">
            <svg className="w-5 h-5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 0 0-2.455 2.456Z" />
            </svg>
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">AI Explanation</h2>
          </div>
          <p className="text-[var(--text-secondary)] leading-relaxed">
            {mockRiskData.explanation}
          </p>
        </section>
      </div>

      {/* Factor Breakdown */}
      <section className="bg-[var(--bg-card)] border border-[var(--border-card)] rounded-xl p-6" aria-label="Risk factor breakdown">
        <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Risk Factors</h2>
        <ul className="space-y-4" role="list">
          {mockRiskData.factors.map((factor) => (
            <li key={factor.name} className="flex items-center gap-4">
              <div className="w-36 shrink-0">
                <div className="text-sm font-medium text-[var(--text-primary)]">{factor.name}</div>
                <div className="text-xs text-[var(--text-muted)]" data-testid="factor-weight">
                  Weight: {(factor.weight * 100).toFixed(0)}%
                </div>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <div
                    className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2"
                    role="progressbar"
                    aria-valuenow={factor.score}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`${factor.name}: ${factor.score} out of 100`}
                  >
                    <div
                      className={`h-2 rounded-full ${getFactorColor(factor.score)}`}
                      style={{ width: `${factor.score}%` }}
                    />
                  </div>
                  <span
                    className="text-sm font-semibold text-[var(--text-primary)] w-8 text-right"
                    data-testid="factor-score"
                    aria-hidden="true"
                  >
                    {factor.score}
                  </span>
                </div>
                <p className="text-xs text-[var(--text-muted)] mt-1" data-testid="factor-detail">
                  {factor.detail}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
