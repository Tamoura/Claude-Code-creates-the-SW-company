export interface RecomEngineConfig {
  apiKey: string;
  apiUrl: string;
  userId?: string;
  autoTrack?: boolean;
}

export function getConfigFromScript(): RecomEngineConfig | null {
  if (typeof document === 'undefined') return null;

  const scripts = document.querySelectorAll('script[data-api-key]');
  const script = scripts[scripts.length - 1];

  if (!script) return null;

  const apiKey = script.getAttribute('data-api-key') || '';
  const apiUrl = script.getAttribute('data-api-url') || inferApiUrl(script.getAttribute('src') || '');
  const userId = script.getAttribute('data-user-id') || undefined;
  const autoTrack = script.getAttribute('data-auto-track') !== 'false';

  return { apiKey, apiUrl, userId, autoTrack };
}

function inferApiUrl(scriptSrc: string): string {
  try {
    const url = new URL(scriptSrc);
    return `${url.protocol}//${url.host}`;
  } catch {
    return '';
  }
}
