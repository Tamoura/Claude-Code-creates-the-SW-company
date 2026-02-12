'use client';

import { useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

interface UseKeyboardShortcutsOptions {
  /** Called when Escape key is pressed */
  onEscape?: () => void;
}

/**
 * Keyboard shortcuts for the dashboard:
 * - Ctrl+K / Cmd+K: Navigate to observe page
 * - Escape: Call onEscape callback (e.g., close modal/drawer)
 */
export function useKeyboardShortcuts(
  options?: UseKeyboardShortcutsOptions
) {
  const router = useRouter();

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isTyping =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable;

      // Ctrl+K / Cmd+K: navigate to observe
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        if (isTyping) return;
        e.preventDefault();
        router.push('/dashboard/observe');
        return;
      }

      // Escape: close modal/drawer
      if (e.key === 'Escape' && options?.onEscape) {
        options.onEscape();
      }
    },
    [router, options]
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}
