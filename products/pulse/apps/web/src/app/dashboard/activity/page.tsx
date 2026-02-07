'use client';

import { useState, useCallback } from 'react';
import { useWebSocket } from '../../../hooks/useWebSocket';
import EventIcon from '../../../components/common/EventIcon';
import type { ActivityEvent } from '../../../lib/activity-types';

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
                <EventIcon type={event.type} />
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
