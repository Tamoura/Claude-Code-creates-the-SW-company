export default function Webhooks() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-text-primary mb-1">Webhooks & Docs</h2>
        <p className="text-text-secondary">
          Configure webhook endpoints and view API documentation
        </p>
      </div>

      <div className="bg-card-bg border border-card-border rounded-xl p-8 text-center">
        <div className="text-4xl mb-3">
          <svg className="w-12 h-12 mx-auto text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75 22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3-4.5 16.5" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-text-primary mb-2">Coming Soon</h3>
        <p className="text-text-secondary text-sm max-w-md mx-auto">
          Configure webhook endpoints to receive real-time payment notifications and browse API documentation.
        </p>
      </div>
    </div>
  );
}
