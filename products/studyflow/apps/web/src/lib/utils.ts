/** Tiny classnames joiner (no clsx dependency needed for MVP). */
export function cn(
  ...classes: Array<string | false | null | undefined>
): string {
  return classes.filter(Boolean).join(' ');
}

/** Format an ISO date (YYYY-MM-DD) for display. */
export function formatDate(iso?: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso.length <= 10 ? `${iso}T00:00:00` : iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/** Today's date as YYYY-MM-DD (local). */
export function todayISO(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Days until a due date (negative = overdue). */
export function daysUntil(iso?: string | null): number | null {
  if (!iso) return null;
  const due = new Date(`${iso.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(due.getTime())) return null;
  const now = new Date(`${todayISO()}T00:00:00`);
  return Math.round((due.getTime() - now.getTime()) / 86_400_000);
}
