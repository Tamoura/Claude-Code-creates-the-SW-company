/**
 * Webhook Integration Documentation
 *
 * Guide for setting up and handling webhook notifications.
 */

export default function WebhooksDocs() {
  const eventTypes = [
    { event: 'payment.created', description: 'Payment session created' },
    { event: 'payment.confirming', description: 'Payment transaction detected on blockchain' },
    { event: 'payment.completed', description: 'Payment confirmed and settled' },
    { event: 'payment.failed', description: 'Payment failed or invalid' },
    { event: 'payment.expired', description: 'Payment session expired without payment' },
    { event: 'refund.created', description: 'Refund initiated' },
    { event: 'refund.completed', description: 'Refund completed' },
    { event: 'refund.failed', description: 'Refund failed' },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-text-primary mb-2">Webhook Integration</h1>
        <p className="text-text-secondary">
          Receive real-time notifications about payment events via HTTP webhooks.
        </p>
      </div>

      {/* How Webhooks Work */}
      <section>
        <h2 className="text-xl font-semibold text-text-primary mb-3">How Webhooks Work</h2>
        <div className="bg-card-bg border border-card-border rounded-xl p-6">
          <ol className="space-y-3 text-text-secondary">
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-gradient-to-r from-pink-500 to-blue-500 flex items-center justify-center text-white text-xs font-bold">
                1
              </span>
              <span>A payment event occurs (e.g., customer completes payment)</span>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-gradient-to-r from-pink-500 to-blue-500 flex items-center justify-center text-white text-xs font-bold">
                2
              </span>
              <span>StableFlow sends a POST request to your webhook URL</span>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-gradient-to-r from-pink-500 to-blue-500 flex items-center justify-center text-white text-xs font-bold">
                3
              </span>
              <span>Your server validates the signature and processes the event</span>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-gradient-to-r from-pink-500 to-blue-500 flex items-center justify-center text-white text-xs font-bold">
                4
              </span>
              <span>Your server responds with a 200 status code</span>
            </li>
          </ol>
        </div>
      </section>

      {/* Event Types */}
      <section>
        <h2 className="text-xl font-semibold text-text-primary mb-3">Event Types</h2>
        <div className="bg-card-bg border border-card-border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-card-border bg-sidebar-hover">
                <th className="text-left px-4 py-3 text-xs font-semibold text-text-muted uppercase">
                  Event
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-text-muted uppercase">
                  Description
                </th>
              </tr>
            </thead>
            <tbody>
              {eventTypes.map((item) => (
                <tr
                  key={item.event}
                  className="border-b border-card-border last:border-0"
                >
                  <td className="px-4 py-3 font-mono text-sm text-accent-blue">
                    {item.event}
                  </td>
                  <td className="px-4 py-3 text-sm text-text-secondary">
                    {item.description}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Webhook Payload */}
      <section>
        <h2 className="text-xl font-semibold text-text-primary mb-3">Webhook Payload</h2>
        <p className="text-text-secondary mb-3">
          Each webhook request includes a JSON payload with event details:
        </p>
        <div className="bg-code-bg rounded-lg p-4 font-mono text-sm text-text-secondary overflow-x-auto">
          <pre>{`{
  "id": "evt_abc123",
  "type": "payment.completed",
  "created_at": "2024-01-15T10:30:00Z",
  "data": {
    "id": "ps_abc123",
    "amount": 100.00,
    "currency": "USD",
    "network": "polygon",
    "token": "USDC",
    "status": "completed",
    "transaction_hash": "0x1234...",
    "metadata": {
      "order_id": "1234"
    }
  }
}`}</pre>
        </div>
      </section>

      {/* Signature Verification */}
      <section>
        <h2 className="text-xl font-semibold text-text-primary mb-3">Signature Verification</h2>
        <p className="text-text-secondary mb-3">
          Verify webhook authenticity using HMAC-SHA256 signatures. The signature is sent in
          the <code className="font-mono text-sm bg-code-bg px-1.5 py-0.5 rounded">X-Webhook-Signature</code> header.
        </p>
        <div className="bg-code-bg rounded-lg p-4 font-mono text-sm text-text-secondary overflow-x-auto">
          <pre>{`import crypto from 'crypto';

function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const expected = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expected)
  );
}

// Usage in your webhook handler
app.post('/webhooks/stableflow', (req, res) => {
  const signature = req.headers['x-webhook-signature'];
  const payload = JSON.stringify(req.body);
  const secret = process.env.WEBHOOK_SECRET;

  if (!verifyWebhookSignature(payload, signature, secret)) {
    return res.status(401).send('Invalid signature');
  }

  // Process the webhook event
  const event = req.body;
  console.log('Received event:', event.type);

  res.status(200).send('OK');
});`}</pre>
        </div>
      </section>

      {/* Retry Policy */}
      <section>
        <h2 className="text-xl font-semibold text-text-primary mb-3">Retry Policy</h2>
        <p className="text-text-secondary mb-3">
          If your endpoint doesn't respond with a 2xx status code, StableFlow will retry the
          webhook with exponential backoff:
        </p>
        <div className="bg-card-bg border border-card-border rounded-xl p-6">
          <ul className="space-y-2 text-text-secondary">
            <li className="flex items-center gap-2">
              <svg className="w-4 h-4 text-accent-blue flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              <span>First retry: 1 second after initial failure</span>
            </li>
            <li className="flex items-center gap-2">
              <svg className="w-4 h-4 text-accent-blue flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              <span>Second retry: 10 seconds after first retry</span>
            </li>
            <li className="flex items-center gap-2">
              <svg className="w-4 h-4 text-accent-blue flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              <span>Third retry: 60 seconds after second retry</span>
            </li>
            <li className="flex items-center gap-2">
              <svg className="w-4 h-4 text-accent-pink flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              <span>After 3 failed attempts, the webhook is marked as failed</span>
            </li>
          </ul>
        </div>
      </section>

      {/* Best Practices */}
      <section>
        <h2 className="text-xl font-semibold text-text-primary mb-3">Best Practices</h2>
        <div className="bg-card-bg border border-card-border rounded-xl p-6">
          <ul className="space-y-3 text-text-secondary">
            <li className="flex gap-2">
              <svg className="w-5 h-5 text-accent-green flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <div>
                <strong className="text-text-primary">Always verify signatures</strong> — Prevent
                unauthorized webhook calls
              </div>
            </li>
            <li className="flex gap-2">
              <svg className="w-5 h-5 text-accent-green flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <div>
                <strong className="text-text-primary">Respond quickly</strong> — Return 200 status
                within 5 seconds to avoid retries
              </div>
            </li>
            <li className="flex gap-2">
              <svg className="w-5 h-5 text-accent-green flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <div>
                <strong className="text-text-primary">Handle duplicates</strong> — Use event IDs
                to deduplicate webhook calls
              </div>
            </li>
            <li className="flex gap-2">
              <svg className="w-5 h-5 text-accent-green flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <div>
                <strong className="text-text-primary">Process asynchronously</strong> — Queue
                heavy operations for background processing
              </div>
            </li>
            <li className="flex gap-2">
              <svg className="w-5 h-5 text-accent-green flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <div>
                <strong className="text-text-primary">Use HTTPS</strong> — Webhook URLs must use
                HTTPS for security
              </div>
            </li>
          </ul>
        </div>
      </section>
    </div>
  );
}
