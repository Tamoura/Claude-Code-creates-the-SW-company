export type SSEParsed =
  | { type: 'text'; data: string }
  | { type: 'progress'; data: Record<string, unknown> }
  | { type: 'usage'; data: { tokensIn: number; tokensOut: number } };

export function parseSSELine(line: string): SSEParsed | null {
  const trimmed = line.trim();
  if (!trimmed) return null;

  const prefix = trimmed.slice(0, 2);
  const payload = trimmed.slice(2);

  switch (prefix) {
    case '0:': {
      // Text: 0:"escaped string"
      const unquoted = payload.slice(1, -1); // remove surrounding quotes
      const unescaped = unquoted.replace(/\\n/g, '\n').replace(/\\"/g, '"').replace(/\\\\/g, '\\');
      return { type: 'text', data: unescaped };
    }
    case '2:':
      return { type: 'progress', data: JSON.parse(payload) };
    case '8:':
      return { type: 'usage', data: JSON.parse(payload) };
    default:
      return null;
  }
}
