import StatCard from '../../components/dashboard/StatCard';
import DeveloperIntegration from '../../components/dashboard/DeveloperIntegration';
import CheckoutPreview from '../../components/dashboard/CheckoutPreview';
import TransactionsTable from '../../components/dashboard/TransactionsTable';
import { useDashboardData } from '../../hooks/useDashboardData';

export default function DashboardHome() {
  const { stats, transactions, isLoading } = useDashboardData();

  return (
    <div className="space-y-8">
      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard
          title={stats.totalBalance.title}
          value={stats.totalBalance.value}
          trend={stats.totalBalance.trend}
        />
        <StatCard
          title={stats.settlementVolume.title}
          value={stats.settlementVolume.value}
          trend={stats.settlementVolume.trend}
        />
        <StatCard
          title={stats.successRate.title}
          value={stats.successRate.value}
          subtitle={stats.successRate.subtitle}
        />
      </div>

      {/* Developer Integration + Checkout Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DeveloperIntegration />
        <CheckoutPreview />
      </div>

      {/* Recent Transactions */}
      <TransactionsTable transactions={transactions} isLoading={isLoading} />
    </div>
  );
}
