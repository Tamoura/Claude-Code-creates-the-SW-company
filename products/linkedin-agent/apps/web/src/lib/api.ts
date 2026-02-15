const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5010';

export async function apiFetch<T = unknown>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    // API uses RFC 7807 format: { detail, errors, title }
    let message = err.detail || err.error || err.title || res.statusText;
    if (err.errors) {
      const fieldErrors = Object.entries(err.errors)
        .map(([field, msgs]) => `${field}: ${(msgs as string[]).join(', ')}`)
        .join('; ');
      if (fieldErrors) message = fieldErrors;
    }
    throw new Error(message);
  }

  return res.json();
}

export { API_URL };
