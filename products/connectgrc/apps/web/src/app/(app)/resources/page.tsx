'use client';

import { useEffect, useState } from 'react';
import { apiClient, type Resource } from '../../../lib/api-client';

export default function ResourcesPage() {
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [domainFilter, setDomainFilter] = useState('');
  const [bookmarking, setBookmarking] = useState<string | null>(null);

  useEffect(() => {
    async function loadResources() {
      try {
        const res = await apiClient.getResources({ domain: domainFilter || undefined });
        setResources(res.data);
      } catch (err) {
        console.error('Failed to load resources:', err);
      } finally {
        setLoading(false);
      }
    }
    loadResources();
  }, [domainFilter]);

  async function toggleBookmark(resource: Resource) {
    setBookmarking(resource.id);
    try {
      if (resource.bookmarked) {
        await apiClient.unbookmarkResource(resource.id);
        setResources(resources.map((r) => (r.id === resource.id ? { ...r, bookmarked: false } : r)));
      } else {
        await apiClient.bookmarkResource(resource.id);
        setResources(resources.map((r) => (r.id === resource.id ? { ...r, bookmarked: true } : r)));
      }
    } catch (err) {
      console.error('Failed to toggle bookmark:', err);
    } finally {
      setBookmarking(null);
    }
  }

  if (loading) {
    return <div className="text-center py-12">Loading...</div>;
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Resource Hub</h1>
      <p className="text-gray-600 mb-8">Access curated GRC content, guides, and learning materials.</p>

      <div className="mb-6">
        <select
          value={domainFilter}
          onChange={(e) => setDomainFilter(e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-400"
        >
          <option value="">All Domains</option>
          <option value="GOVERNANCE_STRATEGY">Governance & Strategy</option>
          <option value="RISK_MANAGEMENT">Risk Management</option>
          <option value="COMPLIANCE_REGULATORY">Compliance</option>
          <option value="INFORMATION_SECURITY">Information Security</option>
          <option value="AUDIT_ASSURANCE">Audit & Assurance</option>
          <option value="BUSINESS_CONTINUITY">Business Continuity</option>
        </select>
      </div>

      {resources.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <p className="text-gray-500">No resources found.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {resources.map((resource) => (
            <div key={resource.id} className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex justify-between items-start mb-3">
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 mb-1">{resource.title}</h3>
                  <div className="flex gap-2 flex-wrap mb-2">
                    <span className="px-2 py-1 bg-accent-50 text-accent text-xs font-medium rounded">
                      {resource.type}
                    </span>
                    {resource.featured && (
                      <span className="px-2 py-1 bg-yellow-50 text-yellow-700 text-xs font-medium rounded">
                        Featured
                      </span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => toggleBookmark(resource)}
                  disabled={bookmarking === resource.id}
                  className="text-gray-400 hover:text-accent transition-colors"
                >
                  <svg className={`w-5 h-5 ${resource.bookmarked ? 'fill-accent text-accent' : ''}`} fill={resource.bookmarked ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                  </svg>
                </button>
              </div>
              <p className="text-sm text-gray-600 mb-4">{resource.description}</p>
              {resource.domain && (
                <p className="text-xs text-gray-500 mb-3">{resource.domain.replace(/_/g, ' ')}</p>
              )}
              <a
                href={resource.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-primary hover:underline font-medium"
              >
                View Resource →
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
