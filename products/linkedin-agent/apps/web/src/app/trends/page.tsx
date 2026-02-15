'use client';

import { useState } from 'react';
import { apiFetch } from '@/lib/api';
import { TrendCard } from '@/components/TrendCard';

interface AnalysisTopic {
  title: string;
  description: string;
  relevance: number;
  suggestedAngle: string;
}

interface ApiAnalysisResponse {
  trendSource: {
    id: string;
    title: string;
    tags: string[];
  };
  analysis: {
    topics: AnalysisTopic[];
    overallTheme: string;
    recommendedTags: string[];
  };
  usage: {
    model: string;
    costUsd: number;
    durationMs: number;
  };
}

export default function TrendsPage() {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ApiAnalysisResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleAnalyze() {
    if (!content.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const data = await apiFetch<ApiAnalysisResponse>('/api/trends/analyze', {
        method: 'POST',
        body: JSON.stringify({ content: content.trim() }),
      });
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to analyze content');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-100">Trend Analysis</h1>
        <p className="text-sm text-gray-400 mt-1" dir="rtl">
          تحليل الاتجاهات - اكتشف المواضيع الرائجة
        </p>
      </div>

      {/* Input section */}
      <div className="card">
        <label htmlFor="trend-content" className="block text-sm font-medium text-gray-300 mb-2">
          Paste content, URLs, or describe topics to analyze
        </label>
        <textarea
          id="trend-content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Paste LinkedIn posts, articles, URLs, or describe the topics you want to explore...&#10;&#10;Examples:&#10;- AI trends in GRC and compliance&#10;- Latest developments in cybersecurity frameworks&#10;- Saudi Arabia $100B AI fund announcement"
          className="textarea h-48 mb-4"
        />

        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500">
            {content.length > 0 ? `${content.length} characters` : 'Enter content to analyze (min 10 chars)'}
          </span>
          <button
            onClick={handleAnalyze}
            disabled={!content.trim() || content.trim().length < 10 || loading}
            className="btn-primary inline-flex items-center gap-2"
          >
            {loading ? (
              <>
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Analyzing...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                Analyze
              </>
            )}
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-900/20 border border-red-700/50 rounded-xl p-4">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-red-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm text-red-300">{error}</p>
          </div>
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="space-y-6">
          {/* Summary */}
          <div className="card">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold text-gray-200">Analysis Summary</h2>
              <span className="text-xs text-gray-500">
                {result.usage.model} &middot; ${result.usage.costUsd.toFixed(4)} &middot; {(result.usage.durationMs / 1000).toFixed(1)}s
              </span>
            </div>
            <p className="text-gray-300 leading-relaxed">{result.analysis.overallTheme}</p>

            {result.analysis.recommendedTags.length > 0 && (
              <div className="mt-4">
                <h3 className="text-sm font-medium text-gray-400 mb-2">Recommended Tags</h3>
                <div className="flex flex-wrap gap-2">
                  {result.analysis.recommendedTags.map((tag, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-900/30 text-blue-300 border border-blue-700/50"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Trending topics */}
          <div>
            <h2 className="text-lg font-semibold text-gray-200 mb-4">
              Trending Topics ({result.analysis.topics.length})
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {result.analysis.topics.map((topic, index) => (
                <TrendCard
                  key={index}
                  topic={topic.title}
                  description={topic.description}
                  relevanceScore={topic.relevance}
                  suggestedAngles={[topic.suggestedAngle]}
                  category={result.analysis.overallTheme}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Empty state when no analysis has been run */}
      {!result && !loading && (
        <div className="text-center py-16">
          <div className="w-20 h-20 mx-auto mb-6 bg-gray-800 rounded-2xl flex items-center justify-center">
            <svg className="w-10 h-10 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-300 mb-2">
            Discover Trending Topics
          </h3>
          <p className="text-sm text-gray-500 max-w-md mx-auto">
            Paste content, URLs, or describe topics above to analyze trends and get AI-powered
            insights for your LinkedIn content strategy.
          </p>
        </div>
      )}
    </div>
  );
}
