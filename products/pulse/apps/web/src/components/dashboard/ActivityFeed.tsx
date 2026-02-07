const mockEvents = [
  {
    id: '1',
    type: 'pull_request.merged',
    author: 'priya-dev',
    title: 'Add user authentication middleware',
    repo: 'backend-api',
    time: '2 minutes ago',
  },
  {
    id: '2',
    type: 'push',
    author: 'alex-eng',
    title: '3 commits to main',
    repo: 'frontend-app',
    time: '15 minutes ago',
  },
  {
    id: '3',
    type: 'pull_request.opened',
    author: 'sam-dev',
    title: 'Refactor database connection pool',
    repo: 'backend-api',
    time: '1 hour ago',
  },
  {
    id: '4',
    type: 'deployment',
    author: 'ci-bot',
    title: 'Deployed to production',
    repo: 'frontend-app',
    time: '2 hours ago',
  },
  {
    id: '5',
    type: 'pull_request.reviewed',
    author: 'jordan-lead',
    title: 'Approved: Add rate limiting',
    repo: 'backend-api',
    time: '3 hours ago',
  },
];

function getEventIcon(type: string) {
  switch (type) {
    case 'pull_request.merged':
      return (
        <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
          <svg className="w-4 h-4 text-purple-600 dark:text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21 3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
          </svg>
        </div>
      );
    case 'pull_request.opened':
      return (
        <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
          <svg className="w-4 h-4 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
        </div>
      );
    case 'push':
      return (
        <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
          <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 8.25 21 12m0 0-3.75 3.75M21 12H3" />
          </svg>
        </div>
      );
    case 'deployment':
      return (
        <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
          <svg className="w-4 h-4 text-amber-600 dark:text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.59 14.37a6 6 0 0 1-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 0 0 6.16-12.12A14.98 14.98 0 0 0 9.631 8.41m5.96 5.96a14.926 14.926 0 0 1-5.841 2.58m-.119-8.54a6 6 0 0 0-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 0 0-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 0 1-2.448-2.448 14.9 14.9 0 0 1 .06-.312m-2.24 2.39a4.493 4.493 0 0 0-1.757 4.306 4.493 4.493 0 0 0 4.306-1.758M16.5 9a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0Z" />
          </svg>
        </div>
      );
    default:
      return (
        <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
          <svg className="w-4 h-4 text-gray-600 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
          </svg>
        </div>
      );
  }
}

export default function ActivityFeed() {
  return (
    <div className="bg-[var(--bg-card)] border border-[var(--border-card)] rounded-xl p-6">
      <div className="text-sm text-[var(--text-secondary)] mb-4">Recent Activity</div>
      <div className="space-y-4">
        {mockEvents.map((event) => (
          <div key={event.id} className="flex items-start gap-3">
            {getEventIcon(event.type)}
            <div className="flex-1 min-w-0">
              <div className="text-sm text-[var(--text-primary)]">
                <span className="font-medium">{event.author}</span>{' '}
                {event.title}
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs text-[var(--text-muted)]">{event.repo}</span>
                <span className="text-xs text-[var(--text-muted)]">{event.time}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
