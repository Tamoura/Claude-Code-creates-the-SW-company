export default function TeamMemberPage({ params }: { params: { id: string } }) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Team Member</h1>
        <p className="text-[var(--text-secondary)] mt-1">
          Individual metrics for member {params.id}
        </p>
      </div>
      <div className="bg-[var(--bg-card)] border border-[var(--border-card)] rounded-xl p-8 text-center">
        <p className="text-[var(--text-secondary)]">
          Individual velocity, review activity, and contribution patterns will appear here.
        </p>
      </div>
    </div>
  );
}
