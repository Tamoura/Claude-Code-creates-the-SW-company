import { useState, useEffect } from 'react';

export type Theme = 'light' | 'dark';

const DEFAULT_STORAGE_KEY = 'connectsw-theme';

function getStoredTheme(storageKey: string): Theme {
  if (typeof window === 'undefined') return 'light';
  const stored = localStorage.getItem(storageKey);
  if (stored === 'dark') return 'dark';
  if (stored === 'light') return 'light';
  // Fall back to system preference
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function useTheme(storageKey: string = DEFAULT_STORAGE_KEY) {
  const [theme, setTheme] = useState<Theme>(() => getStoredTheme(storageKey));

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  const toggleTheme = () => {
    const next = theme === 'light' ? 'dark' : 'light';
    localStorage.setItem(storageKey, next);
    setTheme(next);
  };

  const setThemeValue = (value: Theme) => {
    localStorage.setItem(storageKey, value);
    setTheme(value);
  };

  return { theme, toggleTheme, setTheme: setThemeValue };
}
