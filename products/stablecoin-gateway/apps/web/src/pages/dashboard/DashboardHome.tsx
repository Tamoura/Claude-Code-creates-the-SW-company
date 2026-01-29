import ComingSoon from '../../components/ComingSoon';

export default function DashboardHome() {
  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Dashboard Overview</h2>
        <p className="text-gray-600">
          View your payment statistics and recent transactions
        </p>
      </div>

      {/* Quick Stats (placeholder) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm font-medium text-gray-600 mb-1">Total Volume</div>
          <div className="text-3xl font-bold text-gray-900">$0.00</div>
          <div className="text-xs text-gray-500 mt-1">Last 30 days</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm font-medium text-gray-600 mb-1">Payments</div>
          <div className="text-3xl font-bold text-gray-900">0</div>
          <div className="text-xs text-gray-500 mt-1">Completed</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm font-medium text-gray-600 mb-1">Fees Saved</div>
          <div className="text-3xl font-bold text-green-600">$0.00</div>
          <div className="text-xs text-gray-500 mt-1">vs. credit cards (2.9%)</div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-8">
        <ComingSoon
          title="Analytics Dashboard"
          description="View detailed charts, payment history, and insights about your transactions."
        />
      </div>
    </div>
  );
}
