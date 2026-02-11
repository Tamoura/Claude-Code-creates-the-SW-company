'use client';

import { useTranslations } from 'next-intl';
import { getDimensionBySlug } from '../../lib/dimensions';

interface Observation {
  id: string;
  content: string;
  dimensionSlug: string;
  sentiment: string;
  createdAt: string;
}

interface Milestone {
  id: string;
  title: string;
  dimensionSlug: string;
  achievedAt: string | null;
}

interface Goal {
  id: string;
  title: string;
  dimensionSlug: string;
  status: string;
  updatedAt: string;
}

interface ActivityFeedProps {
  observations?: Observation[];
  milestones?: Milestone[];
  goals?: Goal[];
}

type ActivityItem = {
  id: string;
  type: 'observation' | 'milestone' | 'goal';
  text: string;
  dimensionSlug: string;
  timestamp: string;
};

function formatRelativeTime(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

export default function ActivityFeed({
  observations = [],
  milestones = [],
  goals = [],
}: ActivityFeedProps) {
  const t = useTranslations('dashboard');
  const td = useTranslations('dimensions');

  const items: ActivityItem[] = [];

  for (const obs of observations) {
    items.push({
      id: `obs-${obs.id}`,
      type: 'observation',
      text: obs.content.length > 80 ? obs.content.slice(0, 80) + '...' : obs.content,
      dimensionSlug: obs.dimensionSlug,
      timestamp: obs.createdAt,
    });
  }

  for (const ms of milestones) {
    if (ms.achievedAt) {
      items.push({
        id: `ms-${ms.id}`,
        type: 'milestone',
        text: ms.title,
        dimensionSlug: ms.dimensionSlug,
        timestamp: ms.achievedAt,
      });
    }
  }

  for (const goal of goals) {
    if (goal.status === 'completed') {
      items.push({
        id: `goal-${goal.id}`,
        type: 'goal',
        text: goal.title,
        dimensionSlug: goal.dimensionSlug,
        timestamp: goal.updatedAt,
      });
    }
  }

  items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  const display = items.slice(0, 5);

  const typeLabel = (type: ActivityItem['type']) => {
    switch (type) {
      case 'observation': return t('activityObserved');
      case 'milestone': return t('activityAchieved');
      case 'goal': return t('activityCompleted');
    }
  };

  const typeIcon = (type: ActivityItem['type']) => {
    switch (type) {
      case 'observation':
        return (
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
        );
      case 'milestone':
        return (
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'goal':
        return (
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
          </svg>
        );
    }
  };

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">{t('activityFeed')}</h2>
          <p className="text-sm text-slate-500">{t('activityFeedDesc')}</p>
        </div>
      </div>

      {display.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-6">{t('activityNoItems')}</p>
      ) : (
        <ul className="space-y-3" role="list">
          {display.map((item) => {
            const dimension = getDimensionBySlug(item.dimensionSlug);
            return (
              <li key={item.id} className="flex items-start gap-3">
                <div
                  className="mt-0.5 p-1.5 rounded-lg flex-shrink-0"
                  style={{ backgroundColor: dimension ? `${dimension.colour}15` : '#f1f5f9', color: dimension?.colour ?? '#64748b' }}
                >
                  {typeIcon(item.type)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-slate-500">{typeLabel(item.type)}</span>
                    {dimension && (
                      <span
                        className="text-xs px-1.5 py-0.5 rounded-full"
                        style={{ backgroundColor: `${dimension.colour}15`, color: dimension.colour }}
                      >
                        {td(dimension.slug as any)}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-slate-700 mt-0.5 truncate">{item.text}</p>
                  <time className="text-xs text-slate-400">{formatRelativeTime(item.timestamp)}</time>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
