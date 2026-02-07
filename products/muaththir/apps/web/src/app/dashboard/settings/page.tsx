import Link from 'next/link';

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

      {/* Profile Form Placeholder */}
      <div className="card">
        <h2 className="text-lg font-semibold text-slate-900 mb-6">
          Profile Information
        </h2>
        <div className="space-y-4">
          <div>
            <label htmlFor="settings-name" className="label">Full Name</label>
            <input
              id="settings-name"
              type="text"
              className="input-field"
              placeholder="Your name"
              disabled
            />
          </div>
          <div>
            <label htmlFor="settings-email" className="label">Email</label>
            <input
              id="settings-email"
              type="email"
              className="input-field"
              placeholder="you@example.com"
              disabled
            />
          </div>
          <p className="text-xs text-slate-400">
            Profile editing will be available once connected to the backend.
          </p>
        </div>
      </div>
    </div>
  );
}
