export default function RepoDetailPage({ params }: { params: { id: string } }) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Repository Detail</h1>
        <p className="text-[var(--text-secondary)] mt-1">
          Detailed metrics for repository {params.id}
        </p>
      </div>
      <div className="bg-[var(--bg-card)] border border-[var(--border-card)] rounded-xl p-8 text-center">
        <p className="text-[var(--text-secondary)]">
          Repository metrics, activity timeline, and contributor stats will appear here.
        </p>
      </div>
    </div>
  );
}
