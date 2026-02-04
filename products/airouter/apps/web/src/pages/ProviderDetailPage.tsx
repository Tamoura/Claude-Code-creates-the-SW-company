import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { apiClient } from '../lib/api-client';
import type { Provider } from '../lib/api-client';

export default function ProviderDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const [provider, setProvider] = useState<Provider | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    async function fetchProvider() {
      if (!slug) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      try {
        const data = await apiClient.getProvider(slug);
        if (data) {
          setProvider(data);
        } else {
          setNotFound(true);
        }
      } catch {
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    }
    fetchProvider();
  }, [slug]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent-blue" />
      </div>
    );
  }

  if (notFound || !provider) {
    return (
      <div className="text-center py-12">
        <h1 className="text-2xl font-bold text-text-primary mb-2">
          Provider not found
        </h1>
        <p className="text-text-secondary mb-6">
          The provider you're looking for doesn't exist.
        </p>
        <Link
          to="/dashboard/providers"
          className="text-accent-blue hover:underline"
        >
          Back to Provider Directory
        </Link>
      </div>
    );
  }

  const statusColors = {
    operational: 'text-accent-green',
    degraded: 'text-accent-yellow',
    down: 'text-accent-red',
  };

  const categoryColors: Record<string, string> = {
    Multimodal: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    Speed: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    'Open Source': 'bg-green-500/10 text-green-400 border-green-500/20',
    Aggregator: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
    Enterprise: 'bg-pink-500/10 text-pink-400 border-pink-500/20',
    'Edge AI': 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
    Reasoning: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
  };

  return (
    <div className="max-w-4xl">
      {/* Breadcrumb */}
      <div className="mb-6 flex items-center gap-2 text-sm text-text-secondary">
        <Link
          to="/dashboard/providers"
          className="hover:text-accent-blue transition-colors"
        >
          Provider Directory
        </Link>
        <span>/</span>
        <span className="text-text-primary">{provider.name}</span>
      </div>

      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-wrap items-center gap-3 mb-3">
          <h1 className="text-3xl font-bold text-text-primary">
            {provider.name}
          </h1>
          <span
            className={`px-3 py-1 rounded-full text-xs font-medium border ${
              categoryColors[provider.category] ||
              'bg-gray-500/10 text-gray-400 border-gray-500/20'
            }`}
          >
            {provider.category}
          </span>
          <span
            className={`flex items-center gap-1.5 text-sm font-medium ${
              statusColors[provider.status]
            }`}
          >
            <span className="inline-block w-2 h-2 rounded-full bg-current" />
            {provider.status.charAt(0).toUpperCase() + provider.status.slice(1)}
          </span>
        </div>
        <p className="text-text-secondary text-lg">{provider.description}</p>
        <a
          href={provider.website}
          target="_blank"
          rel="noopener noreferrer"
          className="text-accent-blue hover:underline text-sm mt-2 inline-block"
        >
          Visit {provider.name} →
        </a>
      </div>

      {/* Free Tier Card */}
      <div className="bg-card-bg border border-card-border rounded-xl p-6 mb-6">
        <h2 className="text-xl font-semibold text-text-primary mb-4">
          Free Tier
        </h2>
        <div className="grid sm:grid-cols-2 gap-4">
          {provider.freeTier.unlimited ? (
            <div className="sm:col-span-2">
              <div className="text-text-muted text-sm mb-1">Tokens</div>
              <div className="text-2xl font-bold text-accent-green">
                Unlimited
              </div>
            </div>
          ) : (
            <>
              {provider.freeTier.requestsPerMinute && (
                <div>
                  <div className="text-text-muted text-sm mb-1">
                    Requests per Minute
                  </div>
                  <div className="text-2xl font-bold text-text-primary">
                    {provider.freeTier.requestsPerMinute}
                  </div>
                </div>
              )}
              {provider.freeTier.requestsPerSecond && (
                <div>
                  <div className="text-text-muted text-sm mb-1">
                    Requests per Second
                  </div>
                  <div className="text-2xl font-bold text-text-primary">
                    {provider.freeTier.requestsPerSecond}
                  </div>
                </div>
              )}
              {provider.freeTier.requestsPerDay && (
                <div>
                  <div className="text-text-muted text-sm mb-1">
                    Requests per Day
                  </div>
                  <div className="text-2xl font-bold text-text-primary">
                    {provider.freeTier.requestsPerDay.toLocaleString()}
                  </div>
                </div>
              )}
              {provider.freeTier.requestsPerMonth && (
                <div>
                  <div className="text-text-muted text-sm mb-1">
                    Requests per Month
                  </div>
                  <div className="text-2xl font-bold text-text-primary">
                    {provider.freeTier.requestsPerMonth.toLocaleString()}
                  </div>
                </div>
              )}
              {provider.freeTier.tokensPerDay && (
                <div>
                  <div className="text-text-muted text-sm mb-1">
                    Tokens per Day
                  </div>
                  <div className="text-2xl font-bold text-text-primary">
                    {provider.freeTier.tokensPerDay.toLocaleString()}
                  </div>
                </div>
              )}
              {provider.freeTier.tokensPerMonth && (
                <div>
                  <div className="text-text-muted text-sm mb-1">
                    Tokens per Month
                  </div>
                  <div className="text-2xl font-bold text-text-primary">
                    {provider.freeTier.tokensPerMonth.toLocaleString()}
                  </div>
                </div>
              )}
              {provider.freeTier.neuronsPerDay && (
                <div>
                  <div className="text-text-muted text-sm mb-1">
                    Neurons per Day
                  </div>
                  <div className="text-2xl font-bold text-text-primary">
                    {provider.freeTier.neuronsPerDay.toLocaleString()}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Acquisition Guide */}
      <div className="bg-card-bg border border-card-border rounded-xl p-6 mb-6">
        <h2 className="text-xl font-semibold text-text-primary mb-4">
          How to Get Your API Key
        </h2>
        <ol className="space-y-4">
          {provider.keyAcquisitionGuide.steps.map((step) => (
            <li key={step.step} className="flex gap-4">
              <span className="flex-shrink-0 w-7 h-7 rounded-full bg-accent-blue/10 text-accent-blue flex items-center justify-center text-sm font-semibold">
                {step.step}
              </span>
              <div className="flex-1 pt-0.5">
                <p className="text-text-primary">{step.instruction}</p>
                {step.note && (
                  <p className="text-text-muted text-sm mt-1 italic">
                    {step.note}
                  </p>
                )}
              </div>
            </li>
          ))}
        </ol>
      </div>

      {/* Tips */}
      {provider.keyAcquisitionGuide.tips.length > 0 && (
        <div className="bg-bg-tertiary border border-card-border rounded-xl p-6 mb-6">
          <h3 className="text-lg font-semibold text-text-primary mb-3">
            Tips
          </h3>
          <ul className="space-y-2">
            {provider.keyAcquisitionGuide.tips.map((tip, i) => (
              <li key={i} className="flex gap-3 text-text-secondary">
                <span className="text-accent-blue mt-1">•</span>
                <span>{tip}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Gotchas */}
      {provider.keyAcquisitionGuide.gotchas.length > 0 && (
        <div className="bg-bg-tertiary border border-card-border rounded-xl p-6 mb-6">
          <h3 className="text-lg font-semibold text-text-primary mb-3">
            Gotchas
          </h3>
          <ul className="space-y-2">
            {provider.keyAcquisitionGuide.gotchas.map((gotcha, i) => (
              <li key={i} className="flex gap-3 text-text-secondary">
                <span className="text-accent-yellow mt-1">⚠</span>
                <span>{gotcha}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Verification */}
      {provider.keyAcquisitionGuide.verificationSteps.length > 0 && (
        <div className="bg-card-bg border border-card-border rounded-xl p-6 mb-6">
          <h3 className="text-lg font-semibold text-text-primary mb-3">
            Verify Your Key
          </h3>
          <div className="space-y-3">
            {provider.keyAcquisitionGuide.verificationSteps.map((step, i) => (
              <pre
                key={i}
                className="bg-code-bg border border-card-border rounded-lg p-4 text-sm text-text-secondary overflow-x-auto font-mono"
              >
                {step}
              </pre>
            ))}
          </div>
        </div>
      )}

      {/* Models */}
      <div className="bg-card-bg border border-card-border rounded-xl p-6 mb-6">
        <h3 className="text-lg font-semibold text-text-primary mb-3">
          Available Models
        </h3>
        <div className="flex flex-wrap gap-2">
          {provider.models.map((model) => (
            <span
              key={model}
              className="px-3 py-1.5 bg-bg-tertiary border border-card-border rounded-lg text-sm text-text-secondary font-mono"
            >
              {model}
            </span>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <Link
          to="/dashboard/keys"
          className="flex-1 bg-accent-blue text-white py-3 px-6 rounded-lg hover:opacity-90 transition-opacity text-center font-medium"
        >
          Add Your {provider.name} Key
        </Link>
        <a
          href={provider.website}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 border border-card-border text-text-primary py-3 px-6 rounded-lg hover:bg-bg-tertiary transition-colors text-center font-medium"
        >
          Visit Provider Website
        </a>
      </div>

      {/* Footer */}
      <div className="text-center text-text-muted text-sm">
        Last verified: {new Date(provider.lastVerified).toLocaleDateString()}
      </div>
    </div>
  );
}
