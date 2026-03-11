'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import * as api from '../../lib/api';

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="card">
      <p className="text-sm text-gray-400">{label}</p>
      <p className="mt-1 text-3xl font-bold text-white">{value}</p>
      {sub && <p className="mt-1 text-xs text-gray-500">{sub}</p>}
    </div>
  );
}

function PlatformBar({ name, count, avg }: { name: string; count: number; avg: number }) {
  const maxWidth = 100;
  const width = Math.min(maxWidth, avg * 2);
  return (
    <div className="flex items-center gap-3">
      <span className="w-24 text-sm text-gray-300">{name}</span>
      <div className="flex-1">
        <div className="h-6 overflow-hidden rounded-full bg-gray-800">
          <div
            className="h-full rounded-full bg-gradient-to-r from-brand-600 to-brand-400 transition-all"
            style={{ width: `${width}%` }}
          />
        </div>
      </div>
      <span className="w-16 text-right text-sm text-gray-400">{count} items</span>
      <span className="w-12 text-right text-sm font-bold text-brand-400">{avg}</span>
    </div>
  );
}

export default function DashboardPage() {
  const [overview, setOverview] = useState<api.OverviewStats | null>(null);
  const [trends, setTrends] = useState<api.TrendsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.getOverview(), api.getTrends()])
      .then(([o, t]) => {
        setOverview(o);
        setTrends(t);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-gray-400">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b border-gray-800 px-6 py-4">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-xl font-bold text-brand-500">VCS</Link>
            <nav className="flex gap-4 text-sm">
              <Link href="/dashboard" className="font-medium text-white">Dashboard</Link>
              <Link href="/content" className="text-gray-400 hover:text-white">Content Feed</Link>
            </nav>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8">
        <h1 className="mb-8 text-2xl font-bold">Dashboard</h1>

        {/* Stats Grid */}
        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Total Content Tracked" value={overview?.totalContent ?? 0} />
          <StatCard label="Last 24 Hours" value={overview?.last24hCount ?? 0} sub="new items scraped" />
          <StatCard
            label="Top 1% Content"
            value={overview?.top1PercentCount ?? 0}
            sub="99th percentile"
          />
          <StatCard
            label="Platforms Active"
            value={overview?.platformBreakdown?.length ?? 0}
            sub="being scraped"
          />
        </div>

        <div className="grid gap-8 lg:grid-cols-2">
          {/* Platform Breakdown */}
          <div className="card">
            <h2 className="mb-4 text-lg font-bold">Platform Breakdown</h2>
            <div className="space-y-3">
              {overview?.platformBreakdown?.map((p) => (
                <PlatformBar
                  key={p.platform}
                  name={p.platform}
                  count={p.count}
                  avg={p.avgViralityScore}
                />
              ))}
              {(!overview?.platformBreakdown || overview.platformBreakdown.length === 0) && (
                <p className="text-sm text-gray-500">No data yet. Run a scrape to populate.</p>
              )}
            </div>
          </div>

          {/* Trending Hashtags */}
          <div className="card">
            <h2 className="mb-4 text-lg font-bold">Trending Hashtags</h2>
            <div className="flex flex-wrap gap-2">
              {trends?.trendingHashtags?.map((h) => (
                <span
                  key={h.tag}
                  className="rounded-full bg-brand-900/40 px-3 py-1 text-sm text-brand-300"
                >
                  {h.tag} <span className="text-xs text-gray-500">({h.count})</span>
                </span>
              ))}
              {(!trends?.trendingHashtags || trends.trendingHashtags.length === 0) && (
                <p className="text-sm text-gray-500">No trending hashtags yet.</p>
              )}
            </div>
          </div>

          {/* Top Categories */}
          <div className="card lg:col-span-2">
            <h2 className="mb-4 text-lg font-bold">Top Categories (Last 7 Days)</h2>
            <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-5">
              {overview?.topCategories?.map((c) => (
                <div
                  key={c.category}
                  className="rounded-lg border border-gray-800 bg-gray-800/50 p-3 text-center"
                >
                  <p className="text-lg font-bold text-white">{c.count}</p>
                  <p className="text-sm capitalize text-gray-400">{c.category}</p>
                  <p className="text-xs text-brand-400">avg {c.avgViralityScore}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
