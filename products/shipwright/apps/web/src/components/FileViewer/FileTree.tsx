interface Props {
  paths: string[];
  selectedPath: string | null;
  onSelect: (path: string) => void;
}

export function FileTree({ paths, selectedPath, onSelect }: Props) {
  return (
    <div className="overflow-y-auto text-sm">
      {paths.map((path) => (
        <button
          key={path}
          onClick={() => onSelect(path)}
          className={`w-full text-left px-3 py-1.5 truncate hover:bg-gray-700 transition-colors ${
            selectedPath === path ? 'bg-gray-700 text-blue-400' : 'text-gray-400'
          }`}
        >
          {path}
        </button>
      ))}
    </div>
  );
}
