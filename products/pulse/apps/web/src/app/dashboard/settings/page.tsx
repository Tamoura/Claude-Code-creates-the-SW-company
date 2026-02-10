export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Settings</h1>
        <p className="text-[var(--text-secondary)] mt-1">
          Account settings and GitHub connection
        </p>
      </div>

      {/* Profile Section */}
      <section className="bg-[var(--bg-card)] border border-[var(--border-card)] rounded-xl p-6" aria-label="Profile information">
        <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Profile</h2>
        <dl className="space-y-4">
          <div>
            <dt className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
              Display Name
            </dt>
            <dd className="text-[var(--text-primary)] bg-[var(--bg-page)] border border-[var(--border-card)] rounded-lg px-3 py-2">
              Alex Engineer
            </dd>
          </div>
          <div>
            <dt className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
              Email
            </dt>
            <dd className="text-[var(--text-primary)] bg-[var(--bg-page)] border border-[var(--border-card)] rounded-lg px-3 py-2">
              alex@example.com
            </dd>
          </div>
        </dl>
      </section>

      {/* GitHub Connection */}
      <section className="bg-[var(--bg-card)] border border-[var(--border-card)] rounded-xl p-6" aria-label="GitHub connection status">
        <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">
          GitHub Connection
        </h2>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center" aria-hidden="true">
              <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-[var(--text-primary)]">@alex-eng</span>
                <span className="text-xs font-medium text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30 px-2 py-0.5 rounded-full" role="status">
                  Connected
                </span>
              </div>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                3 repositories connected
              </p>
            </div>
          </div>
          <button
            className="text-red-600 hover:text-red-500 text-sm font-medium transition-colors hover:underline"
            aria-label="Disconnect GitHub account @alex-eng"
          >
            Disconnect
          </button>
        </div>
      </section>

      {/* Quick Navigation */}
      <nav aria-label="Settings navigation" className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <a
          href="/dashboard/settings/notifications"
          className="bg-[var(--bg-card)] border border-[var(--border-card)] rounded-xl p-6 hover:border-indigo-500 transition-colors group"
          aria-label="Notification settings - manage notification preferences"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center" aria-hidden="true">
              <svg className="w-5 h-5 text-indigo-600 dark:text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
              </svg>
            </div>
            <div>
              <span className="text-sm font-medium text-[var(--text-primary)] group-hover:text-[var(--accent-indigo)] transition-colors">
                Notifications
              </span>
              <p className="text-xs text-[var(--text-muted)]">
                Manage notification preferences
              </p>
            </div>
          </div>
        </a>
        <a
          href="/dashboard/settings/team"
          className="bg-[var(--bg-card)] border border-[var(--border-card)] rounded-xl p-6 hover:border-indigo-500 transition-colors group"
          aria-label="Team management - invite members and manage roles"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center" aria-hidden="true">
              <svg className="w-5 h-5 text-purple-600 dark:text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z" />
              </svg>
            </div>
            <div>
              <span className="text-sm font-medium text-[var(--text-primary)] group-hover:text-[var(--accent-indigo)] transition-colors">
                Team Management
              </span>
              <p className="text-xs text-[var(--text-muted)]">
                Invite members and manage roles
              </p>
            </div>
          </div>
        </a>
      </nav>
    </div>
  );
}
