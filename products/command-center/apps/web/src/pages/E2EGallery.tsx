import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useApi } from '../hooks/useApi.js';
import StatCard from '../components/StatCard.js';

interface ScreenshotInfo {
  name: string;
  filename: string;
  product: string;
  category: string;
  url: string;
  sizeKb: number;
  modifiedAt: string;
}

interface VideoInfo {
  name: string;
  filename: string;
  product: string;
  testName: string;
  url: string;
  sizeKb: number;
  modifiedAt: string;
}

interface TraceInfo {
  name: string;
  filename: string;
  product: string;
  testName: string;
  url: string;
  sizeKb: number;
}

interface ProductArtifacts {
  name: string;
  screenshots: ScreenshotInfo[];
  videos: VideoInfo[];
  traces: TraceInfo[];
}

interface GalleryResponse {
  products: ProductArtifacts[];
}

type TabType = 'screenshots' | 'videos' | 'traces';

const TABS: { key: TabType; label: string; icon: string }[] = [
  { key: 'screenshots', label: 'Screenshots', icon: 'M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.41a2.25 2.25 0 013.182 0l2.909 2.91m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z' },
  { key: 'videos', label: 'Videos', icon: 'M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 01-1.125-1.125M3.375 19.5h1.5C5.496 19.5 6 18.996 6 18.375m-3.75 0V5.625m0 12.75v-1.5c0-.621.504-1.125 1.125-1.125m18.375 2.625V5.625m0 12.75c0 .621-.504 1.125-1.125 1.125m1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125m0 3.75h-1.5A1.125 1.125 0 0118 18.375M20.625 4.5H3.375m17.25 0c.621 0 1.125.504 1.125 1.125M20.625 4.5h-1.5C18.504 4.5 18 5.004 18 5.625m3.75 0v1.5c0 .621-.504 1.125-1.125 1.125M3.375 4.5c-.621 0-1.125.504-1.125 1.125M3.375 4.5h1.5C5.496 4.5 6 5.004 6 5.625m-3.75 0v1.5c0 .621.504 1.125 1.125 1.125m0 0h1.5m-1.5 0c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125m1.5-3.75C5.496 8.25 6 7.746 6 7.125v-1.5M4.875 8.25C5.496 8.25 6 8.754 6 9.375v1.5m0-5.25v5.25m0-5.25C6 5.004 6.504 4.5 7.125 4.5h9.75c.621 0 1.125.504 1.125 1.125m1.125 2.625h1.5m-1.5 0A1.125 1.125 0 0118 7.125v-1.5m1.125 2.625c-.621 0-1.125.504-1.125 1.125v1.5m2.625-2.625c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125M18 5.625v5.25M7.125 12h9.75m-9.75 0A1.125 1.125 0 016 10.875M7.125 12C6.504 12 6 12.504 6 13.125m0-2.25C6 11.496 5.496 12 4.875 12M18 10.875c0 .621-.504 1.125-1.125 1.125M18 10.875c0 .621.504 1.125 1.125 1.125m-2.25 0c.621 0 1.125.504 1.125 1.125m-12 5.25v-5.25m0 5.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125m-12 0v-1.5c0-.621-.504-1.125-1.125-1.125M18 18.375v-5.25m0 5.25v-1.5c0-.621.504-1.125 1.125-1.125M18 13.125v1.5c0 .621.504 1.125 1.125 1.125M18 13.125c0-.621.504-1.125 1.125-1.125M6 13.125v1.5c0 .621-.504 1.125-1.125 1.125M6 13.125C6 12.504 5.496 12 4.875 12m-1.5 0h1.5m-1.5 0c-.621 0-1.125-.504-1.125-1.125v-1.5c0-.621.504-1.125 1.125-1.125M19.125 12h1.5m0 0c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125m1.5 3.75c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125' },
  { key: 'traces', label: 'Traces', icon: 'M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z' },
];

