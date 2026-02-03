/**
 * API Reference Documentation
 *
 * Complete reference for all StableFlow API endpoints.
 */

export default function ApiReference() {
  const endpoints = [
    {
      category: 'Payment Sessions',
      items: [
        { method: 'POST', path: '/v1/payment-sessions', description: 'Create payment session' },
        { method: 'GET', path: '/v1/payment-sessions/:id', description: 'Get payment session' },
        { method: 'GET', path: '/v1/payment-sessions', description: 'List payment sessions' },
      ],
    },
    {
      category: 'Webhooks',
      items: [
        { method: 'POST', path: '/v1/webhooks', description: 'Create webhook' },
        { method: 'GET', path: '/v1/webhooks', description: 'List webhooks' },
        { method: 'PATCH', path: '/v1/webhooks/:id', description: 'Update webhook' },
        { method: 'DELETE', path: '/v1/webhooks/:id', description: 'Delete webhook' },
      ],
    },
    {
      category: 'API Keys',
      items: [
        { method: 'POST', path: '/v1/api-keys', description: 'Create API key' },
        { method: 'GET', path: '/v1/api-keys', description: 'List API keys' },
        { method: 'DELETE', path: '/v1/api-keys/:id', description: 'Revoke API key' },
      ],
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-text-primary mb-2">API Reference</h1>
        <p className="text-text-secondary">
          Complete reference documentation for the StableFlow REST API.
        </p>
      </div>

      {/* Base URL */}
      <section>
        <h2 className="text-xl font-semibold text-text-primary mb-3">Base URL</h2>
        <div className="bg-code-bg rounded-lg p-4 font-mono text-sm text-text-secondary">
          <code>https://api.stableflow.io/v1</code>
        </div>
      </section>

      {/* Authentication */}
      <section>
        <h2 className="text-xl font-semibold text-text-primary mb-3">Authentication</h2>
        <p className="text-text-secondary mb-3">
          All API requests require authentication using a Bearer token in the Authorization header:
        </p>
        <div className="bg-code-bg rounded-lg p-4 font-mono text-sm text-text-secondary overflow-x-auto">
          <pre>{`Authorization: Bearer sk_live_your_api_key`}</pre>
        </div>
      </section>

      {/* Endpoints */}
      <section>
        <h2 className="text-xl font-semibold text-text-primary mb-4">Endpoints</h2>
        {endpoints.map((group) => (
          <div key={group.category} className="mb-6">
            <h3 className="text-lg font-semibold text-text-primary mb-3">{group.category}</h3>
            <div className="bg-card-bg border border-card-border rounded-lg overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-card-border bg-sidebar-hover">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-text-muted uppercase">
                      Method
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-text-muted uppercase">
                      Endpoint
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-text-muted uppercase">
                      Description
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {group.items.map((endpoint, idx) => (
                    <tr
                      key={idx}
                      className="border-b border-card-border last:border-0"
                    >
                      <td className="px-4 py-3">
                        <span
                          className={`
                            inline-block px-2 py-1 text-xs font-semibold rounded
                            ${endpoint.method === 'POST'
                              ? 'bg-green-500/15 text-accent-green'
                              : endpoint.method === 'GET'
                              ? 'bg-blue-500/15 text-accent-blue'
                              : endpoint.method === 'PATCH'
                              ? 'bg-yellow-500/15 text-accent-yellow'
                              : 'bg-pink-500/15 text-accent-pink'
                            }
                          `}
                        >
                          {endpoint.method}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-sm text-text-secondary">
                        {endpoint.path}
                      </td>
                      <td className="px-4 py-3 text-sm text-text-secondary">
                        {endpoint.description}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </section>

      {/* Example Request/Response */}
      <section>
        <h2 className="text-xl font-semibold text-text-primary mb-3">
          Example: Create Payment Session
        </h2>
        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-text-primary mb-2">Request</h3>
            <div className="bg-code-bg rounded-lg p-4 font-mono text-sm text-text-secondary overflow-x-auto">
              <pre>{`POST /v1/payment-sessions
Authorization: Bearer sk_live_your_api_key
Content-Type: application/json

{
  "amount": 100.00,
  "currency": "USD",
  "network": "polygon",
  "token": "USDC",
  "description": "Order #1234",
  "metadata": {
    "order_id": "1234",
    "customer_id": "cust_xyz"
  }
}`}</pre>
            </div>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-text-primary mb-2">Response</h3>
            <div className="bg-code-bg rounded-lg p-4 font-mono text-sm text-text-secondary overflow-x-auto">
              <pre>{`{
  "id": "ps_abc123",
  "amount": 100.00,
  "currency": "USD",
  "network": "polygon",
  "token": "USDC",
  "status": "pending",
  "checkout_url": "https://pay.stableflow.io/ps_abc123",
  "created_at": "2024-01-15T10:30:00Z",
  "expires_at": "2024-01-15T11:00:00Z"
}`}</pre>
            </div>
          </div>
        </div>
      </section>

      {/* HTTP Status Codes */}
      <section>
        <h2 className="text-xl font-semibold text-text-primary mb-3">HTTP Status Codes</h2>
        <div className="bg-card-bg border border-card-border rounded-lg overflow-hidden">
          <table className="w-full">
            <tbody>
              {[
                { code: '200', description: 'OK - Request successful' },
                { code: '201', description: 'Created - Resource created successfully' },
                { code: '400', description: 'Bad Request - Invalid request parameters' },
                { code: '401', description: 'Unauthorized - Invalid or missing API key' },
                { code: '404', description: 'Not Found - Resource not found' },
                { code: '429', description: 'Too Many Requests - Rate limit exceeded' },
                { code: '500', description: 'Internal Server Error - Something went wrong' },
              ].map((status) => (
                <tr
                  key={status.code}
                  className="border-b border-card-border last:border-0"
                >
                  <td className="px-4 py-3 font-mono text-sm font-semibold text-accent-blue">
                    {status.code}
                  </td>
                  <td className="px-4 py-3 text-sm text-text-secondary">
                    {status.description}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
