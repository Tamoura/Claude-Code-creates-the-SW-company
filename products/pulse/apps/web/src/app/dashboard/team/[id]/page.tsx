interface TeamDetail {
  id: string;
  name: string;
  memberCount: number;
  recentPRs: number;
  avgCycleTime: string;
  members: Array<{
    id: string;
    name: string;
    prs: number;
    reviews: number;
    commits: number;
  }>;
}

const teamsData: Record<string, TeamDetail> = {
  'team-1': {
    id: 'team-1',
    name: 'Frontend Squad',
    memberCount: 5,
    recentPRs: 12,
    avgCycleTime: '16h',
    members: [
      { id: 'm1', name: 'Alex Engineer', prs: 4, reviews: 6, commits: 18 },
      { id: 'm2', name: 'Priya Dev', prs: 3, reviews: 5, commits: 14 },
      { id: 'm3', name: 'Sam QA', prs: 2, reviews: 8, commits: 9 },
      { id: 'm4', name: 'Jordan Lead', prs: 2, reviews: 10, commits: 7 },
      { id: 'm5', name: 'Casey New', prs: 1, reviews: 2, commits: 5 },
    ],
  },
  'team-2': {
    id: 'team-2',
    name: 'Backend Core',
    memberCount: 4,
    recentPRs: 8,
    avgCycleTime: '22h',
    members: [
      { id: 'm6', name: 'Morgan Backend', prs: 3, reviews: 4, commits: 12 },
      { id: 'm7', name: 'Taylor API', prs: 2, reviews: 6, commits: 10 },
      { id: 'm8', name: 'Riley DB', prs: 2, reviews: 3, commits: 8 },
      { id: 'm9', name: 'Jamie Infra', prs: 1, reviews: 5, commits: 6 },
    ],
  },
  'team-3': {
    id: 'team-3',
    name: 'Platform Infra',
    memberCount: 3,
    recentPRs: 5,
    avgCycleTime: '12h',
    members: [
      { id: 'm10', name: 'Chris DevOps', prs: 2, reviews: 3, commits: 15 },
      { id: 'm11', name: 'Pat SRE', prs: 2, reviews: 4, commits: 10 },
      { id: 'm12', name: 'Quinn Cloud', prs: 1, reviews: 2, commits: 8 },
    ],
  },
};

export default function TeamMemberPage({ params }: { params: { id: string } }) {
  const team = teamsData[params.id];

  if (!team) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Team Not Found</h1>
          <p className="text-[var(--text-secondary)] mt-1">
            The team you are looking for does not exist.
          </p>
        </div>
        <a
          href="/dashboard/team"
          className="text-indigo-600 hover:text-indigo-500 text-sm font-medium"
        >
          Back to Teams
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">{team.name}</h1>
          <p className="text-[var(--text-secondary)] mt-1">
            Team overview and member metrics
          </p>
        </div>
        <a
          href="/dashboard/team"
          className="text-indigo-600 hover:text-indigo-500 text-sm font-medium transition-colors"
        >
          Back to Teams
        </a>
      </div>

      {/* Team Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-[var(--bg-card)] border border-[var(--border-card)] rounded-xl p-6">
          <div className="text-sm text-[var(--text-secondary)] mb-2">Members</div>
          <div className="text-3xl font-bold text-[var(--text-primary)]">{team.memberCount}</div>
        </div>
        <div className="bg-[var(--bg-card)] border border-[var(--border-card)] rounded-xl p-6">
          <div className="text-sm text-[var(--text-secondary)] mb-2">PRs This Week</div>
          <div className="text-3xl font-bold text-[var(--text-primary)]">{team.recentPRs}</div>
        </div>
        <div className="bg-[var(--bg-card)] border border-[var(--border-card)] rounded-xl p-6">
          <div className="text-sm text-[var(--text-secondary)] mb-2">Avg Cycle Time</div>
          <div className="text-3xl font-bold text-[var(--text-primary)]">{team.avgCycleTime}</div>
        </div>
      </div>

      {/* Team Members */}
      <div className="bg-[var(--bg-card)] border border-[var(--border-card)] rounded-xl p-6">
        <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Team Members</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--border-card)]">
                <th className="text-left text-xs font-medium text-[var(--text-muted)] uppercase pb-3">
                  Name
                </th>
                <th className="text-right text-xs font-medium text-[var(--text-muted)] uppercase pb-3">
                  PRs
                </th>
                <th className="text-right text-xs font-medium text-[var(--text-muted)] uppercase pb-3">
                  Reviews
                </th>
                <th className="text-right text-xs font-medium text-[var(--text-muted)] uppercase pb-3">
                  Commits
                </th>
              </tr>
            </thead>
            <tbody>
              {team.members.map((member) => (
                <tr
                  key={member.id}
                  data-testid="member-row"
                  className="border-b border-[var(--border-card)] last:border-0"
                >
                  <td className="py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                        <span className="text-xs font-medium text-indigo-600 dark:text-indigo-400">
                          {member.name.split(' ').map((n) => n[0]).join('')}
                        </span>
                      </div>
                      <span className="text-sm font-medium text-[var(--text-primary)]">
                        {member.name}
                      </span>
                    </div>
                  </td>
                  <td className="text-right text-sm text-[var(--text-primary)]" data-testid="member-prs">
                    {member.prs}
                  </td>
                  <td className="text-right text-sm text-[var(--text-primary)]">
                    {member.reviews}
                  </td>
                  <td className="text-right text-sm text-[var(--text-primary)]">
                    {member.commits}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
