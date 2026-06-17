'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api';
import { useQuery } from '@/lib/useQuery';
import { PageHeader } from '@/components/app/PageHeader';
import { AddToPlanButton } from '@/components/app/AddToPlanButton';
import { Button } from '@/components/ui/Button';
import {
  Badge,
  Card,
  ErrorState,
  LoadingState,
} from '@/components/ui/feedback';

export default function SubjectDetailPage() {
  const params = useParams<{ subjectId: string }>();
  const subjectId = params.subjectId;

  const { data: subject, loading, error, reload } = useQuery(
    () => api.subjects.get(subjectId),
    [subjectId]
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

      {loading && <LoadingState label="Loading subject…" />}
      {error && !loading && <ErrorState message={error} onRetry={reload} />}

      {subject && !loading && (
        <div>
          <PageHeader
            title={subject.name}
            description={subject.code ? `Subject code: ${subject.code}` : undefined}
            actions={<AddToPlanButton subjectId={subject.id} size="md" />}
          />

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <h2 className="text-sm font-semibold text-slate-900">About</h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                {subject.description || 'No description provided.'}
              </p>

              {subject.prerequisites && (
                <div className="mt-5">
                  <h3 className="text-sm font-semibold text-slate-900">
                    Prerequisites
                  </h3>
                  <p className="mt-1 text-sm text-slate-600">
                    {subject.prerequisites}
                  </p>
                </div>
              )}
            </Card>

            <Card>
              <h2 className="text-sm font-semibold text-slate-900">Details</h2>
              <dl className="mt-3 space-y-3 text-sm">
                <Detail label="Type">
                  {subject.isSeed ? (
                    <Badge tone="neutral">Catalog subject</Badge>
                  ) : (
                    <Badge tone="brand">Custom subject</Badge>
                  )}
                </Detail>
                {subject.credits != null && (
                  <Detail label="Credits">{subject.credits}</Detail>
                )}
                {subject.workload && (
                  <Detail label="Workload">{subject.workload}</Detail>
                )}
                {subject.term && <Detail label="Term">{subject.term}</Detail>}
              </dl>

              <div className="mt-5 border-t border-slate-100 pt-4">
                <Link href="/catalog/compare" className="block">
                  <Button variant="secondary" size="sm" className="w-full">
                    Compare subjects
                  </Button>
                </Link>
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}

function Detail({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-slate-500">{label}</dt>
      <dd className="font-medium text-slate-900">{children}</dd>
    </div>
  );
}
