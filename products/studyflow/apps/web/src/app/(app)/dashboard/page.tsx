'use client';

import Link from 'next/link';
import { api } from '@/lib/api';
import type { Dashboard } from '@/lib/types';
import { useQuery } from '@/lib/useQuery';
import { formatDate, daysUntil } from '@/lib/utils';
import { PageHeader } from '@/components/app/PageHeader';
import { ReminderList } from '@/components/app/ReminderList';
import {
  Card,
  EmptyState,
  ErrorState,
  LoadingState,
  ProgressBar,
  StatusBadge,
} from '@/components/ui/feedback';
import { Button } from '@/components/ui/Button';

export default function DashboardPage() {
  const { data, loading, error, reload } = useQuery(() => api.dashboard.get());

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Your subjects, goals, and progress — all in one place."
        actions={
          <Link href="/catalog">
            <Button>Browse catalog</Button>
          </Link>
        }
      />

      {loading && <LoadingState label="Loading your dashboard…" />}
      {error && !loading && (
        <ErrorState message={error} onRetry={reload} />
      )}

      {data && !loading && (
        <DashboardContent data={data} />
      )}
    </div>
  );
}

function DashboardContent({ data }: { data: Dashboard }) {
  const { selections, activeGoals, aggregate, reminders } = data;
  const isEmpty = selections.length === 0 && activeGoals.length === 0;

  if (isEmpty) {
    return (
      <EmptyState
        icon="🚀"
        title="Let's set up your term"
        message="Start by browsing the catalog and adding subjects to your plan. Then set measurable goals and track your progress."
        action={
          <Link href="/catalog">
            <Button>Browse the catalog</Button>
          </Link>
        }
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Aggregate stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Total goals" value={aggregate.totalGoals} />
        <StatCard label="Completed" value={aggregate.completedGoals} />
        <StatCard
          label="Overall completion"
          value={`${Math.round(aggregate.overallCompletionPct)}%`}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Active goals */}
        <section aria-labelledby="goals-heading" className="lg:col-span-2">
          <h2 id="goals-heading" className="mb-3 text-lg font-semibold text-slate-900">
            Active goals
          </h2>
          {activeGoals.length === 0 ? (
            <Card>
              <p className="text-sm text-slate-600">
                No active goals yet.{' '}
                <Link href="/subjects" className="font-semibold text-brand-700 hover:underline">
                  Pick a subject and add a goal.
                </Link>
              </p>
            </Card>
          ) : (
            <ul className="space-y-3">
              {activeGoals.map((g) => {
                const dd = daysUntil(g.dueDate);
                return (
                  <Card as="li" key={g.id}>
                    <div className="flex items-start justify-between gap-3">
                      <Link
                        href={`/goals/${g.id}`}
                        className="text-sm font-semibold text-slate-900 hover:underline"
                      >
                        {g.title}
                      </Link>
                      <StatusBadge status={g.status} />
                    </div>
                    <div className="mt-3">
                      <ProgressBar value={g.completionPct} />
                    </div>
                    <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
                      <span>🔥 {g.streak} streak</span>
                      <span>
                        Due {formatDate(g.dueDate)}
                        {dd !== null && dd >= 0 ? ` · ${dd}d left` : ''}
                      </span>
                    </div>
                  </Card>
                );
              })}
            </ul>
          )}
        </section>

        {/* Sidebar: subjects + reminders */}
        <div className="space-y-6">
          <section aria-labelledby="subjects-heading">
            <h2 id="subjects-heading" className="mb-3 text-lg font-semibold text-slate-900">
              My subjects
            </h2>
            <Card>
              {selections.length === 0 ? (
                <p className="text-sm text-slate-600">
                  No subjects selected yet.
                </p>
              ) : (
                <ul className="space-y-3">
                  {selections.map((s) => (
                    <li key={s.id} className="text-sm">
                      <Link
                        href={`/subjects/${s.id}`}
                        className="font-semibold text-slate-900 hover:underline"
                      >
                        {s.subject.name}
                      </Link>
                      <div className="mt-1">
                        <ProgressBar
                          value={s.avgCompletionPct}
                          label={`${s.goalCount} goal${s.goalCount === 1 ? '' : 's'}`}
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </section>

          <section aria-labelledby="reminders-heading">
            <h2 id="reminders-heading" className="mb-3 text-lg font-semibold text-slate-900">
              Reminders
            </h2>
            <Card>
              <ReminderList reminders={reminders} />
            </Card>
          </section>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <Card>
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className="mt-1 text-3xl font-bold tracking-tight text-slate-900">
        {value}
      </p>
    </Card>
  );
}
