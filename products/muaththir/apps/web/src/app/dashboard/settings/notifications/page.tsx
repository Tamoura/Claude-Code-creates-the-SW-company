export default function NotificationsSettingsPage() {
  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          Notification Preferences
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Configure how and when you receive reminders.
        </p>
      </div>

      <div className="card space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-medium text-slate-900">
              Daily Observation Reminder
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Get a gentle reminder to log an observation each evening.
            </p>
          </div>
          <button
            type="button"
            className="relative inline-flex h-6 w-11 flex-shrink-0 cursor-not-allowed rounded-full border-2 border-transparent bg-slate-200 transition-colors"
            disabled
            aria-label="Toggle daily reminder"
          >
            <span className="translate-x-0 pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition-transform" />
          </button>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-medium text-slate-900">
              Weekly Digest Email
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Receive a weekly summary of your child&apos;s progress.
            </p>
          </div>
          <button
            type="button"
            className="relative inline-flex h-6 w-11 flex-shrink-0 cursor-not-allowed rounded-full border-2 border-transparent bg-slate-200 transition-colors"
            disabled
            aria-label="Toggle weekly digest"
          >
            <span className="translate-x-0 pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition-transform" />
          </button>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-medium text-slate-900">
              Milestone Alerts
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Get notified when new milestones become relevant for your
              child&apos;s age.
            </p>
          </div>
          <button
            type="button"
            className="relative inline-flex h-6 w-11 flex-shrink-0 cursor-not-allowed rounded-full border-2 border-transparent bg-slate-200 transition-colors"
            disabled
            aria-label="Toggle milestone alerts"
          >
            <span className="translate-x-0 pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition-transform" />
          </button>
        </div>

        <p className="text-xs text-slate-400 pt-2 border-t border-slate-100">
          Notification settings will be available once connected to the
          backend.
        </p>
      </div>
    </div>
  );
}
