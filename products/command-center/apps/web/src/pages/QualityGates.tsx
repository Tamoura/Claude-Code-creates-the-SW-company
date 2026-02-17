import { useApi } from '../hooks/useApi.js';
import StatCard from '../components/StatCard.js';

interface ProductQuality {
  name: string;
  scores: Record<string, number>;
  overallScore: number;
  hasAudit: boolean;
  recentReports: string[];
}

interface QualityGatesResponse {
  products: ProductQuality[];
}

const DIMENSIONS = [
  'Security',
  'Architecture',
  'Testing',
  'Code Quality',
  'Performance',
  'DevOps',
  'Runability',
];

function LoadingSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="h-8 bg-gray-800 rounded w-48 mb-2" />
      <div className="h-4 bg-gray-800 rounded w-72 mb-8" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[...Array(3)].map((_, i) => <div key={i} className="h-28 bg-gray-800 rounded-xl" />)}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[...Array(4)].map((_, i) => <div key={i} className="h-64 bg-gray-800 rounded-xl" />)}
      </div>
    </div>
  );
}

function scoreColor(score: number): string {
  if (score >= 8) return 'text-emerald-400';
  if (score >= 6) return 'text-amber-400';
  return 'text-red-400';
}

function barColor(score: number): string {
  if (score >= 8) return 'bg-emerald-500';
  if (score >= 6) return 'bg-amber-500';
  return 'bg-red-500';
}

function barBgColor(score: number): string {
  if (score >= 8) return 'bg-emerald-500/10';
  if (score >= 6) return 'bg-amber-500/10';
  return 'bg-red-500/10';
}

function ScoreBar({ label, score }: { label: string; score: number }) {
  const percentage = (score / 10) * 100;

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-gray-400 w-24 truncate" title={label}>
        {label}
      </span>
      <div className="flex-1 bg-gray-800 rounded-full h-2">
        <div
          className={`${barColor(score)} rounded-full h-2 transition-all`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span className={`text-xs font-medium w-6 text-right ${scoreColor(score)}`}>
        {score}
      </span>
    </div>
  );
}

function ProductCard({ product }: { product: ProductQuality }) {
  if (!product.hasAudit) {
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <div className="flex items-start justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">{product.name}</h3>
          <span className="text-xs text-gray-600 bg-gray-800 px-2 py-1 rounded">No audit</span>
        </div>
        <div className="flex items-center justify-center py-8">
          <p className="text-gray-500 text-sm">No audit report yet</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 hover:border-gray-700 transition-colors">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-white">{product.name}</h3>
          {product.recentReports.length > 0 && (
            <p className="text-xs text-gray-500 mt-0.5">
              {product.recentReports.length} report{product.recentReports.length !== 1 ? 's' : ''}
            </p>
          )}
        </div>
        <div className={`text-right ${barBgColor(product.overallScore)} rounded-lg px-3 py-2`}>
          <p className={`text-3xl font-bold ${scoreColor(product.overallScore)}`}>
            {product.overallScore}
          </p>
          <p className="text-xs text-gray-500">/10</p>
        </div>
      </div>

      <div className="space-y-2.5">
        {DIMENSIONS.map((dim) => {
          const score = product.scores[dim] ?? product.scores[dim.toLowerCase()] ?? 0;
          return <ScoreBar key={dim} label={dim} score={score} />;
        })}
      </div>
    </div>
  );
}

export default function QualityGates() {
  const { data, loading } = useApi<QualityGatesResponse>('/quality-gates');

  if (loading && !data) return <LoadingSkeleton />;
  if (!data) return <p className="text-red-400">Failed to load quality gates</p>;

  const products = data.products;
  const audited = products.filter((p) => p.hasAudit);
  const avgScore = audited.length > 0
    ? Math.round((audited.reduce((sum, p) => sum + p.overallScore, 0) / audited.length) * 10) / 10
    : 0;
  const passing = audited.filter((p) => p.overallScore >= 8).length;

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white mb-1">Quality Gate Dashboard</h1>
        <p className="text-gray-500">Code quality scores across all products</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <StatCard
          label="Products Audited"
          value={audited.length}
          sublabel={`of ${products.length} total`}
          color="blue"
        />
        <StatCard
          label="Avg Score"
          value={avgScore}
          sublabel="out of 10"
          color="purple"
        />
        <StatCard
          label="Passing"
          value={passing}
          sublabel="score >= 8/10"
          color="green"
        />
      </div>

      {/* Product Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {products.map((product) => (
          <ProductCard key={product.name} product={product} />
        ))}
      </div>

      {products.length === 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-12 text-center">
          <p className="text-gray-500">No products found</p>
        </div>
      )}
    </div>
  );
}
