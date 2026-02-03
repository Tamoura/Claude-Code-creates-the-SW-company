/**
 * Landing Page
 *
 * Public-facing page for non-authenticated users.
 * Showcases StableFlow features and directs users to sign up or log in.
 */

import { useNavigate } from 'react-router-dom';
import PublicNav from '../components/PublicNav';
import PublicFooter from '../components/PublicFooter';

export default function HomePageNew() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-page-bg text-text-primary">
      <PublicNav />

      {/* Hero Section */}
      <section className="max-w-6xl mx-auto px-6 pt-20 pb-16 text-center">
        <div className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-pink-500/15 text-accent-pink border border-pink-500/30 mb-6">
          Stablecoin Payment Infrastructure
        </div>
        <h1 className="text-5xl font-bold mb-6 leading-tight">
          Accept crypto payments.
          <br />
          <span className="bg-gradient-to-r from-pink-500 to-blue-500 bg-clip-text text-transparent">
            Settle in stablecoins.
          </span>
        </h1>
        <p className="text-lg text-text-secondary max-w-2xl mx-auto mb-10">
          USDC and USDT payment gateway with 0.5% fees, 5-minute settlements,
          and zero crypto volatility. Built for merchants who want simplicity.
        </p>
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={() => navigate('/signup')}
            className="px-8 py-3 text-sm font-semibold text-white bg-gradient-to-r from-pink-500 to-pink-600 rounded-lg hover:from-pink-600 hover:to-pink-700 transition-all"
          >
            Start Accepting Payments
          </button>
          <button
            onClick={() => navigate('/login')}
            className="px-8 py-3 text-sm font-semibold text-text-secondary border border-card-border rounded-lg hover:text-text-primary hover:border-text-muted transition-colors"
          >
            Merchant Dashboard
          </button>
        </div>
      </section>

      {/* Feature Cards */}
      <section className="max-w-6xl mx-auto px-6 py-16">
        <div className="grid md:grid-cols-3 gap-6">
          <div className="bg-card-bg border border-card-border rounded-xl p-6">
            <div className="w-10 h-10 rounded-lg bg-green-500/15 flex items-center justify-center mb-4">
              <svg className="w-5 h-5 text-accent-green" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-text-primary mb-2">0.5% Fees</h3>
            <p className="text-sm text-text-secondary">
              The lowest fees in crypto payments. No hidden charges, no monthly minimums.
              Pay only when you get paid.
            </p>
          </div>

          <div className="bg-card-bg border border-card-border rounded-xl p-6">
            <div className="w-10 h-10 rounded-lg bg-blue-500/15 flex items-center justify-center mb-4">
              <svg className="w-5 h-5 text-accent-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-text-primary mb-2">5-Minute Settlement</h3>
            <p className="text-sm text-text-secondary">
              On-chain confirmation in minutes, not days. Polygon and Ethereum
              supported with automatic network detection.
            </p>
          </div>

          <div className="bg-card-bg border border-card-border rounded-xl p-6">
            <div className="w-10 h-10 rounded-lg bg-pink-500/15 flex items-center justify-center mb-4">
              <svg className="w-5 h-5 text-accent-pink" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-text-primary mb-2">Zero Volatility</h3>
            <p className="text-sm text-text-secondary">
              Stablecoins only — USDC and USDT pegged 1:1 to USD.
              No Bitcoin price swings. What you see is what you get.
            </p>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="max-w-6xl mx-auto px-6 py-16">
        <h2 className="text-2xl font-bold text-text-primary text-center mb-12">How It Works</h2>
        <div className="grid md:grid-cols-4 gap-8">
          {[
            { step: '1', title: 'Sign Up', desc: 'Create your merchant account in seconds' },
            { step: '2', title: 'Integrate', desc: 'Add your API key and webhook endpoint' },
            { step: '3', title: 'Accept Payments', desc: 'Create payment sessions via API or dashboard' },
            { step: '4', title: 'Get Paid', desc: 'Stablecoins settle directly to your wallet' },
          ].map((item) => (
            <div key={item.step} className="text-center">
              <div className="w-10 h-10 rounded-full bg-gradient-to-r from-pink-500 to-blue-500 flex items-center justify-center mx-auto mb-4">
                <span className="text-white text-sm font-bold">{item.step}</span>
              </div>
              <h3 className="text-sm font-semibold text-text-primary mb-1">{item.title}</h3>
              <p className="text-xs text-text-secondary">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Developer Section */}
      <section className="max-w-6xl mx-auto px-6 py-16">
        <div className="bg-card-bg border border-card-border rounded-xl p-8">
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div>
              <h2 className="text-2xl font-bold text-text-primary mb-4">Developer Friendly</h2>
              <p className="text-text-secondary mb-6">
                RESTful API with webhook notifications. Create payment sessions,
                manage API keys, and monitor transactions from a single dashboard.
              </p>
              <ul className="space-y-3 text-sm text-text-secondary">
                <li className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-accent-green flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  RESTful API with OpenAPI spec
                </li>
                <li className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-accent-green flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Webhook notifications with HMAC signatures
                </li>
                <li className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-accent-green flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  API key management with granular permissions
                </li>
                <li className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-accent-green flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Real-time payment status via SSE
                </li>
              </ul>
            </div>
            <div className="bg-code-bg rounded-lg p-5 font-mono text-sm overflow-x-auto">
              <div className="text-text-muted mb-2">// Create a payment session</div>
              <div className="text-text-secondary">
                <span className="text-accent-blue">const</span> session = <span className="text-accent-blue">await</span> fetch(
              </div>
              <div className="text-accent-green pl-4">'/v1/payments/sessions'</div>
              <div className="text-text-secondary">, {'{'}</div>
              <div className="text-text-secondary pl-4">method: <span className="text-accent-green">'POST'</span>,</div>
              <div className="text-text-secondary pl-4">headers: {'{'}</div>
              <div className="text-text-secondary pl-8"><span className="text-accent-green">'X-API-Key'</span>: apiKey,</div>
              <div className="text-text-secondary pl-4">{'}'},</div>
              <div className="text-text-secondary pl-4">body: JSON.stringify({'{'}</div>
              <div className="text-text-secondary pl-8">amount: <span className="text-accent-pink">10000</span>,</div>
              <div className="text-text-secondary pl-8">currency: <span className="text-accent-green">'USD'</span>,</div>
              <div className="text-text-secondary pl-8">network: <span className="text-accent-green">'polygon'</span>,</div>
              <div className="text-text-secondary pl-4">{'}'}),</div>
              <div className="text-text-secondary">{'}'});</div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-6xl mx-auto px-6 py-16 text-center">
        <h2 className="text-3xl font-bold text-text-primary mb-4">Ready to get started?</h2>
        <p className="text-text-secondary mb-8">
          Create your merchant account and start accepting stablecoin payments today.
        </p>
        <button
          onClick={() => navigate('/signup')}
          className="px-8 py-3 text-sm font-semibold text-white bg-gradient-to-r from-pink-500 to-pink-600 rounded-lg hover:from-pink-600 hover:to-pink-700 transition-all"
        >
          Create Free Account
        </button>
      </section>

      <PublicFooter />
    </div>
  );
}
