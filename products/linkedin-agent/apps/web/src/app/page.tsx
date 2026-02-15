'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { apiFetch } from '@/lib/api';
import { StatusBadge } from '@/components/StatusBadge';
import { FormatBadge } from '@/components/FormatBadge';

interface DraftSummary {
  id: string;
  title: string;
  status: 'draft' | 'review' | 'approved' | 'published';
  format: 'text' | 'carousel' | 'infographic' | 'video-script' | 'poll';
  language: 'ar' | 'en' | 'both';
  createdAt: string;
}

interface DashboardStats {
  totalDrafts: number;
  published: number;
  trendingTopics: number;
  aiCreditsUsed: number;
}

const defaultStats: DashboardStats = {
  totalDrafts: 0,
  published: 0,
  trendingTopics: 0,
  aiCreditsUsed: 0,
};

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats>(defaultStats);
  const [recentDrafts, setRecentDrafts] = useState<DraftSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboard() {
      try {
        const [statsData, draftsData] = await Promise.allSettled([
          apiFetch<DashboardStats>('/api/dashboard/stats'),
          apiFetch<{ posts: DraftSummary[] }>('/api/posts?limit=5&sort=createdAt:desc'),
        ]);

        if (statsData.status === 'fulfilled') {
          setStats(statsData.value);
        }
        if (draftsData.status === 'fulfilled') {
          setRecentDrafts(draftsData.value.posts || []);
        }
      } catch {
        // API not available yet - show empty state
      } finally {
        setLoading(false);
      }
    }

    loadDashboard();
  }, []);

  const statCards = [
    {
      label: 'Total Drafts',
      labelAr: 'إجمالي المسودات',
      value: stats.totalDrafts,
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
      color: 'blue',
    },
    {
      label: 'Published',
      labelAr: 'منشورة',
      value: stats.published,
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      color: 'green',
    },
    {
      label: 'Trending Topics',
      labelAr: 'المواضيع الرائجة',
      value: stats.trendingTopics,
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        </svg>
      ),
      color: 'orange',
    },
    {
      label: 'AI Credits Used',
      labelAr: 'رصيد الذكاء المستخدم',
      value: stats.aiCreditsUsed,
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      ),
      color: 'purple',
    },
  ];

  const colorMap: Record<string, string> = {
    blue: 'bg-blue-600/20 text-blue-400',
    green: 'bg-green-600/20 text-green-400',
    orange: 'bg-orange-600/20 text-orange-400',
    purple: 'bg-purple-600/20 text-purple-400',
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-100">Dashboard</h1>
        <p className="text-sm text-gray-400 mt-1" dir="rtl">
          وكيل لينكدإن - لوحة التحكم
        </p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => (
          <div key={stat.label} className="card">
            <div className="flex items-center justify-between mb-3">
              <div className={`p-2 rounded-lg ${colorMap[stat.color]}`}>
                {stat.icon}
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-100">
              {loading ? (
                <span className="inline-block w-12 h-7 bg-gray-800 rounded animate-pulse" />
              ) : (
                stat.value.toLocaleString()
              )}
            </p>
            <p className="text-sm text-gray-400 mt-1">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div>
        <h2 className="text-lg font-semibold text-gray-200 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Link href="/trends">
            <div className="card hover:border-blue-500/50 hover:bg-gray-900/80 transition-all duration-200 cursor-pointer group text-center py-8">
              <div className="w-12 h-12 mx-auto mb-3 bg-blue-600/20 rounded-xl flex items-center justify-center group-hover:bg-blue-600/30 transition-colors">
                <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              <h3 className="font-semibold text-gray-100 group-hover:text-blue-400 transition-colors">
                Analyze Trends
              </h3>
              <p className="text-xs text-gray-500 mt-1" dir="rtl">تحليل الاتجاهات</p>
            </div>
          </Link>

          <Link href="/posts/new">
            <div className="card hover:border-green-500/50 hover:bg-gray-900/80 transition-all duration-200 cursor-pointer group text-center py-8">
              <div className="w-12 h-12 mx-auto mb-3 bg-green-600/20 rounded-xl flex items-center justify-center group-hover:bg-green-600/30 transition-colors">
                <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <h3 className="font-semibold text-gray-100 group-hover:text-green-400 transition-colors">
                Generate Post
              </h3>
              <p className="text-xs text-gray-500 mt-1" dir="rtl">إنشاء منشور</p>
            </div>
          </Link>

          <Link href="/posts">
            <div className="card hover:border-purple-500/50 hover:bg-gray-900/80 transition-all duration-200 cursor-pointer group text-center py-8">
              <div className="w-12 h-12 mx-auto mb-3 bg-purple-600/20 rounded-xl flex items-center justify-center group-hover:bg-purple-600/30 transition-colors">
                <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <h3 className="font-semibold text-gray-100 group-hover:text-purple-400 transition-colors">
                View Drafts
              </h3>
              <p className="text-xs text-gray-500 mt-1" dir="rtl">عرض المسودات</p>
            </div>
          </Link>
        </div>
      </div>

      {/* Recent drafts */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-200">Recent Drafts</h2>
          <Link href="/posts" className="text-sm text-blue-400 hover:text-blue-300 transition-colors">
            View all
          </Link>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="card animate-pulse">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-4 bg-gray-800 rounded" />
                  <div className="flex-1 h-4 bg-gray-800 rounded" />
                  <div className="w-20 h-4 bg-gray-800 rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : recentDrafts.length > 0 ? (
          <div className="space-y-2">
            {recentDrafts.map((draft) => (
              <Link key={draft.id} href={`/posts/${draft.id}`}>
                <div className="card hover:border-gray-700 transition-colors cursor-pointer py-4">
                  <div className="flex items-center gap-4">
                    <StatusBadge status={draft.status} />
                    <span className="flex-1 text-sm text-gray-200 truncate">{draft.title}</span>
                    <FormatBadge format={draft.format} />
                    <span className="text-xs text-gray-500 whitespace-nowrap">
                      {new Date(draft.createdAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="card text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 bg-gray-800 rounded-xl flex items-center justify-center">
              <svg className="w-8 h-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-gray-300 font-medium mb-1">No drafts yet</h3>
            <p className="text-sm text-gray-500 mb-4">
              Start by analyzing trends or generating your first post
            </p>
            <Link href="/posts/new" className="btn-primary inline-flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Create First Post
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
