import { useState } from 'react';
import type { FormEvent } from 'react';
import { useApiKeys } from '../../hooks/useApiKeys';

export default function ApiKeys() {
  const {
    apiKeys,
    isLoading,
    error,
    createdKey,
    createApiKey,
    deleteApiKey,
    clearCreatedKey,
  } = useApiKeys();

  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [permRead, setPermRead] = useState(true);
  const [permWrite, setPermWrite] = useState(false);
  const [permRefund, setPermRefund] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await createApiKey({
        name,
        permissions: { read: permRead, write: permWrite, refund: permRefund },
      });
      setName('');
      setPermRead(true);
      setPermWrite(false);
      setPermRefund(false);
      setShowForm(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    await deleteApiKey(id);
    setDeleteConfirm(null);
  };

  const handleCopyKey = async (key: string) => {
    await navigator.clipboard.writeText(key);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-text-primary mb-1">API Keys</h2>
          <p className="text-text-secondary">
            Manage your API keys for programmatic access
          </p>
        </div>
        <button
          onClick={() => { setShowForm(true); clearCreatedKey(); }}
          className="px-4 py-2 text-sm font-medium text-white bg-accent-blue hover:bg-blue-600 rounded-lg transition-colors"
        >
          Create API Key
        </button>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Created key banner — show full key once */}
      {createdKey?.key && (
        <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 space-y-3">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-accent-green mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-accent-green">API Key Created</p>
              <p className="text-xs text-text-secondary mt-1">
                Copy this key now. You won't be able to see it again.
              </p>
              <div className="mt-2 flex items-center gap-2">
                <code className="flex-1 text-xs font-mono bg-page-bg px-3 py-2 rounded border border-card-border text-text-primary break-all">
                  {createdKey.key}
                </code>
                <button
                  onClick={() => handleCopyKey(createdKey.key!)}
                  className="px-3 py-2 text-xs font-medium text-text-secondary border border-card-border rounded hover:text-text-primary hover:border-text-muted transition-colors flex-shrink-0"
                >
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>
            </div>
          </div>
          <div className="flex justify-end">
            <button
              onClick={clearCreatedKey}
              className="text-xs text-text-muted hover:text-text-secondary transition-colors"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Create form */}
      {showForm && (
        <div className="bg-card-bg border border-card-border rounded-xl p-6">
          <h3 className="text-lg font-semibold text-text-primary mb-4">Create New API Key</h3>
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label htmlFor="key-name" className="block text-sm font-medium text-text-secondary mb-1">
                Key Name
              </label>
              <input
                id="key-name"
                type="text"
                required
                placeholder="e.g., Production Server"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-page-bg border border-card-border rounded-lg text-text-primary placeholder-text-muted focus:outline-none focus:border-accent-blue"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                Permissions
              </label>
              <div className="space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={permRead}
                    onChange={(e) => setPermRead(e.target.checked)}
                    className="rounded border-card-border"
                  />
                  <span className="text-sm text-text-primary">Read</span>
                  <span className="text-xs text-text-muted">— View payments and balances</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={permWrite}
                    onChange={(e) => setPermWrite(e.target.checked)}
                    className="rounded border-card-border"
                  />
                  <span className="text-sm text-text-primary">Write</span>
                  <span className="text-xs text-text-muted">— Create payment sessions</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={permRefund}
                    onChange={(e) => setPermRefund(e.target.checked)}
                    className="rounded border-card-border"
                  />
                  <span className="text-sm text-text-primary">Refund</span>
                  <span className="text-xs text-text-muted">— Issue refunds</span>
                </label>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={isSubmitting || !name.trim()}
                className="px-4 py-2 text-sm font-medium text-white bg-accent-blue hover:bg-blue-600 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Creating...' : 'Create Key'}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2 text-sm font-medium text-text-secondary border border-card-border rounded-lg hover:text-text-primary hover:border-text-muted transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Keys table */}
      <div className="bg-card-bg border border-card-border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-card-border">
              <th className="text-left px-6 py-3.5 text-text-muted font-medium">Name</th>
              <th className="text-left px-6 py-3.5 text-text-muted font-medium">Key</th>
              <th className="text-left px-6 py-3.5 text-text-muted font-medium">Permissions</th>
              <th className="text-left px-6 py-3.5 text-text-muted font-medium">Created</th>
              <th className="text-left px-6 py-3.5 text-text-muted font-medium">Last Used</th>
              <th className="text-right px-6 py-3.5 text-text-muted font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-text-secondary">
                  Loading API keys...
                </td>
              </tr>
            ) : apiKeys.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-text-secondary">
                  No API keys yet. Create one to get started.
                </td>
              </tr>
            ) : (
              apiKeys.map((key) => (
                <tr key={key.id} className="border-b border-card-border last:border-b-0">
                  <td className="px-6 py-4 text-text-primary font-medium">{key.name}</td>
                  <td className="px-6 py-4 font-mono text-text-secondary text-xs">{key.key_prefix}</td>
                  <td className="px-6 py-4">
                    <div className="flex gap-1.5">
                      {Object.entries(key.permissions)
                        .filter(([, v]) => v)
                        .map(([perm]) => (
                          <span
                            key={perm}
                            className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-accent-blue/15 text-accent-blue border border-accent-blue/30"
                          >
                            {perm}
                          </span>
                        ))}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-text-secondary">
                    {new Date(key.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-text-secondary">
                    {key.last_used_at
                      ? new Date(key.last_used_at).toLocaleDateString()
                      : 'Never'}
                  </td>
                  <td className="px-6 py-4 text-right">
                    {deleteConfirm === key.id ? (
                      <div className="flex items-center justify-end gap-2">
                        <span className="text-xs text-red-400">Revoke?</span>
                        <button
                          onClick={() => handleDelete(key.id)}
                          className="px-2 py-1 text-xs font-medium text-red-400 border border-red-500/30 rounded hover:bg-red-500/10 transition-colors"
                        >
                          Confirm
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(null)}
                          className="px-2 py-1 text-xs font-medium text-text-muted border border-card-border rounded hover:text-text-secondary transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setDeleteConfirm(key.id)}
                        className="px-3 py-1 text-xs font-medium text-red-400 border border-red-500/30 rounded hover:bg-red-500/10 transition-colors"
                      >
                        Revoke
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
