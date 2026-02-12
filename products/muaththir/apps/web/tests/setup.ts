import '@testing-library/jest-dom';

// Mock window.matchMedia (used by ThemeToggle component)
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Load English translations for realistic test output
const messages = require('../src/messages/en.json');

// Global mock for next-intl (ESM module incompatible with Jest)
// useTranslations must return a stable function reference per namespace
// to avoid infinite re-render loops in components that use useCallback([t])
const translatorCache: Record<string, (key: string, params?: Record<string, any>) => string> = {};
function getTranslator(namespace?: string) {
  const cacheKey = namespace || '__root__';
  if (!translatorCache[cacheKey]) {
    const section = namespace ? messages[namespace] || {} : messages;
    translatorCache[cacheKey] = (key: string, params?: Record<string, any>) => {
      const value = section[key] ?? key;
      if (typeof value !== 'string') return key;
      if (!params) return value;
      return value.replace(/\{(\w+)\}/g, (_: string, k: string) =>
        params[k] !== undefined ? String(params[k]) : `{${k}}`
      );
    };
  }
  return translatorCache[cacheKey];
}

jest.mock('next-intl', () => ({
  useTranslations: (namespace?: string) => getTranslator(namespace),
  useLocale: () => 'en',
  useMessages: () => messages,
  useNow: () => new Date(),
  useTimeZone: () => 'UTC',
  useFormatter: () => ({
    dateTime: (d: Date) => d.toISOString(),
    number: (n: number) => String(n),
    relativeTime: () => '',
  }),
  NextIntlClientProvider: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock('next-intl/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  }),
  usePathname: () => '/',
  redirect: jest.fn(),
  Link: ({ children, ...props }: any) => {
    const React = require('react');
    return React.createElement('a', props, children);
  },
}));
