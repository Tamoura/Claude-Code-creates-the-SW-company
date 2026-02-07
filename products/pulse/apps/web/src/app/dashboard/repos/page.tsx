export default function ReposPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Repositories</h1>
          <p className="text-[var(--text-secondary)] mt-1">
            Connected GitHub repositories
          </p>
        </div>
        <button className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium">
          Connect Repository
        </button>
      </div>
      <div className="bg-[var(--bg-card)] border border-[var(--border-card)] rounded-xl p-8 text-center">
        <p className="text-[var(--text-secondary)]">
          No repositories connected yet. Click &quot;Connect Repository&quot; to get started.
        </p>
      </div>
    </div>
  );
}
