import { useState } from 'react';
import { FileTree } from './FileTree';
import { CodeBlock } from './CodeBlock';
import { ExportButton } from '../Export/ExportButton';

interface Props {
  files: Map<string, string>;
}

export function FileViewer({ files }: Props) {
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const paths = Array.from(files.keys()).sort();
  const selectedContent = selectedPath ? files.get(selectedPath) ?? '' : '';

  if (files.size === 0) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500 text-sm">
        No files generated yet
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-2 bg-gray-900 border-b border-gray-800">
        <span className="text-xs text-gray-500 font-semibold uppercase tracking-wider">
          Files ({files.size})
        </span>
        <ExportButton files={files} />
      </div>
      <div className="flex flex-1 overflow-hidden">
        <div className="w-48 border-r border-gray-800 overflow-y-auto bg-gray-900">
          <FileTree paths={paths} selectedPath={selectedPath} onSelect={setSelectedPath} />
        </div>
        <div className="flex-1 overflow-hidden">
          {selectedPath ? (
            <CodeBlock code={selectedContent} filename={selectedPath} />
          ) : (
            <div className="flex items-center justify-center h-full text-gray-600 text-sm">
              Select a file to view
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
