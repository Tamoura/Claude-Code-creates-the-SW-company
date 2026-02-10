import Link from 'next/link';

interface RepoData {
  id: string;
  name: string;
  fullName: string;
  language: string;
  status: 'Active' | 'Syncing' | 'Error';
  coverage: number;
  prsMerged: number;
  openPrs: number;
  lastActivity: string;
}

const mockRepos: RepoData[] = [
  {
    id: 'repo-1',
    name: 'backend-api',
    fullName: 'acme/backend-api',
    language: 'TypeScript',
    status: 'Active',
    coverage: 87.3,
    prsMerged: 12,
    openPrs: 3,
    lastActivity: '2 minutes ago',
  },
  {
    id: 'repo-2',
    name: 'frontend-app',
    fullName: 'acme/frontend-app',
    language: 'TypeScript',
    status: 'Active',
    coverage: 82.1,
    prsMerged: 8,
    openPrs: 5,
    lastActivity: '15 minutes ago',
  },
  {
    id: 'repo-3',
    name: 'shared-utils',
    fullName: 'acme/shared-utils',
    language: 'TypeScript',
    status: 'Active',
    coverage: 94.5,
    prsMerged: 4,
    openPrs: 1,
    lastActivity: '1 hour ago',
  },
];

function getStatusColor(status: string) {
  switch (status) {
    case 'Active':
      return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
    case 'Syncing':
      return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
    case 'Error':
      return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
    default:
      return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400';
  }
}

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

      {/* Repo cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {mockRepos.map((repo) => (
          <Link
            key={repo.id}
            href={`/dashboard/repos/${repo.id}`}
            className="block bg-[var(--bg-card)] border border-[var(--border-card)] rounded-xl p-5 hover:border-indigo-400 transition-colors"
          >
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="font-semibold text-[var(--text-primary)]">
                  {repo.name}
                </div>
                <div className="text-xs text-[var(--text-muted)] mt-0.5">
                  {repo.fullName}
                </div>
              </div>
              <span
                className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                  repo.status
                )}`}
              >
                {repo.status}
              </span>
            </div>

            <div className="flex items-center gap-2 mb-4">
              <span className="inline-flex items-center gap-1 text-xs text-[var(--text-secondary)]">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                {repo.language}
              </span>
              <span className="text-xs text-[var(--text-muted)]">
                {repo.lastActivity}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-3 pt-3 border-t border-[var(--border-card)]">
              <div>
                <div className="text-xs text-[var(--text-muted)]">Coverage</div>
                <div className="text-sm font-semibold text-[var(--text-primary)]">
                  {repo.coverage}%
                </div>
              </div>
              <div>
                <div className="text-xs text-[var(--text-muted)]">Merged</div>
                <div className="text-sm font-semibold text-[var(--text-primary)]">
                  {repo.prsMerged}
                </div>
              </div>
              <div>
                <div className="text-xs text-[var(--text-muted)]">Open PRs</div>
                <div className="text-sm font-semibold text-[var(--text-primary)]">
                  {repo.openPrs}
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
