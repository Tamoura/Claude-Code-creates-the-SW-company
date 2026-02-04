interface Props {
  code: string;
  filename: string;
}

export function CodeBlock({ code, filename }: Props) {
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-2 bg-gray-800 border-b border-gray-700 text-sm text-gray-400">
        <span>{filename}</span>
      </div>
      <pre className="flex-1 overflow-auto p-4 bg-gray-950 text-sm text-gray-300 font-mono">
        <code>{code}</code>
      </pre>
    </div>
  );
}
