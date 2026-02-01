import { useState } from 'react';
import type { FormEvent } from 'react';
import { useWebhooks, WEBHOOK_EVENTS } from '../../hooks/useWebhooks';

export default function Webhooks() {
  const {
    webhooks,
    isLoading,
    error,
    createdWebhook,
    rotatedSecret,
    createWebhook,
    updateWebhook,
    deleteWebhook,
    rotateSecret,
    clearCreatedWebhook,
    clearRotatedSecret,
  } = useWebhooks();

  const [showForm, setShowForm] = useState(false);
  const [url, setUrl] = useState('');
  const [description, setDescription] = useState('');
  const [selectedEvents, setSelectedEvents] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editUrl, setEditUrl] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editEvents, setEditEvents] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await createWebhook({
        url,
        events: selectedEvents,
        description: description || undefined,
      });
      setUrl('');
      setDescription('');
      setSelectedEvents([]);
      setShowForm(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleEvent = (event: string) => {
    setSelectedEvents(prev =>
      prev.includes(event)
        ? prev.filter(e => e !== event)
        : [...prev, event]
    );
  };

  const handleEditToggleEvent = (event: string) => {
    setEditEvents(prev =>
      prev.includes(event)
        ? prev.filter(e => e !== event)
        : [...prev, event]
    );
  };

  const handleStartEdit = (webhook: typeof webhooks[0]) => {
    setEditingId(webhook.id);
    setEditUrl(webhook.url);
    setEditDescription(webhook.description || '');
    setEditEvents([...webhook.events]);
  };

  const handleSaveEdit = async () => {
    if (!editingId) return;
    await updateWebhook(editingId, {
      url: editUrl,
      description: editDescription || undefined,
      events: editEvents,
    });
    setEditingId(null);
  };

  const handleToggleEnabled = async (id: string, enabled: boolean) => {
    await updateWebhook(id, { enabled: !enabled });
  };

  const handleDelete = async (id: string) => {
    await deleteWebhook(id);
    setDeleteConfirm(null);
  };

  const handleCopySecret = async (secret: string) => {
    await navigator.clipboard.writeText(secret);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const secretBanner = createdWebhook?.secret || rotatedSecret;
  const secretLabel = createdWebhook?.secret ? 'Webhook Created' : 'Secret Rotated';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-text-primary mb-1">Webhooks</h2>
          <p className="text-text-secondary">
            Configure endpoints to receive real-time payment notifications
          </p>
        </div>
        <button
          onClick={() => { setShowForm(true); clearCreatedWebhook(); clearRotatedSecret(); }}
          className="px-4 py-2 text-sm font-medium text-white bg-accent-blue hover:bg-blue-600 rounded-lg transition-colors"
        >
          Add Webhook
        </button>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Secret banner */}
      {secretBanner && (
        <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 space-y-3">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-accent-green mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-accent-green">{secretLabel}</p>
              <p className="text-xs text-text-secondary mt-1">
                Copy this signing secret now. You won't be able to see it again.
              </p>
              <div className="mt-2 flex items-center gap-2">
                <code className="flex-1 text-xs font-mono bg-page-bg px-3 py-2 rounded border border-card-border text-text-primary break-all">
                  {secretBanner}
                </code>
                <button
                  onClick={() => handleCopySecret(secretBanner)}
                  className="px-3 py-2 text-xs font-medium text-text-secondary border border-card-border rounded hover:text-text-primary hover:border-text-muted transition-colors flex-shrink-0"
                >
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>
            </div>
          </div>
          <div className="flex justify-end">
            <button
              onClick={() => { clearCreatedWebhook(); clearRotatedSecret(); }}
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
          <h3 className="text-lg font-semibold text-text-primary mb-4">Add Webhook Endpoint</h3>
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label htmlFor="wh-url" className="block text-sm font-medium text-text-secondary mb-1">
                Endpoint URL
              </label>
              <input
                id="wh-url"
                type="url"
                required
                placeholder="https://your-server.com/webhooks/stableflow"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-page-bg border border-card-border rounded-lg text-text-primary placeholder-text-muted focus:outline-none focus:border-accent-blue"
              />
            </div>

            <div>
              <label htmlFor="wh-desc" className="block text-sm font-medium text-text-secondary mb-1">
                Description (optional)
              </label>
              <input
                id="wh-desc"
                type="text"
                placeholder="e.g., Production payment notifications"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-page-bg border border-card-border rounded-lg text-text-primary placeholder-text-muted focus:outline-none focus:border-accent-blue"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                Events
              </label>
              <div className="grid grid-cols-2 gap-2">
                {WEBHOOK_EVENTS.map(event => (
                  <label key={event} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedEvents.includes(event)}
                      onChange={() => handleToggleEvent(event)}
                      className="rounded border-card-border"
                    />
                    <span className="text-sm text-text-primary font-mono">{event}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={isSubmitting || !url.trim() || selectedEvents.length === 0}
                className="px-4 py-2 text-sm font-medium text-white bg-accent-blue hover:bg-blue-600 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Creating...' : 'Create Webhook'}
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

      {/* Webhooks list */}
      {isLoading ? (
        <div className="bg-card-bg border border-card-border rounded-xl p-8 text-center text-text-secondary">
          Loading webhooks...
        </div>
      ) : webhooks.length === 0 ? (
        <div className="bg-card-bg border border-card-border rounded-xl p-8 text-center text-text-secondary">
          No webhooks configured. Add one to start receiving payment notifications.
        </div>
      ) : (
        <div className="space-y-4">
          {webhooks.map(webhook => (
            <div key={webhook.id} className="bg-card-bg border border-card-border rounded-xl p-5">
              {editingId === webhook.id ? (
                /* Edit mode */
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-1">URL</label>
                    <input
                      type="url"
                      value={editUrl}
                      onChange={(e) => setEditUrl(e.target.value)}
                      className="w-full px-3 py-2 text-sm bg-page-bg border border-card-border rounded-lg text-text-primary focus:outline-none focus:border-accent-blue"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-1">Description</label>
                    <input
                      type="text"
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                      className="w-full px-3 py-2 text-sm bg-page-bg border border-card-border rounded-lg text-text-primary focus:outline-none focus:border-accent-blue"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-2">Events</label>
                    <div className="grid grid-cols-2 gap-2">
                      {WEBHOOK_EVENTS.map(event => (
                        <label key={event} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={editEvents.includes(event)}
                            onChange={() => handleEditToggleEvent(event)}
                            className="rounded border-card-border"
                          />
                          <span className="text-sm text-text-primary font-mono">{event}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={handleSaveEdit}
                      className="px-4 py-2 text-sm font-medium text-white bg-accent-blue hover:bg-blue-600 rounded-lg transition-colors"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="px-4 py-2 text-sm font-medium text-text-secondary border border-card-border rounded-lg hover:text-text-primary transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                /* View mode */
                <div>
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-1">
                        <code className="text-sm font-mono text-text-primary truncate">{webhook.url}</code>
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold border ${
                            webhook.enabled
                              ? 'bg-green-500/15 text-accent-green border-green-500/30'
                              : 'bg-yellow-500/15 text-accent-yellow border-yellow-500/30'
                          }`}
                        >
                          {webhook.enabled ? 'Active' : 'Disabled'}
                        </span>
                      </div>
                      {webhook.description && (
                        <p className="text-xs text-text-muted">{webhook.description}</p>
                      )}
                    </div>
                  </div>

                  {/* Events */}
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {webhook.events.map(event => (
                      <span
                        key={event}
                        className="inline-block px-2 py-0.5 rounded text-xs font-mono bg-accent-blue/10 text-accent-blue border border-accent-blue/20"
                      >
                        {event}
                      </span>
                    ))}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 border-t border-card-border pt-3">
                    <button
                      onClick={() => handleToggleEnabled(webhook.id, webhook.enabled)}
                      className="px-3 py-1 text-xs font-medium text-text-secondary border border-card-border rounded hover:text-text-primary hover:border-text-muted transition-colors"
                    >
                      {webhook.enabled ? 'Disable' : 'Enable'}
                    </button>
                    <button
                      onClick={() => handleStartEdit(webhook)}
                      className="px-3 py-1 text-xs font-medium text-text-secondary border border-card-border rounded hover:text-text-primary hover:border-text-muted transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => rotateSecret(webhook.id)}
                      className="px-3 py-1 text-xs font-medium text-accent-yellow border border-yellow-500/30 rounded hover:bg-yellow-500/10 transition-colors"
                    >
                      Rotate Secret
                    </button>
                    {deleteConfirm === webhook.id ? (
                      <>
                        <span className="text-xs text-red-400 ml-2">Delete?</span>
                        <button
                          onClick={() => handleDelete(webhook.id)}
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
                      </>
                    ) : (
                      <button
                        onClick={() => setDeleteConfirm(webhook.id)}
                        className="px-3 py-1 text-xs font-medium text-red-400 border border-red-500/30 rounded hover:bg-red-500/10 transition-colors"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
