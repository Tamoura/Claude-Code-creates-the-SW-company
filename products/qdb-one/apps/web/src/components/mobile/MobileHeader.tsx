'use client';

import { useRouter } from 'next/navigation';
import { useLanguage } from '@/contexts/LanguageContext';
import { ReactNode } from 'react';

interface MobileHeaderProps {
  title: string;
  showBack?: boolean;
  actions?: ReactNode;
}

export default function MobileHeader({ title, showBack = false, actions }: MobileHeaderProps) {
  const router = useRouter();
  const { isRtl } = useLanguage();

  return (
    <header className="sticky top-0 z-40 bg-[var(--card-bg)] border-b border-[var(--border)] mobile-safe-top">
      <div className="flex items-center h-14 px-4">
        {showBack && (
          <button
            onClick={() => router.back()}
            className="flex items-center justify-center w-8 h-8 -ml-1 mr-2 rounded-full active:bg-gray-100 transition-colors"
          >
            <svg
              className="w-5 h-5 text-[var(--foreground)]"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              style={{ transform: isRtl ? 'scaleX(-1)' : undefined }}
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        )}
        <h1 className="text-base font-semibold text-[var(--foreground)] truncate flex-1">
          {title}
        </h1>
        {actions && <div className="flex items-center gap-2 ml-2">{actions}</div>}
      </div>
    </header>
  );
}
