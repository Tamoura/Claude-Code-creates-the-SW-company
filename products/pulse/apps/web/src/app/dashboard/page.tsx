import StatCard from '../../components/dashboard/StatCard';
import RiskGauge from '../../components/dashboard/RiskGauge';
import ActivityFeed from '../../components/dashboard/ActivityFeed';

const mockStats = [
  { title: 'PRs Merged (7d)', value: '24', trend: '+12% vs last week' },
  { title: 'Median Cycle Time', value: '18h', trend: '-2h vs last week' },
  { title: 'Review Time', value: '4.2h', subtitle: 'Median time to first review' },
  { title: 'Test Coverage', value: '87.3%', trend: '+0.8% this sprint' },
];

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Dashboard</h1>
        <p className="text-[var(--text-secondary)] mt-1">Your team&apos;s engineering pulse at a glance</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {mockStats.map((stat) => (
          <StatCard key={stat.title} {...stat} />
        ))}
      </div>

      {/* Risk + Activity Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <RiskGauge score={42} label="Sprint Risk" />
        </div>
        <div className="lg:col-span-2">
          <ActivityFeed />
        </div>
      </div>
    </div>
  );
}
