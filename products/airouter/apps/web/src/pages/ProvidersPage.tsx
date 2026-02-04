import { useEffect, useState } from 'react';
import ProviderCard from '../components/ui/ProviderCard';
import { apiClient } from '../lib/api-client';
import type { Provider } from '../lib/api-client';

export default function ProvidersPage() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modelFilter, setModelFilter] = useState('');
  const [showAddKeyModal, setShowAddKeyModal] = useState(false);
  const [selectedProviderId, setSelectedProviderId] = useState('');
  const [newKey, setNewKey] = useState('');
  const [addingKey, setAddingKey] = useState(false);
  const [addKeyMessage, setAddKeyMessage] = useState('');

  useEffect(() => {
    async function fetchProviders() {
      try {
        const data = await apiClient.listProviders();
        setProviders(data);
      } finally {
        setLoading(false);
      }
    }
    fetchProviders();
  }, []);

  const handleAddKey = (providerId: string) => {
    setSelectedProviderId(providerId);
    setNewKey('');
    setAddKeyMessage('');
    setShowAddKeyModal(true);
  };

  const handleSubmitKey = async () => {
    if (!newKey.trim()) return;
    setAddingKey(true);
    setAddKeyMessage('');
    try {
      await apiClient.addKey(selectedProviderId, newKey);
      setAddKeyMessage('Key added successfully!');
      setNewKey('');
      setTimeout(() => setShowAddKeyModal(false), 1500);
    } catch (err) {
      setAddKeyMessage(
        err instanceof Error ? err.message : 'Failed to add key'
      );
    } finally {
      setAddingKey(false);
    }
  };

  // Build unique model list for filter
  const allModels = Array.from(
    new Set(providers.flatMap((p) => p.models))
  ).sort();

  const filteredProviders = providers.filter((p) => {
    const matchesSearch =
      !search ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.description.toLowerCase().includes(search.toLowerCase());
    const matchesModel =
      !modelFilter || p.models.some((m) => m === modelFilter);
    return matchesSearch && matchesModel;
  });

  const selectedProviderName =
    providers.find((p) => p.id === selectedProviderId)?.name ?? '';

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent-blue" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-text-primary">
          Provider Directory
        </h1>
        <p className="text-text-secondary mt-1">
          Browse free AI providers and add your API keys
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <input
          type="text"
          placeholder="Search providers..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 px-4 py-2.5 rounded-lg bg-input-bg border border-input-border text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-blue transition-colors"
        />
        <select
          value={modelFilter}
          onChange={(e) => setModelFilter(e.target.value)}
          className="px-4 py-2.5 rounded-lg bg-input-bg border border-input-border text-text-secondary focus:outline-none focus:border-accent-blue transition-colors"
          aria-label="Filter by model"
        >
          <option value="">All Models</option>
          {allModels.map((model) => (
            <option key={model} value={model}>
              {model}
            </option>
          ))}
        </select>
      </div>

      {/* Provider Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredProviders.map((provider) => (
          <ProviderCard
            key={provider.id}
            provider={provider}
            onAddKey={handleAddKey}
          />
        ))}
      </div>

      {filteredProviders.length === 0 && (
        <div className="text-center py-12 text-text-muted">
          No providers match your filters.
        </div>
      )}

      {/* Add Key Modal */}
      {showAddKeyModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card-bg border border-card-border rounded-xl p-6 w-full max-w-md">
            <h2 className="text-lg font-semibold text-text-primary mb-1">
              Add API Key
            </h2>
            <p className="text-sm text-text-secondary mb-4">
              Add your {selectedProviderName} API key
            </p>

            <input
              type="password"
              value={newKey}
              onChange={(e) => setNewKey(e.target.value)}
              placeholder="Paste your API key here"
              className="w-full px-4 py-2.5 rounded-lg bg-input-bg border border-input-border text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-blue mb-4 font-mono text-sm transition-colors"
            />

            {addKeyMessage && (
              <p
                className={`text-sm mb-4 ${
                  addKeyMessage.includes('success')
                    ? 'text-accent-green'
                    : 'text-accent-red'
                }`}
              >
                {addKeyMessage}
              </p>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setShowAddKeyModal(false)}
                className="flex-1 py-2.5 rounded-lg border border-card-border text-text-secondary hover:text-text-primary transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitKey}
                disabled={addingKey || !newKey.trim()}
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
