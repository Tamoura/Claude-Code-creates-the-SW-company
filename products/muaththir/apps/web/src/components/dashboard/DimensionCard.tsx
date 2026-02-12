'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import type { Dimension } from '../../lib/dimensions';

interface DimensionCardProps {
  dimension: Dimension;
  score?: number;
  observationCount?: number;
}

function DimensionIcon({ icon, colour }: { icon: string; colour: string }) {
  const iconPaths: Record<string, string> = {
    Book: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253',
    Heart: 'M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z',
    Shield: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z',
    Star: 'M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z',
    Moon: 'M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z',
    Activity: 'M13 10V3L4 14h7v7l9-11h-7z',
  };

  return (
    <svg
      className="h-6 w-6"
      fill="none"
      viewBox="0 0 24 24"
      stroke={colour}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={iconPaths[icon] || iconPaths.Book} />
    </svg>
  );
}

export default function DimensionCard({
  dimension,
  score,
  observationCount = 0,
}: DimensionCardProps) {
  const td = useTranslations('dimensions');
  return (
    <Link
      href={`/dashboard/dimensions/${dimension.slug}`}
      className="card group hover:shadow-md transition-shadow duration-200"
      aria-label={`${td(dimension.slug as any)} - score ${score ?? 0} out of 100, ${observationCount} observations`}
    >
      <div className="flex items-start justify-between mb-3">
        <div
          className="p-2.5 rounded-xl"
          style={{ backgroundColor: `${dimension.colour}15` }}
        >
          <DimensionIcon icon={dimension.icon} colour={dimension.colour} />
        </div>
        {score !== undefined && (
          <div className="text-right">
            <span
              className="text-2xl font-bold"
              style={{ color: dimension.colour }}
            >
              {score}
            </span>
            <span className="text-xs text-slate-400 dark:text-slate-500">/100</span>
          </div>
        )}
      </div>
      <h3 className="text-sm font-semibold text-slate-900 mb-1 group-hover:text-emerald-700 transition-colors">
        {td(dimension.slug as any)}
      </h3>
      <p className="text-xs text-slate-500 line-clamp-2 mb-3">
        {td(`${dimension.slug}Desc` as any)}
      </p>
      <div className="flex items-center gap-1 text-xs text-slate-400 dark:text-slate-500">
        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        </svg>
        <span>{observationCount} observations</span>
      </div>
    </Link>
  );
}
