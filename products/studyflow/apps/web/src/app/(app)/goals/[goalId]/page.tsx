'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import { useQuery } from '@/lib/useQuery';
import { formatDate, daysUntil } from '@/lib/utils';
import { PageHeader } from '@/components/app/PageHeader';
import { ProgressForm } from '@/components/app/ProgressForm';
import { Button } from '@/components/ui/Button';
import {
  Card,
  ErrorState,
  LoadingState,
  ProgressBar,
  StatusBadge,
} from '@/components/ui/feedback';

export default function GoalDetailPage() {
  const params = useParams<{ goalId: string }>();
  const goalId = params.goalId;
  const router = useRouter();

  const { data: goal, loading, error, reload } = useQuery(
    () => api.goals.get(goalId),
    [goalId]
  );

  const [actionError, setActionError] = useState<string | null>(null);

  async function deleteEntry(id: string) {
    if (!window.confirm('Delete this progress entry?')) return;
    setActionError(null);
    try {
      await api.progress.remove(id);
      reload();
    } catch (err) {
      setActionError(
        err instanceof ApiError ? err.message : 'Could not delete entry.'
      );
    }
  }

  async function deleteGoal() {
    if (!goal) return;
    if (!window.confirm(`Delete goal “${goal.title}”?`)) return;
    try {
      await api.goals.remove(goal.id);
      router.push(`/subjects/${goal.selectionId}`);
    } catch (err) {
      setActionError(
        err instanceof ApiError ? err.message : 'Could not delete goal.'
      );
    }
  }

  return (
    <div>
      <div className="mb-4">
        <Link
          href={goal ? `/subjects/${goal.selectionId}` : '/subjects'}
          className="text-sm font-medium text-brand-700 hover:underline"
        >
          ← Back to subject
        </Link>
      </div>

      {loading && <LoadingState label="Loading goal…" />}
      {error && !loading && <ErrorState message={error} onRetry={reload} />}

      {goal && !loading && (
        <div>
          <PageHeader
            title={goal.title}
            description={`${goal.metricType} · target ${goal.target} · ${goal.cadence}`}
            actions={
              <Button variant="danger" size="sm" onClick={deleteGoal}>
                Delete goal
              </Button>
            }
          />

          {actionError && (
            <p role="alert" className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {actionError}
            </p>
          )}

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* Status + log form */}
            <div className="space-y-6 lg:col-span-2">
              <Card>
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-slate-900">Status</h2>
                  <StatusBadge status={goal.status} />
                </div>
                <div className="mt-4">
                  <ProgressBar value={goal.completionPct} />
                </div>
                <div className="mt-4 grid grid-cols-3 gap-3 text-center text-sm">
                  <Stat label="Streak" value={`🔥 ${goal.streak}`} />
                  <Stat
                    label="Due"
                    value={formatDate(goal.dueDate)}
                    sub={dueLabel(goal.dueDate)}
                  />
                  <Stat
                    label="At risk"
                    value={goal.atRisk ? 'Yes' : 'No'}
                  />
                </div>
              </Card>

              <Card>
                <h2 className="text-sm font-semibold text-slate-900">
                  Log progress
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  Record what you did. Future dates aren&apos;t allowed.
                </p>
                <div className="mt-4">
                  <ProgressForm
                    goalId={goal.id}
                    metricType={goal.metricType}
                    onLogged={reload}
                  />
                </div>
              </Card>
            </div>

            {/* Entries */}
            <section aria-labelledby="entries-heading">
              <h2
                id="entries-heading"
                className="mb-3 text-sm font-semibold text-slate-900"
              >
                Progress history
              </h2>
              <Card>
                {goal.progressEntries.length === 0 ? (
                  <p className="text-sm text-slate-500">
                    No entries yet. Log your first one to get started.
                  </p>
                ) : (
                  <ul className="divide-y divide-slate-100">
                    {goal.progressEntries.map((entry) => (
                      <li
                        key={entry.id}
                        className="flex items-start justify-between gap-3 py-3 first:pt-0 last:pb-0"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-slate-900">
                            {entry.value}
                          </p>
                          <p className="text-xs text-slate-500">
                            {formatDate(entry.entryDate)}
                          </p>
                          {entry.note && (
                            <p className="mt-1 text-xs text-slate-600">
                              {entry.note}
                            </p>
                          )}
                        </div>
                        <button
                          onClick={() => deleteEntry(entry.id)}
                          className="rounded-lg px-2 py-1 text-xs font-medium text-slate-500 hover:bg-slate-100 hover:text-red-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500"
                          aria-label={`Delete entry from ${formatDate(entry.entryDate)}`}
                        >
                          Delete
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            </section>
          </div>
        </div>
      )}
    </div>
  );
}

function dueLabel(iso: string): string | undefined {
  const d = daysUntil(iso);
  if (d === null) return undefined;
  if (d < 0) return `${Math.abs(d)}d overdue`;
  if (d === 0) return 'today';
  return `${d}d left`;
}

function Stat({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="rounded-xl bg-slate-50 px-2 py-3">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-0.5 text-sm font-semibold text-slate-900">{value}</p>
      {sub && <p className="text-[11px] text-slate-400">{sub}</p>}
    </div>
  );
}
