import { useApi } from '../hooks/useApi.js';
import MarkdownRenderer from '../components/MarkdownRenderer.js';

interface Article {
  number: string;
  title: string;
  content: string;
}

interface ConstitutionData {
  version: string | null;
  ratifiedAt: string | null;
  lastAmended: string | null;
  preamble: string;
  articles: Article[];
  raw: string;
}

// Roman numerals in display order
const ROMAN_ORDER = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];

function romanValue(r: string): number {
  const idx = ROMAN_ORDER.indexOf(r.toUpperCase());
  return idx === -1 ? 999 : idx;
}

function articleAnchor(number: string): string {
  return `article-${number.toLowerCase()}`;
}

function scrollToArticle(number: string) {
  const el = document.getElementById(articleAnchor(number));
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

export default function Constitution() {
  const { data, loading } = useApi<ConstitutionData>('/constitution');

  if (loading) return <LoadingSkeleton />;
  if (!data) return <p className="text-red-400">Failed to load constitution</p>;

  const articles = [...(data.articles ?? [])].sort(
    (a, b) => romanValue(a.number) - romanValue(b.number),
  );

  return (
    <div>
      {/* Page header */}
      <div className="mb-8">
        <div className="flex items-start justify-between gap-4 flex-wrap mb-2">
          <h1 className="text-2xl font-bold text-white">Constitution</h1>
          <div className="flex items-center gap-2 flex-wrap">
            {data.version && (
              <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-500/20 text-blue-400 border border-blue-500/30">
                v{data.version}
              </span>
            )}
          </div>
        </div>
        <p className="text-gray-500 text-sm">Governing principles for all ConnectSW specification, planning, and implementation work</p>

        {/* Meta line */}
        <div className="flex items-center gap-4 mt-3 text-xs text-gray-500 flex-wrap">
          {data.ratifiedAt && (
            <span>Ratified: <span className="text-gray-400">{data.ratifiedAt}</span></span>
          )}
          {data.lastAmended && (
            <span>Last Amended: <span className="text-gray-400">{data.lastAmended}</span></span>
          )}
          <span>{articles.length} Articles</span>
        </div>
      </div>

      {/* Two-column layout */}
      <div className="flex gap-8 items-start">
        {/* Left: sticky article navigation */}
        <aside className="hidden xl:block w-52 flex-shrink-0 sticky top-8 self-start">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-600 mb-3">Articles</p>
            <nav className="space-y-0.5">
              {articles.map((article) => (
                <button
                  key={article.number}
                  onClick={() => scrollToArticle(article.number)}
                  className="w-full text-left flex items-start gap-2 px-2 py-1.5 rounded-md text-xs text-gray-400 hover:text-gray-200 hover:bg-gray-800 transition-colors group"
                >
                  <span className="font-mono text-gray-600 group-hover:text-gray-400 flex-shrink-0 w-6">
                    {article.number}
                  </span>
                  <span className="line-clamp-2 leading-tight">{article.title}</span>
                </button>
              ))}
            </nav>
          </div>
        </aside>

        {/* Main content */}
        <div className="flex-1 min-w-0">
          {/* Preamble */}
          {data.preamble && (
            <div className="mb-8 bg-gray-900 border border-gray-800 rounded-xl p-6">
              <h2 className="text-lg font-bold text-white mb-3">Preamble</h2>
              <p className="text-gray-300 text-sm leading-relaxed">{data.preamble}</p>
            </div>
          )}

          {/* Articles */}
          <div className="space-y-6">
            {articles.map((article) => (
              <div
                key={article.number}
                id={articleAnchor(article.number)}
                className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden scroll-mt-8"
              >
                {/* Article header */}
                <div className="px-6 py-4 border-b border-gray-800 flex items-baseline gap-3">
                  <span className="font-mono text-2xl font-bold text-blue-400 leading-none flex-shrink-0">
                    {article.number}
                  </span>
                  <h2 className="text-lg font-bold text-white">{article.title}</h2>
                </div>

                {/* Article body */}
                <div className="px-6 py-5">
                  {article.content ? (
                    <MarkdownRenderer content={article.content} theme="dark" />
                  ) : (
                    <p className="text-gray-500 text-sm italic">No content available</p>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Governance note */}
          {articles.length === 0 && (
            <p className="text-gray-500 text-sm">No articles found in constitution</p>
          )}

          {/* Amendment history note */}
          <div className="mt-8 bg-gray-900/50 border border-gray-800 rounded-xl p-5">
            <h3 className="text-white font-semibold text-sm mb-2">Amendment Process</h3>
            <p className="text-gray-500 text-xs leading-relaxed">
              All amendments require CEO approval. Versions follow semantic versioning: MAJOR for principle removal/redefinition,
              MINOR for additions, PATCH for clarifications. All dependent templates and agent definitions must be updated after
              each amendment.
            </p>
            {data.lastAmended && (
              <p className="text-gray-600 text-xs mt-2">Last amended: {data.lastAmended}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="h-8 bg-gray-800 rounded w-56 mb-2" />
      <div className="h-4 bg-gray-800 rounded w-96 mb-4" />
      <div className="h-4 bg-gray-800 rounded w-48 mb-8" />
      <div className="flex gap-8">
        <div className="hidden xl:block w-52 flex-shrink-0">
          <div className="h-80 bg-gray-800 rounded-xl" />
        </div>
        <div className="flex-1 space-y-4">
          <div className="h-24 bg-gray-800 rounded-xl" />
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-48 bg-gray-800 rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  );
}
