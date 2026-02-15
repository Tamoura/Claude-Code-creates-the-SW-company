'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';
import { PostCard } from '@/components/PostCard';

interface PostDraft {
  id: string;
  title: string;
  content: string;
  contentAr: string | null;
  contentEn: string | null;
  status: string;
  format: string;
  createdAt: string;
}

interface PostsResponse {
  data: PostDraft[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

type StatusFilter = 'all' | 'draft' | 'review' | 'approved' | 'published' | 'archived';
type FormatFilter = 'all' | 'text' | 'carousel' | 'infographic' | 'link' | 'poll' | 'video';

export default function PostsPage() {
  const [posts, setPosts] = useState<PostDraft[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [formatFilter, setFormatFilter] = useState<FormatFilter>('all');

  useEffect(() => {
    async function loadPosts() {
      try {
        const params = new URLSearchParams();
        if (statusFilter !== 'all') params.set('status', statusFilter);
        if (formatFilter !== 'all') params.set('format', formatFilter);

        const data = await apiFetch<PostsResponse>(`/api/posts?${params.toString()}`);
        setPosts(data.data || []);
      } catch {
        // API not available
      } finally {
        setLoading(false);
      }
    }

    loadPosts();
  }, [statusFilter, formatFilter]);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-100">Post Drafts</h1>
          <p className="text-sm text-gray-400 mt-1" dir="rtl">
            مسودات المنشورات
          </p>
        </div>
        <Link href="/posts/new" className="btn-primary inline-flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Post
        </Link>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="flex flex-wrap items-center gap-4">
          {/* Status filter */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
              className="select text-sm py-1.5"
            >
              <option value="all">All Statuses</option>
              <option value="draft">Draft</option>
              <option value="review">In Review</option>
              <option value="approved">Approved</option>
              <option value="published">Published</option>
              <option value="archived">Archived</option>
            </select>
          </div>

          {/* Format filter */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Format</label>
            <select
              value={formatFilter}
              onChange={(e) => setFormatFilter(e.target.value as FormatFilter)}
              className="select text-sm py-1.5"
            >
              <option value="all">All Formats</option>
              <option value="text">Text Post</option>
              <option value="carousel">Carousel</option>
              <option value="infographic">Infographic</option>
              <option value="link">Link</option>
              <option value="poll">Poll</option>
              <option value="video">Video</option>
            </select>
          </div>
        </div>
      </div>

      {/* Posts grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="card animate-pulse">
              <div className="flex items-center justify-between mb-3">
                <div className="w-16 h-5 bg-gray-800 rounded-full" />
                <div className="w-20 h-5 bg-gray-800 rounded-full" />
              </div>
              <div className="w-3/4 h-5 bg-gray-800 rounded mb-2" />
              <div className="w-full h-4 bg-gray-800 rounded mb-1" />
              <div className="w-2/3 h-4 bg-gray-800 rounded mb-4" />
              <div className="flex items-center justify-between pt-3 border-t border-gray-800">
                <div className="w-16 h-3 bg-gray-800 rounded" />
                <div className="w-20 h-3 bg-gray-800 rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : posts.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {posts.map((post) => (
            <PostCard
              key={post.id}
              id={post.id}
              title={post.title}
              content={post.content}
              contentAr={post.contentAr}
              contentEn={post.contentEn}
              status={post.status}
              format={post.format}
              createdAt={post.createdAt}
            />
          ))}
        </div>
      ) : (
        <div className="card text-center py-16">
          <div className="w-20 h-20 mx-auto mb-6 bg-gray-800 rounded-2xl flex items-center justify-center">
            <svg className="w-10 h-10 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-300 mb-2">No posts found</h3>
          <p className="text-sm text-gray-500 mb-6">
            {statusFilter !== 'all' || formatFilter !== 'all'
              ? 'Try adjusting your filters or create a new post.'
              : 'Get started by generating your first LinkedIn post with AI.'}
          </p>
          <Link href="/posts/new" className="btn-primary inline-flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Generate Post
          </Link>
        </div>
      )}
    </div>
  );
}
