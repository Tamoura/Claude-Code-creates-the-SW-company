'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../hooks/useAuth';

const settingsSections = [
  {
    title: 'Profile',
    description: 'Update your name, email, and password.',
    href: '/dashboard/settings',
    current: true,
  },
  {
    title: 'Notifications',
    description: 'Configure observation reminders and digest emails.',
    href: '/dashboard/settings/notifications',
    current: false,
  },
  {
    title: 'Subscription',
    description: 'Manage your plan and billing.',
    href: '/dashboard/settings/subscription',
    current: false,
  },
];

export default function SettingsPage() {
  const router = useRouter();
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
        <p className="text-sm text-slate-500 mt-1">
          Manage your account and preferences.
        </p>
      </div>

      {/* Settings Navigation */}
      <div className="space-y-3">
        {settingsSections.map((section) => (
          <Link
            key={section.href}
            href={section.href}
            className={`card block hover:shadow-md transition-shadow ${
              section.current ? 'ring-2 ring-emerald-200' : ''
            }`}
          >
            <h2 className="text-sm font-semibold text-slate-900">
              {section.title}
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              {section.description}
            </p>
          </Link>
        ))}
      </div>

      {/* Profile Information */}
      <div className="card">
        <h2 className="text-lg font-semibold text-slate-900 mb-6">
          Profile Information
        </h2>
        <div className="space-y-4">
          <div>
            <label className="label">Full Name</label>
            <p className="text-sm text-slate-900">{user?.name || 'Not available'}</p>
          </div>
          <div>
            <label className="label">Email</label>
            <p className="text-sm text-slate-900">{user?.email || 'Not available'}</p>
          </div>
          <div>
            <label className="label">Subscription Tier</label>
            <p className="text-sm text-slate-900">Free (Basic)</p>
          </div>
          <p className="text-xs text-slate-400">
            Profile editing will be available in a future update.
          </p>
        </div>
      </div>

      {/* Account Actions */}
      <div className="card">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">
          Account Actions
        </h2>
        <button
          onClick={handleLogout}
          className="btn-secondary border-red-300 text-red-700 hover:bg-red-50 w-full"
        >
          Sign Out
        </button>
      </div>
    </div>
  );
}
