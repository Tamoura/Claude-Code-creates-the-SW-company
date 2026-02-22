import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useApi } from '../hooks/useApi.js';
import Badge from '../components/Badge.js';

interface ShowcaseInfo {
  tagline: string;
  audiences: string[];
  category: string;
  highlights: string[];
  metrics: Record<string, number>;
  color: string;
}

interface Product {
  name: string;
  displayName: string;
  phase: string;
  hasApi: boolean;
  hasWeb: boolean;
  description: string;
  fileCount: number;
  showcase: ShowcaseInfo | null;
}

const AUDIENCES = ['All', 'Founders', 'Investors', 'Consumers'] as const;
type Audience = (typeof AUDIENCES)[number];

function phaseVariant(phase: string) {
  if (phase === 'Production') return 'success' as const;
  if (phase === 'MVP') return 'info' as const;
  if (phase === 'Foundation') return 'warning' as const;
  return 'default' as const;
}

export default function Showcase() {
  const { data, loading } = useApi<{ products: Product[] }>('/products');
  const [audience, setAudience] = useState<Audience>('All');

  if (loading) {
    return (
      <div className="animate-pulse space-y-8">
        <div className="h-32 bg-gray-800 rounded-2xl" />
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-48 bg-gray-800 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (!data) return <p className="text-red-400">Failed to load products</p>;

  const products = data.products;
  const filtered =
    audience === 'All'
      ? products
      : products.filter((p) =>
          p.showcase?.audiences.includes(audience.toLowerCase()),
        );

  const totalTests = products.reduce((sum, p) => {
    const t = p.showcase?.metrics?.tests ?? 0;
    const e = p.showcase?.metrics?.e2eTests ?? 0;
    return sum + t + e;
  }, 0);

  return (
    <div>
      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600/20 via-purple-600/10 to-gray-900 border border-gray-800 p-8 mb-8">
        <div className="relative z-10">
          <h1 className="text-4xl font-bold text-white mb-2">ConnectSW</h1>
          <p className="text-lg text-gray-300 mb-6 max-w-2xl">
            An AI-first software company where Claude Code agents build
            production-grade products under CEO direction.
          </p>
          <div className="flex gap-6">
            <HeroStat label="Products" value={products.length} />
            <HeroStat label="Tests" value={totalTests.toLocaleString()} />
            <HeroStat label="AI Agents" value={16} />
          </div>
        </div>
        {/* Decorative gradient orb */}
        <div className="absolute -top-24 -right-24 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl" />
      </div>

      {/* Audience filter tabs */}
      <div className="flex items-center gap-2 mb-6">
        {AUDIENCES.map((a) => (
          <button
            key={a}
            onClick={() => setAudience(a)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              audience === a
                ? 'bg-blue-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:text-gray-200 hover:bg-gray-700'
            }`}
          >
            {a}
          </button>
        ))}
        <span className="text-sm text-gray-500 ml-3">
          {filtered.length} product{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Product grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {filtered.map((product) => (
          <ProductCard key={product.name} product={product} />
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16 text-gray-500">
          <p className="text-lg">No products match this audience filter.</p>
        </div>
      )}
    </div>
  );
}

function HeroStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <div className="text-2xl font-bold text-white">{value}</div>
      <div className="text-sm text-gray-400">{label}</div>
    </div>
  );
}

function ProductCard({ product }: { product: Product }) {
  const sc = product.showcase;
  const accentColor = sc?.color ?? '#3B82F6';

  return (
    <Link
      to={`/showcase/${product.name}`}
      className="group bg-gray-900 border border-gray-800 rounded-xl overflow-hidden hover:border-gray-700 hover:shadow-lg transition-all"
    >
      {/* Accent color strip */}
      <div className="h-1" style={{ backgroundColor: accentColor }} />

      <div className="p-5">
        <div className="flex items-start justify-between mb-2">
          <h3 className="text-lg font-semibold text-white group-hover:text-blue-400 transition-colors">
            {product.displayName}
          </h3>
          <Badge variant={phaseVariant(product.phase)}>{product.phase}</Badge>
        </div>

        {sc?.tagline ? (
          <p className="text-sm text-gray-400 mb-3">{sc.tagline}</p>
        ) : (
          <p className="text-sm text-gray-500 mb-3">{product.description}</p>
        )}

        {sc?.category && (
          <span
            className="inline-block text-xs px-2 py-0.5 rounded-full mb-3"
            style={{
              backgroundColor: `${accentColor}20`,
              color: accentColor,
            }}
          >
            {sc.category}
          </span>
        )}

        {/* Highlights */}
        {sc?.highlights && sc.highlights.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {sc.highlights.slice(0, 4).map((h) => (
              <span
                key={h}
                className="text-xs bg-gray-800 text-gray-400 px-2 py-0.5 rounded"
              >
                {h}
              </span>
            ))}
            {sc.highlights.length > 4 && (
              <span className="text-xs text-gray-600">
                +{sc.highlights.length - 4}
              </span>
            )}
          </div>
        )}
      </div>
    </Link>
  );
}
