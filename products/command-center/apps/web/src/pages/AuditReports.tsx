import { useState } from 'react';
import { useApi } from '../hooks/useApi.js';
import StatCard from '../components/StatCard.js';
import Badge from '../components/Badge.js';
import MarkdownRenderer from '../components/MarkdownRenderer.js';

interface AuditReport {
  product: string;
  overallScore: number | null;
  lastModified: string;
  excerpt: string;
  content: string;
  qualityReports: string[];
}

interface AuditReportsData {
  reports: AuditReport[];
  stats: {
    total: number;
    audited: number;
    avgScore: number | null;
    topScore: number | null;
  };
}

function scoreColor(score: number | null): string {
  if (score === null) return 'text-gray-500';
  if (score >= 8) return 'text-emerald-400';
  if (score >= 6) return 'text-amber-400';
  return 'text-red-400';
}

function scoreBg(score: number | null): string {
  if (score === null) return 'bg-gray-800 border-gray-700';
  if (score >= 8) return 'bg-emerald-500/10 border-emerald-500/20';
  if (score >= 6) return 'bg-amber-500/10 border-amber-500/20';
  return 'bg-red-500/10 border-red-500/20';
}

function scoreVariant(score: number | null): 'success' | 'warning' | 'danger' | 'default' {
  if (score === null) return 'default';
  if (score >= 8) return 'success';
  if (score >= 6) return 'warning';
  return 'danger';
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function AuditCard({ report }: { report: AuditReport }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden hover:border-gray-700 transition-colors">
      {/* Card Header */}
      <div className="p-6">
        <div className="flex items-start justify-between gap-4 mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-white capitalize">{report.product}</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Last updated {formatDate(report.lastModified)}
              {report.qualityReports.length > 0 && (
                <span className="ml-2 text-gray-600">
                  · {report.qualityReports.length} quality report{report.qualityReports.length !== 1 ? 's' : ''}
                </span>
              )}
            </p>
          </div>
          <div className={`flex-shrink-0 text-right px-4 py-2 rounded-lg border ${scoreBg(report.overallScore)}`}>
            {report.overallScore !== null ? (
              <>
                <p className={`text-2xl font-bold ${scoreColor(report.overallScore)}`}>{report.overallScore}</p>
                <p className="text-xs text-gray-500">/10</p>
              </>
            ) : (
              <p className="text-sm text-gray-500">No score</p>
            )}
          </div>
        </div>

        {/* Excerpt */}
        {report.excerpt && (
          <p className="text-sm text-gray-400 leading-relaxed line-clamp-3 mb-4">{report.excerpt}</p>
        )}

        {/* Quality report badges */}
        {report.qualityReports.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {report.qualityReports.map((qr) => (
              <Badge key={qr} variant="default">{qr}</Badge>
            ))}
          </div>
        )}

        {/* Score badge inline */}
        <div className="flex items-center gap-3 mb-4">
          {report.overallScore !== null && (
            <Badge variant={scoreVariant(report.overallScore)}>
              {report.overallScore}/10
            </Badge>
          )}
        </div>

        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1.5 text-sm text-blue-400 hover:text-blue-300 transition-colors"
        >
          <svg
            className={`w-4 h-4 transition-transform ${expanded ? 'rotate-90' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
          {expanded ? 'Collapse report' : 'View full report'}
        </button>
      </div>

      {/* Full Markdown Content */}
      {expanded && (
        <div className="border-t border-gray-800 p-6 bg-gray-950/50 max-h-[60vh] overflow-y-auto">
          <MarkdownRenderer content={report.content} />
        </div>
      )}
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="h-8 bg-gray-800 rounded w-48 mb-2" />
      <div className="h-4 bg-gray-800 rounded w-72 mb-8" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[...Array(4)].map((_, i) => <div key={i} className="h-28 bg-gray-800 rounded-xl" />)}
      </div>
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => <div key={i} className="h-48 bg-gray-800 rounded-xl" />)}
      </div>
    </div>
  );
}

export default function AuditReports() {
  const { data, loading } = useApi<AuditReportsData>('/audit/reports');

  if (loading && !data) return <LoadingSkeleton />;
  if (!data) return <p className="text-red-400">Failed to load audit reports</p>;

  const { reports, stats } = data;
  const pending = stats.total - stats.audited;

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white mb-1">Audit Reports</h1>
        <p className="text-gray-500">Code quality audits across all products</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Audited" value={stats.audited} sublabel={`of ${stats.total} products`} color="blue" />
        <StatCard
          label="Avg Score"
          value={stats.avgScore !== null ? stats.avgScore : '—'}
          sublabel="out of 10"
          color="purple"
        />
        <StatCard
          label="Top Score"
          value={stats.topScore !== null ? stats.topScore : '—'}
          sublabel="best product"
          color="green"
        />
        <StatCard label="Pending Audit" value={pending} sublabel="products" color="orange" />
      </div>

      {/* Report List */}
      {reports.length === 0 ? (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-12 text-center">
          <svg
            className="w-12 h-12 text-gray-600 mx-auto mb-3"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z"
            />
          </svg>
          <p className="text-gray-400 text-sm">No audit reports found</p>
          <p className="text-gray-600 text-xs mt-1">
            Run <code className="text-blue-400">/audit [product]</code> to generate a report
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {reports.map((report) => (
            <AuditCard key={report.product} report={report} />
          ))}
        </div>
      )}
    </div>
  );
}
