/**
 * Pricing Page
 *
 * Public-facing pricing page showing StableFlow's 0.5% fee structure,
 * competitor comparison, and savings calculator.
 */

import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import PublicNav from '../components/PublicNav';
import PublicFooter from '../components/PublicFooter';

export default function PricingPage() {
  const navigate = useNavigate();
  const [salesVolume, setSalesVolume] = useState(100000);

  // Calculate savings vs credit cards
  const calculateSavings = (volume: number) => {
    // Estimate number of transactions (avg $100 per transaction)
    const avgTransactionSize = 100;
    const numTransactions = volume / avgTransactionSize;

    // Credit card fees: 2.9% + $0.30 per transaction
    const creditCardFees = volume * 0.029 + numTransactions * 0.3;

    // StableFlow fees: 0.5%
    const stablecoinFees = volume * 0.005;

    return Math.round(creditCardFees - stablecoinFees);
  };

  const savings = calculateSavings(salesVolume);

  const competitors = [
    { name: 'Stripe', fee: '2.9% + $0.30', cost: '~$3,200', highlight: false },
    { name: 'PayPal', fee: '2.9% + $0.30', cost: '~$3,200', highlight: false },
    { name: 'Coinbase Commerce', fee: '1%', cost: '$1,000', highlight: false },
    { name: 'BitPay', fee: '1%', cost: '$1,000', highlight: false },
    { name: 'StableFlow', fee: '0.5%', cost: '$500', highlight: true },
  ];

  const features = [
    'No monthly fees',
    'No setup fees',
    'Instant settlement',
    'Real-time notifications',
    'Developer API & SDK',
    'Webhook integrations',
  ];

  return (
    <div className="min-h-screen bg-page-bg text-text-primary">
      <PublicNav />

      {/* Hero Section */}
      <section className="max-w-6xl mx-auto px-6 pt-20 pb-16 text-center">
        <h1 className="text-5xl font-bold text-text-primary mb-4">
          Simple, transparent pricing
        </h1>
        <p className="text-lg text-text-secondary mb-12">
          One flat rate. No monthly fees. No hidden charges.
        </p>
        <div className="inline-block bg-gradient-to-br from-pink-500/10 to-blue-500/10 border border-pink-500/30 rounded-2xl p-12">
          <div className="text-8xl font-bold bg-gradient-to-r from-pink-500 to-blue-500 bg-clip-text text-transparent mb-3">
            0.5%
          </div>
          <div className="text-lg text-text-secondary">
            per successful transaction
          </div>
        </div>
      </section>

      {/* Comparison Table */}
      <section className="max-w-4xl mx-auto px-6 py-16">
        <h2 className="text-2xl font-bold text-text-primary text-center mb-8">
          Compare and save
        </h2>
        <div className="bg-card-bg border border-card-border rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-card-border">
                <th className="text-left px-6 py-4 text-sm font-semibold text-text-primary">
                  Provider
                </th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-text-primary">
                  Fee
                </th>
                <th className="text-right px-6 py-4 text-sm font-semibold text-text-primary">
                  Cost on $100k
                </th>
              </tr>
            </thead>
            <tbody>
              {competitors.map((competitor, index) => (
                <tr
                  key={competitor.name}
                  className={`
                    border-b border-card-border last:border-b-0
                    ${competitor.highlight ? 'bg-gradient-to-r from-pink-500/5 to-blue-500/5' : ''}
                  `}
                >
                  <td className="px-6 py-4">
                    <span
                      className={`text-sm font-medium ${
                        competitor.highlight ? 'text-accent-pink' : 'text-text-primary'
                      }`}
                    >
                      {competitor.name}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-text-secondary">
                    {competitor.fee}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span
                      className={`text-sm font-semibold ${
                        competitor.highlight ? 'text-accent-green' : 'text-text-primary'
                      }`}
                    >
                      {competitor.cost}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Savings Calculator */}
      <section className="max-w-4xl mx-auto px-6 py-16">
        <div className="bg-card-bg border border-card-border rounded-xl p-8">
          <h2 className="text-2xl font-bold text-text-primary text-center mb-6">
            Calculate your savings
          </h2>
          <div className="max-w-md mx-auto">
            <label htmlFor="sales-volume" className="block text-sm font-medium text-text-primary mb-2">
              Annual sales volume
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted">
                $
              </span>
              <input
                id="sales-volume"
                type="number"
                value={salesVolume}
                onChange={(e) => setSalesVolume(Number(e.target.value))}
                className="w-full pl-8 pr-4 py-3 bg-page-bg border border-card-border rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-pink"
              />
            </div>
            <div className="mt-6 text-center">
              <div className="text-4xl font-bold bg-gradient-to-r from-green-500 to-green-600 bg-clip-text text-transparent mb-2">
                You save ${savings.toLocaleString()} per year
              </div>
              <p className="text-sm text-text-secondary">
                vs. traditional credit card processing
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* What's Included */}
      <section className="max-w-6xl mx-auto px-6 py-16">
        <h2 className="text-2xl font-bold text-text-primary text-center mb-12">
          What's included
        </h2>
        <div className="grid md:grid-cols-3 gap-6">
          {features.map((feature) => (
            <div
              key={feature}
              className="bg-card-bg border border-card-border rounded-xl p-6 flex items-start gap-3"
            >
              <svg
                className="w-5 h-5 text-accent-green flex-shrink-0 mt-0.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
              <span className="text-sm font-medium text-text-primary">{feature}</span>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-6xl mx-auto px-6 py-16 text-center">
        <div className="bg-gradient-to-br from-pink-500/10 to-blue-500/10 border border-pink-500/30 rounded-2xl p-12">
          <h2 className="text-3xl font-bold text-text-primary mb-4">
            Start accepting stablecoins today
          </h2>
          <p className="text-text-secondary mb-8 max-w-2xl mx-auto">
            Join merchants saving thousands on payment processing fees.
            Set up your account in minutes and start accepting USDC and USDT.
          </p>
          <button
            onClick={() => navigate('/signup')}
            className="px-8 py-3 text-sm font-semibold text-white bg-gradient-to-r from-pink-500 to-pink-600 rounded-lg hover:from-pink-600 hover:to-pink-700 transition-all"
          >
            Start accepting stablecoins today
          </button>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