function productDisplayName(name: string): string {
  return name.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

function categoryColor(category: string): string {
  const colors: Record<string, string> = {
    'Smoke Tests': 'bg-slate-700 text-slate-300',
    'Authentication': 'bg-blue-900/50 text-blue-300',
    'Registration & Login': 'bg-indigo-900/50 text-indigo-300',
    'Assessment': 'bg-purple-900/50 text-purple-300',
    'Profile': 'bg-emerald-900/50 text-emerald-300',
    'Learning Paths': 'bg-amber-900/50 text-amber-300',
    'Dashboard': 'bg-cyan-900/50 text-cyan-300',
    'Cross-Page Validation': 'bg-rose-900/50 text-rose-300',
    'User Stories': 'bg-teal-900/50 text-teal-300',
  };
  return colors[category] || 'bg-slate-700 text-slate-300';
}

export default function E2EGallery() {
  const { product: urlProduct } = useParams<{ product?: string }>();
  const { data, loading, error } = useApi<GalleryResponse>('/e2e-gallery');
  const [activeTab, setActiveTab] = useState<TabType>('screenshots');
  const [selectedProduct, setSelectedProduct] = useState<string>(urlProduct || 'all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [lightboxImage, setLightboxImage] = useState<ScreenshotInfo | null>(null);

  // Sync with URL param changes
  useEffect(() => {
    if (urlProduct) setSelectedProduct(urlProduct);
  }, [urlProduct]);

  if (loading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-8 bg-slate-800 rounded w-56 mb-2" />
        <div className="h-4 bg-slate-800 rounded w-96 mb-8" />
        <div className="grid grid-cols-4 gap-4 mb-8">
          {[1, 2, 3, 4].map((i) => <div key={i} className="h-24 bg-slate-800 rounded-xl" />)}
        </div>
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => <div key={i} className="h-48 bg-slate-800 rounded-xl" />)}
        </div>
      </div>
    );
  }

  if (error || !data) {
    return <p className="text-rose-400">Failed to load E2E test gallery: {error}</p>;
  }

  const products = data.products;

  const filteredProducts = selectedProduct === 'all'
    ? products
    : products.filter(p => p.name === selectedProduct);

  const totalScreenshots = filteredProducts.reduce((sum, p) => sum + p.screenshots.length, 0);
  const totalVideos = filteredProducts.reduce((sum, p) => sum + p.videos.length, 0);
  const totalTraces = filteredProducts.reduce((sum, p) => sum + p.traces.length, 0);

  const allScreenshots = filteredProducts.flatMap(p => p.screenshots);
  const allVideos = filteredProducts.flatMap(p => p.videos);
  const allTraces = filteredProducts.flatMap(p => p.traces);

  const categories = [...new Set(allScreenshots.map(s => s.category))].sort();
  const displayScreenshots = selectedCategory === 'all'
    ? allScreenshots
    : allScreenshots.filter(s => s.category === selectedCategory);

  return (
    <div>
      {/* Breadcrumb */}
      {urlProduct && (
        <div className="flex items-center gap-2 text-sm text-slate-500 mb-4">
          <Link to="/products" className="hover:text-slate-300 transition-colors">Products</Link>
          <span>/</span>
          <Link to={`/products/${urlProduct}`} className="hover:text-slate-300 transition-colors">{productDisplayName(urlProduct)}</Link>
          <span>/</span>
          <span className="text-slate-300">E2E Tests</span>
        </div>
      )}

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white mb-1">
          {urlProduct ? `${productDisplayName(urlProduct)} — E2E Tests` : 'E2E Test Gallery'}
        </h1>
        <p className="text-sm text-slate-400">
          {urlProduct
            ? `Screenshots, videos, and traces from Playwright E2E test runs for ${productDisplayName(urlProduct)}`
            : 'Screenshots, videos, and traces from Playwright E2E test runs across all products'}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {!urlProduct && <StatCard label="Products with E2E" value={products.length} />}
        <StatCard label="Screenshots" value={totalScreenshots} />
        <StatCard label="Test Videos" value={totalVideos} />
        <StatCard label="Trace Files" value={totalTraces} />
      </div>

      {/* Product filter — hidden when viewing a specific product */}
      {!urlProduct && (
        <div className="flex items-center gap-3 mb-6">
          <span className="text-xs text-slate-500 uppercase tracking-wider font-medium">Product:</span>
          <div className="flex gap-2">
            <button
              onClick={() => setSelectedProduct('all')}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                selectedProduct === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              All
            </button>
            {products.map(p => (
              <button
                key={p.name}
                onClick={() => setSelectedProduct(p.name)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  selectedProduct === p.name
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                {productDisplayName(p.name)}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-slate-800 mb-6">
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.key
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d={tab.icon} />
            </svg>
            {tab.label}
            <span className={`text-xs px-1.5 py-0.5 rounded-full ${
              activeTab === tab.key ? 'bg-blue-600/20 text-blue-300' : 'bg-slate-800 text-slate-500'
            }`}>
              {tab.key === 'screenshots' ? allScreenshots.length :
               tab.key === 'videos' ? allVideos.length : allTraces.length}
            </span>
          </button>
        ))}
      </div>

      {/* Screenshots tab */}
      {activeTab === 'screenshots' && (
        <div>
          {/* Category filter */}
          {categories.length > 1 && (
            <div className="flex flex-wrap items-center gap-2 mb-6">
              <span className="text-xs text-slate-500 uppercase tracking-wider font-medium">Category:</span>
              <button
                onClick={() => setSelectedCategory('all')}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                  selectedCategory === 'all'
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                All ({allScreenshots.length})
              </button>
              {categories.map(cat => {
                const count = allScreenshots.filter(s => s.category === cat).length;
                return (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                      selectedCategory === cat
                        ? 'bg-blue-600 text-white'
                        : categoryColor(cat)
                    }`}
                  >
                    {cat} ({count})
                  </button>
                );
              })}
            </div>
          )}

          {/* Screenshot grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {displayScreenshots.map(screenshot => (
              <div
                key={`${screenshot.product}-${screenshot.filename}`}
                className="group bg-slate-900 border border-slate-800 rounded-xl overflow-hidden hover:border-slate-600 transition-all cursor-pointer"
                onClick={() => setLightboxImage(screenshot)}
              >
                <div className="relative aspect-video bg-slate-950 flex items-center justify-center overflow-hidden">
                  <img
                    src={screenshot.url}
                    alt={screenshot.name}
                    className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                    <svg className="w-10 h-10 text-white opacity-0 group-hover:opacity-80 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607zM10.5 7.5v6m3-3h-6" />
                    </svg>
                  </div>
                </div>
                <div className="p-3">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="text-sm font-medium text-white truncate">{screenshot.name}</h3>
                    <span className="text-[10px] text-slate-500">{screenshot.sizeKb} KB</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${categoryColor(screenshot.category)}`}>
                      {screenshot.category}
                    </span>
                    {!urlProduct && selectedProduct === 'all' && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                        {productDisplayName(screenshot.product)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {displayScreenshots.length === 0 && (
            <div className="text-center py-16 text-slate-500">
              <p>No screenshots found for this filter.</p>
            </div>
          )}
        </div>
      )}

      {/* Videos tab */}
      {activeTab === 'videos' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {allVideos.map(video => (
            <div
              key={`${video.product}-${video.testName}-${video.filename}`}
              className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden"
            >
              <video
                controls
                preload="metadata"
                className="w-full aspect-video bg-black"
              >
                <source src={video.url} type={video.filename.endsWith('.webm') ? 'video/webm' : 'video/mp4'} />
                Your browser does not support video playback.
              </video>
              <div className="p-3">
                <h3 className="text-sm font-medium text-white mb-1 truncate" title={video.name}>
                  {video.name}
                </h3>
                <div className="flex items-center gap-3 text-[10px] text-slate-500">
                  <span>{productDisplayName(video.product)}</span>
                  <span>{video.sizeKb} KB</span>
                  <span>{new Date(video.modifiedAt).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          ))}
          {allVideos.length === 0 && (
            <div className="col-span-2 text-center py-16 text-slate-500">
              <p>No test videos found. Run Playwright tests with <code className="text-slate-400">video: 'on'</code> in config.</p>
            </div>
          )}
        </div>
      )}

      {/* Traces tab */}
      {activeTab === 'traces' && (
        <div className="space-y-2">
          {allTraces.map(trace => (
            <a
              key={`${trace.product}-${trace.testName}-${trace.filename}`}
              href={trace.url}
              download
              className="flex items-center gap-4 bg-slate-900 border border-slate-800 rounded-lg p-4 hover:border-slate-600 transition-colors"
            >
              <svg className="w-8 h-8 text-slate-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m.75 12l3 3m0 0l3-3m-3 3v-6m-1.5-9H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              </svg>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-medium text-white truncate">{trace.name}</h3>
                <p className="text-[10px] text-slate-500">{trace.filename} - {trace.sizeKb} KB</p>
              </div>
              <span className="text-xs text-slate-400 bg-slate-800 px-2 py-1 rounded">
                {productDisplayName(trace.product)}
              </span>
            </a>
          ))}
          {allTraces.length === 0 && (
            <div className="text-center py-16 text-slate-500">
              <p>No trace files found. Run Playwright tests with <code className="text-slate-400">trace: 'on'</code> in config.</p>
            </div>
          )}
        </div>
      )}

      {/* Lightbox */}
      {lightboxImage && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-8 cursor-pointer"
          onClick={() => setLightboxImage(null)}
        >
          <div className="relative max-w-6xl max-h-full w-full" onClick={e => e.stopPropagation()}>
            <button
              onClick={() => setLightboxImage(null)}
              className="absolute -top-10 right-0 text-white/70 hover:text-white text-sm flex items-center gap-1"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
              Close
            </button>
            <img
              src={lightboxImage.url}
              alt={lightboxImage.name}
              className="w-full h-auto max-h-[85vh] object-contain rounded-lg"
            />
            <div className="mt-3 text-center">
              <h3 className="text-lg font-medium text-white">{lightboxImage.name}</h3>
              <p className="text-sm text-slate-400">
                {productDisplayName(lightboxImage.product)} - {lightboxImage.category} - {lightboxImage.sizeKb} KB
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
