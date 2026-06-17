'use client';

import { useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import type { Subject } from '@/lib/types';
import { useQuery } from '@/lib/useQuery';
import { PageHeader } from '@/components/app/PageHeader';
import { AddToPlanButton } from '@/components/app/AddToPlanButton';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import {
  Badge,
  Card,
  EmptyState,
  ErrorState,
  LoadingState,
} from '@/components/ui/feedback';

export default function CatalogPage() {
  const [searchInput, setSearchInput] = useState('');
  const [query, setQuery] = useState('');

  const { data, loading, error, reload } = useQuery(
    () => api.subjects.list({ q: query || undefined, limit: 50 }),
    [query]
  );

  const subjects = data?.data ?? [];

  return (
    <div>
      <PageHeader
        title="Subject catalog"
        description="Browse and search subjects, then add them to your term plan."
        actions={
          <Link href="/subjects">
            <Button variant="secondary">My plan</Button>
          </Link>
        }
      />

      <form
        role="search"
        className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end"
        onSubmit={(e) => {
          e.preventDefault();
          setQuery(searchInput.trim());
        }}
      >
        <div className="flex-1">
          <Input
            label="Search subjects"
            type="search"
            placeholder="Search by name or code…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <Button type="submit">Search</Button>
          {query && (
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setSearchInput('');
                setQuery('');
              }}
            >
              Clear
            </Button>
          )}
        </div>
      </form>

      {loading && <LoadingState label="Loading catalog…" />}
      {error && !loading && <ErrorState message={error} onRetry={reload} />}

      {!loading && !error && subjects.length === 0 && (
        <EmptyState
          icon="🔍"
          title={query ? 'No subjects found' : 'The catalog is empty'}
          message={
            query
              ? `No subjects match “${query}”. Try a different search, or add your own subject.`
              : 'No subjects are available yet. You can add your own subject from My Plan.'
          }
          action={
            <Link href="/subjects">
              <Button>Add a custom subject</Button>
            </Link>
          }
        />
      )}

      {!loading && !error && subjects.length > 0 && (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {subjects.map((s) => (
            <SubjectCard key={s.id} subject={s} />
          ))}
        </ul>
      )}
    </div>
  );
}

function SubjectCard({ subject }: { subject: Subject }) {
  return (
    <Card as="li" className="flex flex-col">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          {subject.code && (
            <span className="text-xs font-semibold uppercase tracking-wide text-brand-700">
              {subject.code}
            </span>
          )}
          <h2 className="text-base font-semibold text-slate-900">
            <Link href={`/catalog/${subject.id}`} className="hover:underline">
              {subject.name}
            </Link>
          </h2>
        </div>
        {subject.isSeed ? (
          <Badge tone="neutral">Catalog</Badge>
        ) : (
          <Badge tone="brand">Custom</Badge>
        )}
      </div>

      <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-500">
        {subject.credits != null && <span>{subject.credits} credits</span>}
        {subject.workload && <span>· {subject.workload}</span>}
        {subject.term && <span>· {subject.term}</span>}
      </div>

      {subject.description && (
        <p className="mt-2 line-clamp-3 text-sm text-slate-600">
          {subject.description}
        </p>
      )}

      <div className="mt-4 flex items-center justify-between gap-2 pt-2">
        <Link
          href={`/catalog/${subject.id}`}
          className="text-sm font-semibold text-brand-700 hover:underline"
        >
          View details
        </Link>
        <AddToPlanButton subjectId={subject.id} />
      </div>
    </Card>
  );
}
