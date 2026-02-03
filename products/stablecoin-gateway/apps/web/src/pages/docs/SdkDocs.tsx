/**
 * SDK Documentation
 *
 * Guide for using the StableFlow JavaScript SDK.
 */

export default function SdkDocs() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-text-primary mb-2">JavaScript SDK</h1>
        <p className="text-text-secondary">
          Official JavaScript/TypeScript SDK for StableFlow payment gateway.
        </p>
      </div>

      {/* Installation */}
      <section>
        <h2 className="text-xl font-semibold text-text-primary mb-3">Installation</h2>
        <p className="text-text-secondary mb-3">
          Install the SDK using npm or yarn:
        </p>
        <div className="bg-code-bg rounded-lg p-4 font-mono text-sm text-text-secondary overflow-x-auto">
          <code>npm install @stablecoin-gateway/sdk</code>
        </div>
      </section>

      {/* Initialization */}
      <section>
        <h2 className="text-xl font-semibold text-text-primary mb-3">Initialization</h2>
        <p className="text-text-secondary mb-3">
          Initialize the SDK with your API key:
        </p>
        <div className="bg-code-bg rounded-lg p-4 font-mono text-sm text-text-secondary overflow-x-auto">
          <pre>{`import { StablecoinGateway } from '@stablecoin-gateway/sdk';

const gateway = new StablecoinGateway('sk_live_your_api_key');`}</pre>
        </div>
      </section>

      {/* Create Payment Session */}
      <section>
        <h2 className="text-xl font-semibold text-text-primary mb-3">Create Payment Session</h2>
        <p className="text-text-secondary mb-3">
          Create a new payment session for your customer:
        </p>
        <div className="space-y-3">
          <div>
            <h3 className="text-sm font-semibold text-text-primary mb-2">TypeScript Signature</h3>
            <div className="bg-code-bg rounded-lg p-4 font-mono text-sm text-text-secondary overflow-x-auto">
              <pre>{`createPaymentSession(params: {
  amount: number;
  currency: 'USD' | 'EUR' | 'GBP';
  network: 'polygon' | 'ethereum';
  token?: 'USDC' | 'USDT';
  description?: string;
  metadata?: Record<string, any>;
}): Promise<PaymentSession>`}</pre>
            </div>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-text-primary mb-2">Example</h3>
            <div className="bg-code-bg rounded-lg p-4 font-mono text-sm text-text-secondary overflow-x-auto">
              <pre>{`const session = await gateway.createPaymentSession({
  amount: 100.00,
  currency: 'USD',
  network: 'polygon',
  token: 'USDC',
  description: 'Order #1234',
  metadata: {
    order_id: '1234',
    customer_id: 'cust_xyz',
  },
});

console.log(session.id); // ps_abc123
console.log(session.checkout_url); // https://pay.stableflow.io/ps_abc123

// Redirect customer to checkout
window.location.href = session.checkout_url;`}</pre>
            </div>
          </div>
        </div>
      </section>

      {/* Get Payment Session */}
      <section>
        <h2 className="text-xl font-semibold text-text-primary mb-3">Get Payment Session</h2>
        <p className="text-text-secondary mb-3">
          Retrieve details of an existing payment session:
        </p>
        <div className="space-y-3">
          <div>
            <h3 className="text-sm font-semibold text-text-primary mb-2">TypeScript Signature</h3>
            <div className="bg-code-bg rounded-lg p-4 font-mono text-sm text-text-secondary overflow-x-auto">
              <pre>{`getPaymentSession(id: string): Promise<PaymentSession>`}</pre>
            </div>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-text-primary mb-2">Example</h3>
            <div className="bg-code-bg rounded-lg p-4 font-mono text-sm text-text-secondary overflow-x-auto">
              <pre>{`const session = await gateway.getPaymentSession('ps_abc123');

console.log(session.status); // 'pending' | 'confirming' | 'completed' | 'failed'
console.log(session.amount); // 100.00
console.log(session.transaction_hash); // 0x1234... (if completed)`}</pre>
            </div>
          </div>
        </div>
      </section>

      {/* List Payment Sessions */}
      <section>
        <h2 className="text-xl font-semibold text-text-primary mb-3">List Payment Sessions</h2>
        <p className="text-text-secondary mb-3">
          Retrieve a paginated list of all payment sessions:
        </p>
        <div className="space-y-3">
          <div>
            <h3 className="text-sm font-semibold text-text-primary mb-2">TypeScript Signature</h3>
            <div className="bg-code-bg rounded-lg p-4 font-mono text-sm text-text-secondary overflow-x-auto">
              <pre>{`listPaymentSessions(params?: {
  limit?: number;
  offset?: number;
  status?: 'pending' | 'confirming' | 'completed' | 'failed' | 'expired';
}): Promise<{
  data: PaymentSession[];
  total: number;
  has_more: boolean;
}>`}</pre>
            </div>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-text-primary mb-2">Example</h3>
            <div className="bg-code-bg rounded-lg p-4 font-mono text-sm text-text-secondary overflow-x-auto">
              <pre>{`const result = await gateway.listPaymentSessions({
  limit: 10,
  offset: 0,
  status: 'completed',
});

console.log(result.data); // Array of PaymentSession objects
console.log(result.total); // Total count
console.log(result.has_more); // Boolean indicating if more results exist`}</pre>
            </div>
          </div>
        </div>
      </section>

      {/* Error Handling */}
      <section>
        <h2 className="text-xl font-semibold text-text-primary mb-3">Error Handling</h2>
        <p className="text-text-secondary mb-3">
          The SDK throws typed errors that you can catch and handle:
        </p>
        <div className="bg-code-bg rounded-lg p-4 font-mono text-sm text-text-secondary overflow-x-auto">
          <pre>{`import { StablecoinGateway, ApiError } from '@stablecoin-gateway/sdk';

const gateway = new StablecoinGateway('sk_live_your_api_key');

try {
  const session = await gateway.createPaymentSession({
    amount: 100.00,
    currency: 'USD',
    network: 'polygon',
  });
} catch (error) {
  if (error instanceof ApiError) {
    console.error('API Error:', error.message);
    console.error('Status Code:', error.statusCode);
    console.error('Error Code:', error.code);
  } else {
    console.error('Unexpected error:', error);
  }
}`}</pre>
        </div>
      </section>

      {/* TypeScript Support */}
      <section>
        <h2 className="text-xl font-semibold text-text-primary mb-3">TypeScript Support</h2>
        <p className="text-text-secondary mb-3">
          The SDK is written in TypeScript and provides full type definitions:
        </p>
        <div className="bg-code-bg rounded-lg p-4 font-mono text-sm text-text-secondary overflow-x-auto">
          <pre>{`import type {
  PaymentSession,
  PaymentSessionStatus,
  CreatePaymentSessionParams,
  Network,
  Token,
} from '@stablecoin-gateway/sdk';

// All types are exported for your convenience
const params: CreatePaymentSessionParams = {
  amount: 100.00,
  currency: 'USD',
  network: 'polygon',
  token: 'USDC',
};

const session: PaymentSession = await gateway.createPaymentSession(params);
const status: PaymentSessionStatus = session.status;`}</pre>
        </div>
      </section>

      {/* Next Steps */}
      <section className="bg-card-bg border border-card-border rounded-xl p-6 mt-12">
        <h3 className="text-lg font-semibold text-text-primary mb-4">Additional Resources</h3>
        <ul className="space-y-2">
          <li className="flex items-center gap-2 text-text-secondary">
            <svg className="w-4 h-4 text-accent-blue flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <a
              href="https://github.com/stableflow/sdk"
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent-blue hover:underline"
            >
              View SDK source code on GitHub
            </a>
          </li>
          <li className="flex items-center gap-2 text-text-secondary">
            <svg className="w-4 h-4 text-accent-blue flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            <a
              href="https://www.npmjs.com/package/@stablecoin-gateway/sdk"
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent-blue hover:underline"
            >
              View package on npm
            </a>
          </li>
        </ul>
      </section>
    </div>
  );
}
