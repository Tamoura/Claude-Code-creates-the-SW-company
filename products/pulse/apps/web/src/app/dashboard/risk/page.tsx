export default function RiskPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">AI Sprint Risk</h1>
        <p className="text-[var(--text-secondary)] mt-1">
          AI-predicted sprint risk with natural language explanations
        </p>
      </div>
      <div className="bg-[var(--bg-card)] border border-[var(--border-card)] rounded-xl p-8 text-center">
        <p className="text-[var(--text-secondary)]">
          Sprint risk gauge, factor breakdown, and recommendations will appear here.
        </p>
        <p className="text-[var(--text-muted)] text-sm mt-2">
          Weighted composite of 7 risk factors updated every 4 hours
        </p>
      </div>
    </div>
  );
}
