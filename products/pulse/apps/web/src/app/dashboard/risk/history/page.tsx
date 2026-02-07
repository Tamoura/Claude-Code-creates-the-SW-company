'use client';

import { useState } from 'react';
import DateRangeSelector from '../../../../components/common/DateRangeSelector';
import type { DateRange } from '../../../../components/common/DateRangeSelector';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';

const mockSnapshots = [
  {
    id: 'snap-1',
    score: 42,
    level: 'medium',
    explanation: 'Sprint velocity decreased, 2 PRs stalled in review.',
    calculatedAt: '2026-02-07T10:30:00Z',
  },
  {
    id: 'snap-2',
    score: 38,
    level: 'medium',
    explanation: 'Coverage dipped to 84%, velocity slightly improved.',
    calculatedAt: '2026-02-06T10:30:00Z',
  },
  {
    id: 'snap-3',
    score: 55,
    level: 'medium',
    explanation: 'Two critical PRs merged late, increasing cycle time.',
    calculatedAt: '2026-02-05T10:30:00Z',
  },
  {
    id: 'snap-4',
    score: 30,
    level: 'low',
    explanation: 'Velocity on track, all tests green, no incidents.',
    calculatedAt: '2026-02-04T10:30:00Z',
  },
  {
    id: 'snap-5',
    score: 25,
    level: 'low',
    explanation: 'Strong sprint start with high deployment frequency.',
    calculatedAt: '2026-02-03T10:30:00Z',
  },
  {
    id: 'snap-6',
    score: 62,
    level: 'high',
    explanation: 'Production incident spiked risk temporarily.',
    calculatedAt: '2026-02-02T10:30:00Z',
  },
  {
    id: 'snap-7',
    score: 45,
    level: 'medium',
    explanation: 'Recovery from incident, velocity normalizing.',
    calculatedAt: '2026-02-01T10:30:00Z',
  },
];

const chartData = mockSnapshots
  .slice()
  .reverse()
  .map((s) => ({
    date: new Date(s.calculatedAt).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    }),
    score: s.score,
  }));

function getLevelColor(level: string): string {
  switch (level) {
    case 'low':
      return 'text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30';
    case 'medium':
      return 'text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/30';
    case 'high':
      return 'text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30';
    default:
      return 'text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-900/30';
  }
}

export default function RiskHistoryPage() {
  const [range, setRange] = useState<DateRange>('30d');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Risk History</h1>
          <p className="text-[var(--text-secondary)] mt-1">
            Historical risk scores with event correlation
          </p>
        </div>
        <div className="flex items-center gap-4">
          <DateRangeSelector value={range} onChange={setRange} />
          <a
            href="/dashboard/risk"
            className="text-indigo-600 hover:text-indigo-500 text-sm font-medium transition-colors"
          >
            Back to Current Risk
          </a>
        </div>
      </div>

      {/* Risk Trend Chart */}
      <div className="bg-[var(--bg-card)] border border-[var(--border-card)] rounded-xl p-6">
        <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">
          Risk Score Trend
        </h2>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-card)" />
              <XAxis dataKey="date" stroke="var(--text-muted)" fontSize={12} />
              <YAxis domain={[0, 100]} stroke="var(--text-muted)" fontSize={12} />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="score"
                stroke="#6366f1"
                strokeWidth={2}
                dot={{ fill: '#6366f1', r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Historical Snapshots */}
      <div className="bg-[var(--bg-card)] border border-[var(--border-card)] rounded-xl p-6">
        <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">
          Historical Snapshots
        </h2>
        <div className="space-y-3">
          {mockSnapshots.map((snapshot) => (
            <div
              key={snapshot.id}
              data-testid="snapshot-entry"
              className="flex items-start gap-4 p-3 rounded-lg hover:bg-[var(--bg-page)] transition-colors"
            >
              <div className="shrink-0 text-center">
                <span
                  className="text-2xl font-bold text-[var(--text-primary)]"
                  data-testid="snapshot-score"
                >
                  {snapshot.score}
                </span>
                <span
                  className={`block text-xs font-medium mt-1 px-2 py-0.5 rounded-full ${getLevelColor(snapshot.level)}`}
                  data-testid="snapshot-level"
                >
                  {snapshot.level.charAt(0).toUpperCase() + snapshot.level.slice(1)}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-[var(--text-secondary)]">
                  {snapshot.explanation}
                </p>
                <p className="text-xs text-[var(--text-muted)] mt-1">
                  {new Date(snapshot.calculatedAt).toLocaleString()}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
