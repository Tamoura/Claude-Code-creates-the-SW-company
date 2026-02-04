export interface ParsedFile {
  path: string;
  content: string;
}

const FILE_ACTION_REGEX =
  /<boltAction\s+type="file"\s+filePath="([^"]+)">([\s\S]*?)<\/boltAction>/g;

export function parseArtifacts(text: string): ParsedFile[] {
  const fileMap = new Map<string, string>();

  let match: RegExpExecArray | null;
  while ((match = FILE_ACTION_REGEX.exec(text)) !== null) {
    const path = match[1];
    const content = match[2].trim();
    fileMap.set(path, content);
  }

  // Reset regex lastIndex for reuse
  FILE_ACTION_REGEX.lastIndex = 0;

  return Array.from(fileMap.entries()).map(([path, content]) => ({ path, content }));
}
