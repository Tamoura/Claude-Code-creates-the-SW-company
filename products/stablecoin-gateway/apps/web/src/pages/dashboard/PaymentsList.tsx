import TransactionsTable from '../../components/dashboard/TransactionsTable';

export default function PaymentsList() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-text-primary mb-1">Payment History</h2>
        <p className="text-text-secondary">
          View and manage all your payment transactions
        </p>
      </div>
      <TransactionsTable />
    </div>
  );
}
