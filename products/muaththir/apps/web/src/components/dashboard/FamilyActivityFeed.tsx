'use client';

import { useTranslations } from 'next-intl';
import { getDimensionBySlug } from '../../lib/dimensions';

export interface FamilyActivity {
  id: string;
  type: 'observation' | 'milestone' | 'goal';
  text: string;
  childName: string;
  dimensionSlug: string;
  timestamp: string;
}

interface FamilyActivityFeedProps {
  activities: FamilyActivity[];
  loading: boolean;
}

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

function TypeIcon({ type }: { type: FamilyActivity['type'] }) {
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
}

export default function FamilyActivityFeed({
  activities,
  loading,
}: FamilyActivityFeedProps) {
  const t = useTranslations('dashboard');
  const tf = useTranslations('familyActivity');
  const td = useTranslations('dimensions');

  const typeLabel = (type: FamilyActivity['type']) => {
    switch (type) {
      case 'observation': return t('activityObserved');
      case 'milestone': return t('activityAchieved');
      case 'goal': return t('activityCompleted');
    }
  };

  // Sort by timestamp descending and limit to 10
  const sorted = [...activities]
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 10);

  if (loading) {
    return (
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              {tf('title')}
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {tf('description')}
            </p>
          </div>
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-slate-100 dark:bg-slate-800 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
            {tf('title')}
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {tf('description')}
          </p>
        </div>
      </div>

      {sorted.length === 0 ? (
        <p className="text-sm text-slate-400 dark:text-slate-500 text-center py-6">
          {tf('noActivity')}
        </p>
      ) : (
        <ul className="space-y-3" role="list">
          {sorted.map((item) => {
            const dimension = getDimensionBySlug(item.dimensionSlug);
            return (
              <li key={item.id} className="flex items-start gap-3">
                <div
                  className="mt-0.5 p-1.5 rounded-lg flex-shrink-0"
                  style={{
                    backgroundColor: dimension ? `${dimension.colour}15` : '#f1f5f9',
                    color: dimension?.colour ?? '#64748b',
                  }}
                >
                  <TypeIcon type={item.type} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 px-1.5 py-0.5 rounded">
                      {item.childName}
                    </span>
                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                      {typeLabel(item.type)}
                    </span>
                    {dimension && (
                      <span
                        className="text-xs px-1.5 py-0.5 rounded-full"
                        style={{
                          backgroundColor: `${dimension.colour}15`,
                          color: dimension.colour,
                        }}
                      >
                        {td(dimension.slug as any)}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-slate-700 dark:text-slate-300 mt-0.5 truncate">
                    {item.text}
                  </p>
                  <time className="text-xs text-slate-400 dark:text-slate-500">
                    {formatRelativeTime(item.timestamp)}
                  </time>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
