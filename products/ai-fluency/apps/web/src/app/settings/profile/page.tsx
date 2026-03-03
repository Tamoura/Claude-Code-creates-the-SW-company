'use client';

import { Sidebar } from '@/components/layout/Sidebar';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { t } from '@/lib/i18n';

export default function SettingsProfilePage() {
  return (
    <div className="flex min-h-[calc(100vh-64px)]">
      <Sidebar />
      <div className="flex-1 px-6 py-8">
        <div className="mx-auto max-w-2xl">
          <h1 className="mb-8 text-2xl font-bold text-gray-900">
            {t('settings.profile.title')}
          </h1>

          <Card padding="lg" className="mb-6">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">
              Personal Information
            </h2>
            <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
              <Input
                id="settings-name"
                label="Full Name"
                type="text"
                autoComplete="name"
                placeholder="Your full name"
                defaultValue=""
                disabled
              />
              <Input
                id="settings-email"
                label="Email Address"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                defaultValue=""
                disabled
              />
              <div>
                <label
                  htmlFor="settings-role"
                  className="mb-1 block text-sm font-medium text-gray-700"
                >
                  Job Role
                </label>
                <input
                  id="settings-role"
                  type="text"
                  placeholder="e.g. Software Engineer"
                  disabled
                  className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-400 bg-gray-50 cursor-not-allowed"
                />
              </div>
              <p className="text-xs text-gray-400">
                Profile editing will be available after email verification.
              </p>
              <Button type="submit" disabled>
                {t('common.save')} Changes
              </Button>
            </form>
          </Card>

          <Card padding="lg">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">
              Change Password
            </h2>
            <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
              <Input
                id="current-password"
                label="Current Password"
                type="password"
                autoComplete="current-password"
                placeholder="Enter current password"
                disabled
              />
              <Input
                id="new-password"
                label="New Password"
                type="password"
                autoComplete="new-password"
                placeholder="Enter new password"
                disabled
              />
              <Input
                id="confirm-password"
                label="Confirm New Password"
                type="password"
                autoComplete="new-password"
                placeholder="Confirm new password"
                disabled
              />
              <Button type="submit" disabled>
                Update Password
              </Button>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
}
