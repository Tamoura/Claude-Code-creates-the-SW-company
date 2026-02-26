import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApi } from '../hooks/useApi.js';
import { ContentSlide, isContentSlide } from '../components/pitch-deck/ContentSlides.js';
import { DataSlide, isDataSlide } from '../components/pitch-deck/DataSlides.js';
import { GridSlide, isGridSlide } from '../components/pitch-deck/GridSlides.js';

interface PitchDeckData {
  product: string;
  subtitle: string;
  slides: Array<{
    layout: string;
    audiences: string[];
    [key: string]: unknown;
  }>;
}

interface ProductData {
  product: {
    displayName: string;
    showcase: { color: string } | null;
  };
}

const AUDIENCE_OPTIONS = ['All', 'Founders', 'Investors', 'Consumers', 'Customers'] as const;

export default function PitchDeck() {
  const { name } = useParams<{ name: string }>();
  const navigate = useNavigate();
  const { data: deckData, loading: deckLoading } = useApi<PitchDeckData>(`/products/${name}/pitch-deck`);
  const { data: productData } = useApi<ProductData>(`/products/${name}`);

  const [currentSlide, setCurrentSlide] = useState(0);
  const [audience, setAudience] = useState<string>('All');
  const [isTransitioning, setIsTransitioning] = useState(false);

  const accentColor = productData?.product?.showcase?.color ?? '#3B82F6';
  const displayName = productData?.product?.displayName ?? name ?? '';

  // Filter slides by audience
  const allSlides = deckData?.slides ?? [];
  const filteredSlides = audience === 'All'
    ? allSlides
    : allSlides.filter((s) => s.audiences?.includes(audience.toLowerCase()));

  const totalSlides = filteredSlides.length;

  const goToSlide = useCallback((index: number) => {
    if (index < 0 || index >= totalSlides || index === currentSlide) return;
    setIsTransitioning(true);
    setTimeout(() => {
      setCurrentSlide(index);
      setIsTransitioning(false);
    }, 150);
  }, [totalSlides, currentSlide]);

  const next = useCallback(() => goToSlide(currentSlide + 1), [goToSlide, currentSlide]);
  const prev = useCallback(() => goToSlide(currentSlide - 1), [goToSlide, currentSlide]);
  const exit = useCallback(() => navigate(`/products`), [navigate]);

  // Reset slide index when audience filter changes
  useEffect(() => {
    setCurrentSlide(0);
  }, [audience]);

  // Keyboard navigation
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); next(); }
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); prev(); }
      else if (e.key === 'Escape') { e.preventDefault(); exit(); }
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [next, prev, exit]);

  if (deckLoading) {
    return (
      <div className="fixed inset-0 z-50 bg-slate-950 flex items-center justify-center">
        <div className="animate-pulse text-slate-500 text-lg">Loading pitch deck...</div>
      </div>
    );
  }

  if (!deckData || totalSlides === 0) {
    return (
      <div className="fixed inset-0 z-50 bg-slate-950 flex flex-col items-center justify-center gap-4">
        <p className="text-slate-400 text-lg">No pitch deck available for this product.</p>
        <button onClick={exit} className="text-indigo-400 hover:text-indigo-300 underline">
          Go back
        </button>
      </div>
    );
  }

  const slide = filteredSlides[currentSlide];
  const progress = totalSlides > 1 ? ((currentSlide + 1) / totalSlides) * 100 : 100;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950 flex flex-col overflow-hidden">
      {/* Progress bar */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-slate-900 z-20">
        <div
          className="h-full transition-all duration-300 ease-out"
          style={{ width: `${progress}%`, backgroundColor: accentColor }}
        />
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between px-6 py-3 z-20 relative">
        <div className="flex items-center gap-4">
          <button
            onClick={exit}
            className="text-slate-400 hover:text-white transition-colors p-1"
            title="Close (Esc)"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <span className="text-white font-semibold">{displayName}</span>
          <span className="text-slate-500 text-sm">
            {currentSlide + 1} / {totalSlides}
          </span>
        </div>

        {/* Audience filter */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 mr-1">Audience:</span>
          {AUDIENCE_OPTIONS.map((a) => (
            <button
              key={a}
              onClick={() => setAudience(a)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                audience === a
                  ? 'text-white'
                  : 'bg-slate-800 text-slate-500 hover:text-slate-300'
              }`}
              style={audience === a ? { backgroundColor: `${accentColor}30`, color: accentColor } : undefined}
            >
              {a}
            </button>
          ))}
        </div>
      </div>

      {/* Slide area */}
      <div className="flex-1 relative">
        <div
          className={`absolute inset-0 transition-all duration-150 ${
            isTransitioning ? 'opacity-0 translate-y-2' : 'opacity-100 translate-y-0'
          }`}
        >
          {renderSlide(slide, accentColor)}
        </div>
      </div>

      {/* Navigation bar */}
      <div className="flex items-center justify-between px-6 py-4 z-20 relative">
        <button
          onClick={prev}
          disabled={currentSlide === 0}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-30 disabled:cursor-not-allowed bg-slate-800 text-slate-300 hover:bg-slate-700 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Prev
        </button>

        {/* Slide dots */}
        <div className="flex items-center gap-1.5">
          {filteredSlides.map((_, i) => (
            <button
              key={i}
              onClick={() => goToSlide(i)}
              className="w-2 h-2 rounded-full transition-all"
              style={{
                backgroundColor: i === currentSlide ? accentColor : 'rgba(255,255,255,0.15)',
                transform: i === currentSlide ? 'scale(1.3)' : 'scale(1)',
              }}
            />
          ))}
        </div>

        <button
          onClick={next}
          disabled={currentSlide === totalSlides - 1}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-30 disabled:cursor-not-allowed bg-slate-800 text-slate-300 hover:bg-slate-700 transition-colors"
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

/* eslint-disable @typescript-eslint/no-explicit-any */
function renderSlide(slide: any, accentColor: string) {
  if (isContentSlide(slide.layout)) return <ContentSlide slide={slide} accentColor={accentColor} />;
  if (isDataSlide(slide.layout)) return <DataSlide slide={slide} accentColor={accentColor} />;
  if (isGridSlide(slide.layout)) return <GridSlide slide={slide} accentColor={accentColor} />;
  return (
    <div className="flex items-center justify-center h-full">
      <p className="text-slate-500">Unknown slide layout: {slide.layout}</p>
    </div>
  );
}
