'use client';

import Link from 'next/link';
import { useAuth } from '@/components/auth/AuthProvider';
import { PageHeader } from '@/components/app/PageHeader';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/feedback';

/**
 * Deferred per the PRD site map: a real page skeleton with disabled controls
 * and a clear empty-state message — NOT a "Coming Soon" placeholder.
 */
export default function ProfilePage() {
  const { student } = useAuth();

  return (
    <div>
      <div className="mb-4">
        <Link
          href="/settings"
          className="text-sm font-medium text-brand-700 hover:underline"
        >
          ← Back to settings
        </Link>
      </div>

      <PageHeader
        title="Profile"
        description="Profile management is planned for a later release. The fields below show what you'll be able to edit."
      />

      <Card className="max-w-xl">
        <form
          aria-label="Profile (preview — not yet editable)"
          className="space-y-4"
          onSubmit={(e) => e.preventDefault()}
        >
          <p className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">
            These controls are read-only for now. Editing your profile will be
            available in an upcoming release.
          </p>
          <Input
            label="Display name"
            placeholder="Not set"
            value=""
            disabled
            readOnly
          />
          <Input
            label="Email"
            type="email"
            value={student?.email ?? ''}
            disabled
            readOnly
          />
          <Input
            label="Active term"
            value={student?.activeTerm ?? ''}
            disabled
            readOnly
          />
          <Button type="submit" disabled>
            Save changes
          </Button>
        </form>
      </Card>
    </div>
  );
}
