'use client';

import AuthGuard from '@/components/AuthGuard';
import Layout from '@/components/Layout';
import { useAuth } from '@/lib/auth-context';

function SettingsContent() {
  const { user } = useAuth();

  return (
    <div className="p-8 max-w-2xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Settings</h1>
        <p className="text-sm text-gray-500">Manage your account and preferences</p>
      </div>

      <div className="space-y-6">
        {/* Profile Section */}
        <section className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Profile</h2>
          <dl className="space-y-4">
            <div className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
              <dt className="text-sm font-medium text-gray-500">Full name</dt>
              <dd className="text-sm text-gray-900">{user?.fullName ?? '—'}</dd>
            </div>
            <div className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
              <dt className="text-sm font-medium text-gray-500">Email address</dt>
              <dd className="text-sm text-gray-900">{user?.email ?? '—'}</dd>
            </div>
            <div className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
              <dt className="text-sm font-medium text-gray-500">Role</dt>
              <dd className="text-sm text-gray-900 capitalize">{user?.role ?? '—'}</dd>
            </div>
            <div className="flex items-center justify-between py-3">
              <dt className="text-sm font-medium text-gray-500">Member since</dt>
              <dd className="text-sm text-gray-900">
                {user?.createdAt
                  ? new Date(user.createdAt).toLocaleDateString('en-US', {
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric',
                    })
                  : '—'}
              </dd>
            </div>
          </dl>
        </section>

        {/* API Info */}
        <section className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">API</h2>
          <p className="text-sm text-gray-500 mb-4">
            The ArchForge API is available at{' '}
            <code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded font-mono">
              {process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5012'}/api/v1
            </code>
          </p>
          <div className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-50 border border-amber-200">
            <svg className="w-4 h-4 text-amber-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
            </svg>
            <p className="text-xs text-amber-700">API key management coming in a future release.</p>
          </div>
        </section>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <AuthGuard>
      <Layout>
        <SettingsContent />
      </Layout>
    </AuthGuard>
  );
}
