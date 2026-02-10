'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import RiskGauge from '../../../components/dashboard/RiskGauge';
import { apiClient } from '../../../lib/api-client';

interface RiskFactor {
  name: string;
  score: number;
  weight: number;
  detail: string;
}

interface RiskData {
  score: number;
  level: 'low' | 'medium' | 'high';
  explanation: string;
  recommendations: string[];
  factors: RiskFactor[];
  calculatedAt: string;
}

function getFactorColor(score: number): string {
  if (score <= 30) return 'bg-green-500';
  if (score <= 60) return 'bg-amber-500';
  return 'bg-red-500';
}

export default function RiskPage() {
  const searchParams = useSearchParams();
  const teamId = searchParams.get('teamId') || 'default';
  const [data, setData] = useState<RiskData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);

    apiClient
      .get<RiskData>(`/api/v1/risk/current?teamId=${encodeURIComponent(teamId)}`)
      .then((result) => {
        setData(result);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Failed to load risk data');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [teamId]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">AI Sprint Risk</h1>
          <p className="text-[var(--text-secondary)] mt-1">Loading risk analysis...</p>
        </div>
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">AI Sprint Risk</h1>
          <p className="text-[var(--text-secondary)] mt-1">
            AI-predicted sprint risk with natural language explanations
          </p>
        </div>
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-6 text-center">
          <p className="text-red-600 dark:text-red-400">
            {error || 'No risk data available'}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="mt-3 text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

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
          <RiskGauge score={data.score} label="Sprint Risk" />
          <p className="text-xs text-[var(--text-muted)] mt-2">
            <time dateTime={data.calculatedAt}>
              Last calculated: {new Date(data.calculatedAt).toLocaleString()}
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
            {data.explanation}
          </p>
        </section>
      </div>

      {/* AI Recommendations */}
      {data.recommendations.length > 0 && (
        <section className="bg-[var(--bg-card)] border border-[var(--border-card)] rounded-xl p-6" aria-label="AI recommendations">
          <div className="flex items-center gap-2 mb-3">
            <svg className="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">Recommendations</h2>
          </div>
          <ul className="space-y-2" role="list">
            {data.recommendations.map((rec, i) => (
              <li key={i} className="flex items-start gap-2 text-[var(--text-secondary)]">
                <span className="text-green-500 mt-0.5 shrink-0" aria-hidden="true">&bull;</span>
                <span>{rec}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Factor Breakdown */}
      <section className="bg-[var(--bg-card)] border border-[var(--border-card)] rounded-xl p-6" aria-label="Risk factor breakdown">
        <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Risk Factors</h2>
        <ul className="space-y-4" role="list">
          {data.factors.map((factor) => (
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
