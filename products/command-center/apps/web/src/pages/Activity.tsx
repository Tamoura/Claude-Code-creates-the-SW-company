import { useApi } from '../hooks/useApi.js';

interface ActivityItem {
  type: 'audit' | 'commit';
  timestamp: string;
  data: {
    // Audit fields
    type?: string;
    summary?: string;
    product?: string;
    agent?: string;
    status?: string;
    // Commit fields
    shortHash?: string;
    author?: string;
    message?: string;
  };
}

export default function Activity() {
  const { data, loading } = useApi<{ activity: ActivityItem[] }>('/activity?limit=50');

  if (loading) return <div className="animate-pulse"><div className="h-8 bg-gray-800 rounded w-32 mb-6" /></div>;
  if (!data) return <p className="text-red-400">Failed to load activity</p>;

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-1">Activity Feed</h1>
      <p className="text-gray-500 mb-8">Audit trail and commit history</p>

      <div className="bg-gray-900 border border-gray-800 rounded-xl divide-y divide-gray-800">
        {data.activity.length === 0 && (
          <p className="text-gray-500 text-sm p-6">No activity found</p>
        )}
        {data.activity.map((item, i) => (
          <div key={i} className="p-4 flex items-start gap-4 hover:bg-gray-800/50 transition-colors">
            {/* Type indicator */}
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
              item.type === 'commit' ? 'bg-purple-500/20 text-purple-400' : 'bg-blue-500/20 text-blue-400'
            }`}>
              {item.type === 'commit' ? (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <circle cx="12" cy="12" r="4" />
                  <line x1="1.05" y1="12" x2="7" y2="12" />
                  <line x1="17.01" y1="12" x2="22.96" y2="12" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-200">
                {item.type === 'commit' ? item.data.message : (item.data.summary ?? item.data.type)}
              </p>
              <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                {item.type === 'commit' && item.data.shortHash && (
                  <code className="text-purple-400 bg-purple-500/10 px-1 rounded">{item.data.shortHash}</code>
                )}
                {item.data.author && <span>{item.data.author}</span>}
                {item.data.product && <span className="text-blue-400">{item.data.product}</span>}
                {item.data.agent && <span>{item.data.agent}</span>}
                <span>{new Date(item.timestamp).toLocaleString()}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
