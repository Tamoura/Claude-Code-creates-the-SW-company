import { useCallback } from 'react';
import { createProjectZip } from '../../lib/zip-export';

interface Props {
  files: Map<string, string>;
}

export function ExportButton({ files }: Props) {
  const handleExport = useCallback(async () => {
    const parsedFiles = Array.from(files.entries()).map(([path, content]) => ({ path, content }));
    const blob = await createProjectZip(parsedFiles);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'project.zip';
    a.click();
    URL.revokeObjectURL(url);
  }, [files]);

  return (
    <button
      onClick={handleExport}
      disabled={files.size === 0}
      className="text-xs bg-gray-800 hover:bg-gray-700 disabled:opacity-50 text-gray-300 px-3 py-1 rounded transition-colors"
    >
      Download ZIP
    </button>
  );
}
