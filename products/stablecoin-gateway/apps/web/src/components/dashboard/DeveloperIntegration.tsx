import { useState } from 'react';
import { codeSnippet } from '../../data/dashboard-mock';

export default function DeveloperIntegration() {
  const [codeCopied, setCodeCopied] = useState(false);

  const copyCode = async () => {
    await navigator.clipboard.writeText(codeSnippet);
    setCodeCopied(true);
    setTimeout(() => setCodeCopied(false), 2000);
  };

  return (
    <div>
      <h3 className="text-lg font-bold text-text-primary mb-1">Developer Integration</h3>
      <span className="inline-block text-xs text-text-secondary bg-card-bg border border-card-border rounded px-2 py-0.5 mb-4">
        REST API
      </span>

      <div className="relative bg-code-bg rounded-lg border border-card-border overflow-hidden">
        <button
          onClick={copyCode}
          className="absolute top-3 right-3 px-3 py-1 text-xs font-medium text-text-secondary bg-card-bg border border-card-border rounded hover:text-text-primary transition-colors"
        >
          {codeCopied ? 'Copied!' : 'Copy'}
        </button>
        <pre className="p-5 text-sm leading-relaxed overflow-x-auto">
          <code>
            <span className="text-purple-400">const</span>{' '}
            <span className="text-blue-300">stableflow</span>{' '}
            <span className="text-white">=</span>{' '}
            <span className="text-yellow-300">require</span>
            <span className="text-white">(</span>
            <span className="text-green-400">'stableflow'</span>
            <span className="text-white">)(</span>
            <span className="text-green-400">'pk_live_...'</span>
            <span className="text-white">);</span>
            {'\n\n'}
            <span className="text-gray-500">// Create a payment intent</span>
            {'\n'}
            <span className="text-purple-400">await</span>{' '}
            <span className="text-blue-300">stableflow</span>
            <span className="text-white">.paymentIntents.create({'{'}</span>
            {'\n'}
            <span className="text-white">{'  '}amount: </span>
            <span className="text-orange-400">10000</span>
            <span className="text-white">,</span>{' '}
            <span className="text-gray-500">// $100.00</span>
            {'\n'}
            <span className="text-white">{'  '}currency: </span>
            <span className="text-green-400">'usdc'</span>
            <span className="text-white">,</span>
            {'\n'}
            <span className="text-white">{'  '}network: </span>
            <span className="text-green-400">'ethereum'</span>
            <span className="text-white">,</span>
            {'\n'}
            <span className="text-white">{'  '}confirm: </span>
            <span className="text-blue-400">true</span>
            <span className="text-white">,</span>
            {'\n'}
            <span className="text-white">{'}'});</span>
          </code>
        </pre>
      </div>

      <div className="mt-4">
        <div className="text-sm text-text-muted mb-2">API Key</div>
        <div className="flex items-center gap-3">
          <code className="px-3 py-1.5 bg-code-bg border border-card-border rounded text-sm text-text-muted font-mono">
            sk_live_••••••••••••••••
          </code>
          <a
            href="/dashboard/api-keys"
            className="px-3 py-1.5 text-xs font-medium text-text-primary bg-accent-blue rounded hover:bg-blue-600 transition-colors"
          >
            Manage Keys
          </a>
        </div>
        <p className="text-xs text-text-muted mt-1">
          Generate and manage API keys in the API Keys section.
        </p>
      </div>
    </div>
  );
}
