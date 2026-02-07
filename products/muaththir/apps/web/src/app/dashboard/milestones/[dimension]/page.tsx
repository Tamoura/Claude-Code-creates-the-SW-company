import Link from 'next/link';
import { DIMENSIONS } from '../../../../lib/dimensions';
import DimensionBadge from '../../../../components/common/DimensionBadge';

interface MilestonesByDimensionPageProps {
  params: { dimension: string };
}

export function generateStaticParams() {
  return DIMENSIONS.map((d) => ({ dimension: d.slug }));
}

export default function MilestonesByDimensionPage({
  params,
}: MilestonesByDimensionPageProps) {
  const dimension = DIMENSIONS.find((d) => d.slug === params.dimension);

  if (!dimension) {
    return (
      <div className="text-center py-16">
        <h1 className="text-2xl font-bold text-slate-900">
          Dimension not found
        </h1>
        <Link
          href="/dashboard/milestones"
          className="text-sm text-emerald-600 hover:text-emerald-700 mt-4 inline-block"
        >
          Back to Milestones
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Link
              href="/dashboard/milestones"
              className="text-sm text-slate-400 hover:text-slate-600"
            >
              Milestones
            </Link>
            <span className="text-slate-300">/</span>
            <DimensionBadge slug={dimension.slug} />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">
            {dimension.name} Milestones
          </h1>
        </div>
      </div>

      {/* Empty State */}
      <div className="card text-center py-16">
        <div className="mx-auto h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center mb-4">
          <svg className="h-6 w-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
          </svg>
        </div>
        <h2 className="text-sm font-medium text-slate-900 mb-1">
          Milestones coming soon
        </h2>
        <p className="text-xs text-slate-500">
          Create a child profile to see age-appropriate {dimension.name.toLowerCase()}{' '}
          milestones with checklists.
        </p>
      </div>
    </div>
  );
}
