import { useState, type FormEvent } from 'react';
import { apiClient } from '../lib/api-client';
import type { ChatMessage, ChatResponse, Provider } from '../lib/api-client';
import { useEffect } from 'react';

export default function PlaygroundPage() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [selectedModel, setSelectedModel] = useState('auto');
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [response, setResponse] = useState<ChatResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    apiClient.listProviders().then(setProviders);
  }, []);

  // Build flat model list
  const allModels = [
    { value: 'auto', label: 'auto (smart routing)' },
    ...Array.from(
      new Set(providers.flatMap((p) => p.models))
    )
      .sort()
      .map((m) => ({ value: m, label: m })),
  ];

  const handleSend = async (e: FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    setLoading(true);
    setError('');
    setResponse(null);

    const newMessages: ChatMessage[] = [
      ...messages,
      { role: 'user', content: input.trim() },
    ];
    setMessages(newMessages);
    setInput('');

    try {
      const result = await apiClient.chatCompletions(
        selectedModel,
        newMessages
      );
      setResponse(result);
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: result.content },
      ]);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to get response'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setMessages([]);
    setResponse(null);
    setError('');
    setInput('');
  };

  return (
    <div className="h-full flex flex-col">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text-primary">Playground</h1>
        <p className="text-text-secondary mt-1">
          Test the AI router with different models and providers
        </p>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-4 mb-4">
        <div className="flex items-center gap-2">
          <label
            htmlFor="model-select"
            className="text-sm text-text-secondary"
          >
            Model:
          </label>
          <select
            id="model-select"
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            className="px-3 py-2 rounded-lg bg-input-bg border border-input-border text-text-primary text-sm focus:outline-none focus:border-accent-blue transition-colors"
          >
            {allModels.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </div>
        <button
          onClick={handleClear}
          className="text-sm text-text-muted hover:text-text-secondary transition-colors"
        >
          Clear Chat
        </button>
      </div>

      {/* Chat Area */}
      <div className="flex-1 bg-card-bg border border-card-border rounded-xl flex flex-col overflow-hidden">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.length === 0 && (
            <div className="text-center text-text-muted py-12">
              <p className="text-lg mb-2">Send a message to get started</p>
              <p className="text-sm">
                Select a model or use "auto" for smart routing
              </p>
            </div>
          )}

          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${
                msg.role === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              <div
                className={`max-w-[80%] rounded-xl px-4 py-3 ${
                  msg.role === 'user'
                    ? 'bg-accent-blue text-white'
                    : 'bg-bg-tertiary text-text-primary'
                }`}
              >
                <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="bg-bg-tertiary rounded-xl px-4 py-3">
                <div className="flex items-center gap-2 text-text-muted">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-accent-blue" />
                  <span className="text-sm">Routing request...</span>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-red-400 text-sm">
              {error}
            </div>
          )}
        </div>

        {/* Provider Attribution */}
        {response && (
          <div className="px-6 py-3 border-t border-card-border bg-bg-secondary">
            <div className="flex items-center gap-4 text-xs text-text-muted">
              <span>
                Provider:{' '}
                <span className="text-accent-green font-medium">
                  {response.provider}
                </span>
              </span>
              <span>
                Model:{' '}
                <span className="text-text-secondary">{response.model}</span>
              </span>
              <span>
                Tokens: {response.tokens.total.toLocaleString()}
              </span>
              <span>Latency: {response.latencyMs}ms</span>
            </div>
          </div>
        )}

        {/* Input */}
        <form
          onSubmit={handleSend}
          className="p-4 border-t border-card-border flex gap-3"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your message..."
            disabled={loading}
            className="flex-1 px-4 py-2.5 rounded-lg bg-input-bg border border-input-border text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-blue transition-colors disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="bg-accent-blue text-white px-6 py-2.5 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2"
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
                d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5"
              />
            </svg>
            Send
          </button>
        </form>
      </div>
    </div>
  );
}
