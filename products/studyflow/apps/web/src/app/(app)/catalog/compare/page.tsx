'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import type { Subject } from '@/lib/types';
import { useQuery } from '@/lib/useQuery';
import { PageHeader } from '@/components/app/PageHeader';
import { AddToPlanButton } from '@/components/app/AddToPlanButton';
import {
  Card,
  ErrorState,
  LoadingState,
  EmptyState,
} from '@/components/ui/feedback';

const ROWS: { key: keyof Subject; label: string }[] = [
  { key: 'code', label: 'Code' },
  { key: 'credits', label: 'Credits' },
  { key: 'workload', label: 'Workload' },
  { key: 'term', label: 'Term' },
  { key: 'prerequisites', label: 'Prerequisites' },
  { key: 'description', label: 'Description' },
];

export default function ComparePage() {
  // Picker: load the catalog so the student can choose 2–4 subjects to compare.
  const { data, loading, error, reload } = useQuery(() =>
    api.subjects.list({ limit: 50 })
  );
  const all = useMemo(() => data?.data ?? [], [data]);

  const [selected, setSelected] = useState<string[]>([]);

  function toggle(id: string) {
    setSelected((prev) =>
      prev.includes(id)
        ? prev.filter((x) => x !== id)
        : prev.length >= 4
          ? prev
          : [...prev, id]
    );
  }

  const chosen = useMemo(
    () => all.filter((s) => selected.includes(s.id)),
    [all, selected]
  );

  return (
    <div>
      <div className="mb-4">
        <Link
          href="/catalog"
          className="text-sm font-medium text-brand-700 hover:underline"
        >
          ← Back to catalog
        </Link>
      </div>

      <PageHeader
        title="Compare subjects"
        description="Pick 2 to 4 subjects to compare their attributes side by side."
      />

      {loading && <LoadingState label="Loading subjects…" />}
      {error && !loading && <ErrorState message={error} onRetry={reload} />}

      {!loading && !error && all.length === 0 && (
        <EmptyState
          icon="📚"
          title="No subjects to compare"
          message="Add some subjects to the catalog first, then come back to compare them."
        />
      )}

      {!loading && !error && all.length > 0 && (
        <div className="space-y-6">
          {/* Picker */}
          <Card>
            <fieldset>
              <legend className="text-sm font-semibold text-slate-900">
                Select subjects ({selected.length}/4)
              </legend>
              <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {all.map((s) => {
                  const checked = selected.includes(s.id);
                  const disabled = !checked && selected.length >= 4;
                  return (
                    <label
                      key={s.id}
                      className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm ${
                        checked
                          ? 'border-brand-400 bg-brand-50'
                          : 'border-slate-200 hover:bg-slate-50'
                      } ${disabled ? 'cursor-not-allowed opacity-50' : ''}`}
                    >
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                        checked={checked}
                        disabled={disabled}
                        onChange={() => toggle(s.id)}
                      />
                      <span className="truncate">{s.name}</span>
                    </label>
                  );
                })}
              </div>
            </fieldset>
          </Card>

          {/* Comparison table */}
          {chosen.length < 2 ? (
            <p className="text-sm text-slate-500">
              Select at least 2 subjects to see the comparison.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
              <table className="w-full min-w-[640px] text-left text-sm">
                <caption className="sr-only">Subject comparison</caption>
                <thead>
                  <tr className="border-b border-slate-200">
                    <th scope="col" className="p-4 font-semibold text-slate-500">
                      Attribute
                    </th>
                    {chosen.map((s) => (
                      <th
                        key={s.id}
                        scope="col"
                        className="p-4 font-semibold text-slate-900"
                      >
                        {s.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {ROWS.map((row) => (
                    <tr key={row.key} className="border-b border-slate-100">
                      <th
                        scope="row"
                        className="p-4 font-medium text-slate-500"
                      >
                        {row.label}
                      </th>
                      {chosen.map((s) => (
                        <td key={s.id} className="p-4 text-slate-700">
                          {formatCell(s[row.key])}
                        </td>
                      ))}
                    </tr>
                  ))}
                  <tr>
                    <th scope="row" className="p-4" />
                    {chosen.map((s) => (
                      <td key={s.id} className="p-4">
                        <AddToPlanButton subjectId={s.id} />
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function formatCell(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  return String(value);
}
