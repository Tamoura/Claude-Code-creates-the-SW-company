'use client';

import { useAuth } from '../../../hooks/useAuth';

export default function SettingsPage() {
  const { user } = useAuth();

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Settings</h1>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 max-w-lg">
        <h3 className="font-semibold mb-4">Account</h3>
        <dl className="space-y-3 text-sm">
          <div className="flex justify-between">
            <dt className="text-gray-500">Email</dt>
            <dd className="font-medium">{user?.email}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-gray-500">Role</dt>
            <dd className="font-medium">{user?.role}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-gray-500">User ID</dt>
            <dd className="font-mono text-xs">{user?.id}</dd>
          </div>
        </dl>
      </div>

      <div className="mt-6 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 max-w-lg">
        <h3 className="font-semibold mb-2">Billing</h3>
        <p className="text-sm text-gray-500">Subscription billing coming in Phase 2.</p>
      </div>

      <div className="mt-6 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 max-w-lg">
        <h3 className="font-semibold mb-2">Team Management</h3>
        <p className="text-sm text-gray-500">Team management coming in Phase 2.</p>
      </div>
    </div>
  );
}
