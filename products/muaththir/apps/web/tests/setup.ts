import '@testing-library/jest-dom';

// Load English translations for realistic test output
const messages = require('../src/messages/en.json');

// Global mock for next-intl (ESM module incompatible with Jest)
jest.mock('next-intl', () => ({
  useTranslations: (namespace?: string) => {
    const section = namespace ? messages[namespace] || {} : messages;
    return (key: string, params?: Record<string, any>) => {
      const value = section[key] ?? key;
      if (typeof value !== 'string') return key;
      if (!params) return value;
      return value.replace(/\{(\w+)\}/g, (_: string, k: string) =>
        params[k] !== undefined ? String(params[k]) : `{${k}}`
      );
    };
  },
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
