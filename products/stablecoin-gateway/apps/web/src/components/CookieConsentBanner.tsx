import { useState, useEffect, useCallback } from 'react';

const CONSENT_KEY = 'stableflow-consent';

interface ConsentPreferences {
  essential: true;
  analytics: boolean;
  marketing: boolean;
  timestamp: string;
}

function getStoredConsent(): ConsentPreferences | null {
  try {
    const raw = localStorage.getItem(CONSENT_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as ConsentPreferences;
  } catch {
    return null;
  }
}

function storeConsent(prefs: ConsentPreferences): void {
  localStorage.setItem(CONSENT_KEY, JSON.stringify(prefs));
}

export default function CookieConsentBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const existing = getStoredConsent();
    if (!existing) {
      setVisible(true);
    }
  }, []);

  const handleAcceptAll = useCallback(() => {
    storeConsent({
      essential: true,
      analytics: true,
      marketing: true,
      timestamp: new Date().toISOString(),
    });
    setVisible(false);
  }, []);

  const handleEssentialOnly = useCallback(() => {
    storeConsent({
      essential: true,
      analytics: false,
      marketing: false,
      timestamp: new Date().toISOString(),
    });
    setVisible(false);
  }, []);

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label="Cookie consent"
      aria-live="polite"
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-gray-200 bg-white p-4 shadow-lg dark:border-gray-700 dark:bg-gray-900 sm:flex sm:items-center sm:justify-between sm:gap-4 sm:px-6"
    >
      <p className="mb-3 text-sm text-gray-700 dark:text-gray-300 sm:mb-0">
        We use cookies to improve your experience. Essential cookies are required
        for the site to function. Analytics cookies help us understand usage.{' '}
        <a
          href="/docs/privacy"
          className="underline hover:text-blue-600 dark:hover:text-blue-400"
        >
          Learn more
        </a>
      </p>
      <div className="flex shrink-0 gap-2">
        <button
          type="button"
          onClick={handleEssentialOnly}
          className="rounded border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
        >
          Essential Only
        </button>
        <button
          type="button"
          onClick={handleAcceptAll}
          className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          Accept All
        </button>
      </div>
    </div>
  );
}
