'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import * as api from '../../lib/api';
import { ContentItem } from '../../lib/api';

const PLATFORMS = ['', 'TWITTER', 'REDDIT', 'LINKEDIN', 'TIKTOK', 'YOUTUBE', 'INSTAGRAM', 'HACKERNEWS'];
const TIME_RANGES = ['1h', '6h', '24h', '7d', '30d', 'all'];

function ScoreBadge({ score }: { score: number }) {
  let color = 'bg-gray-700 text-gray-300';
  if (score >= 80) color = 'bg-red-900/60 text-red-300';
  else if (score >= 60) color = 'bg-orange-900/60 text-orange-300';
  else if (score >= 40) color = 'bg-yellow-900/60 text-yellow-300';
  else if (score >= 20) color = 'bg-green-900/60 text-green-300';

  return <span className={`score-badge ${color}`}>{score.toFixed(1)}</span>;
}

function ContentCard({ item }: { item: ContentItem }) {
  const timeAgo = item.publishedAt
    ? formatTimeAgo(new Date(item.publishedAt))
    : 'Unknown';

  return (
    <div className="card group transition-colors hover:border-gray-700">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="rounded bg-gray-800 px-2 py-0.5 text-xs font-medium text-gray-300">
            {item.platform}
          </span>
          {item.category && (
            <span className="text-xs capitalize text-gray-500">{item.category}</span>
          )}
        </div>
        <ScoreBadge score={item.viralityScore} />
      </div>

      <h3 className="mb-2 text-base font-semibold leading-snug text-white">
        {item.title || item.body?.slice(0, 120) || 'Untitled'}
      </h3>

      {item.body && item.title && (
        <p className="mb-3 line-clamp-2 text-sm text-gray-400">
          {item.body.slice(0, 200)}
        </p>
      )}

      {/* Metrics row */}
      <div className="mb-3 flex flex-wrap gap-4 text-xs text-gray-500">
        <span title="Likes">{formatNumber(item.likes)} likes</span>
        <span title="Comments">{formatNumber(item.comments)} comments</span>
        {item.shares > 0 && <span title="Shares">{formatNumber(item.shares)} shares</span>}
        {item.views > 0 && <span title="Views">{formatNumber(item.views)} views</span>}
      </div>

      {/* Bottom row */}
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-2 text-gray-500">
          {item.author && <span>@{item.author}</span>}
          <span>{timeAgo}</span>
        </div>
        <div className="flex gap-2">
          <span className="text-gray-600" title="Engagement Rate">
            ER: {item.engagementRate.toFixed(1)}
          </span>
          <span className="text-gray-600" title="Velocity">
            V: {item.velocityScore.toFixed(1)}
          </span>
          {item.percentile >= 99 && (
            <span className="font-bold text-red-400">TOP 1%</span>
          )}
        </div>
      </div>

      {item.url && (
        <a
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 block text-xs text-brand-500 opacity-0 transition-opacity group-hover:opacity-100"
        >
          View original &rarr;
        </a>
      )}
    </div>
  );
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return String(n);
}

function formatTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

export default function ContentFeedPage() {
  const [content, setContent] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [platform, setPlatform] = useState('');
  const [timeRange, setTimeRange] = useState('24h');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchContent = useCallback(async () => {
    setLoading(true);
    try {
      const filters: api.ContentFilters = {
        page,
        limit: 20,
        timeRange,
        sortBy: 'viralityScore',
        order: 'desc',
      };
      if (platform) filters.platform = platform;
      if (search) filters.search = search;

      const result = await api.getContent(filters);
      setContent(result.content);
      setTotalPages(result.pagination.totalPages);
    } catch (err) {
      console.error('Failed to fetch content', err);
    } finally {
      setLoading(false);
    }
  }, [platform, timeRange, search, page]);

  useEffect(() => {
    fetchContent();
  }, [fetchContent]);

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b border-gray-800 px-6 py-4">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-xl font-bold text-brand-500">VCS</Link>
            <nav className="flex gap-4 text-sm">
              <Link href="/dashboard" className="text-gray-400 hover:text-white">Dashboard</Link>
              <Link href="/content" className="font-medium text-white">Content Feed</Link>
            </nav>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8">
        <h1 className="mb-6 text-2xl font-bold">Viral Content Feed</h1>

        {/* Filters */}
        <div className="mb-6 flex flex-wrap gap-3">
          <select
            value={platform}
            onChange={(e) => { setPlatform(e.target.value); setPage(1); }}
            className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white"
          >
            <option value="">All Platforms</option>
            {PLATFORMS.filter(Boolean).map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>

          <select
            value={timeRange}
            onChange={(e) => { setTimeRange(e.target.value); setPage(1); }}
            className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white"
          >
            {TIME_RANGES.map((t) => (
              <option key={t} value={t}>
                {t === 'all' ? 'All Time' : `Last ${t}`}
              </option>
            ))}
          </select>

          <input
            type="text"
            placeholder="Search content..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="flex-1 rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-brand-500 focus:outline-none"
          />
        </div>

        {/* Content Grid */}
        {loading ? (
          <div className="py-20 text-center text-gray-400">Loading content...</div>
        ) : content.length === 0 ? (
          <div className="py-20 text-center">
            <p className="text-lg text-gray-400">No content found</p>
            <p className="mt-2 text-sm text-gray-600">
              Try adjusting your filters or run a scrape to populate data.
            </p>
          </div>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {content.map((item) => (
                <ContentCard key={item.id} item={item} />
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-8 flex items-center justify-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="btn-secondary text-sm disabled:opacity-30"
                >
                  Previous
                </button>
                <span className="text-sm text-gray-400">
                  Page {page} of {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="btn-secondary text-sm disabled:opacity-30"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
