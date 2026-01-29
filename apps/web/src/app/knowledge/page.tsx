'use client';

import { useKnowledgeArticles } from '@/hooks/use-knowledge';
import { formatDate } from '@/lib/utils';
import Link from 'next/link';

export default function KnowledgePage() {
  const { data, isLoading, error } = useKnowledgeArticles({ page: 1, limit: 20 });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading knowledge articles...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-red-600">
          Error loading articles: {(error as Error).message}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Knowledge Base</h1>
              <p className="mt-2 text-gray-600">
                Browse and search knowledge articles
              </p>
            </div>
            <div className="flex gap-2">
              <Link
                href="/incidents"
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                Incidents
              </Link>
              <Link
                href="/problems"
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                Problems
              </Link>
              <Link
                href="/changes"
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                Changes
              </Link>
              <Link
                href="/service-requests"
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                Requests
              </Link>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="mb-6 bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600">
            Total Articles:{' '}
            <span className="font-semibold text-gray-900">
              {data?.pagination.total || 0}
            </span>
          </div>
        </div>

        {/* Articles Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {data?.data.map((article) => (
            <Link
              key={article.id}
              href={`/knowledge/${article.id}`}
              className="bg-white shadow rounded-lg p-6 hover:shadow-lg transition-shadow"
            >
              <div className="mb-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-gray-500">
                    {article.displayId}
                  </span>
                  <span
                    className={`px-2 py-1 text-xs font-semibold rounded-full ${
                      article.status === 'DRAFT'
                        ? 'bg-gray-100 text-gray-800'
                        : article.status === 'IN_REVIEW'
                        ? 'bg-yellow-100 text-yellow-800'
                        : article.status === 'PUBLISHED'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {article.status.replace('_', ' ')}
                  </span>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 line-clamp-2">
                  {article.title}
                </h3>
              </div>

              {article.summary && (
                <p className="text-sm text-gray-600 mb-4 line-clamp-3">
                  {article.summary}
                </p>
              )}

              {article.keywords.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {article.keywords.slice(0, 3).map((keyword, index) => (
                    <span
                      key={index}
                      className="px-2 py-1 text-xs bg-blue-50 text-blue-700 rounded"
                    >
                      {keyword}
                    </span>
                  ))}
                  {article.keywords.length > 3 && (
                    <span className="px-2 py-1 text-xs text-gray-500">
                      +{article.keywords.length - 3} more
                    </span>
                  )}
                </div>
              )}

              <div className="flex items-center justify-between text-xs text-gray-500">
                <div className="flex items-center gap-4">
                  <span>👁 {article.viewCount} views</span>
                  {article._count && article._count.ratings > 0 && (
                    <span>⭐ {article._count.ratings} ratings</span>
                  )}
                </div>
                <span>{formatDate(article.createdAt)}</span>
              </div>

              {article.author && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <div className="text-xs text-gray-500">
                    By {article.author.email}
                  </div>
                </div>
              )}
            </Link>
          ))}
        </div>

        {data?.data.length === 0 && (
          <div className="text-center py-12 text-gray-500 bg-white rounded-lg shadow">
            No knowledge articles found. Create articles to share solutions and best practices.
          </div>
        )}

        {/* Pagination Info */}
        {data && data.pagination.total > 0 && (
          <div className="mt-6 text-sm text-gray-600 text-center">
            Showing {data.data.length} of {data.pagination.total} articles
          </div>
        )}
      </div>
    </div>
  );
}
