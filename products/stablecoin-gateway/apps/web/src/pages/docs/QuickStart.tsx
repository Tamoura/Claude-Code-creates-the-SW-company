/**
 * Quick Start Documentation
 *
 * Step-by-step guide to getting started with StableFlow API.
 */

import { Link } from 'react-router-dom';

export default function QuickStart() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-text-primary mb-2">Quick Start Guide</h1>
        <p className="text-text-secondary">
          Get started with StableFlow in minutes. Follow these steps to integrate stablecoin
          payments into your application.
        </p>
      </div>

      {/* Step 1 */}
      <section>
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-r from-pink-500 to-blue-500 flex items-center justify-center">
            <span className="text-white text-sm font-bold">1</span>
          </div>
          <h2 className="text-xl font-semibold text-text-primary">Create an Account</h2>
        </div>
        <p className="text-text-secondary mb-2">
          First, you'll need to create a merchant account on StableFlow.
        </p>
        <Link
          to="/signup"
          className="inline-block px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-pink-500 to-pink-600 rounded-lg hover:from-pink-600 hover:to-pink-700 transition-all"
        >
          Sign Up
        </Link>
      </section>

      {/* Step 2 */}
      <section>
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-r from-pink-500 to-blue-500 flex items-center justify-center">
            <span className="text-white text-sm font-bold">2</span>
          </div>
          <h2 className="text-xl font-semibold text-text-primary">Get Your API Key</h2>
        </div>
        <p className="text-text-secondary">
          After signing up, navigate to your dashboard and go to{' '}
          <span className="font-mono text-sm bg-code-bg px-1.5 py-0.5 rounded">
            API Keys
          </span>{' '}
          to generate your API credentials.
        </p>
      </section>

      {/* Step 3 */}
      <section>
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-r from-pink-500 to-blue-500 flex items-center justify-center">
            <span className="text-white text-sm font-bold">3</span>
          </div>
          <h2 className="text-xl font-semibold text-text-primary">Install the SDK</h2>
        </div>
        <p className="text-text-secondary mb-3">
          Install the StableFlow SDK using npm or yarn:
        </p>
        <div className="bg-code-bg rounded-lg p-4 font-mono text-sm text-text-secondary overflow-x-auto">
          <code>npm install @stablecoin-gateway/sdk</code>
        </div>
      </section>

      {/* Step 4 */}
      <section>
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-r from-pink-500 to-blue-500 flex items-center justify-center">
            <span className="text-white text-sm font-bold">4</span>
          </div>
          <h2 className="text-xl font-semibold text-text-primary">Create a Payment Session</h2>
        </div>
        <p className="text-text-secondary mb-3">
          Create your first payment session using curl or the SDK:
        </p>
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-text-primary mb-2">Using curl</h3>
          <div className="bg-code-bg rounded-lg p-4 font-mono text-sm text-text-secondary overflow-x-auto">
            <pre>{`curl -X POST https://api.stableflow.io/v1/payment-sessions \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "amount": 100,
    "currency": "USD",
    "description": "Order #1234"
  }'`}</pre>
          </div>
        </div>
        <div>
          <h3 className="text-sm font-semibold text-text-primary mb-2">Using the SDK</h3>
          <div className="bg-code-bg rounded-lg p-4 font-mono text-sm text-text-secondary overflow-x-auto">
            <pre>{`import { StablecoinGateway } from '@stablecoin-gateway/sdk';

const gateway = new StablecoinGateway('sk_live_your_api_key');

const session = await gateway.createPaymentSession({
  amount: 100.00,
  currency: 'USD',
  network: 'polygon',
  token: 'USDC',
  description: 'Order #1234',
});

// Redirect customer to checkout
window.location.href = session.checkout_url;`}</pre>
          </div>
        </div>
      </section>

      {/* Step 5 */}
      <section>
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-r from-pink-500 to-blue-500 flex items-center justify-center">
            <span className="text-white text-sm font-bold">5</span>
          </div>
          <h2 className="text-xl font-semibold text-text-primary">Handle Webhooks</h2>
        </div>
        <p className="text-text-secondary mb-2">
          Set up webhook endpoints to receive real-time notifications about payment status
          changes. Learn more in our{' '}
          <Link
            to="/docs/webhooks"
            className="text-accent-blue hover:underline"
          >
            webhook docs
          </Link>
          .
        </p>
      </section>

      {/* Next Steps */}
      <section className="bg-card-bg border border-card-border rounded-xl p-6 mt-12">
        <h3 className="text-lg font-semibold text-text-primary mb-4">Next Steps</h3>
        <ul className="space-y-2">
          <li>
            <Link
              to="/docs/api-reference"
              className="text-accent-blue hover:underline text-sm"
            >
              Explore the full API Reference
            </Link>
          </li>
          <li>
            <Link
              to="/docs/webhooks"
              className="text-accent-blue hover:underline text-sm"
            >
              Set up webhook notifications
            </Link>
          </li>
          <li>
            <Link
              to="/docs/sdk"
              className="text-accent-blue hover:underline text-sm"
            >
              Learn about SDK features
            </Link>
          </li>
        </ul>
      </section>
    </div>
  );
}
