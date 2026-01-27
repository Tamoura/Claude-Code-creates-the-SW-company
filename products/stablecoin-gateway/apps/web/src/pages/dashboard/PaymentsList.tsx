import ComingSoon from '../../components/ComingSoon';

export default function PaymentsList() {
  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Payment History</h2>
        <p className="text-gray-600">
          View and manage all your payment transactions
        </p>
      </div>

      <div className="bg-white rounded-lg shadow p-8">
        <ComingSoon
          title="Payment History"
          description="View all your payments, filter by status, search by transaction hash, and export to CSV."
        />
      </div>
    </div>
  );
}
