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
  hasPitchDeck: boolean;
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
  const { data: agentsData } = useApi<{ agents: unknown[] }>('/agents');
  const agentCount = agentsData?.agents?.length ?? 18;
  const [audience, setAudience] = useState<Audience>('All');

  if (loading) {
    return (
      <div className="animate-pulse space-y-8">
        <div className="h-32 bg-slate-800 rounded-2xl" />
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-48 bg-slate-800 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (!data) return <p className="text-rose-400">Failed to load products</p>;

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
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600/20 via-purple-600/10 to-slate-900 border border-slate-800 p-8 mb-8">
        <div className="relative z-10">
          <h1 className="text-4xl font-bold text-white mb-2">ConnectSW</h1>
          <p className="text-lg text-slate-300 mb-6 max-w-2xl">
            An AI-first software company where Claude Code agents build
            production-grade products under CEO direction.
          </p>
          <div className="flex gap-6">
            <HeroStat label="Products" value={products.length} />
            <HeroStat label="Tests" value={totalTests.toLocaleString()} />
            <HeroStat label="AI Agents" value={agentCount} />
          </div>
        </div>
        {/* Decorative gradient orb */}
        <div className="absolute -top-24 -right-24 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl" />
      </div>

      {/* Audience filter tabs */}
      <div className="flex items-center gap-2 mb-6">
        {AUDIENCES.map((a) => (
          <button
            key={a}
            onClick={() => setAudience(a)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              audience === a
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-700'
            }`}
          >
            {a}
          </button>
        ))}
        <span className="text-sm text-slate-500 ml-3">
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
        <div className="text-center py-16 text-slate-500">
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
      <div className="text-sm text-slate-400">{label}</div>
    </div>
  );
}

function ProductCard({ product }: { product: Product }) {
  const sc = product.showcase;
  const accentColor = sc?.color ?? '#3B82F6';

  return (
    <div className="group bg-slate-900 border border-slate-800 rounded-xl overflow-hidden hover:border-slate-700 hover:shadow-lg transition-all">
      {/* Accent color strip */}
      <div className="h-1" style={{ backgroundColor: accentColor }} />

      <Link to={`/showcase/${product.name}`} className="block p-5">
        <div className="flex items-start justify-between mb-2">
          <h3 className="text-lg font-semibold text-white group-hover:text-indigo-400 transition-colors">
            {product.displayName}
          </h3>
          <Badge variant={phaseVariant(product.phase)}>{product.phase}</Badge>
        </div>

        {sc?.tagline ? (
          <p className="text-sm text-slate-400 mb-3">{sc.tagline}</p>
        ) : (
          <p className="text-sm text-slate-500 mb-3">{product.description}</p>
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
                className="text-xs bg-slate-800 text-slate-400 px-2 py-0.5 rounded"
              >
                {h}
              </span>
            ))}
            {sc.highlights.length > 4 && (
              <span className="text-xs text-slate-600">
                +{sc.highlights.length - 4}
              </span>
            )}
          </div>
        )}
      </Link>

      {/* Pitch button */}
      {product.hasPitchDeck && (
        <div className="px-5 pb-4">
          <Link
            to={`/showcase/${product.name}/pitch`}
            className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
            style={{
              backgroundColor: `${accentColor}15`,
              color: accentColor,
            }}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4v16l13-8L7 4z" />
            </svg>
            Pitch Deck
          </Link>
        </div>
      )}
    </div>
  );
}
