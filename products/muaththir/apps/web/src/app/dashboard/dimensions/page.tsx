import { DIMENSIONS } from '../../../lib/dimensions';
import DimensionCard from '../../../components/dashboard/DimensionCard';

export default function DimensionsPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Dimensions</h1>
        <p className="text-sm text-slate-500 mt-1">
          Explore all six dimensions of your child&apos;s development.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {DIMENSIONS.map((dimension) => (
          <DimensionCard
            key={dimension.slug}
            dimension={dimension}
            score={0}
            observationCount={0}
          />
        ))}
      </div>
    </div>
  );
}
