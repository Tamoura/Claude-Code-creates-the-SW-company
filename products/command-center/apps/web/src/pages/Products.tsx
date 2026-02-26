import { useNavigate } from 'react-router-dom';
import { useApi } from '../hooks/useApi.js';
import Badge from '../components/Badge.js';

interface Product {
  name: string;
  displayName: string;
  phase: string;
  hasApi: boolean;
  hasWeb: boolean;
  hasDocker: boolean;
  hasCi: boolean;
  apiPort: number | null;
  webPort: number | null;
  description: string;
  lastModified: string;
  fileCount: number;
  docs: string[];
}

export default function Products() {
  const { data, loading } = useApi<{ products: Product[] }>('/products');
  const navigate = useNavigate();

  if (loading) return <div className="animate-pulse"><div className="h-8 bg-slate-800 rounded w-32 mb-6" /></div>;
  if (!data) return <p className="text-rose-400">Failed to load products</p>;

  const phaseVariant = (phase: string) => {
    if (phase === 'Production') return 'success';
    if (phase === 'MVP') return 'info';
    if (phase === 'Foundation') return 'warning';
    return 'default';
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-1">Products</h1>
      <p className="text-slate-500 mb-8">{data.products.length} products in the portfolio</p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {data.products.map((product) => (
          <div
            key={product.name}
            onClick={() => navigate(`/products/${product.name}`)}
            className="bg-slate-900 border border-slate-800 rounded-xl p-6 hover:border-slate-700 hover:shadow-lg hover:shadow-blue-500/10 transition-all group cursor-pointer"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-semibold text-white group-hover:text-indigo-400 transition-colors">
                    {product.displayName}
                  </h3>
                  {product.docs.length > 0 && (
                    <span className="text-xs text-slate-500 bg-slate-800 px-2 py-0.5 rounded">
                      {product.docs.length} {product.docs.length === 1 ? 'doc' : 'docs'}
                    </span>
                  )}
                </div>
                <p className="text-sm text-slate-500 mt-0.5">{product.description}</p>
              </div>
              <Badge variant={phaseVariant(product.phase)}>{product.phase}</Badge>
            </div>

            {/* Capabilities row */}
            <div className="flex gap-2 mb-4 flex-wrap">
              {product.hasApi && <MiniTag label="API" active />}
              {product.hasWeb && <MiniTag label="Web" active />}
              {product.hasDocker && <MiniTag label="Docker" active />}
              {product.hasCi && <MiniTag label="CI/CD" active />}
              {!product.hasApi && <MiniTag label="API" />}
              {!product.hasWeb && <MiniTag label="Web" />}
            </div>

            {/* Footer: ports + pitch deck */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-800/60">
              <div className="flex items-center gap-4 text-xs text-slate-500">
                {product.apiPort && <span>API :{product.apiPort}</span>}
                {product.webPort && <span>Web :{product.webPort}</span>}
                <span>{product.fileCount} files</span>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/products/${product.name}/pitch-deck`);
                }}
                className="text-xs px-3 py-1.5 bg-indigo-600/15 text-indigo-400 hover:bg-indigo-600/30 rounded-md transition-colors flex items-center gap-1.5 border border-indigo-600/20"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5M9 11.25v1.5M12 9v3.75m3-6v6" />
                </svg>
                Pitch Deck
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function MiniTag({ label, active = false }: { label: string; active?: boolean }) {
  return (
    <span className={`text-xs px-2 py-0.5 rounded ${active ? 'bg-slate-700 text-slate-300' : 'bg-slate-800/50 text-slate-600'}`}>
      {label}
    </span>
  );
}
