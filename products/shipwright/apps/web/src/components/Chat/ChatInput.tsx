import { useState, type KeyboardEvent } from 'react';

interface ModelOption {
  id: string;
  name: string;
}

interface Props {
  onSend: (text: string) => void;
  isStreaming: boolean;
  models: ModelOption[];
  selectedModel: string;
  onModelChange: (modelId: string) => void;
}

export function ChatInput({ onSend, isStreaming, models, selectedModel, onModelChange }: Props) {
  const [text, setText] = useState('');

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed || isStreaming) return;
    onSend(trimmed);
    setText('');
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="border-t border-gray-700 p-4 bg-gray-900">
      <div className="flex items-end gap-2">
        {models.length > 0 && (
          <select
            value={selectedModel}
            onChange={(e) => onModelChange(e.target.value)}
            className="bg-gray-800 text-gray-300 text-sm rounded px-2 py-2 border border-gray-700"
          >
            {models.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        )}
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Describe what you want to build..."
          rows={2}
          className="flex-1 bg-gray-800 text-gray-100 rounded-lg px-4 py-2 resize-none border border-gray-700 focus:border-blue-500 focus:outline-none"
        />
        <button
          onClick={handleSend}
          disabled={isStreaming || !text.trim()}
          aria-label="Send"
          className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:text-gray-500 text-white px-4 py-2 rounded-lg font-medium transition-colors"
        >
          Send
        </button>
      </div>
    </div>
  );
}
