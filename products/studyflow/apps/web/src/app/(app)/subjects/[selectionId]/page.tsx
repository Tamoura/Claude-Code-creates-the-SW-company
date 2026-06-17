'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import type { Goal, Selection } from '@/lib/types';
import { useQuery } from '@/lib/useQuery';
import { formatDate } from '@/lib/utils';
import { PageHeader } from '@/components/app/PageHeader';
import { GoalForm } from '@/components/app/GoalForm';
import { Button } from '@/components/ui/Button';
import {
  Card,
  EmptyState,
  ErrorState,
  LoadingState,
  ProgressBar,
  StatusBadge,
} from '@/components/ui/feedback';

export default function SelectionDetailPage() {
  const params = useParams<{ selectionId: string }>();
  const selectionId = params.selectionId;

  // Resolve the selection (for its subject name) from the list.
  const selectionsQuery = useQuery(() => api.selections.list());
  const selection: Selection | undefined = selectionsQuery.data?.data.find(
    (s) => s.id === selectionId
  );

  const goalsQuery = useQuery(
    () => api.goals.list({ selectionId }),
    [selectionId]
  );
  const goals = goalsQuery.data?.data ?? [];

  const [showForm, setShowForm] = useState(false);
  const [editGoal, setEditGoal] = useState<Goal | null>(null);

  function refreshGoals() {
    setShowForm(false);
    setEditGoal(null);
    goalsQuery.reload();
    selectionsQuery.reload();
  }

  const loading = selectionsQuery.loading || goalsQuery.loading;

  return (
    <div>
      <div className="mb-4">
        <Link
          href="/subjects"
          className="text-sm font-medium text-brand-700 hover:underline"
        >
          ← Back to my plan
        </Link>
      </div>

      <PageHeader
        title={selection?.subject.name ?? 'Subject'}
        description={
          selection?.subject.code
            ? `${selection.subject.code} · ${selection.goalCount} goal${
                selection.goalCount === 1 ? '' : 's'
              }`
            : 'Set measurable goals for this subject and track them.'
        }
        actions={
          !showForm &&
          !editGoal && (
            <Button onClick={() => setShowForm(true)}>+ New goal</Button>
          )
        }
      />

      {(showForm || editGoal) && (
        <div className="mb-6">
          <GoalForm
            selectionId={selectionId}
            goal={editGoal ?? undefined}
            onSaved={refreshGoals}
            onCancel={() => {
              setShowForm(false);
              setEditGoal(null);
            }}
          />
        </div>
      )}

      {loading && <LoadingState label="Loading goals…" />}
      {goalsQuery.error && !loading && (
        <ErrorState message={goalsQuery.error} onRetry={goalsQuery.reload} />
      )}

      {!loading && !goalsQuery.error && goals.length === 0 && !showForm && (
        <EmptyState
          icon="🎯"
          title="No goals yet"
          message="Create a measurable goal — a target with a due date — to start tracking your progress for this subject."
          action={<Button onClick={() => setShowForm(true)}>Create a goal</Button>}
        />
      )}

      {!loading && goals.length > 0 && (
        <ul className="space-y-3">
          {goals.map((g) => (
            <GoalRow
              key={g.id}
              goal={g}
              onEdit={() => {
                setEditGoal(g);
                setShowForm(false);
              }}
              onChanged={refreshGoals}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function GoalRow({
  goal,
  onEdit,
  onChanged,
}: {
  goal: Goal;
  onEdit: () => void;
  onChanged: () => void;
}) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function remove() {
    if (!window.confirm(`Delete goal “${goal.title}”? This removes its progress too.`))
      return;
    setError(null);
    setDeleting(true);
    try {
      await api.goals.remove(goal.id);
      onChanged();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not delete goal.');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Card as="li">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Link
            href={`/goals/${goal.id}`}
            className="text-base font-semibold text-slate-900 hover:underline"
          >
            {goal.title}
          </Link>
          <p className="mt-0.5 text-xs text-slate-500">
            {goal.metricType} · target {goal.target} · due {formatDate(goal.dueDate)}
          </p>
        </div>
        <StatusBadge status={goal.status} />
      </div>

      <div className="mt-3">
        <ProgressBar value={goal.completionPct} />
      </div>

      <div className="mt-3 flex items-center justify-between">
        <span className="text-xs text-slate-500">🔥 {goal.streak} streak</span>
        <div className="flex gap-2">
          <Link href={`/goals/${goal.id}`}>
            <Button variant="secondary" size="sm">
              Log progress
            </Button>
          </Link>
          <Button variant="ghost" size="sm" onClick={onEdit}>
            Edit
          </Button>
          <Button variant="ghost" size="sm" loading={deleting} onClick={remove}>
            Delete
          </Button>
        </div>
      </div>
      {error && (
        <p role="alert" className="mt-2 text-xs text-red-600">
          {error}
        </p>
      )}
    </Card>
  );
}
