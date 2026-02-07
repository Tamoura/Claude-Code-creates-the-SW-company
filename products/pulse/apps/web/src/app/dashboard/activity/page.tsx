export default function ActivityPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Activity Feed</h1>
        <p className="text-[var(--text-secondary)] mt-1">
          Real-time development activity across your repositories
        </p>
      </div>
      <div className="bg-[var(--bg-card)] border border-[var(--border-card)] rounded-xl p-8 text-center">
        <p className="text-[var(--text-secondary)]">
          Live activity feed will appear here once repositories are connected.
        </p>
        <p className="text-[var(--text-muted)] text-sm mt-2">
          Powered by WebSocket for real-time updates
        </p>
      </div>
    </div>
  );
}
