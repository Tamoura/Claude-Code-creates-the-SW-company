import Link from 'next/link';
import { DIMENSIONS } from '../../../lib/dimensions';

export default function MilestonesPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Milestones</h1>
        <p className="text-sm text-slate-500 mt-1">
          Age-appropriate developmental milestones across all dimensions.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {DIMENSIONS.map((dim) => (
          <Link
            key={dim.slug}
            href={`/dashboard/milestones/${dim.slug}`}
            className="card group hover:shadow-md transition-shadow"
            style={{ borderLeft: `4px solid ${dim.colour}` }}
          >
            <h2 className="text-sm font-semibold text-slate-900 group-hover:text-emerald-700 transition-colors">
              {dim.name}
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              View milestones for {dim.name.toLowerCase()}
            </p>
            <div className="mt-4 flex items-center gap-1 text-xs text-slate-400">
              <span>0 completed</span>
              <span className="mx-1">|</span>
              <span>0 total</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
