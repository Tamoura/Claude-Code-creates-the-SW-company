type SupportedLocale = 'en' | 'ar';

const SUPPORTED: SupportedLocale[] = ['en', 'ar'];
const DEFAULT_LOCALE: SupportedLocale = 'en';

export function getLocale(
  request: { headers: Record<string, string | undefined> }
): SupportedLocale {
  const header = request.headers['accept-language'];
  if (!header) return DEFAULT_LOCALE;

  const primary = header.split(',')[0].trim().split('-')[0].toLowerCase();
  if (SUPPORTED.includes(primary as SupportedLocale)) {
    return primary as SupportedLocale;
  }

  return DEFAULT_LOCALE;
}
