'use client';

import { useState, useCallback } from 'react';
import { useWebSocket } from '../../../hooks/useWebSocket';

interface ActivityEvent {
  id: string;
  type: string;
  author: string;
  title: string;
  repo: string;
  time: string;
}

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

export default function ActivityPage() {
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [repoFilter, setRepoFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');

  const handleMessage = useCallback((message: { type: string; data?: unknown }) => {
    if (message.type === 'activity' && message.data) {
      const event = message.data as ActivityEvent;
      setEvents((prev) => [event, ...prev].slice(0, 100));
    }
  }, []);

  const { isConnected } = useWebSocket({
    rooms: ['activity'],
    onMessage: handleMessage,
  });

  const repos = Array.from(new Set(events.map((e) => e.repo)));
  const types = Array.from(new Set(events.map((e) => e.type)));

  const filteredEvents = events.filter((event) => {
    if (repoFilter !== 'all' && event.repo !== repoFilter) return false;
    if (typeFilter !== 'all' && event.type !== typeFilter) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Activity Feed</h1>
        <p className="text-[var(--text-secondary)] mt-1">
          Real-time development activity across your repositories
        </p>
      </div>

      {/* Status bar and filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div
          data-testid="connection-status"
          className="flex items-center gap-2"
        >
          <div
            className={`w-2.5 h-2.5 rounded-full ${
              isConnected ? 'bg-green-500' : 'bg-red-500'
            }`}
          />
          <span className="text-sm text-[var(--text-secondary)]">
            {isConnected ? 'Connected' : 'Disconnected'}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <select
            data-testid="filter-repo"
            value={repoFilter}
            onChange={(e) => setRepoFilter(e.target.value)}
            className="px-3 py-1.5 rounded-lg border border-[var(--border-card)] bg-[var(--bg-card)] text-sm text-[var(--text-primary)]"
          >
            <option value="all">All Repos</option>
            {repos.map((repo) => (
              <option key={repo} value={repo}>
                {repo}
              </option>
            ))}
          </select>

          <select
            data-testid="filter-type"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-1.5 rounded-lg border border-[var(--border-card)] bg-[var(--bg-card)] text-sm text-[var(--text-primary)]"
          >
            <option value="all">All Types</option>
            {types.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Event list */}
      <div className="bg-[var(--bg-card)] border border-[var(--border-card)] rounded-xl p-6">
        {filteredEvents.length === 0 ? (
          <div className="text-center py-8">
            <svg
              className="w-12 h-12 text-[var(--text-muted)] mx-auto mb-3"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75Z"
              />
            </svg>
            <p className="text-[var(--text-secondary)]">
              Waiting for activity...
            </p>
            <p className="text-[var(--text-muted)] text-sm mt-1">
              Events will appear here in real-time as your team works
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredEvents.map((event) => (
              <div key={event.id} className="flex items-start gap-3">
                {getEventIcon(event.type)}
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-[var(--text-primary)]">
                    <span className="font-medium">{event.author}</span>{' '}
                    {event.title}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-[var(--text-muted)]">
                      {event.repo}
                    </span>
                    <span className="text-xs text-[var(--text-muted)]">
                      {event.time}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
