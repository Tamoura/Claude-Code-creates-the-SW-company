export default function ApiKeys() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-text-primary mb-1">API Keys</h2>
        <p className="text-text-secondary">
          Manage your API keys for programmatic access
        </p>
      </div>

      <div className="bg-card-bg border border-card-border rounded-xl p-8 text-center">
        <div className="text-4xl mb-3">
          <svg className="w-12 h-12 mx-auto text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 0 1 3 3m3 0a6 6 0 0 1-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1 1 21.75 8.25Z" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-text-primary mb-2">Coming Soon</h3>
        <p className="text-text-secondary text-sm max-w-md mx-auto">
          Generate and manage API keys for secure programmatic access to StableFlow services.
        </p>
      </div>
    </div>
  );
}
