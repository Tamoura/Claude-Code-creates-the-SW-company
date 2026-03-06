const METRICS = [
  { label: 'Total Signups', value: '0', change: null },
  { label: 'Active Users (30d)', value: '0', change: null },
  { label: 'Assessments Completed', value: '0', change: null },
  { label: 'Avg Score', value: '--', change: null },
];

const DOMAIN_STATS = [
  { domain: 'Governance & Strategy', assessments: 0, avgScore: 0 },
  { domain: 'Risk Management', assessments: 0, avgScore: 0 },
  { domain: 'Compliance & Regulatory', assessments: 0, avgScore: 0 },
  { domain: 'Information Security', assessments: 0, avgScore: 0 },
  { domain: 'Audit & Assurance', assessments: 0, avgScore: 0 },
  { domain: 'Business Continuity', assessments: 0, avgScore: 0 },
];

export default function AdminAnalyticsPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">
        Analytics
      </h1>
      <p className="text-gray-600 mb-8">
        Platform usage and assessment analytics.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {METRICS.map((metric) => (
          <div
            key={metric.label}
            className="bg-white rounded-lg border border-gray-200 p-6"
          >
            <h3 className="text-sm font-medium text-gray-500 mb-1">
              {metric.label}
            </h3>
            <p className="text-2xl font-bold text-gray-900">{metric.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Assessments by Domain
          </h2>
          <div className="space-y-4">
            {DOMAIN_STATS.map((stat) => (
              <div key={stat.domain}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-700">{stat.domain}</span>
                  <span className="text-gray-500">{stat.assessments} taken</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div
                    className="bg-primary h-2 rounded-full"
                    style={{ width: `${stat.avgScore}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Tier Distribution
          </h2>
          <div className="space-y-3">
            {['Vanguard', 'Expert', 'Professional', 'Practitioner', 'Aspirant'].map(
              (tier) => (
                <div key={tier} className="flex items-center gap-3">
                  <span className="text-sm text-gray-700 w-28">{tier}</span>
                  <div className="flex-1 bg-gray-100 rounded-full h-2">
                    <div className="bg-secondary h-2 rounded-full" style={{ width: '0%' }} />
                  </div>
                  <span className="text-sm text-gray-500 w-8 text-right">0</span>
                </div>
              )
            )}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Recent Activity
        </h2>
        <div className="text-center py-8 text-gray-500 text-sm">
          No activity recorded yet. User signups, assessments, and job
          applications will be tracked here.
        </div>
      </div>
    </div>
  );
}
