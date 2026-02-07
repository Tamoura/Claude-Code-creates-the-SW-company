import EventIcon from '../common/EventIcon';
import type { ActivityEvent } from '../../lib/activity-types';

const mockEvents: ActivityEvent[] = [
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

export default function ActivityFeed() {
  return (
    <section
      className="bg-[var(--bg-card)] border border-[var(--border-card)] rounded-xl p-6"
      aria-label="Recent activity feed"
    >
      <h2 className="text-sm font-medium text-[var(--text-secondary)] mb-4">Recent Activity</h2>
      <ul className="space-y-4" role="list">
        {mockEvents.map((event) => (
          <li key={event.id} className="flex items-start gap-3">
            <EventIcon type={event.type} />
            <div className="flex-1 min-w-0">
              <div className="text-sm text-[var(--text-primary)]">
                <span className="font-medium">{event.author}</span>{' '}
                {event.title}
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs text-[var(--text-muted)]">{event.repo}</span>
                <span className="text-xs text-[var(--text-muted)]">
                  <time>{event.time}</time>
                </span>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
