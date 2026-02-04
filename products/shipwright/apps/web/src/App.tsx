import { useState, useEffect } from 'react';
import { useOrchestrator } from './hooks/useOrchestrator';
import { ChatPanel } from './components/Chat/ChatPanel';
import { ChatInput } from './components/Chat/ChatInput';
import { PipelineSidebar } from './components/Pipeline/PipelineSidebar';
import { FileViewer } from './components/FileViewer/FileViewer';

interface ModelInfo {
  id: string;
  name: string;
}

export function App() {
  const { messages, agentStates, files, isStreaming, totalTokensIn, totalTokensOut, send } =
    useOrchestrator();
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [selectedModel, setSelectedModel] = useState('anthropic/claude-sonnet-4');
  const [showFiles, setShowFiles] = useState(true);

  useEffect(() => {
    fetch('/api/models')
      .then((r) => r.json())
      .then((data) => {
        setModels(data);
        if (data.length > 0) setSelectedModel(data[0].id);
      })
      .catch(() => {});
  }, []);

  const handleSend = (text: string) => {
    send(text, selectedModel);
  };

  return (
    <div className="h-screen flex bg-gray-950 text-gray-100">
      {/* Left: Pipeline Sidebar */}
      <PipelineSidebar
        agents={agentStates}
        totalTokensIn={totalTokensIn}
        totalTokensOut={totalTokensOut}
      />

      {/* Center: Chat Panel */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800 bg-gray-900">
          <h1 className="text-lg font-semibold">Shipwright</h1>
          <button
            onClick={() => setShowFiles(!showFiles)}
            className="text-xs text-gray-400 hover:text-gray-200 px-2 py-1 rounded border border-gray-700"
          >
            {showFiles ? 'Hide Files' : 'Show Files'}
          </button>
        </div>
        <ChatPanel messages={messages} />
        <ChatInput
          onSend={handleSend}
          isStreaming={isStreaming}
          models={models}
          selectedModel={selectedModel}
          onModelChange={setSelectedModel}
        />
      </div>

      {/* Right: File Viewer */}
      {showFiles && (
        <div className="w-[400px] border-l border-gray-800">
          <FileViewer files={files} />
        </div>
      )}
    </div>
  );
}
