export default function Invoices() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-text-primary mb-1">Invoices</h2>
        <p className="text-text-secondary">
          Create and manage invoices for your customers
        </p>
      </div>

      <div className="bg-card-bg border border-card-border rounded-xl p-8 text-center">
        <div className="text-4xl mb-3">
          <svg className="w-12 h-12 mx-auto text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-text-primary mb-2">Coming Soon</h3>
        <p className="text-text-secondary text-sm max-w-md mx-auto">
          Invoice generation and management tools are being developed. Send professional invoices with stablecoin payment links.
        </p>
      </div>
    </div>
  );
}
