'use client';

import { useLocale } from 'next-intl';
import DimensionBadge from '../common/DimensionBadge';

export interface Observation {
  id: string;
  dimension: string;
  text: string;
  sentiment: 'positive' | 'neutral' | 'needs_attention';
  observedAt: string;
  tags?: string[];
}

interface ObservationCardProps {
  observation: Observation;
}

const sentimentConfig = {
  positive: {
    label: 'Positive',
    bgClass: 'bg-emerald-50',
    textClass: 'text-emerald-700',
    dotClass: 'bg-emerald-500',
  },
  neutral: {
    label: 'Neutral',
    bgClass: 'bg-slate-50',
    textClass: 'text-slate-600',
    dotClass: 'bg-slate-400',
  },
  needs_attention: {
    label: 'Needs Attention',
    bgClass: 'bg-amber-50',
    textClass: 'text-amber-700',
    dotClass: 'bg-amber-500',
  },
};

export default function ObservationCard({
  observation,
}: ObservationCardProps) {
  const sentiment = sentimentConfig[observation.sentiment];
  const locale = useLocale();
  const date = new Date(observation.observedAt);
  const formattedDate = date.toLocaleDateString(
    locale === 'ar' ? 'ar-SA' : 'en-GB',
    {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }
  );

  return (
    <article className="card" aria-label={`Observation from ${formattedDate}`}>
      <div className="flex items-center justify-between mb-3">
        <DimensionBadge slug={observation.dimension} />
        <time className="text-xs text-slate-400" dateTime={observation.observedAt}>
          {formattedDate}
        </time>
      </div>
      <p className="text-sm text-slate-700 mb-3 leading-relaxed">
        {observation.text}
      </p>
      <div className="flex items-center justify-between">
        <span
          className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${sentiment.bgClass} ${sentiment.textClass}`}
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${sentiment.dotClass}`}
            aria-hidden="true"
          />
          {sentiment.label}
        </span>
        {observation.tags && observation.tags.length > 0 && (
          <div className="flex gap-1">
            {observation.tags.map((tag) => (
              <span
                key={tag}
                className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </article>
  );
}
