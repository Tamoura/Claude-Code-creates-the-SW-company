export default function OverviewPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Cross-Team Overview</h1>
        <p className="text-[var(--text-secondary)] mt-1">
          VP-level view of all teams with risk cards and velocity summaries
        </p>
      </div>
      <div className="bg-[var(--bg-card)] border border-[var(--border-card)] rounded-xl p-8 text-center">
        <p className="text-[var(--text-secondary)]">
          Cross-team risk comparison, velocity rankings, and organization-wide health metrics will appear here.
        </p>
      </div>
    </div>
  );
}
