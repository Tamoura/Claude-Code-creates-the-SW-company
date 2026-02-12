'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { api } from '../../../../../lib/api-client';

interface ApiKey {
  id: string;
  name: string;
  keyPrefix: string;
  permissions: string;
  lastUsedAt: string | null;
  createdAt: string;
}

export default function ApiKeysPage() {
  const params = useParams();
  const tenantId = params.id as string;
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyPerms, setNewKeyPerms] = useState<'read' | 'read_write'>('read');
  const [createdKey, setCreatedKey] = useState<string | null>(null);

  const loadKeys = async () => {
    try {
      const res = await api.get<{ data: ApiKey[] }>(`/api/v1/tenants/${tenantId}/api-keys`);
      setKeys(res.data);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { loadKeys(); }, [tenantId]);

  const handleCreate = async () => {
    if (!newKeyName.trim()) return;
    try {
      const res = await api.post<{ data: { key: string } }>(`/api/v1/tenants/${tenantId}/api-keys`, {
        name: newKeyName,
        permissions: newKeyPerms,
      });
      setCreatedKey(res.data.key);
      setNewKeyName('');
      loadKeys();
    } catch {}
  };

  const handleRevoke = async (keyId: string) => {
    try {
      await api.delete(`/api/v1/tenants/${tenantId}/api-keys/${keyId}`);
      loadKeys();
    } catch {}
  };

  if (loading) return <div className="text-gray-500">Loading API keys...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">API Keys</h1>
        <button
          onClick={() => { setShowCreate(true); setCreatedKey(null); }}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium"
        >
          + Generate Key
        </button>
      </div>

      {createdKey && (
        <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg">
          <p className="text-sm font-medium text-green-800 dark:text-green-300 mb-2">
            API key created! Copy it now - it won't be shown again.
          </p>
          <code className="block p-3 bg-white dark:bg-gray-800 rounded text-sm font-mono break-all">
            {createdKey}
          </code>
        </div>
      )}

      {showCreate && !createdKey && (
        <div className="mb-6 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 flex gap-3 items-end">
          <div className="flex-1">
            <label className="block text-sm font-medium mb-1">Name</label>
            <input
              type="text"
              value={newKeyName}
              onChange={e => setNewKeyName(e.target.value)}
              placeholder="e.g., Production SDK"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Permissions</label>
            <select
              value={newKeyPerms}
              onChange={e => setNewKeyPerms(e.target.value as 'read' | 'read_write')}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700"
            >
              <option value="read">Read</option>
              <option value="read_write">Read + Write</option>
            </select>
          </div>
          <button onClick={handleCreate} className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm">
            Generate
          </button>
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Key</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Permissions</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Last Used</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {keys.map(key => (
              <tr key={key.id}>
                <td className="px-6 py-4 font-medium">{key.name}</td>
                <td className="px-6 py-4 text-sm font-mono text-gray-500">{key.keyPrefix}...</td>
                <td className="px-6 py-4 text-sm">{key.permissions}</td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  {key.lastUsedAt ? new Date(key.lastUsedAt).toLocaleDateString() : 'Never'}
                </td>
                <td className="px-6 py-4 text-right">
                  <button
                    onClick={() => handleRevoke(key.id)}
                    className="text-sm text-red-600 hover:text-red-700"
                  >
                    Revoke
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
