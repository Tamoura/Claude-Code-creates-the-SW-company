const mockTeams = [
  {
    id: 'team-1',
    name: 'Frontend Squad',
    memberCount: 5,
    recentPRs: 12,
    avgCycleTime: '16h',
    coverage: '89.1%',
  },
  {
    id: 'team-2',
    name: 'Backend Core',
    memberCount: 4,
    recentPRs: 8,
    avgCycleTime: '22h',
    coverage: '91.3%',
  },
  {
    id: 'team-3',
    name: 'Platform Infra',
    memberCount: 3,
    recentPRs: 5,
    avgCycleTime: '12h',
    coverage: '85.7%',
  },
];

export default function TeamPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Teams</h1>
        <p className="text-[var(--text-secondary)] mt-1">
          Teams you belong to and their activity
        </p>
      </div>

      {/* Team Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {mockTeams.map((team) => (
          <a
            key={team.id}
            href={`/dashboard/team/${team.id}`}
            data-testid="team-link"
            className="block"
          >
            <div
              data-testid="team-card"
              className="bg-[var(--bg-card)] border border-[var(--border-card)] rounded-xl p-6 hover:border-indigo-500 transition-colors"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-[var(--text-primary)]">
                  {team.name}
                </h3>
                <span className="text-xs text-[var(--text-muted)] bg-[var(--bg-page)] px-2 py-1 rounded-full">
                  {team.memberCount} members
                </span>
              </div>
              <div className="space-y-2" data-testid="team-activity">
                <div className="flex justify-between text-sm">
                  <span className="text-[var(--text-secondary)]">PRs this week</span>
                  <span className="font-medium text-[var(--text-primary)]">{team.recentPRs}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[var(--text-secondary)]">Avg cycle time</span>
                  <span className="font-medium text-[var(--text-primary)]">{team.avgCycleTime}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[var(--text-secondary)]">Test coverage</span>
                  <span className="font-medium text-[var(--text-primary)]">{team.coverage}</span>
                </div>
              </div>
            </div>
          </a>
        ))}
      </div>

      {/* Create Team */}
      <div className="bg-[var(--bg-card)] border border-[var(--border-card)] rounded-xl p-6">
        <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">
          Create Team
        </h2>
        <div className="flex items-center gap-3">
          <input
            type="text"
            placeholder="Team name"
            className="flex-1 bg-[var(--bg-page)] border border-[var(--border-card)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)]"
          />
          <button className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium">
            Create
          </button>
        </div>
      </div>
    </div>
  );
}
