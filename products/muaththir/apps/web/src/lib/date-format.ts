/**
 * Locale-aware date formatting utilities for Mu'aththir.
 *
 * Uses Intl.DateTimeFormat so dates are formatted according
 * to the active locale (en-GB, ar-SA, etc.).
 */

/** Map our app locale codes to BCP 47 locale tags */
const LOCALE_MAP: Record<string, string> = {
  en: 'en-GB',
  ar: 'ar-SA',
};

function resolveLocale(locale: string): string {
  return LOCALE_MAP[locale] || locale;
}

/**
 * Format a date string or Date as a short human-readable date.
 * Example: "12 Feb 2026" (en) or "١٢ فبراير ٢٠٢٦" (ar)
 */
export function formatDate(
  dateInput: string | Date,
  locale: string
): string {
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(date.getTime())) return String(dateInput);

  return new Intl.DateTimeFormat(resolveLocale(locale), {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

/**
 * Format a date string or Date as a long human-readable date.
 * Example: "12 February 2026" (en)
 */
export function formatDateLong(
  dateInput: string | Date,
  locale: string
): string {
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(date.getTime())) return String(dateInput);

  return new Intl.DateTimeFormat(resolveLocale(locale), {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
}

/**
 * Format a date string or Date with time.
 * Example: "12 Feb 2026, 14:30" (en)
 */
export function formatDateTime(
  dateInput: string | Date,
  locale: string
): string {
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(date.getTime())) return String(dateInput);

  return new Intl.DateTimeFormat(resolveLocale(locale), {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}
