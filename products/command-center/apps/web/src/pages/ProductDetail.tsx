import { useParams, Link } from 'react-router-dom';
import { useState, useEffect, useCallback } from 'react';
import { useApi } from '../hooks/useApi.js';
import Badge from '../components/Badge.js';
import MarkdownRenderer from '../components/MarkdownRenderer.js';
import PdfExportButton from '../components/PdfExportButton.js';

interface DocInfo {
  filename: string;
  title: string;
  category: 'prd' | 'api' | 'architecture' | 'adr' | 'audit' | 'design' | 'security' | 'strategy' | 'other';
  sizeBytes: number;
  lastModified: string;
}

interface ProductDocsResponse {
  product: string;
  docs: DocInfo[];
}

interface DocContentResponse {
  filename: string;
  title: string;
  category: string;
  content: string;
}

interface ProductOverview {
  name: string;
  displayName: string;
  phase: string;
  description: string;
  apiPort: number | null;
  webPort: number | null;
  fileCount: number;
  capabilities: string[];
}

const categoryConfig = {
  prd: { label: 'PRD', variant: 'info' as const, icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
  architecture: { label: 'Architecture', variant: 'warning' as const, icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4' },
  api: { label: 'API', variant: 'success' as const, icon: 'M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
  audit: { label: 'Audit', variant: 'danger' as const, icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4' },
  design: { label: 'Design', variant: 'info' as const, icon: 'M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zm0 8a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zm10 0a1 1 0 011-1h4a1 1 0 011 1v6a1 1 0 01-1 1h-4a1 1 0 01-1-1v-6z' },
  security: { label: 'Security', variant: 'danger' as const, icon: 'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z' },
  strategy: { label: 'Strategy', variant: 'warning' as const, icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
  adr: { label: 'ADR', variant: 'default' as const, icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
  other: { label: 'Other', variant: 'default' as const, icon: 'M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z' },
};

/** Sort order by importance */
const CATEGORY_ORDER: Record<string, number> = {
  prd: 0,
  architecture: 1,
  api: 2,
  design: 3,
  security: 4,
  strategy: 5,
  audit: 6,
  adr: 7,
  other: 8,
};

function sortDocsByImportance(docs: DocInfo[]): DocInfo[] {
  return [...docs].sort((a, b) => {
    const orderA = CATEGORY_ORDER[a.category] ?? 99;
    const orderB = CATEGORY_ORDER[b.category] ?? 99;
    if (orderA !== orderB) return orderA - orderB;
    return a.title.localeCompare(b.title);
  });
}

interface Slide {
  heading: string;
  content: string;
}

/** Split markdown into slides by ## headings. First slide gets the doc title. */
function splitIntoSlides(markdown: string, docTitle: string): Slide[] {
  const parts = markdown.split(/^(?=## )/m);
  const slides: Slide[] = [];

  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;

    const headingMatch = trimmed.match(/^## (.+)/);
    if (headingMatch) {
      slides.push({
        heading: headingMatch[1].trim(),
        content: trimmed.replace(/^## .+\n?/, '').trim(),
      });
    } else {
      // Content before the first ## heading — use doc title
      slides.push({ heading: docTitle, content: trimmed });
    }
  }

  return slides.length > 0 ? slides : [{ heading: docTitle, content: markdown }];
}

export default function ProductDetail() {
  const { name } = useParams<{ name: string }>();
  const [selectedDoc, setSelectedDoc] = useState<string | null>(null);
  const [docContent, setDocContent] = useState<DocContentResponse | null>(null);
  const [loadingDoc, setLoadingDoc] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [docTheme, setDocTheme] = useState<'light' | 'dark'>('light');
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());
  const [presentationMode, setPresentationMode] = useState(false);
  const [slideIndex, setSlideIndex] = useState(0);

  const { data: docsData, loading: docsLoading } = useApi<ProductDocsResponse>(`/products/${name}/docs`);
  const { data: productData } = useApi<{ product: ProductOverview }>(`/products/${name}`);

  // Split content by ## headings into slides
  const slides = docContent
    ? splitIntoSlides(docContent.content, docContent.title)
    : [];

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (presentationMode) {
      if (e.key === 'Escape') {
        setPresentationMode(false);
        return;
      }
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        setSlideIndex((i) => Math.min(i + 1, slides.length - 1));
        return;
      }
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        setSlideIndex((i) => Math.max(i - 1, 0));
        return;
      }
      return;
    }
    if (e.key === 'Escape' && fullscreen) setFullscreen(false);
  }, [fullscreen, presentationMode, slides.length]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  useEffect(() => {
    if (!selectedDoc) {
      setDocContent(null);
      return;
    }

    const loadDoc = async () => {
      setLoadingDoc(true);
      try {
        const res = await fetch(`/api/v1/products/${name}/docs/${selectedDoc}`);
        if (!res.ok) throw new Error('Failed to load document');
        const data = await res.json();
        setDocContent(data);
      } catch (err) {
        console.error('Error loading document:', err);
        setDocContent(null);
      } finally {
        setLoadingDoc(false);
      }
    };

    loadDoc();
  }, [selectedDoc, name]);

  if (docsLoading) {
    return (
      <div className="animate-pulse">
        <div className="h-8 bg-slate-800 rounded w-64 mb-6" />
        <div className="grid grid-cols-4 gap-6">
          <div className="col-span-1 space-y-3">
            <div className="h-6 bg-slate-800 rounded" />
            <div className="h-6 bg-slate-800 rounded" />
            <div className="h-6 bg-slate-800 rounded" />
          </div>
          <div className="col-span-3 h-96 bg-slate-800 rounded" />
        </div>
      </div>
    );
  }

  if (!docsData || !name) {
    return <p className="text-rose-400">Failed to load product documentation</p>;
  }

  const sortedDocs = sortDocsByImportance(docsData.docs);

  const groupedDocs: Record<string, DocInfo[]> = {};
  for (const doc of sortedDocs) {
    if (!groupedDocs[doc.category]) groupedDocs[doc.category] = [];
    groupedDocs[doc.category].push(doc);
  }

  // Maintain category order in the sidebar
  const orderedCategories = Object.keys(groupedDocs).sort(
    (a, b) => (CATEGORY_ORDER[a] ?? 99) - (CATEGORY_ORDER[b] ?? 99)
  );

  const toggleCategory = (category: string) => {
    const newCollapsed = new Set(collapsedCategories);
    if (newCollapsed.has(category)) {
      newCollapsed.delete(category);
    } else {
      newCollapsed.add(category);
    }
    setCollapsedCategories(newCollapsed);
  };

  const phaseVariant = (phase: string) => {
    if (phase === 'Production') return 'success';
    if (phase === 'MVP') return 'info';
    if (phase === 'Foundation') return 'warning';
    return 'default';
  };

  const isLight = docTheme === 'light';

  const enterPresentation = () => {
    setSlideIndex(0);
    setPresentationMode(true);
  };

  // --- Presentation mode ---
  if (presentationMode && docContent && slides.length > 0) {
    const slide = slides[slideIndex];
    return (
      <div className="fixed inset-0 z-50 bg-slate-950 flex flex-col">
        {/* Presentation toolbar */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-slate-800 bg-slate-950/95 backdrop-blur">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setPresentationMode(false)}
              className="text-slate-400 hover:text-white transition-colors"
              title="Exit presentation (Esc)"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <span className="text-sm text-slate-400 truncate">{docContent.title}</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-slate-500">
              {slideIndex + 1} / {slides.length}
            </span>
            <span className="text-xs text-slate-600">Arrow keys to navigate</span>
          </div>
        </div>

        {/* Slide content */}
        <div className="flex-1 flex items-center justify-center px-8 py-12 overflow-y-auto">
          <div className="max-w-4xl w-full">
            <h1 className="text-4xl font-bold text-white mb-8">{slide.heading}</h1>
            <div className="text-lg">
              <MarkdownRenderer content={slide.content} theme="dark" />
            </div>
          </div>
        </div>

        {/* Navigation buttons */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-slate-800">
          <button
            onClick={() => setSlideIndex((i) => Math.max(i - 1, 0))}
            disabled={slideIndex === 0}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              slideIndex === 0
                ? 'text-slate-600 cursor-not-allowed'
                : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Previous
          </button>

          {/* Slide indicator dots */}
          <div className="flex gap-1.5">
            {slides.map((_, i) => (
              <button
                key={i}
                onClick={() => setSlideIndex(i)}
                className={`w-2 h-2 rounded-full transition-colors ${
                  i === slideIndex ? 'bg-indigo-500' : 'bg-slate-700 hover:bg-slate-600'
                }`}
              />
            ))}
          </div>

          <button
            onClick={() => setSlideIndex((i) => Math.min(i + 1, slides.length - 1))}
            disabled={slideIndex === slides.length - 1}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              slideIndex === slides.length - 1
                ? 'text-slate-600 cursor-not-allowed'
                : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            Next
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>
    );
  }

  // --- Fullscreen document view ---
  if (fullscreen && selectedDoc && docContent) {
    return (
      <div className={`fixed inset-0 z-50 overflow-y-auto ${isLight ? 'bg-white' : 'bg-slate-950'}`}>
        {/* Fullscreen toolbar */}
        <div className={`sticky top-0 z-10 backdrop-blur border-b px-6 py-3 flex items-center justify-between ${
          isLight ? 'bg-white/95 border-slate-200' : 'bg-slate-950/95 border-slate-800'
        }`}>
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setFullscreen(false)}
              className={`transition-colors shrink-0 ${isLight ? 'text-slate-500 hover:text-slate-900' : 'text-slate-400 hover:text-white'}`}
              title="Exit fullscreen (Esc)"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <h1 className={`text-lg font-semibold truncate ${isLight ? 'text-slate-900' : 'text-white'}`}>{docContent.title}</h1>
            <Badge variant={categoryConfig[docContent.category as keyof typeof categoryConfig]?.variant ?? 'default'}>
              {categoryConfig[docContent.category as keyof typeof categoryConfig]?.label ?? docContent.category}
            </Badge>
          </div>
          <div className="flex items-center gap-4 shrink-0">
            {/* PDF Download */}
            <PdfExportButton
              productName={name!}
              docFilename={selectedDoc!}
              title={docContent.title}
              theme={docTheme}
              compact
            />
            {/* Present */}
            <button
              onClick={() => { setFullscreen(false); enterPresentation(); }}
              className={`p-1.5 rounded-lg transition-colors ${isLight ? 'text-slate-500 hover:text-slate-900 hover:bg-slate-100' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
              title="Present"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 010 1.972l-11.54 6.347a1.125 1.125 0 01-1.667-.986V5.653z" />
              </svg>
            </button>
            {/* Theme toggle */}
            <button
              onClick={() => setDocTheme(isLight ? 'dark' : 'light')}
              className={`p-1.5 rounded-lg transition-colors ${isLight ? 'text-slate-500 hover:text-slate-900 hover:bg-slate-100' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
              title={isLight ? 'Switch to dark mode' : 'Switch to light mode'}
            >
              {isLight ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              )}
            </button>
            <span className={`text-sm ${isLight ? 'text-slate-500' : 'text-slate-500'}`}>{productData?.product.displayName || name}</span>
            <span className={`text-sm ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>Esc to exit</span>
          </div>
        </div>

        {/* Fullscreen content */}
        <div className="max-w-5xl mx-auto px-8 py-8">
          <MarkdownRenderer content={docContent.content} theme={docTheme} />
        </div>
      </div>
    );
  }

  // --- Normal view ---
  return (
    <div>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-slate-500 mb-6">
        <Link to="/products" className="hover:text-slate-300 transition-colors">Products</Link>
        <span>/</span>
        <span className="text-slate-300">{productData?.product.displayName || name}</span>
        {selectedDoc && (
          <>
            <span>/</span>
            <span className="text-slate-300">{docContent?.title || selectedDoc}</span>
          </>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 lg:h-[calc(100vh-8rem)]">
        {/* Left sidebar navigation — scrolls independently */}
        <div className="lg:col-span-1 lg:overflow-y-auto lg:min-h-0 scrollbar-thin">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            {/* Product header */}
            <div className="mb-4 pb-4 border-b border-slate-800">
              <h2 className="text-lg font-semibold text-white mb-2">
                {productData?.product.displayName || name}
              </h2>
              {productData?.product.phase && (
                <Badge variant={phaseVariant(productData.product.phase)}>
                  {productData.product.phase}
                </Badge>
              )}
            </div>

            {/* Doc categories */}
            <nav className="space-y-1">
              {docsData.docs.length === 0 ? (
                <p className="text-sm text-slate-500 italic">No documents available</p>
              ) : (
                orderedCategories.map((category) => {
                  const docs = groupedDocs[category];
                  const config = categoryConfig[category as keyof typeof categoryConfig];
                  const isCollapsed = collapsedCategories.has(category);
                  const shouldCollapse = docs.length > 3;

                  return (
                    <div key={category} className="space-y-1">
                      {/* Category header */}
                      <div
                        className={`flex items-center gap-2 px-2 py-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wider ${
                          shouldCollapse ? 'cursor-pointer hover:text-slate-300' : ''
                        }`}
                        onClick={() => shouldCollapse && toggleCategory(category)}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={config.icon} />
                        </svg>
                        <span className="flex-1">{config.label}</span>
                        {shouldCollapse && (
                          <svg
                            className={`w-4 h-4 transition-transform ${isCollapsed ? '' : 'rotate-90'}`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        )}
                      </div>

                      {/* Doc list */}
                      {(!shouldCollapse || !isCollapsed) && (
                        <div className="space-y-0.5">
                          {docs.map((doc) => (
                            <button
                              key={doc.filename}
                              onClick={() => setSelectedDoc(doc.filename)}
                              className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                                selectedDoc === doc.filename
                                  ? 'bg-indigo-600/20 text-indigo-400 font-medium'
                                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                              }`}
                            >
                              {doc.title}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </nav>
          </div>
        </div>

        {/* Main content area — scrolls independently */}
        <div className="lg:col-span-3 lg:overflow-y-auto lg:min-h-0 scrollbar-thin">
          <div className={`rounded-xl p-8 border ${selectedDoc && isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'}`}>
            {!selectedDoc ? (
              // Landing page - product overview
              <div>
                <h1 className="text-3xl font-bold text-white mb-3">
                  {productData?.product.displayName || name}
                </h1>
                <p className="text-slate-400 text-lg mb-6">
                  {productData?.product.description || 'Product documentation'}
                </p>

                {productData?.product && (
                  <div className="grid grid-cols-2 gap-4 mb-8">
                    <div className="bg-slate-950 border border-slate-800 rounded-lg p-4">
                      <div className="text-sm text-slate-500 mb-1">Phase</div>
                      <div className="text-lg font-semibold text-white">
                        {productData.product.phase}
                      </div>
                    </div>
                    <div className="bg-slate-950 border border-slate-800 rounded-lg p-4">
                      <div className="text-sm text-slate-500 mb-1">Documents</div>
                      <div className="text-lg font-semibold text-white">
                        {productData.product.fileCount}
                      </div>
                    </div>
                    {productData.product.apiPort && (
                      <div className="bg-slate-950 border border-slate-800 rounded-lg p-4">
                        <div className="text-sm text-slate-500 mb-1">API Port</div>
                        <div className="text-lg font-semibold text-white">
                          :{productData.product.apiPort}
                        </div>
                      </div>
                    )}
                    {productData.product.webPort && (
                      <div className="bg-slate-950 border border-slate-800 rounded-lg p-4">
                        <div className="text-sm text-slate-500 mb-1">Web Port</div>
                        <div className="text-lg font-semibold text-white">
                          :{productData.product.webPort}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Document index - sorted by importance */}
                <div>
                  <h2 className="text-xl font-semibold text-white mb-4">Documentation</h2>
                  {sortedDocs.length === 0 ? (
                    <div className="text-center py-12 text-slate-500">
                      <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <p className="text-lg font-medium mb-2">No documentation available</p>
                      <p className="text-sm">This product doesn't have any documentation yet.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-3">
                      {sortedDocs.map((doc) => {
                        const config = categoryConfig[doc.category];
                        return (
                          <button
                            key={doc.filename}
                            onClick={() => setSelectedDoc(doc.filename)}
                            className="bg-slate-950 border border-slate-800 rounded-lg p-4 hover:border-slate-700 transition-colors text-left"
                          >
                            <div className="flex items-start justify-between mb-2">
                              <h3 className="text-base font-semibold text-white">{doc.title}</h3>
                              <Badge variant={config.variant}>{config.label}</Badge>
                            </div>
                            <div className="text-xs text-slate-500">
                              Last modified: {new Date(doc.lastModified).toLocaleDateString()}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              // Document view
              <div>
                {loadingDoc ? (
                  <div className="animate-pulse space-y-4">
                    <div className="h-8 bg-slate-800 rounded w-3/4" />
                    <div className="h-4 bg-slate-800 rounded w-1/2" />
                    <div className="space-y-3 mt-8">
                      <div className="h-4 bg-slate-800 rounded" />
                      <div className="h-4 bg-slate-800 rounded" />
                      <div className="h-4 bg-slate-800 rounded w-5/6" />
                    </div>
                  </div>
                ) : docContent ? (
                  <div>
                    {/* Doc header */}
                    <div className={`mb-8 pb-6 border-b ${isLight ? 'border-slate-200' : 'border-slate-800'}`}>
                      <div className="flex items-start justify-between mb-3">
                        <h1 className={`text-3xl font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>{docContent.title}</h1>
                        <div className="flex items-center gap-2 shrink-0">
                          {/* PDF Download */}
                          <PdfExportButton
                            productName={name!}
                            docFilename={selectedDoc!}
                            title={docContent.title}
                            theme={docTheme}
                            compact
                          />
                          {/* Theme toggle */}
                          <button
                            onClick={() => setDocTheme(isLight ? 'dark' : 'light')}
                            className={`transition-colors p-1.5 rounded-lg ${isLight ? 'text-slate-500 hover:text-slate-900 hover:bg-slate-100' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
                            title={isLight ? 'Switch to dark mode' : 'Switch to light mode'}
                          >
                            {isLight ? (
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                              </svg>
                            ) : (
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                              </svg>
                            )}
                          </button>
                          {/* Present */}
                          <button
                            onClick={enterPresentation}
                            className={`transition-colors p-1.5 rounded-lg ${isLight ? 'text-slate-500 hover:text-slate-900 hover:bg-slate-100' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
                            title="Present"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 010 1.972l-11.54 6.347a1.125 1.125 0 01-1.667-.986V5.653z" />
                            </svg>
                          </button>
                          {/* Fullscreen */}
                          <button
                            onClick={() => setFullscreen(true)}
                            className={`transition-colors p-1.5 rounded-lg ${isLight ? 'text-slate-500 hover:text-slate-900 hover:bg-slate-100' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
                            title="Fullscreen"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                            </svg>
                          </button>
                          <Badge variant={categoryConfig[docContent.category as keyof typeof categoryConfig]?.variant ?? 'default'}>
                            {categoryConfig[docContent.category as keyof typeof categoryConfig]?.label ?? docContent.category}
                          </Badge>
                        </div>
                      </div>
                      <p className="text-sm text-slate-500">
                        Last modified: {new Date(
                          docsData.docs.find(d => d.filename === selectedDoc)?.lastModified || ''
                        ).toLocaleString()}
                      </p>
                    </div>

                    {/* Markdown content */}
                    <MarkdownRenderer content={docContent.content} theme={docTheme} />
                  </div>
                ) : (
                  <div className="text-center py-12 text-rose-400">
                    <p>Failed to load document</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
