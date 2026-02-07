export default function NotificationSettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Notification Preferences</h1>
        <p className="text-[var(--text-secondary)] mt-1">
          Configure notification categories and quiet hours
        </p>
      </div>
      <div className="bg-[var(--bg-card)] border border-[var(--border-card)] rounded-xl p-8 text-center">
        <p className="text-[var(--text-secondary)]">
          Notification category toggles and quiet hours configuration will appear here.
        </p>
      </div>
    </div>
  );
}
