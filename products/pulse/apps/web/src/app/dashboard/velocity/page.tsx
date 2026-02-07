export default function VelocityPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Team Velocity</h1>
        <p className="text-[var(--text-secondary)] mt-1">
          PR merge rates, cycle time trends, and review time metrics
        </p>
      </div>
      <div className="bg-[var(--bg-card)] border border-[var(--border-card)] rounded-xl p-8 text-center">
        <p className="text-[var(--text-secondary)]">
          Velocity charts will render here with data from connected repositories.
        </p>
        <p className="text-[var(--text-muted)] text-sm mt-2">
          Includes PRs merged per week, cycle time, and review time
        </p>
      </div>
    </div>
  );
}
