export default function RiskHistoryPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Risk History</h1>
        <p className="text-[var(--text-secondary)] mt-1">
          Historical risk scores with event correlation
        </p>
      </div>
      <div className="bg-[var(--bg-card)] border border-[var(--border-card)] rounded-xl p-8 text-center">
        <p className="text-[var(--text-secondary)]">
          Risk score history line chart and event correlation will appear here.
        </p>
      </div>
    </div>
  );
}
