export default function QualityPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Code Quality</h1>
        <p className="text-[var(--text-secondary)] mt-1">
          Test coverage trends, PR size distribution, and review comment patterns
        </p>
      </div>
      <div className="bg-[var(--bg-card)] border border-[var(--border-card)] rounded-xl p-8 text-center">
        <p className="text-[var(--text-secondary)]">
          Quality trend charts will render here with data from connected repositories.
        </p>
        <p className="text-[var(--text-muted)] text-sm mt-2">
          Includes coverage trends, PR size analysis, and review patterns
        </p>
      </div>
    </div>
  );
}
