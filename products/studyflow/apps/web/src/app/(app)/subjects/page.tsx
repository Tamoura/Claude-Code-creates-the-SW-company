'use client';

import { useState } from 'react';
import Link from 'next/link';
import { api, ApiError } from '@/lib/api';
import type { Selection } from '@/lib/types';
import { useQuery } from '@/lib/useQuery';
import { PageHeader } from '@/components/app/PageHeader';
import { CustomSubjectForm } from '@/components/app/CustomSubjectForm';
import { Button } from '@/components/ui/Button';
import {
  Badge,
  Card,
  EmptyState,
  ErrorState,
  LoadingState,
} from '@/components/ui/feedback';

export default function MyPlanPage() {
  const { data, loading, error, reload } = useQuery(() =>
    api.selections.list()
  );
  const selections = data?.data ?? [];

  return (
    <div>
      <PageHeader
        title="My plan"
        description="The subjects you've chosen for this term. Add goals to each, or remove subjects you no longer need."
        actions={
          <Link href="/catalog">
            <Button>Browse catalog</Button>
          </Link>
        }
      />

      <div className="mb-6">
        <CustomSubjectForm onAdded={reload} />
      </div>

      {loading && <LoadingState label="Loading your plan…" />}
      {error && !loading && <ErrorState message={error} onRetry={reload} />}

      {!loading && !error && selections.length === 0 && (
        <EmptyState
          icon="🎯"
          title="No subjects in your plan yet"
          message="Browse the catalog to add subjects, or add a custom subject above. Then set goals to start tracking."
          action={
            <Link href="/catalog">
              <Button>Browse the catalog</Button>
            </Link>
          }
        />
      )}

      {!loading && !error && selections.length > 0 && (
        <ul className="space-y-4">
          {selections.map((sel) => (
            <SelectionRow key={sel.id} selection={sel} onChanged={reload} />
          ))}
        </ul>
      )}
    </div>
  );
}

function SelectionRow({
  selection,
  onChanged,
}: {
  selection: Selection;
  onChanged: () => void;
}) {
  const [removing, setRemoving] = useState(false);
  const [blockMessage, setBlockMessage] = useState<string | null>(null);

  async function remove() {
    setBlockMessage(null);
    setRemoving(true);
    try {
      await api.selections.remove(selection.id);
      onChanged();
    } catch (err) {
      if (err instanceof ApiError && err.isConflict) {
        // C-7: removal blocked because goals exist.
        const goals = (err.problem as { dependentGoals?: { title: string }[] })
          ?.dependentGoals;
        const titles = goals?.map((g) => g.title).join(', ');
        setBlockMessage(
          titles
            ? `Delete its goals first: ${titles}.`
            : err.detail ||
                'This subject has goals. Delete its goals before removing it.'
        );
      } else {
        setBlockMessage(
          err instanceof ApiError ? err.message : 'Could not remove subject.'
        );
      }
    } finally {
      setRemoving(false);
    }
  }

  return (
    <Card as="li">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold text-slate-900">
              {selection.subject.name}
            </h2>
            {selection.subject.code && (
              <Badge tone="neutral">{selection.subject.code}</Badge>
            )}
          </div>
          <p className="mt-1 text-xs text-slate-500">
            {selection.goalCount} goal{selection.goalCount === 1 ? '' : 's'}
            {selection.subject.credits != null &&
              ` · ${selection.subject.credits} credits`}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`/subjects/${selection.id}`}>
            <Button variant="secondary" size="sm">
              View &amp; set goals
            </Button>
          </Link>
          <Button
            variant="danger"
            size="sm"
            loading={removing}
            onClick={remove}
          >
            Remove
          </Button>
        </div>
      </div>
      {blockMessage && (
        <p role="alert" className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
          {blockMessage}
        </p>
      )}
    </Card>
  );
}
