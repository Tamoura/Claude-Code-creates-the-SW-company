'use client';

import { useState, useEffect } from 'react';
import { DIMENSIONS } from '../../../lib/dimensions';
import { apiClient, type Child, type Observation } from '../../../lib/api-client';

export default function TimelinePage() {
  const [selectedDimension, setSelectedDimension] = useState<string>('all');
  const [selectedSentiment, setSelectedSentiment] = useState<string>('');
  const [children, setChildren] = useState<Child[]>([]);
  const [selectedChildId, setSelectedChildId] = useState<string>('');
  const [observations, setObservations] = useState<Observation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Fetch children on mount
  useEffect(() => {
    const fetchChildren = async () => {
      try {
        const response = await apiClient.getChildren(1, 50);
        setChildren(response.data);

        // If only one child, select automatically
        if (response.data.length === 1) {
          setSelectedChildId(response.data[0].id);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load children');
      } finally {
        setIsLoading(false);
      }
    };

    fetchChildren();
  }, []);

  // Fetch observations when child or filters change
  useEffect(() => {
    if (!selectedChildId) return;

    const fetchObservations = async () => {
      try {
        setIsLoading(true);
        setError('');

        const params: {
          page?: number;
          limit?: number;
          dimension?: string;
          sentiment?: string;
          from?: string;
          to?: string;
        } = {
          page: 1,
          limit: 20,
        };

        if (selectedDimension !== 'all') {
          params.dimension = selectedDimension;
        }
        if (selectedSentiment) {
          params.sentiment = selectedSentiment;
        }
        if (dateFrom) {
          params.from = dateFrom;
        }
        if (dateTo) {
          params.to = dateTo;
        }

        const response = await apiClient.getObservations(selectedChildId, params);
        setObservations(response.data);
        setHasMore(response.pagination.hasMore);
        setCurrentPage(1);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load observations');
      } finally {
        setIsLoading(false);
      }
    };

    fetchObservations();
  }, [selectedChildId, selectedDimension, selectedSentiment, dateFrom, dateTo]);

  const handleLoadMore = async () => {
    if (!selectedChildId || !hasMore || isLoadingMore) return;

    setIsLoadingMore(true);
    try {
      const params: {
        page?: number;
        limit?: number;
        dimension?: string;
        sentiment?: string;
        from?: string;
        to?: string;
      } = {
        page: currentPage + 1,
        limit: 20,
      };

      if (selectedDimension !== 'all') {
        params.dimension = selectedDimension;
      }
      if (selectedSentiment) {
        params.sentiment = selectedSentiment;
      }
      if (dateFrom) {
        params.from = dateFrom;
      }
      if (dateTo) {
        params.to = dateTo;
      }

      const response = await apiClient.getObservations(selectedChildId, params);
      setObservations([...observations, ...response.data]);
      setHasMore(response.pagination.hasMore);
      setCurrentPage(currentPage + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load more observations');
    } finally {
      setIsLoadingMore(false);
    }
  };

  const handleDelete = async (observationId: string) => {
    if (!selectedChildId) return;
    if (!confirm('Are you sure you want to delete this observation?')) return;

    try {
      await apiClient.deleteObservation(selectedChildId, observationId);
      setObservations(observations.filter((obs) => obs.id !== observationId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete observation');
    }
  };

  const getDimensionColor = (dimensionSlug: string): string => {
    const dim = DIMENSIONS.find((d) => d.slug === dimensionSlug);
    return dim?.colour || '#94A3B8';
  };

  const getSentimentColor = (sentiment: string): string => {
    const colors: Record<string, string> = {
      positive: '#10B981',
      neutral: '#94A3B8',
      needs_attention: '#F59E0B',
    };
    return colors[sentiment] || '#94A3B8';
  };

  const getSentimentLabel = (sentiment: string): string => {
    const labels: Record<string, string> = {
      positive: 'Positive',
      neutral: 'Neutral',
      needs_attention: 'Needs Attention',
    };
    return labels[sentiment] || sentiment;
  };

  // Loading state
  if (isLoading && observations.length === 0) {
    return (
      <div className="space-y-8">
        <div className="h-8 w-48 bg-slate-200 rounded animate-pulse" />
        <div className="card py-12 text-center">
          <div className="h-6 w-32 bg-slate-200 rounded mx-auto animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Timeline</h1>
        <p className="text-sm text-slate-500 mt-1">
          A chronological view of all observations.
        </p>
      </div>

      {/* Child Selector (if multiple children) */}
      {children.length > 1 && (
        <div className="mb-4">
          <label htmlFor="child-select-timeline" className="label">
            Select Child
          </label>
          <select
            id="child-select-timeline"
            className="input-field max-w-xs"
            value={selectedChildId}
            onChange={(e) => setSelectedChildId(e.target.value)}
          >
            <option value="">Choose a child...</option>
            {children.map((child) => (
              <option key={child.id} value={child.id}>
                {child.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="p-4 rounded-lg bg-red-50 border border-red-200">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Filter Bar */}
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setSelectedDimension('all')}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              selectedDimension === 'all'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All Dimensions
          </button>
          {DIMENSIONS.map((dim) => (
            <button
              key={dim.slug}
              type="button"
              onClick={() => setSelectedDimension(dim.slug)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                selectedDimension === dim.slug
                  ? 'text-white'
                  : 'text-slate-600 hover:bg-slate-200'
              }`}
              style={
                selectedDimension === dim.slug
                  ? { backgroundColor: dim.colour }
                  : { backgroundColor: `${dim.colour}15` }
              }
            >
              <span
                className={`h-2 w-2 rounded-full ${
                  selectedDimension === dim.slug ? 'bg-white' : ''
                }`}
                style={
                  selectedDimension !== dim.slug
                    ? { backgroundColor: dim.colour }
                    : {}
                }
                aria-hidden="true"
              />
              {dim.name}
            </button>
          ))}
        </div>

        {/* Sentiment & Date Filters */}
        <div className="flex flex-wrap gap-3">
          <select
            className="input-field text-xs py-1.5 px-3"
            value={selectedSentiment}
            onChange={(e) => setSelectedSentiment(e.target.value)}
          >
            <option value="">All Sentiments</option>
            <option value="positive">Positive</option>
            <option value="neutral">Neutral</option>
            <option value="needs_attention">Needs Attention</option>
          </select>

          <input
            type="date"
            className="input-field text-xs py-1.5 px-3"
            placeholder="From"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
          />

          <input
            type="date"
            className="input-field text-xs py-1.5 px-3"
            placeholder="To"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
          />

          {(selectedSentiment || dateFrom || dateTo) && (
            <button
              type="button"
              onClick={() => {
                setSelectedSentiment('');
                setDateFrom('');
                setDateTo('');
              }}
              className="text-xs text-slate-600 hover:text-slate-900 underline"
            >
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* No child selected */}
      {!selectedChildId && (
        <div className="card text-center py-16">
          <h2 className="text-sm font-medium text-slate-900 mb-1">
            No child selected
          </h2>
          <p className="text-xs text-slate-500">
            Please select a child to view their timeline.
          </p>
        </div>
      )}

      {/* Observations List */}
      {selectedChildId && observations.length === 0 && !isLoading && (
        <div className="card text-center py-16">
          <div className="mx-auto h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center mb-4">
            <svg className="h-6 w-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-sm font-medium text-slate-900 mb-1">
            No observations yet
          </h2>
          <p className="text-xs text-slate-500">
            Your child&apos;s timeline will appear here as you log observations.
          </p>
        </div>
      )}

      {selectedChildId && observations.length > 0 && (
        <div className="space-y-4">
          {observations.map((obs) => (
            <div
              key={obs.id}
              className="card hover:shadow-md transition-shadow"
              style={{ borderLeft: `4px solid ${getDimensionColor(obs.dimension)}` }}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span
                    className="text-xs font-medium px-2 py-0.5 rounded-full"
                    style={{
                      backgroundColor: `${getDimensionColor(obs.dimension)}15`,
                      color: getDimensionColor(obs.dimension),
                    }}
                  >
                    {DIMENSIONS.find((d) => d.slug === obs.dimension)?.name || obs.dimension}
                  </span>
                  <span
                    className="text-xs font-medium px-2 py-0.5 rounded-full"
                    style={{
                      backgroundColor: `${getSentimentColor(obs.sentiment)}15`,
                      color: getSentimentColor(obs.sentiment),
                    }}
                  >
                    {getSentimentLabel(obs.sentiment)}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleDelete(obs.id)}
                  className="text-slate-400 hover:text-red-600 transition-colors"
                  aria-label="Delete observation"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>

              <p className="text-sm text-slate-700 mb-3">{obs.content}</p>

              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>
                  {new Date(obs.observedAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })}
                </span>
                {obs.tags.length > 0 && (
                  <div className="flex gap-1">
                    {obs.tags.map((tag) => (
                      <span
                        key={tag}
                        className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* Load More Button */}
          {hasMore && (
            <div className="text-center pt-4">
              <button
                type="button"
                onClick={handleLoadMore}
                disabled={isLoadingMore}
                className="btn-secondary py-2 px-6 text-sm"
              >
                {isLoadingMore ? 'Loading...' : 'Load More'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
