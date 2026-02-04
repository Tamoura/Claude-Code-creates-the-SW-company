import { useAnalytics } from '../../hooks/useAnalytics';

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

interface OverviewCardProps {
  title: string;
  value: string;
}

function OverviewCard({ title, value }: OverviewCardProps) {
  return (
    <div className="bg-card-bg border border-card-border rounded-xl p-6">
      <h3 className="text-sm text-text-secondary mb-2">{title}</h3>
      <p className="text-2xl font-bold text-text-primary">{value}</p>
    </div>
  );
}

interface PeriodButtonProps {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}

function PeriodButton({ active, onClick, children }: PeriodButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
        active
          ? 'bg-accent-blue text-white border-accent-blue'
          : 'border-card-border bg-card-bg text-text-secondary hover:bg-sidebar-hover'
      }`}
    >
      {children}
    </button>
  );
}

export default function Analytics() {
  const {
    overview,
    volume,
    breakdown,
    isLoading,
    error,
    period,
    setPeriod,
    days,
    setDays,
    groupBy,
    setGroupBy,
  } = useAnalytics();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-text-secondary">Loading analytics...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-red-500">{error}</div>
      </div>
    );
  }

  const maxVolume = Math.max(...volume.map(v => v.volume), 1);

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Analytics</h1>
        <p className="text-sm text-text-secondary mt-1">
          Payment insights and metrics
        </p>
      </div>

      {/* Overview Cards */}
      {overview && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <OverviewCard
            title="Total Payments"
            value={overview.total_payments.toString()}
          />
          <OverviewCard
            title="Total Volume"
            value={formatCurrency(overview.total_volume)}
          />
          <OverviewCard
            title="Success Rate"
            value={`${overview.success_rate.toFixed(1)}%`}
          />
          <OverviewCard
            title="Average Payment"
            value={formatCurrency(overview.average_payment)}
          />
        </div>
      )}

      {/* Volume Chart */}
      <div className="bg-card-bg border border-card-border rounded-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-text-primary">Payment Volume</h2>
          <div className="flex items-center gap-4">
            {/* Period Selector */}
            <div className="flex gap-2">
              <PeriodButton
                active={period === 'day'}
                onClick={() => setPeriod('day')}
              >
                Day
              </PeriodButton>
              <PeriodButton
                active={period === 'week'}
                onClick={() => setPeriod('week')}
              >
                Week
              </PeriodButton>
              <PeriodButton
                active={period === 'month'}
                onClick={() => setPeriod('month')}
              >
                Month
              </PeriodButton>
            </div>

            {/* Days Selector */}
            <select
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
              className="px-3 py-2 border border-card-border bg-card-bg text-text-primary rounded-lg text-sm"
            >
              <option value={7}>7 days</option>
              <option value={30}>30 days</option>
              <option value={90}>90 days</option>
            </select>
          </div>
        </div>

        {/* Simple Bar Chart */}
        {volume.length > 0 ? (
          <div className="space-y-3">
            {volume.map((item, index) => (
              <div key={index} className="flex items-center gap-4">
                <div className="w-24 text-sm text-text-secondary">
                  {item.date}
                </div>
                <div className="flex-1">
                  <div
                    className="bg-accent-blue h-8 rounded transition-all"
                    style={{ width: `${(item.volume / maxVolume) * 100}%` }}
                  />
                </div>
                <div className="w-32 text-sm text-text-primary text-right">
                  {formatCurrency(item.volume)} ({item.count})
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center text-text-secondary py-8">
            No volume data available
          </div>
        )}
      </div>

      {/* Payment Breakdown */}
      <div className="bg-card-bg border border-card-border rounded-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-text-primary">
            Payment Breakdown
          </h2>

          {/* Group By Selector */}
          <div className="flex gap-2">
            <PeriodButton
              active={groupBy === 'status'}
              onClick={() => setGroupBy('status')}
            >
              Status
            </PeriodButton>
            <PeriodButton
              active={groupBy === 'network'}
              onClick={() => setGroupBy('network')}
            >
              Network
            </PeriodButton>
            <PeriodButton
              active={groupBy === 'token'}
              onClick={() => setGroupBy('token')}
            >
              Token
            </PeriodButton>
          </div>
        </div>

        {/* Breakdown Table */}
        {breakdown.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-card-border">
                  <th className="text-left py-3 px-4 text-sm font-medium text-text-secondary">
                    {groupBy.charAt(0).toUpperCase() + groupBy.slice(1)}
                  </th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-text-secondary">
                    Count
                  </th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-text-secondary">
                    Volume
                  </th>
                </tr>
              </thead>
              <tbody>
                {breakdown.map((item, index) => (
                  <tr
                    key={index}
                    className="border-b border-card-border last:border-0"
                  >
                    <td className="py-3 px-4 text-sm text-text-primary capitalize">
                      {item.label}
                    </td>
                    <td className="py-3 px-4 text-sm text-text-primary text-right">
                      {item.count}
                    </td>
                    <td className="py-3 px-4 text-sm text-text-primary text-right">
                      {formatCurrency(item.volume)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center text-text-secondary py-8">
            No breakdown data available
          </div>
        )}
      </div>
    </div>
  );
}
