import { useState, useMemo } from 'react';
import { useApi } from '../hooks/useApi.js';
import StatCard from '../components/StatCard.js';
import Badge from '../components/Badge.js';

interface Alert {
  id: string;
  severity: 'critical' | 'warning' | 'info';
  source: string;
  message: string;
  product?: string;
  timestamp: string;
  details?: string;
}

interface AlertData {
  alerts: Alert[];
}

type FilterTab = 'all' | 'critical' | 'warning' | 'info';

export default function AlertCenter() {
  const { data, loading } = useApi<AlertData>('/alerts');
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const counts = useMemo(() => {
    if (!data) return { critical: 0, warning: 0, info: 0 };
    return {
      critical: data.alerts.filter((a) => a.severity === 'critical').length,
      warning: data.alerts.filter((a) => a.severity === 'warning').length,
      info: data.alerts.filter((a) => a.severity === 'info').length,
    };
  }, [data]);

  const filtered = useMemo(() => {
    if (!data) return [];
    if (activeTab === 'all') return data.alerts;
    return data.alerts.filter((a) => a.severity === activeTab);
  }, [data, activeTab]);

  if (loading) return <LoadingSkeleton />;
  if (!data) return <p className="text-red-400">Failed to load alerts</p>;

  const tabs: { key: FilterTab; label: string }[] = [
    { key: 'all', label: `All (${data.alerts.length})` },
    { key: 'critical', label: `Critical (${counts.critical})` },
    { key: 'warning', label: `Warning (${counts.warning})` },
    { key: 'info', label: `Info (${counts.info})` },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-1">Alert Center</h1>
      <p className="text-gray-500 mb-8">System alerts and notifications</p>

      {/* Stat cards */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <StatCard label="Critical Alerts" value={counts.critical} color="red" />
        <StatCard label="Warnings" value={counts.warning} color="orange" />
        <StatCard label="Info" value={counts.info} color="blue" />
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 mb-6 bg-gray-900 border border-gray-800 rounded-lg p-1 w-fit">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? 'bg-gray-700 text-white'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Alert list */}
      {filtered.length === 0 ? (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-12 text-center">
          <svg className="w-12 h-12 text-emerald-500 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-gray-400 text-sm">All clear — no active alerts</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((alert) => (
            <AlertCard
              key={alert.id}
              alert={alert}
              expanded={expandedId === alert.id}
              onToggle={() => setExpandedId(expandedId === alert.id ? null : alert.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

const severityConfig = {
  critical: {
    border: 'border-l-red-500',
    icon: (
      <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
      </svg>
    ),
  },
  warning: {
    border: 'border-l-yellow-500',
    icon: (
      <svg className="w-5 h-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
      </svg>
    ),
  },
  info: {
    border: 'border-l-blue-500',
    icon: (
      <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
      </svg>
    ),
  },
};

function formatRelativeTime(timestamp: string): string {
  const now = Date.now();
  const then = new Date(timestamp).getTime();
  const diff = now - then;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days > 1 ? 's' : ''} ago`;
}

function AlertCard({ alert, expanded, onToggle }: { alert: Alert; expanded: boolean; onToggle: () => void }) {
  const config = severityConfig[alert.severity];

  return (
    <div
      className={`bg-gray-900 border border-gray-800 border-l-4 ${config.border} rounded-xl p-4 hover:border-gray-700 transition-colors`}
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">{config.icon}</div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white">{alert.message}</p>
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <Badge>{alert.source}</Badge>
            {alert.product && <Badge variant="info">{alert.product}</Badge>}
            <span className="text-xs text-gray-500">{formatRelativeTime(alert.timestamp)}</span>
          </div>
          {alert.details && (
            <button
              onClick={onToggle}
              className="text-xs text-gray-500 hover:text-gray-300 mt-2 transition-colors"
            >
              {expanded ? 'Hide details' : 'Show details'}
            </button>
          )}
          {expanded && alert.details && (
            <div className="mt-3 bg-gray-800/50 rounded-lg p-3 text-xs text-gray-400 whitespace-pre-wrap">
              {alert.details}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="h-8 bg-gray-800 rounded w-36 mb-2" />
      <div className="h-4 bg-gray-800 rounded w-56 mb-8" />
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[...Array(3)].map((_, i) => <div key={i} className="h-28 bg-gray-800 rounded-xl" />)}
      </div>
      <div className="space-y-3">
        {[...Array(4)].map((_, i) => <div key={i} className="h-20 bg-gray-800 rounded-xl" />)}
      </div>
    </div>
  );
}
