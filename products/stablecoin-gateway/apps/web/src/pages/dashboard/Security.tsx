export default function Security() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-text-primary mb-1">Security</h2>
        <p className="text-text-secondary">
          Manage your security settings and access controls
        </p>
      </div>

      <div className="bg-card-bg border border-card-border rounded-xl p-8 text-center">
        <div className="text-4xl mb-3">
          <svg className="w-12 h-12 mx-auto text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-text-primary mb-2">Coming Soon</h3>
        <p className="text-text-secondary text-sm max-w-md mx-auto">
          Two-factor authentication, IP allowlisting, and session management features are being developed.
        </p>
      </div>
    </div>
  );
}
