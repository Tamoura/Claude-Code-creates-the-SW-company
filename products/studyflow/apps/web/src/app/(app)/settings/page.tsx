'use client';

import Link from 'next/link';
import { exportUrl } from '@/lib/api';
import { useAuth } from '@/components/auth/AuthProvider';
import { PageHeader } from '@/components/app/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/feedback';

export default function SettingsPage() {
  const { student, logout } = useAuth();

  return (
    <div>
      <PageHeader
        title="Settings"
        description="Manage your account and your StudyFlow data."
      />

      <div className="space-y-6">
        <Card>
          <h2 className="text-base font-semibold text-slate-900">Account</h2>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-slate-500">Email</dt>
              <dd className="font-medium text-slate-900">{student?.email ?? '—'}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-slate-500">Active term</dt>
              <dd className="font-medium text-slate-900">
                {student?.activeTerm ?? '—'}
              </dd>
            </div>
          </dl>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href="/settings/profile">
              <Button variant="secondary" size="sm">
                Profile (coming in a later release)
              </Button>
            </Link>
            <Button variant="ghost" size="sm" onClick={() => void logout()}>
              Sign out
            </Button>
          </div>
        </Card>

        <Card>
          <h2 className="text-base font-semibold text-slate-900">
            Export your data
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Download all of your subjects, selections, goals, and progress as a
            JSON file. You own your data.
          </p>
          <div className="mt-4">
            {/* A direct link so the browser downloads via the session cookie. */}
            <a href={exportUrl()} download="studyflow-export.json">
              <Button>Download JSON export</Button>
            </a>
          </div>
        </Card>
      </div>
    </div>
  );
}
