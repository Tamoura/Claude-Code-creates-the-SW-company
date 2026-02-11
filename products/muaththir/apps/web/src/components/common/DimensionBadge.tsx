'use client';

import { useTranslations } from 'next-intl';
import { getDimensionBySlug } from '../../lib/dimensions';

interface DimensionBadgeProps {
  slug: string;
  size?: 'sm' | 'md';
}

export default function DimensionBadge({
  slug,
  size = 'sm',
}: DimensionBadgeProps) {
  const td = useTranslations('dimensions');
  const dimension = getDimensionBySlug(slug);

  if (!dimension) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-slate-100 text-slate-600">
        {slug}
      </span>
    );
  }

  const sizeClasses = size === 'sm' ? 'text-xs px-2.5 py-1' : 'text-sm px-3 py-1.5';

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium rounded-full ${sizeClasses}`}
      style={{
        backgroundColor: `${dimension.colour}15`,
        color: dimension.colour,
      }}
    >
      <span
        className="h-2 w-2 rounded-full"
        style={{ backgroundColor: dimension.colour }}
        aria-hidden="true"
      />
      {td(slug as any)}
    </span>
  );
}
