import { useEffect, useState } from 'react';
import StatusBadge from '../components/ui/StatusBadge';
import { apiClient } from '../lib/api-client';
import type { StoredKey, Provider } from '../lib/api-client';

export default function KeysPage() {
  const [keys, setKeys] = useState<StoredKey[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState('');
  const [newKey, setNewKey] = useState('');
  const [addingKey, setAddingKey] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [testingKeyId, setTestingKeyId] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{
    keyId: string;
    valid: boolean;
    message: string;
  } | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const [keysData, providersData] = await Promise.all([
          apiClient.listKeys(),
          apiClient.listProviders(),
        ]);
        setKeys(keysData);
        setProviders(providersData);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const handleAddKey = async () => {
    if (!selectedProvider || !newKey.trim()) return;
    setAddingKey(true);
    try {
      const added = await apiClient.addKey(selectedProvider, newKey);
      setKeys((prev) => [...prev, added]);
      setShowAddModal(false);
      setNewKey('');
      setSelectedProvider('');
    } catch {
      // Error handling could be expanded
    } finally {
      setAddingKey(false);
    }
  };

  const handleDeleteKey = async (keyId: string) => {
    try {
      await apiClient.deleteKey(keyId);
      setKeys((prev) => prev.filter((k) => k.id !== keyId));
      setDeleteConfirmId(null);
    } catch {
      // Error handling could be expanded
    }
  };

  const handleTestKey = async (keyId: string) => {
    setTestingKeyId(keyId);
    setTestResult(null);
    try {
      const result = await apiClient.testKey(keyId);
      setTestResult({ keyId, ...result });
    } catch {
      setTestResult({
        keyId,
        valid: false,
        message: 'Failed to test key',
      });
    } finally {
      setTestingKeyId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent-blue" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">
            Key Vault
          </h1>
          <p className="text-text-secondary mt-1">
            Manage your provider API keys
          </p>
        </div>
        <button
          onClick={() => {
            setShowAddModal(true);
            setNewKey('');
            setSelectedProvider('');
          }}
          className="bg-accent-blue text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity flex items-center gap-2"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 4.5v15m7.5-7.5h-15"
            />
          </svg>
          Add Key
        </button>
      </div>

      {keys.length === 0 ? (
        <div className="bg-card-bg border border-card-border rounded-xl p-12 text-center">
          <div className="w-16 h-16 bg-bg-tertiary rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-text-muted"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15.75 5.25a3 3 0 0 1 3 3m3 0a6 6 0 0 1-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1 1 21.75 8.25Z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-text-primary mb-2">
            No keys yet
          </h3>
          <p className="text-text-secondary mb-4">
            Add your first provider API key to start routing requests.
          </p>
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-accent-blue text-white px-6 py-2.5 rounded-lg text-sm hover:opacity-90 transition-opacity"
          >
            Add Your First Key
          </button>
        </div>
      ) : (
        <div className="bg-card-bg border border-card-border rounded-xl">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-card-border">
                  <th className="text-left text-xs font-medium text-text-muted uppercase tracking-wider px-6 py-3">
                    Provider
                  </th>
                  <th className="text-left text-xs font-medium text-text-muted uppercase tracking-wider px-6 py-3">
                    Key
                  </th>
                  <th className="text-left text-xs font-medium text-text-muted uppercase tracking-wider px-6 py-3">
                    Status
                  </th>
                  <th className="text-left text-xs font-medium text-text-muted uppercase tracking-wider px-6 py-3">
                    Added
                  </th>
                  <th className="text-right text-xs font-medium text-text-muted uppercase tracking-wider px-6 py-3">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-card-border">
                {keys.map((key) => (
                  <tr key={key.id}>
                    <td className="px-6 py-4 text-sm font-medium text-text-primary">
                      {key.providerName}
                    </td>
                    <td className="px-6 py-4 text-sm font-mono text-text-secondary">
                      {key.keyPrefix}
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={key.status} />
                      {testResult?.keyId === key.id && (
                        <span
                          className={`ml-2 text-xs ${
                            testResult.valid
                              ? 'text-accent-green'
                              : 'text-accent-red'
                          }`}
                        >
                          {testResult.message}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-text-muted">
                      {new Date(key.addedAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleTestKey(key.id)}
                          disabled={testingKeyId === key.id}
                          className="text-xs px-3 py-1.5 rounded-lg border border-card-border text-text-secondary hover:text-accent-blue hover:border-accent-blue transition-colors disabled:opacity-50"
                        >
                          {testingKeyId === key.id
                            ? 'Testing...'
                            : 'Test'}
                        </button>
                        {deleteConfirmId === key.id ? (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleDeleteKey(key.id)}
                              className="text-xs px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
                            >
                              Confirm
                            </button>
                            <button
                              onClick={() => setDeleteConfirmId(null)}
                              className="text-xs px-2 py-1.5 text-text-muted hover:text-text-secondary"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setDeleteConfirmId(key.id)}
                            className="text-xs px-3 py-1.5 rounded-lg border border-card-border text-text-secondary hover:text-accent-red hover:border-red-500/30 transition-colors"
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Key Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card-bg border border-card-border rounded-xl p-6 w-full max-w-md">
            <h2 className="text-lg font-semibold text-text-primary mb-4">
              Add API Key
            </h2>

            <div className="space-y-4">
              <div>
                <label
                  htmlFor="provider-select"
                  className="block text-sm font-medium text-text-secondary mb-1.5"
                >
                  Provider
                </label>
                <select
                  id="provider-select"
                  value={selectedProvider}
                  onChange={(e) => setSelectedProvider(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg bg-input-bg border border-input-border text-text-primary focus:outline-none focus:border-accent-blue transition-colors"
                >
                  <option value="">Select a provider</option>
                  {providers.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="api-key-input"
                  className="block text-sm font-medium text-text-secondary mb-1.5"
                >
                  API Key
                </label>
                <input
                  id="api-key-input"
                  type="password"
                  value={newKey}
                  onChange={(e) => setNewKey(e.target.value)}
                  placeholder="Paste your API key"
                  className="w-full px-4 py-2.5 rounded-lg bg-input-bg border border-input-border text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-blue font-mono text-sm transition-colors"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowAddModal(false)}
                className="flex-1 py-2.5 rounded-lg border border-card-border text-text-secondary hover:text-text-primary transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddKey}
                disabled={addingKey || !selectedProvider || !newKey.trim()}
                className="flex-1 bg-accent-blue text-white py-2.5 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {addingKey ? 'Adding...' : 'Add Key'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
