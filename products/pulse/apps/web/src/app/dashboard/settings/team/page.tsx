export default function TeamSettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Team Management</h1>
        <p className="text-[var(--text-secondary)] mt-1">
          Invite members, manage roles, and configure team settings
        </p>
      </div>
      <div className="bg-[var(--bg-card)] border border-[var(--border-card)] rounded-xl p-8 text-center">
        <p className="text-[var(--text-secondary)]">
          Team member management, role assignment, and invitation controls will appear here.
        </p>
      </div>
    </div>
  );
}
