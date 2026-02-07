import Link from 'next/link';
import { DIMENSIONS } from '../../../../lib/dimensions';
import DimensionBadge from '../../../../components/common/DimensionBadge';

interface DimensionDetailPageProps {
  params: { slug: string };
}

export function generateStaticParams() {
  return DIMENSIONS.map((d) => ({ slug: d.slug }));
}

export default function DimensionDetailPage({
  params,
}: DimensionDetailPageProps) {
  const dimension = DIMENSIONS.find((d) => d.slug === params.slug);

  if (!dimension) {
    return (
      <div className="text-center py-16">
        <h1 className="text-2xl font-bold text-slate-900">
          Dimension not found
        </h1>
        <Link
          href="/dashboard/dimensions"
          className="text-sm text-emerald-600 hover:text-emerald-700 mt-4 inline-block"
        >
          Back to Dimensions
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div
            className="p-3 rounded-2xl"
            style={{ backgroundColor: `${dimension.colour}15` }}
          >
            <svg
              className="h-8 w-8"
              fill="none"
              viewBox="0 0 24 24"
              stroke={dimension.colour}
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="10" />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              {dimension.name}
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              {dimension.description}
            </p>
          </div>
        </div>
        <DimensionBadge slug={dimension.slug} size="md" />
      </div>

      {/* Score Card */}
      <div
        className="card"
        style={{ borderLeft: `4px solid ${dimension.colour}` }}
      >
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-medium text-slate-500">
              Current Score
            </h2>
            <p
              className="text-4xl font-bold mt-1"
              style={{ color: dimension.colour }}
            >
              0
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-slate-500">Observations</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">0</p>
          </div>
        </div>
      </div>

      {/* Observations - Empty State */}
      <section>
        <h2 className="text-lg font-semibold text-slate-900 mb-4">
          Recent Observations
        </h2>
        <div className="card text-center py-12">
          <h3 className="text-sm font-medium text-slate-900 mb-1">
            No observations in {dimension.name}
          </h3>
          <p className="text-xs text-slate-500 mb-4">
            Start logging observations for this dimension.
          </p>
          <Link
            href="/dashboard/observe"
            className="btn-primary text-sm py-2 px-4"
          >
            Log Observation
          </Link>
        </div>
      </section>

      {/* Milestones Preview */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-900">
            Milestones
          </h2>
          <Link
            href={`/dashboard/milestones/${dimension.slug}`}
            className="text-sm font-medium text-emerald-600 hover:text-emerald-700"
          >
            View All
          </Link>
        </div>
        <div className="card text-center py-12">
          <h3 className="text-sm font-medium text-slate-900 mb-1">
            Milestones coming soon
          </h3>
          <p className="text-xs text-slate-500">
            Age-appropriate milestones will be loaded once a child profile is
            created.
          </p>
        </div>
      </section>
    </div>
  );
}
