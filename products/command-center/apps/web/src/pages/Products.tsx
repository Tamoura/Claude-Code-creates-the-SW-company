import { Link } from 'react-router-dom';
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

  if (loading) return <div className="animate-pulse"><div className="h-8 bg-gray-800 rounded w-32 mb-6" /></div>;
  if (!data) return <p className="text-red-400">Failed to load products</p>;

  const phaseVariant = (phase: string) => {
    if (phase === 'Production') return 'success';
    if (phase === 'MVP') return 'info';
    if (phase === 'Foundation') return 'warning';
    return 'default';
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-1">Products</h1>
      <p className="text-gray-500 mb-8">{data.products.length} products in the portfolio</p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {data.products.map((product) => (
          <Link
            key={product.name}
            to={`/products/${product.name}`}
            className="bg-gray-900 border border-gray-800 rounded-xl p-6 hover:border-gray-700 hover:shadow-lg hover:shadow-blue-500/10 transition-all group"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-semibold text-white group-hover:text-blue-400 transition-colors">
                    {product.displayName}
                  </h3>
                  {product.docs.length > 0 && (
                    <span className="text-xs text-gray-500 bg-gray-800 px-2 py-0.5 rounded">
                      {product.docs.length} {product.docs.length === 1 ? 'doc' : 'docs'}
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-500 mt-0.5">{product.description}</p>
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

            {/* Ports & stats */}
            <div className="flex items-center gap-4 text-xs text-gray-500">
              {product.apiPort && <span>API :{product.apiPort}</span>}
              {product.webPort && <span>Web :{product.webPort}</span>}
              <span>{product.fileCount} files</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

function MiniTag({ label, active = false }: { label: string; active?: boolean }) {
  return (
    <span className={`text-xs px-2 py-0.5 rounded ${active ? 'bg-gray-700 text-gray-300' : 'bg-gray-800/50 text-gray-600'}`}>
      {label}
    </span>
  );
}
