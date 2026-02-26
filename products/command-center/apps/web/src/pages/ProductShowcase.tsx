import { useParams, Link } from 'react-router-dom';
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
  docs: string[];
  showcase: ShowcaseInfo | null;
}

function phaseVariant(phase: string) {
  if (phase === 'Production') return 'success' as const;
  if (phase === 'MVP') return 'info' as const;
  if (phase === 'Foundation') return 'warning' as const;
  return 'default' as const;
}

export default function ProductShowcase() {
  const { name } = useParams<{ name: string }>();
  const { data, loading } = useApi<{ product: Product }>(`/products/${name}`);

  if (loading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-40 bg-slate-800 rounded-2xl" />
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-slate-800 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (!data) return <p className="text-rose-400">Product not found</p>;

  const product = data.product;
  const sc = product.showcase;
  const accentColor = sc?.color ?? '#3B82F6';

  const metricEntries = sc?.metrics
    ? Object.entries(sc.metrics).filter(([, v]) => v > 0)
    : [];

  // Key docs to surface
  const keyDocs = ['PRD.md', 'ARCHITECTURE.md', 'API.md'].filter((d) =>
    product.docs.some((doc) => doc.toUpperCase() === d.toUpperCase()),
  );

  return (
    <div>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-slate-500 mb-6">
        <Link
          to="/showcase"
          className="hover:text-slate-300 transition-colors"
        >
          Showcase
        </Link>
        <span>/</span>
        <span className="text-slate-300">{product.displayName}</span>
      </div>

      {/* Hero */}
      <div
        className="relative overflow-hidden rounded-2xl border border-slate-800 p-8 mb-8"
        style={{
          background: `linear-gradient(135deg, ${accentColor}15, transparent 60%)`,
        }}
      >
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-3">
            <h1 className="text-3xl font-bold text-white">
              {product.displayName}
            </h1>
            <Badge variant={phaseVariant(product.phase)}>
              {product.phase}
            </Badge>
          </div>

          {sc?.tagline ? (
            <p className="text-lg text-slate-300 mb-4 max-w-2xl">
              {sc.tagline}
            </p>
          ) : (
            <p className="text-lg text-slate-400 mb-4 max-w-2xl">
              {product.description}
            </p>
          )}

          {sc?.category && (
            <span
              className="inline-block text-sm px-3 py-1 rounded-full font-medium"
              style={{
                backgroundColor: `${accentColor}20`,
                color: accentColor,
              }}
            >
              {sc.category}
            </span>
          )}

          {sc?.audiences && sc.audiences.length > 0 && (
            <div className="flex gap-2 mt-3">
              {sc.audiences.map((a) => (
                <span
                  key={a}
                  className="text-xs bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full capitalize"
                >
                  {a}
                </span>
              ))}
            </div>
          )}

          {product.hasPitchDeck && (
            <Link
              to={`/showcase/${product.name}/pitch`}
              className="inline-flex items-center gap-2 mt-5 px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors"
              style={{
                backgroundColor: accentColor,
                color: '#fff',
              }}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4v16l13-8L7 4z" />
              </svg>
              View Pitch Deck
            </Link>
          )}
        </div>
        <div
          className="absolute -top-20 -right-20 w-64 h-64 rounded-full blur-3xl opacity-20"
          style={{ backgroundColor: accentColor }}
        />
      </div>

      {/* Highlights */}
      {sc?.highlights && sc.highlights.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-white mb-4">
            Highlights
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {sc.highlights.map((h) => (
              <div
                key={h}
                className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-center"
              >
                <span className="text-sm text-slate-300">{h}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Metrics + Docs row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Metrics */}
        <div>
          <h2 className="text-xl font-semibold text-white mb-4">Metrics</h2>
          <div className="grid grid-cols-2 gap-3">
            <MetricCard
              label="Documents"
              value={product.fileCount}
              color={accentColor}
            />
            {metricEntries.map(([key, val]) => (
              <MetricCard
                key={key}
                label={formatMetricLabel(key)}
                value={val}
                color={accentColor}
              />
            ))}
            {product.hasApi && (
              <MetricCard label="API" value="Yes" color={accentColor} />
            )}
            {product.hasWeb && (
              <MetricCard label="Web App" value="Yes" color={accentColor} />
            )}
          </div>
        </div>

        {/* Documentation links */}
        <div>
          <h2 className="text-xl font-semibold text-white mb-4">
            Documentation
          </h2>
          <div className="space-y-2">
            {keyDocs.length > 0 ? (
              keyDocs.map((doc) => (
                <Link
                  key={doc}
                  to={`/products/${product.name}`}
                  className="flex items-center gap-3 bg-slate-900 border border-slate-800 rounded-xl p-4 hover:border-slate-700 transition-colors"
                >
                  <svg
                    className="w-5 h-5 text-slate-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  <span className="text-sm text-slate-300">{doc}</span>
                </Link>
              ))
            ) : (
              <Link
                to={`/products/${product.name}`}
                className="flex items-center gap-3 bg-slate-900 border border-slate-800 rounded-xl p-4 hover:border-slate-700 transition-colors"
              >
                <svg
                  className="w-5 h-5 text-slate-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                <span className="text-sm text-slate-300">
                  Browse all {product.fileCount} documents
                </span>
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  color,
}: {
  label: string;
  value: string | number;
  color: string;
}) {
  return (
    <div
      className="rounded-xl border p-4"
      style={{
        backgroundColor: `${color}08`,
        borderColor: `${color}20`,
      }}
    >
      <div className="text-sm text-slate-400">{label}</div>
      <div className="text-2xl font-bold text-white mt-1">{value}</div>
    </div>
  );
}

function formatMetricLabel(key: string): string {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (s) => s.toUpperCase())
    .trim();
}
